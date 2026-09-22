import { describe, it, expect } from "vitest";
import {
  mapearInteracaoResponse,
  mapearPaginaResponse,
  type InteracaoComMidia,
} from "../src/modules/interacoes/interacoes.mapper.js";

/**
 * T036/B3 (D-536) — o DTO público de interações é uma ALLOWLIST: nenhuma
 * coluna interna/legada pode vazar (usuario_id, tenant_id, created_at, tipo,
 * rating, comentario), e os campos consumidos pelo feed/biblioteca/store
 * (reacao, motivo_abandono, midia, timestamps, progresso_detalhe) são
 * preservados.
 */

// Fixture com TODAS as colunas internas/legadas preenchidas (como o Prisma
// devolveria o registro cru) — o mapper precisa descartá-las.
const ITEM = {
  id: "i-1",
  midia_id: "m-1",
  status: "CONCLUIDO",
  reacao: "GOSTEI",
  motivo_abandono: null,
  progresso_detalhe: "T2E5",
  iniciado_em: new Date("2026-02-01T00:00:00Z"),
  concluido_em: new Date("2026-03-01T00:00:00Z"),
  atualizado_em: new Date("2026-03-02T00:00:00Z"),
  origem_relacao_id: null,
  // Colunas internas/legadas (NÃO podem aparecer na resposta):
  usuario_id: "u-1",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  tipo: "consumo",
  rating: 5,
  comentario: "texto legado em plaintext",
  created_at: new Date("2026-01-01T00:00:00Z"),
  midia: {
    id: "m-1",
    slug: "titulo",
    titulo: "Título",
    tipo: "FILME",
    ano_lancamento: 2024,
    imagem_url: null,
    score: 80,
  },
} as unknown as InteracaoComMidia;

describe("T036/D-536 — DTO público de interações (mapper allowlist)", () => {
  it("NÃO expõe colunas internas/legadas", () => {
    const out = mapearInteracaoResponse(ITEM) as Record<string, unknown>;
    for (const k of ["usuario_id", "tenant_id", "tipo", "rating", "comentario", "created_at"]) {
      expect(out, `campo ${k} não deve vazar`).not.toHaveProperty(k);
    }
  });

  it("expõe EXATAMENTE o allowlist de campos do item", () => {
    const out = mapearInteracaoResponse(ITEM);
    expect(Object.keys(out).sort()).toEqual(
      [
        "id",
        "midia_id",
        "status",
        "reacao",
        "motivo_abandono",
        "progresso_detalhe",
        "iniciado_em",
        "concluido_em",
        "atualizado_em",
        "origem_relacao_id",
        "midia",
      ].sort(),
    );
  });

  it("preserva reacao/motivo_abandono e o shape de midia (consumidos pelo store/feed)", () => {
    const out = mapearInteracaoResponse(ITEM);
    expect(out.reacao).toBe("GOSTEI");
    expect(out.motivo_abandono).toBeNull();
    expect(out.progresso_detalhe).toBe("T2E5");
    expect(out.midia).toEqual({
      id: "m-1",
      slug: "titulo",
      titulo: "Título",
      tipo: "FILME",
      ano_lancamento: 2024,
      imagem_url: null,
      score: 80,
    });
    expect(out.midia as unknown as Record<string, unknown>).not.toHaveProperty("deleted_at");
  });

  it("mantém o envelope { items, total, porStatus, nextCursor } e mapeia os itens", () => {
    const pg = mapearPaginaResponse({
      items: [ITEM],
      total: 1,
      porStatus: { CONCLUIDO: 1, QUERO_CONSUMIR: 0, CONSUMINDO: 0, ABANDONADO: 0 },
      nextCursor: "abc",
    });
    expect(pg.total).toBe(1);
    expect(pg.porStatus.CONCLUIDO).toBe(1);
    expect(pg.nextCursor).toBe("abc");
    expect(pg.items).toHaveLength(1);
    expect(pg.items[0] as unknown as Record<string, unknown>).not.toHaveProperty("usuario_id");
  });

  it("reacao null e motivo ABANDONADO passam como null/valor (contrato estável)", () => {
    const out = mapearInteracaoResponse({
      ...ITEM,
      status: "ABANDONADO",
      reacao: null,
      motivo_abandono: "FALTA_TEMPO",
    } as InteracaoComMidia);
    expect(out.reacao).toBeNull();
    expect(out.motivo_abandono).toBe("FALTA_TEMPO");
    expect(out.status).toBe("ABANDONADO");
  });
});
