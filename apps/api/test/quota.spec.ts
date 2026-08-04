import { describe, it, expect, vi } from "vitest";
import { HttpException } from "@nestjs/common";
import { QuotaService } from "../src/modules/quota/quota.service.js";
import { MediaController } from "../src/modules/media/media.controller.js";
import type { MediaScoreService } from "../src/modules/media-score/media-score.service.js";
import type { MediaService } from "../src/modules/media/media.service.js";

function mockPrisma() {
  let count = 0;
  return {
    usoDiario: {
      upsert: vi.fn(async () => {
        count++;
        return { count };
      }),
    },
    usuarioPlano: {
      findUnique: vi.fn().mockResolvedValue({ plano: "FREE" }),
    },
  };
}

describe("QuotaService — quotas diárias de plano (D-132)", () => {
  it("consumir até o limite não lança", async () => {
    const prisma = mockPrisma();
    const quota = new QuotaService(prisma as never);
    for (let i = 0; i < 3; i++) {
      await quota.usar("user-1", "recomendacoes", 3);
    }
    expect(prisma.usoDiario.upsert).toHaveBeenCalledTimes(3);
  });

  it("excede o limite → 429 com retry_after_seconds", async () => {
    const prisma = mockPrisma();
    const quota = new QuotaService(prisma as never);
    for (let i = 0; i < 3; i++) {
      await quota.usar("user-1", "recomendacoes", 3);
    }
    const err = await quota.usar("user-1", "recomendacoes", 3).catch((e: HttpException) => e);
    expect(err.getStatus()).toBe(429);
    const body = err.getResponse() as { required_plan: string; retry_after_seconds: number };
    expect(body.required_plan).toBe("PLUS");
    expect(body.retry_after_seconds).toBeGreaterThan(60);
  });

  it("planoDe sem registro → FREE (defensivo)", async () => {
    const prisma = mockPrisma();
    prisma.usuarioPlano.findUnique.mockResolvedValue(null);
    const quota = new QuotaService(prisma as never);
    expect(await quota.planoDe("user-1")).toBe("FREE");
  });
});

describe("MediaController — quota de recomendações no sort=score", () => {
  it("FREE autenticado com sort=score consome a cota", async () => {
    const prisma = {
      midia: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    };
    const quota = {
      planoDe: vi.fn().mockResolvedValue("FREE"),
      usar: vi.fn().mockResolvedValue(undefined),
    };
    const session = {
      validateToken: vi.fn().mockResolvedValue({ sessao: { usuario_id: "user-1" } }),
    };
    const controller = new MediaController(
      prisma as never,
      {} as MediaScoreService,
      {} as MediaService,
      session as never,
      quota as never,
    );
    const req = { cookies: { sess: "token-x" } } as never;
    await controller.list(
      undefined,
      "20",
      undefined,
      "score:desc",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      req,
    );
    expect(quota.usar).toHaveBeenCalledWith("user-1", "recomendacoes", 3);
  });

  it("sem cookie (anônimo) não consome cota", async () => {
    const prisma = {
      midia: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    };
    const quota = { planoDe: vi.fn(), usar: vi.fn() };
    const controller = new MediaController(
      prisma as never,
      {} as MediaScoreService,
      {} as MediaService,
      undefined,
      quota as never,
    );
    const req = { cookies: {} } as never;
    await controller.list(
      undefined,
      "20",
      undefined,
      "score:desc",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      req,
    );
    expect(quota.usar).not.toHaveBeenCalled();
  });
});
