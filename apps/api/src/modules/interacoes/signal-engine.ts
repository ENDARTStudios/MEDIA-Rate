import type { StatusConsumo, ReacaoConsumo, MotivoAbandono } from "@prisma/client";

/**
 * Motor de sinal (Addendum 4, Parte 5) — converte cada interação do usuário
 * em pesos para o motor de recomendação:
 *  - pesoMesmaMidia: sinal para recomendações de gênero/estilo (mesma mídia);
 *  - ativaCrossMidia: se a interação ativa/prioriza a descoberta cross-mídia
 *    (Addendum 3) — com enquadramento ('reenquadramento') quando a reação é
 *    negativa, NUNCA suprimindo (Parte 6);
 *  - pesoPerfil: impacto no perfil de gosto / evolução temporal.
 */
export interface InteracaoSinal {
  status: StatusConsumo;
  reacao: ReacaoConsumo | null;
  motivoAbandono: MotivoAbandono | null;
}

export interface Sinal {
  /** -1 (negativo forte) … +1 (positivo forte); 0 = neutro. */
  pesoMesmaMidia: number;
  ativaCrossMidia: boolean;
  /** Intensidade da ativação cross-mídia (0..1). */
  intensidadeCrossMidia: number;
  pesoPerfil: number;
  /**
   * 'reenquadramento' = reação negativa não suprime a sugestão cross-mídia;
   * a UI reformula o texto ("Você não curtiu a adaptação — o livro tem
   * abordagem diferente. Vale conhecer?"). 'padrao' para o resto.
   */
  enquadramento: "padrao" | "reenquadramento";
}

const REENQUADRA = "reenquadramento" as const;
const PADRAO = "padrao" as const;

/** Tabela vinculante do Addendum 4 Parte 5 — cada linha da tabela. */
export function calcularPesos(i: InteracaoSinal): Sinal {
  switch (i.status) {
    case "QUERO_CONSUMIR":
      // Intenção: positivo fraco; prioriza mostrar cross-mídia já.
      return {
        pesoMesmaMidia: 0.25,
        ativaCrossMidia: true,
        intensidadeCrossMidia: 0.5,
        pesoPerfil: 0.2,
        enquadramento: PADRAO,
      };

    case "CONSUMINDO":
      // Neutro — cedo demais para qualquer sinal.
      return {
        pesoMesmaMidia: 0,
        ativaCrossMidia: false,
        intensidadeCrossMidia: 0,
        pesoPerfil: 0,
        enquadramento: PADRAO,
      };

    case "CONCLUIDO":
      if (i.reacao === "GOSTEI") {
        // Positivo forte; cross-mídia em prioridade máxima; registra no feed
        // de Descobertas se a obra relacionada veio via sugestão.
        return {
          pesoMesmaMidia: 1.0,
          ativaCrossMidia: true,
          intensidadeCrossMidia: 1.0,
          pesoPerfil: 1.0,
          enquadramento: PADRAO,
        };
      }
      if (i.reacao === "NAO_GOSTEI") {
        // Negativo forte para a MESMA mídia — mas NUNCA suprime a sugestão
        // cross-mídia da mesma obra: reenquadra o texto (Parte 6).
        return {
          pesoMesmaMidia: -1.0,
          ativaCrossMidia: true,
          intensidadeCrossMidia: 0.7,
          pesoPerfil: -1.0,
          enquadramento: REENQUADRA,
        };
      }
      // Terminou sem reagir: positivo fraco (engajou).
      return {
        pesoMesmaMidia: 0.3,
        ativaCrossMidia: true,
        intensidadeCrossMidia: 0.5,
        pesoPerfil: 0.3,
        enquadramento: PADRAO,
      };

    case "ABANDONADO":
      // Só "NAO_CURTI" equivale a Não Gostei (negativo forte). Qualquer
      // outro motivo (ou ausência) é NEUTRO — nunca penaliza.
      if (i.motivoAbandono === "NAO_CURTI") {
        return {
          pesoMesmaMidia: -1.0,
          ativaCrossMidia: true,
          intensidadeCrossMidia: 0.7,
          pesoPerfil: -0.8,
          enquadramento: REENQUADRA,
        };
      }
      return {
        pesoMesmaMidia: 0,
        ativaCrossMidia: true,
        intensidadeCrossMidia: 0.5,
        pesoPerfil: 0,
        enquadramento: PADRAO,
      };
  }
}

/** Regra de edição da reação (Addendum 4, Parte 3): só após consumo real. */
export function reacaoEditavelPara(status: StatusConsumo): boolean {
  return status === "CONCLUIDO" || status === "ABANDONADO";
}
