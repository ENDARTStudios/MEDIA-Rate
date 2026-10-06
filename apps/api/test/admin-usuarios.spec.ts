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
            return u.email.toLowerCase().includes(q) || (u.nome ?? "").toLowerCase().includes(q);
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
    usuarioMidiaInteracao: {
      findMany: vi.fn(async () => [
        {
          id: "int-1",
          usuario_id: EDI,
          midia_id: "11111111-1111-4111-8111-111111111111",
          status: "CONCLUIDO",
          reacao: "GOSTEI",
          motivo_abandono: null,
          progresso_detalhe: null,
          iniciado_em: null,
          concluido_em: new Date("2026-10-01"),
          atualizado_em: new Date("2026-10-01"),
          origem_relacao_id: null,
          midia: {
            id: "11111111-1111-4111-8111-111111111111",
            slug: "duna",
            titulo: "Duna",
            tipo: "FILME",
            ano_lancamento: 2021,
            imagem_url: null,
            score: 82,
          },
        },
      ]),
      findUnique: vi.fn(async () => ({ id: "int-1" })),
      delete: vi.fn(async () => ({ id: "int-1" })),
    },
    watchlistEntry: {
      findMany: vi.fn(async () => [
        {
          id: "wl-1",
          midia_id: "22222222-2222-4222-8222-222222222222",
          coluna: "WANT",
          created_at: new Date("2026-09-30"),
        },
      ]),
      findFirst: vi.fn(async () => ({ id: "wl-1" })),
      delete: vi.fn(async () => ({ id: "wl-1" })),
    },
    auditLog: {
      findMany: vi.fn(async ({ where }: any) =>
        [
          {
            entidade: "Usuario",
            entidade_id: EDI,
            acao: "ADMIN_USUARIO_BANIDO",
            usuario_id: "admin-1",
            ip_origem: "1.2.3.4",
            created_at: new Date("2026-10-05T12:00:00Z"),
          },
        ].filter((x) => !where.acao || x.acao === where.acao),
      ),
      count: vi.fn(async ({ where }: any) => (where.acao === "ADMIN_USUARIO_BANIDO" ? 1 : 0)),
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
      expect.objectContaining({
        acao: "ADMIN_PLANO_ALTERADO",
        dadosDepois: { alvo: EDI, plano: "PREMIUM", origem: "MANUAL" },
      }),
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

  it("atividadeDoUsuario devolve interações (DTO allowlist) + watchlist; 404 sem usuário", async () => {
    const r = await service.atividadeDoUsuario(EDI);
    expect(r.usuario).toMatchObject({ id: EDI, email: "edi@endart.com" });
    expect(r.interacoes).toHaveLength(1);
    // DTO allowlist: sem usuario_id/tenant_id (T036/D-536)
    expect(JSON.stringify(r.interacoes[0])).not.toContain("usuario_id");
    expect(r.interacoes[0]).toMatchObject({ status: "CONCLUIDO", midia: { titulo: "Duna" } });
    expect(r.watchlist).toEqual([
      {
        id: "wl-1",
        midia_id: "22222222-2222-4222-8222-222222222222",
        coluna: "WANT",
        criado_em: expect.any(Date),
      },
    ]);
    // RLS: contexto ADMIN
    expect(prisma.usuario.findUnique).toHaveBeenCalled();
    await expect(service.atividadeDoUsuario("nao-existe")).rejects.toThrow(NotFoundException);
  });

  it("listarAuditoria filtra por ação, pagina e NUNCA expõe hashes da cadeia", async () => {
    const r = await service.listarAuditoria({ acao: "ADMIN_USUARIO_BANIDO", page: 0 });
    expect(r.total).toBe(1);
    expect(r.items[0]).toMatchObject({ acao: "ADMIN_USUARIO_BANIDO", ip: "1.2.3.4" });
    expect(JSON.stringify(r)).not.toContain("hash_cadeia");
    expect(JSON.stringify(r)).not.toContain("hash_anterior");

    const vazio = await service.listarAuditoria({ acao: "INEXISTENTE", page: 0 });
    expect(vazio.items).toHaveLength(0);
    expect(vazio.total).toBe(0);
  });

  it("moderação: remover interação audita ADMIN_MODERACAO e 404 sem interação", async () => {
    const midiaId = "11111111-1111-4111-8111-111111111111";
    const r = await service.removerInteracaoUsuario(ADMIN, EDI, midiaId, "spam");
    expect(r).toEqual({ usuarioId: EDI, midiaId });
    expect(prisma.usuarioMidiaInteracao.delete).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: "ADMIN_MODERACAO_INTERACAO_REMOVIDA",
        dadosDepois: expect.objectContaining({ alvo: EDI, midiaId, motivo: "spam" }),
      }),
    );
    prisma.usuarioMidiaInteracao.findUnique.mockResolvedValueOnce(null);
    await expect(service.removerInteracaoUsuario(ADMIN, EDI, midiaId, "x")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("moderação: remover watchlist audita e 404 sem entrada", async () => {
    const r = await service.removerWatchlistUsuario(ADMIN, EDI, "wl-1", "conteúdo inadequado");
    expect(r).toEqual({ usuarioId: EDI, entryId: "wl-1" });
    expect(prisma.watchlistEntry.delete).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ADMIN_MODERACAO_WATCHLIST_REMOVIDA" }),
    );
    prisma.watchlistEntry.findFirst.mockResolvedValueOnce(null);
    await expect(service.removerWatchlistUsuario(ADMIN, EDI, "wl-1", "x")).rejects.toThrow(
      NotFoundException,
    );
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
