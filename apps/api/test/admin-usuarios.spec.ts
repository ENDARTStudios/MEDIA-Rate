/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminService } from "../src/modules/admin/admin.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { CacheService } from "../src/common/cache.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";

const ADMIN = "admin-1";
const EDI = "90a1c50a-aa71-42d0-97e6-5304802b4d92";

function mockPrisma() {
  const usuarios = new Map<string, any>();
  usuarios.set(EDI, {
    id: EDI,
    nome: "Edi",
    email: "edi@endart.com",
    banido_em: null,
    created_at: new Date("2026-07-01"),
    plano: { plano: "PLUS", origem: "STRIPE" },
  });
  return {
    usuario: {
      findUnique: vi.fn(async ({ where }: any) => usuarios.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: any) =>
        [...usuarios.values()].filter((u) => {
          if (where.usuarioPlano && u.plano.plano !== where.usuarioPlano.plano) return false;
          if (where.OR) {
            const q = where.OR[0].nome.contains.toLowerCase();
            return (
              u.email.toLowerCase().includes(q) || (u.nome ?? "").toLowerCase().includes(q)
            );
          }
          return true;
        }),
      ),
      count: vi.fn(async () => usuarios.size),
      update: vi.fn(async ({ where, data }: any) => {
        const u = usuarios.get(where.id);
        if (!u) throw new Error("not found");
        Object.assign(u, data);
        return u;
      }),
    },
    usuarioPlano: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async ({ create }: any) => create),
    },
    sessao: {
      updateMany: vi.fn(async () => ({ count: 3 })),
    },
  };
}

describe("AdminService — gestão de usuários (Onda 1 admin, P0)", () => {
  let service: AdminService;
  let prisma: ReturnType<typeof mockPrisma>;
  let audit: { log: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = mockPrisma();
    audit = { log: vi.fn(async () => undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: {} },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it("listarUsuarios devolve itens mapeados (plano default FREE sem vínculo) e total", async () => {
    prisma.usuario.findMany.mockResolvedValueOnce([
      {
        id: EDI,
        nome: "Edi",
        email: "edi@endart.com",
        banido_em: null,
        created_at: new Date("2026-07-01"),
        plano: { plano: "PLUS", origem: "STRIPE" },
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        nome: null,
        email: "semplano@test.com",
        banido_em: new Date("2026-10-05"),
        created_at: new Date("2026-10-01"),
        plano: null,
      },
    ]);
    prisma.usuario.count.mockResolvedValueOnce(2);

    const r = await service.listarUsuarios({ q: undefined, plano: undefined, page: 0 });
    expect(r.total).toBe(2);
    expect(r.items[0]).toMatchObject({ plano: "PLUS", origem: "STRIPE", banido: false });
    expect(r.items[1]).toMatchObject({ plano: "FREE", banido: true });
  });

  it("alterarPlano cria exceção MANUAL, audita e 404 em usuário inexistente", async () => {
    const r = await service.alterarPlano(ADMIN, EDI, "PREMIUM");
    expect(r).toEqual({ usuarioId: EDI, plano: "PREMIUM", origem: "MANUAL" });
    expect(prisma.usuarioPlano.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ plano: "PREMIUM", origem: "MANUAL" }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ADMIN_PLANO_ALTERADO", dadosDepois: { alvo: EDI, plano: "PREMIUM", origem: "MANUAL" } }),
    );
    await expect(service.alterarPlano(ADMIN, "nao-existe", "PLUS")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("banir seta banido_em, revoga sessões e audita com motivo", async () => {
    const r = await service.banir(ADMIN, EDI, "teste de ban");
    expect(r.usuarioId).toBe(EDI);
    expect(r.banido_em).toBeInstanceOf(Date);
    expect(r.sessoesRevogadas).toBe(3);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { banido_em: expect.any(Date) } }),
    );
    expect(prisma.sessao.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: EDI, revoked_at: null } }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: "ADMIN_USUARIO_BANIDO",
        dadosDepois: expect.objectContaining({ motivo: "teste de ban" }),
      }),
    );
  });

  it("banir a si mesmo → 400", async () => {
    await expect(service.banir(ADMIN, ADMIN, "motivo")).rejects.toThrow(BadRequestException);
  });

  it("desbanir limpa banido_em e audita; usuário inexistente → 404", async () => {
    const r = await service.desbanir(ADMIN, EDI);
    expect(r).toEqual({ usuarioId: EDI, banido: false });
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { banido_em: null } }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ADMIN_USUARIO_DESBANIDO" }),
    );
    await expect(service.desbanir(ADMIN, "nao-existe")).rejects.toThrow(NotFoundException);
  });
});
