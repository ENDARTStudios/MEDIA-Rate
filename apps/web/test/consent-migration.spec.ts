import { describe, it, expect } from "vitest";
import {
  migrarConsentimento,
  registrarRevogacaoV2,
  type ConsentV2,
} from "@/lib/consent-migration";

/**
 * T470 (D-531/D-532) — migração v1→v2 do consentimento granular.
 *
 * Regras do payload D-531:
 * - lgpd-consent-v1='accepted' detectado ⇒ banner REEXIBIDO, NUNCA herdado
 *   como consentimento granular (achado P0 auditoria/parecer).
 * - Schema v2 corrompido ⇒ reexibir.
 * - Cookie mr_consent v1 (T442/T443, granular) ⇒ migra PRESERVANDO categorias.
 */

const AGORA = "2026-09-21T00:00:00.000Z";
const IDIOMA = "pt-BR";

function v2Exemplo(): ConsentV2 {
  return {
    categorias: { analytics: true, monitoring: false },
    versao_banner: 2,
    timestamp_iso: "2026-09-01T00:00:00.000Z",
    idioma: IDIOMA,
    pais_sem_ip: "BR",
    fornecedores: ["posthog", "sentry"],
    revogacoes: [],
  };
}

describe("migrarConsentimento (T470)", () => {
  it("v2 válido → usa sem reexibir banner", () => {
    const v2 = v2Exemplo();
    const r = migrarConsentimento({
      v2Bruto: v2,
      v1Cookie: null,
      lgpdV1: null,
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("usar-v2");
    expect(r.estado).toEqual(v2);
    expect(r.purgarLgpdV1).toBe(false);
  });

  it("v2 corrompido (schema mismatch) → reexibe banner", () => {
    const corrompido = { ...v2Exemplo(), categorias: { analytics: "sim" } };
    const r = migrarConsentimento({
      v2Bruto: corrompido,
      v1Cookie: null,
      lgpdV1: null,
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("reexibir-banner");
    expect(r.estado).toBeNull();
  });

  it("cookie mr_consent v1 granular → migra PRESERVANDO categorias + metadados", () => {
    const r = migrarConsentimento({
      v2Bruto: null,
      v1Cookie: { analytics: true, monitoring: false },
      lgpdV1: null,
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("migrar-v1");
    expect(r.estado?.categorias).toEqual({ analytics: true, monitoring: false });
    expect(r.estado?.versao_banner).toBe(2);
    expect(r.estado?.timestamp_iso).toBe(AGORA);
    expect(r.estado?.idioma).toBe(IDIOMA);
    expect(r.estado?.pais_sem_ip).toBe("BR");
    expect(r.estado?.fornecedores).toEqual(["posthog", "sentry"]);
    expect(r.estado?.revogacoes).toEqual([]);
  });

  it("lgpd-consent-v1 genérico ('accepted') ⇒ NUNCA herdado como granular", () => {
    const r = migrarConsentimento({
      v2Bruto: null,
      v1Cookie: null,
      lgpdV1: "accepted",
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("reexibir-banner");
    expect(r.estado).toBeNull();
    expect(r.purgarLgpdV1).toBe(true);
  });

  it("nada → privacy by default (banner, sem estado)", () => {
    const r = migrarConsentimento({
      v2Bruto: null,
      v1Cookie: null,
      lgpdV1: null,
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("reexibir-banner");
    expect(r.estado).toBeNull();
    expect(r.purgarLgpdV1).toBe(false);
  });

  it("v1 genérico presente NÃO bloqueia a migração do cookie v1 granular", () => {
    const r = migrarConsentimento({
      v2Bruto: null,
      v1Cookie: { analytics: true, monitoring: true },
      lgpdV1: "accepted",
      idioma: IDIOMA,
      agoraIso: AGORA,
    });
    expect(r.acao).toBe("migrar-v1");
    expect(r.estado?.categorias).toEqual({ analytics: true, monitoring: true });
  });
});

describe("registrarRevogacaoV2 (T470)", () => {
  it("revoga categoria e registra no trail", () => {
    const estado = v2Exemplo();
    const revogado = registrarRevogacaoV2(estado, "analytics", "2026-09-21T01:00:00.000Z");
    expect(revogado.categorias.analytics).toBe(false);
    expect(revogado.categorias.monitoring).toBe(false);
    expect(revogado.revogacoes).toEqual([
      { categoria: "analytics", timestamp: "2026-09-21T01:00:00.000Z" },
    ]);
    // estado original imutável
    expect(estado.categorias.analytics).toBe(true);
    expect(estado.revogacoes).toHaveLength(0);
  });

  it("revogações são append-only (duas categorias = duas entradas)", () => {
    let estado = v2Exemplo();
    estado = registrarRevogacaoV2(estado, "analytics", "2026-09-21T01:00:00.000Z");
    estado = registrarRevogacaoV2(estado, "monitoring", "2026-09-21T02:00:00.000Z");
    expect(estado.revogacoes.map((r) => r.categoria)).toEqual(["analytics", "monitoring"]);
  });
});
