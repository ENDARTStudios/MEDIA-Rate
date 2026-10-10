/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BackfillDrainService } from "../src/modules/admin/backfill-drain.service.js";

/**
 * T179 (D-576) — drain auto-reagendável: fila zerada = no-op barato; com fila,
 * roda um lote e registra resumo; fora de produção fica desligado; falha do
 * lote não derruba o tique (vira resumo/log).
 */

function makeBackfill(over: any = {}) {
  return {
    contarPendentes: vi.fn(
      async () => over.pendentes ?? { semElenco: 0, seriesSemTemporada: 0, filmesSemPais: 0 },
    ),
    drenarLote: vi.fn(async () => ({
      pendentesAntes: { semElenco: 10, seriesSemTemporada: 5, filmesSemPais: 20 },
      pendentesDepois: { semElenco: 0, seriesSemTemporada: 0, filmesSemPais: 0 },
      lotes: [{ tipo: "continuidade", ok: 25, falhas: 0 }],
    })),
    continuidade: vi.fn(),
    enriquecerMetadados: vi.fn(),
  };
}

describe("BackfillDrainService (T179)", () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.MEDIA_BACKFILL_DRAIN_ENABLED;
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it("tique com fila zerada NÃO chama o drain (idle barato)", async () => {
    const backfill = makeBackfill();
    const svc = new BackfillDrainService(backfill as any);
    await svc.tique();
    expect(backfill.drenarLote).not.toHaveBeenCalled();
    expect(svc.status().ticks).toBe(1);
    expect(svc.status().ultimoResumo).toBeNull();
  });

  it("tique com fila roda um lote e registra resumo observável", async () => {
    const backfill = makeBackfill({
      pendentes: { semElenco: 10, seriesSemTemporada: 5, filmesSemPais: 20 },
    });
    const svc = new BackfillDrainService(backfill as any);
    await svc.tique();
    expect(backfill.drenarLote).toHaveBeenCalledTimes(1);
    const resumo = svc.status().ultimoResumo;
    expect(resumo?.lotes[0]).toEqual({ tipo: "continuidade", ok: 25, falhas: 0 });
    expect(resumo?.pendentesDepois).toMatchObject({ semElenco: 0 });
    expect(() => JSON.stringify(svc.status())).not.toThrow();
  });

  it("falha do lote não derruba o tique (log + resumo com erro)", async () => {
    const backfill = makeBackfill({
      pendentes: { semElenco: 1, seriesSemTemporada: 0, filmesSemPais: 0 },
    });
    backfill.drenarLote.mockRejectedValueOnce(new Error("boom"));
    const svc = new BackfillDrainService(backfill as any);
    await expect(svc.tique()).resolves.toBeUndefined();
  });

  it("habilitado só em produção e sem opt-out; onModuleInit agenda quando habilitado", async () => {
    const backfill = makeBackfill();
    const svc = new BackfillDrainService(backfill as any);
    expect(svc.status().habilitado).toBe(true);
    svc.onModuleInit();
    svc.onModuleDestroy();

    process.env.MEDIA_BACKFILL_DRAIN_ENABLED = "false";
    expect(svc.status().habilitado).toBe(false);
    process.env.MEDIA_BACKFILL_DRAIN_ENABLED = "true";
    process.env.NODE_ENV = "test";
    expect(svc.status().habilitado).toBe(false);
  });

  it("orçamento/intervalo têm defaults seguros e são sobrescrevíveis", () => {
    const svc = new BackfillDrainService(makeBackfill() as any);
    expect(svc.status().intervaloMs).toBe(5 * 60 * 1000);
    expect(svc.status().orcamentoMs).toBe(45 * 60 * 1000);
    process.env.MEDIA_BACKFILL_DRAIN_INTERVAL_MS = "60000";
    process.env.MEDIA_BACKFILL_DRAIN_BUDGET_MS = "120000";
    expect(svc.status().intervaloMs).toBe(60000);
    expect(svc.status().orcamentoMs).toBe(120000);
    // valores inválidos caem no default (sem loop apertado)
    process.env.MEDIA_BACKFILL_DRAIN_INTERVAL_MS = "1000";
    expect(svc.status().intervaloMs).toBe(5 * 60 * 1000);
  });

  it("fila presa (sem progresso) espaça para 6h em vez de reaprocessar a cada 5min", async () => {
    // 32 pendentes que NÃO diminuem (título sem elenco na fonte) — 2 tiques
    // sem progresso devem ativar o espaçamento.
    const backfill = makeBackfill({
      pendentes: { semElenco: 32, seriesSemTemporada: 0, filmesSemPais: 0 },
    });
    backfill.drenarLote.mockImplementation(async () => ({
      pendentesAntes: { semElenco: 32, seriesSemTemporada: 0, filmesSemPais: 0 },
      pendentesDepois: { semElenco: 32, seriesSemTemporada: 0, filmesSemPais: 0 },
      lotes: [{ tipo: "metadados", ok: 32, falhas: 0 }],
    }));
    const svc = new BackfillDrainService(backfill as any);
    await svc.tique(); // 1º tique: baseline (tolerado)
    expect(svc.status().espacado).toBe(false);
    await svc.tique(); // 2º: 1 sem progresso (ainda tolerado)
    expect(svc.status().espacado).toBe(false);
    await svc.tique(); // 3º: 2 sem progresso → espaça
    expect(svc.status().espacado).toBe(true);
    expect(svc.status().semProgresso).toBeGreaterThanOrEqual(2);
  });

  it("progresso (fila diminuindo) mantém cadência normal", async () => {
    let n = 100;
    const backfill = makeBackfill();
    backfill.contarPendentes.mockImplementation(async () => ({
      semElenco: n,
      seriesSemTemporada: 0,
      filmesSemPais: 0,
    }));
    backfill.drenarLote.mockImplementation(async () => {
      n -= 10;
      return {
        pendentesAntes: { semElenco: n + 10, seriesSemTemporada: 0, filmesSemPais: 0 },
        pendentesDepois: { semElenco: n, seriesSemTemporada: 0, filmesSemPais: 0 },
        lotes: [{ tipo: "metadados", ok: 10, falhas: 0 }],
      };
    });
    const svc = new BackfillDrainService(backfill as any);
    await svc.tique();
    await svc.tique();
    expect(svc.status().espacado).toBe(false);
  });
});
