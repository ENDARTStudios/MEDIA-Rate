import { describe, it, expect } from "vitest";
import { calcularPesos, reacaoEditavelPara } from "../src/modules/interacoes/signal-engine.js";

describe("T198 — signal-engine (tabela de pesos Addendum 4 Parte 5)", () => {
  it("QUERO_CONSUMIR: positivo fraco, cross-mídia ativa (prioriza mostrar já), perfil leve", () => {
    const s = calcularPesos({ status: "QUERO_CONSUMIR", reacao: null, motivoAbandono: null });
    expect(s.pesoMesmaMidia).toBe(0.25);
    expect(s.ativaCrossMidia).toBe(true);
    expect(s.pesoPerfil).toBe(0.2);
    expect(s.enquadramentoCross).toBe("normal");
  });

  it("CONSUMINDO: neutro — não ativa cross-mídia (cedo demais)", () => {
    const s = calcularPesos({ status: "CONSUMINDO", reacao: null, motivoAbandono: null });
    expect(s.pesoMesmaMidia).toBe(0);
    expect(s.ativaCrossMidia).toBe(false);
    expect(s.pesoPerfil).toBe(0);
  });

  it("CONCLUIDO + GOSTEI: positivo forte, prioridade máxima cross-mídia, perfil forte", () => {
    const s = calcularPesos({ status: "CONCLUIDO", reacao: "GOSTEI", motivoAbandono: null });
    expect(s.pesoMesmaMidia).toBe(1.0);
    expect(s.ativaCrossMidia).toBe(true);
    expect(s.intensidadeCrossMidia).toBe(1.0);
    expect(s.pesoPerfil).toBe(1.0);
  });

  it("CONCLUIDO sem reação: positivo fraco (terminar = engajou), cross-mídia moderada", () => {
    const s = calcularPesos({ status: "CONCLUIDO", reacao: null, motivoAbandono: null });
    expect(s.pesoMesmaMidia).toBe(0.3);
    expect(s.ativaCrossMidia).toBe(true);
    expect(s.pesoPerfil).toBe(0.3);
  });

  it("CONCLUIDO + NAO_GOSTEI: negativo forte na mesma mídia, mas NUNCA suprime cross-mídia — reenquadra (Parte 6)", () => {
    const s = calcularPesos({ status: "CONCLUIDO", reacao: "NAO_GOSTEI", motivoAbandono: null });
    expect(s.pesoMesmaMidia).toBe(-1.0);
    expect(s.ativaCrossMidia).toBe(true);
    expect(s.enquadramentoCross).toBe("reenquadramento");
    expect(s.pesoPerfil).toBe(-1.0);
  });

  it("ABANDONADO + NAO_CURTI: equivale a Não Gostei (negativo forte, reenquadra)", () => {
    const s = calcularPesos({ status: "ABANDONADO", reacao: null, motivoAbandono: "NAO_CURTI" });
    expect(s.pesoMesmaMidia).toBe(-1.0);
    expect(s.ativaCrossMidia).toBe(true);
    expect(s.enquadramentoCross).toBe("reenquadramento");
  });

  it("ABANDONADO + FALTA_TEMPO/MUDANCA_HUMOR/sem motivo: NEUTRO — nunca penaliza", () => {
    for (const motivo of [null, "FALTA_TEMPO", "MUDANCA_HUMOR"] as const) {
      const s = calcularPesos({ status: "ABANDONADO", reacao: null, motivoAbandono: motivo });
      expect(s.pesoMesmaMidia).toBe(0);
      expect(s.pesoPerfil).toBe(0);
      expect(s.ativaCrossMidia).toBe(true);
      expect(s.enquadramentoCross).toBe("normal");
    }
  });

  it("reação editável apenas em CONCLUIDO/ABANDONADO (Parte 3)", () => {
    expect(reacaoEditavelPara("QUERO_CONSUMIR")).toBe(false);
    expect(reacaoEditavelPara("CONSUMINDO")).toBe(false);
    expect(reacaoEditavelPara("CONCLUIDO")).toBe(true);
    expect(reacaoEditavelPara("ABANDONADO")).toBe(true);
  });
});
