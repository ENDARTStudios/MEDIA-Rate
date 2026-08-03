import { Injectable, Logger } from "@nestjs/common";
import { Prisma, type TipoMidia } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service.js";
import { PESOS_POR_TIPO_V2, type ClassificacaoFonte, obterFonte } from "./source-registry.js";

/**
 * Avaliação de uma fonte para uma mídia específica.
 */
export interface FonteAvaliacao {
  fonte: string;
  /** Rating bruto da fonte (ex: 0-10, 0-100). */
  rating: number;
  /** Média da fonte (para z-score). */
  media_fonte: number;
  /** Desvio-padrão da fonte (para z-score). */
  desvio_fonte: number;
  /** Votos/reviews reportados pela fonte (v3 MET-03 — pull Bayesiano). */
  votos?: number;
}

/** Detalhe por fonte do MEDIA Score (classificação Crítica vs Público). */
export interface DetalheFonte {
  fonte: string;
  classificacao: ClassificacaoFonte;
  rating_original: number;
  rating_100: number;
  z_score: number;
  peso: number;
  contribuicao: number;
}

/**
 * Resultado do MEDIA Score v2 (classificação Crítica vs Público).
 *
 * - `score` = consolidado: 0.5×Crítica + 0.5×Público quando ambos existem;
 *   senão o bucket disponível; neutro 50 quando nenhum.
 * - `consenso` = gap |Crítica − Público| em escala 0–100 (informativo,
 *   NUNCA realimenta o score).
 */
export interface MediaScoreV2Result {
  score: number;
  criticosScore: number | null;
  publicoScore: number | null;
  consenso: number | null;
  num_fontes: number;
  confianca: number;
  pesos_usados: Record<string, number>;
  detalhes: {
    fonte: string;
    classificacao: ClassificacaoFonte;
    rating_original: number;
    rating_100: number;
    z_score: number;
    peso: number;
    contribuicao: number;
  }[];
}

/**
 * Configuração v3 (MET-03) por tipo de mídia — metodologia matemática:
 * pesos de S (crítica + público + consenso I), threshold Bayesiano m e
 * modo do índice de consenso.
 */
interface ConfigV3 {
  pesos: { critica: number; publico: number; consenso: number };
  m: number;
  inflacao?: boolean;
  modoConsenso: "gap" | "polarizacao" | "editoras";
}

const CONFIG_V3_POR_TIPO = {
  // Filmes e Séries: crítica 40% + público 40% + consenso 20%; m = 50+10.
  FILME: {
    pesos: { critica: 0.4, publico: 0.4, consenso: 0.2 },
    m: 60,
    modoConsenso: "gap",
  },
  SERIE: {
    pesos: { critica: 0.4, publico: 0.4, consenso: 0.2 },
    m: 60,
    modoConsenso: "gap",
  },
  // Games: crítica 55% + público 35% + consenso 10%; m = 1000+15.
  GAME: {
    pesos: { critica: 0.55, publico: 0.35, consenso: 0.1 },
    m: 1015,
    modoConsenso: "gap",
  },
  // Livros: crítica 25% + público 55% + consenso 20%; m = 100; inflação.
  LIVRO: {
    pesos: { critica: 0.25, publico: 0.55, consenso: 0.2 },
    m: 100,
    inflacao: true,
    modoConsenso: "gap",
  },
  // HQs: público 60% + consenso entre editoras 40%; m = 250.
  HQ: {
    pesos: { critica: 0, publico: 0.6, consenso: 0.4 },
    m: 250,
    modoConsenso: "editoras",
  },
  // Mangás/Light Novels: crítica 45% + público 45% + polarização 10%; m = 500.
  ANIME: {
    pesos: { critica: 0.45, publico: 0.45, consenso: 0.1 },
    m: 500,
    modoConsenso: "polarizacao",
  },
} satisfies Record<string, ConfigV3>;

/** Config da mídia com fallback para FILME (tipo desconhecido). */
function configV3(tipo: string): ConfigV3 {
  return CONFIG_V3_POR_TIPO[tipo as keyof typeof CONFIG_V3_POR_TIPO] ?? CONFIG_V3_POR_TIPO.FILME;
}

/** Prior Bayesiano padrão (média do catálogo 0–100) quando não há dados. */
const CATALOGO_DEFAULT = 70;

/** TTL do cache da média do catálogo por tipo (5 min). */
const CATALOGO_CACHE_TTL_MS = 5 * 60 * 1000;

/** Parâmetros opcionais do cálculo v3 (MET-03). */
export interface CalcularScoreV3Params {
  /** Votos totais v (Σ votos das fontes). null/undefined → 0. */
  votosTotal?: number | null;
  /** Média do catálogo C na mesma categoria (0–100). null → padrão 70. */
  mediaCatalogo?: number | null;
  /** Índice de consenso I (0–100) fornecido externamente. */
  indiceConsenso?: number | null;
  /** Distribuição de notas (bins 1–10) — polarização de mangás/LN. */
  distribuicaoNotas?: { nota: number; votos: number }[];
  /** Média por editora — consenso de editoras de HQs. */
  mediaPorEditora?: { editora: string; media: number }[];
  /** Última coleta de avaliações — fator Atualização da confiança. */
  atualizadoEm?: Date | null;
}

/**
 * Resultado do MEDIA Score v3 (MET-03) — estimador Bayesiano:
 * MEDIA = (v/(v+m))·S + (m/(v+m))·C.
 *
 * - `s` = S pré-Bayes (0–100), `c` = prior usado, `votosTotal` = v.
 * - `indiceConsenso` (I = 100 − |crítica − público|) REALIMENTA o score;
 *   `consenso` permanece como gap informativo.
 * - `confianca` = Confidence Score 0–100 (40×cobertura + 30×volume +
 *   20×concordância + 10×atualização).
 */
export interface MediaScoreV3Result {
  score: number;
  criticosScore: number | null;
  publicoScore: number | null;
  consenso: number | null;
  indiceConsenso: number | null;
  s: number | null;
  c: number;
  votosTotal: number;
  num_fontes: number;
  confianca: number;
  pesos_usados: Record<string, number>;
  detalhes: DetalheFonte[];
}

/**
 * Serviço do MEDIA Score™ (T4.7).
 *
 * v3 (MET-03): estimador Bayesiano por mídia com buckets Crítica vs Público.
 * - Z-score por fonte: z = (rating − media_fonte) / desvio_fonte (0–100).
 * - Buckets: média ponderada dos z-scores → score = 50 + zMedio·25 (clip 0–100).
 * - Consenso I realimenta o score; prior C = média do catálogo da categoria.
 */
@Injectable()
export class MediaScoreService {
  private readonly logger = new Logger(MediaScoreService.name);

  /** Cache da média do catálogo por tipo (evita re-agregação no job diário). */
  private readonly catalogoCache = new Map<string, { valor: number | null; at: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * MEDIA Score v3 (MET-03) — estimador Bayesiano por mídia:
   *
   *   MEDIA = (v / (v + m)) · S + (m / (v + m)) · C
   *
   * - S = Σ pesos × componentes (crítica, público, consenso I), renormalizado
   *   sobre os componentes disponíveis; peso zero (ex.: crítica em HQs)
   *   ignora o componente.
   * - I = 100 − |crítica − público| REALIMENTA o score (não é mais
   *   informativo); mangás/LN trocam I pelo índice de polarização e HQs pelo
   *   consenso entre editoras quando os dados são fornecidos.
   * - C = média do catálogo da mesma categoria (0–100); LIVRO aplica a curva
   *   de inflação quando C > 85 (S' = min(S, 0.5·S + 30): 80 → 70, 90 → 75).
   * - `confianca` = Confidence Score 0–100.
   */
  calcularScoreV3(
    tipo: string,
    avaliacoes: FonteAvaliacao[],
    params: CalcularScoreV3Params = {},
  ): MediaScoreV3Result {
    const cfg = configV3(tipo);
    const { buckets, pesosUsados } = this.montarBuckets(tipo, avaliacoes);

    const criticosScore = this.scoreDoBucket(buckets.critica);
    const publicoScore = this.scoreDoBucket(buckets.publico);
    const numFontes = buckets.critica.length + buckets.publico.length;
    const detalhes = [...buckets.critica, ...buckets.publico];

    const consenso =
      criticosScore != null && publicoScore != null
        ? Math.round(Math.abs(criticosScore - publicoScore) * 10) / 10
        : null;
    const indiceGap = consenso != null ? Math.round((100 - consenso) * 10) / 10 : null;

    let indiceConsenso = params.indiceConsenso ?? indiceGap;
    if (cfg.modoConsenso === "polarizacao" && params.distribuicaoNotas?.length) {
      indiceConsenso = this.indicePolarizacao(params.distribuicaoNotas);
    } else if (cfg.modoConsenso === "editoras" && params.mediaPorEditora?.length) {
      indiceConsenso = this.indiceConsensoEditoras(params.mediaPorEditora);
    }

    const componentes: { peso: number; valor: number }[] = [];
    if (criticosScore != null && cfg.pesos.critica > 0) {
      componentes.push({ peso: cfg.pesos.critica, valor: criticosScore });
    }
    if (publicoScore != null && cfg.pesos.publico > 0) {
      componentes.push({ peso: cfg.pesos.publico, valor: publicoScore });
    }
    if (indiceConsenso != null && cfg.pesos.consenso > 0) {
      componentes.push({ peso: cfg.pesos.consenso, valor: indiceConsenso });
    }
    const somaPesos = componentes.reduce((acc, c) => acc + c.peso, 0);
    let s: number | null =
      somaPesos > 0 ? componentes.reduce((acc, c) => acc + c.peso * c.valor, 0) / somaPesos : null;

    const c = params.mediaCatalogo ?? CATALOGO_DEFAULT;
    if (cfg.inflacao && c > 85 && s != null) {
      s = Math.min(s, 0.5 * s + 30);
    }

    const v = Math.max(0, params.votosTotal ?? 0);
    const m = cfg.m;
    // Sem dados de votos (v=0), o pull Bayesiano não tem base — usa S direto
    // (evita colapsar o catálogo inteiro na média C quando as fontes ainda
    // não reportam votos). Com v>0, aplica o estimador da metodologia.
    const score =
      s == null
        ? c
        : v > 0
          ? Math.round(((v / (v + m)) * s + (m / (v + m)) * c) * 10) / 10
          : Math.round(s * 10) / 10;
    const confianca = this.calcularConfiancaV3(
      numFontes,
      v,
      detalhes,
      m,
      params.atualizadoEm ?? null,
    );

    return {
      score,
      criticosScore,
      publicoScore,
      consenso,
      indiceConsenso,
      s: s == null ? null : Math.round(s * 10) / 10,
      c,
      votosTotal: v,
      num_fontes: numFontes,
      confianca,
      pesos_usados: pesosUsados,
      detalhes,
    };
  }

  /**
   * Classifica as avaliações em buckets Crítica vs Público (registro da
   * fonte). Avaliações com valores não finitos (NaN/Infinity vindos de
   * adaptadores externos) são ignoradas — nunca entram no cálculo.
   */
  private montarBuckets(
    tipo: string,
    avaliacoes: FonteAvaliacao[],
  ): {
    buckets: Record<ClassificacaoFonte, DetalheFonte[]>;
    pesosUsados: Record<string, number>;
  } {
    const pesos = PESOS_POR_TIPO_V2[tipo] ?? {
      critica: {} as Record<string, number>,
      publico: {} as Record<string, number>,
    };
    const buckets: Record<ClassificacaoFonte, DetalheFonte[]> = {
      critica: [],
      publico: [],
    };
    const pesosUsados: Record<string, number> = {};

    for (const av of avaliacoes) {
      if (
        !Number.isFinite(av.rating) ||
        !Number.isFinite(av.media_fonte) ||
        !Number.isFinite(av.desvio_fonte) ||
        (av.votos != null && !Number.isFinite(av.votos))
      ) {
        this.logger.warn(`Avaliação não finita ignorada: ${av.fonte}`);
        continue;
      }
      const meta = obterFonte(av.fonte);
      if (!meta) {
        this.logger.warn(`Fonte fora do registro ignorada: ${av.fonte}`);
        continue;
      }
      const peso = pesos[meta.classificacao]?.[meta.id];
      if (!peso || peso <= 0) continue;
      const bucket = buckets[meta.classificacao];
      if (!bucket) continue;
      const fator = meta.fator100;
      const rating100 = Math.max(0, Math.min(100, av.rating * fator));
      const media100 = av.media_fonte * fator;
      const desvio100 = (av.desvio_fonte > 0 ? av.desvio_fonte : 1) * fator;
      const z = (rating100 - media100) / desvio100;
      pesosUsados[meta.id] = peso;
      bucket.push({
        fonte: meta.id,
        classificacao: meta.classificacao,
        rating_original: av.rating,
        rating_100: Math.round(rating100 * 10) / 10,
        z_score: z,
        peso,
        contribuicao: z * peso,
      });
    }

    return { buckets, pesosUsados };
  }

  /**
   * Índice de Polarização (mangás/LN) — 0–100. Penaliza distribuição bimodal
   * (muitas notas ≤2 ou ≥9 sem notas no meio): I = 1 − min(1, extremas/total × 1.25).
   */
  private indicePolarizacao(distribuicao: { nota: number; votos: number }[]): number | null {
    const total = distribuicao.reduce((acc, d) => acc + Math.max(0, d.votos), 0);
    if (total <= 0) return null;
    const extremas = distribuicao.reduce(
      (acc, d) => (d.nota <= 2 || d.nota >= 9 ? acc + Math.max(0, d.votos) : acc),
      0,
    );
    const p = extremas / total;
    return Math.round(Math.max(0, 1 - Math.min(1, p * 1.25)) * 1000) / 10;
  }

  /**
   * Índice de Consenso de Editoras (HQs) — 0–100. Mede a variação da nota
   * entre leitores de editoras diferentes: I = 1 − min(1, desvio/2.5).
   */
  private indiceConsensoEditoras(porEditora: { editora: string; media: number }[]): number | null {
    const medias = porEditora.map((e) => e.media).filter((m) => Number.isFinite(m));
    if (medias.length < 2) return null;
    const mean = medias.reduce((acc, m) => acc + m, 0) / medias.length;
    const std = Math.sqrt(medias.reduce((acc, m) => acc + (m - mean) ** 2, 0) / medias.length);
    return Math.round(Math.max(0, 1 - Math.min(1, std / 2.5)) * 1000) / 10;
  }

  /**
   * Confidence Score v3 — 0–100, independente da mídia:
   * CS = (Cobertura·40) + (Volume·30) + (Concordância·20) + (Atualização·10)
   *   - Cobertura: fontes primárias distintas (0–5 satura).
   *   - Volume: votos v; satura exatamente no threshold m da mídia.
   *   - Concordância: desvio dos z-scores entre fontes (satura em 2.5);
   *     sem 2+ fontes, não há evidência de concordância → 0.
   *   - Atualização: coleta nos últimos 30 dias = 1; decai até 180 dias.
   * Faixas: ≥70 Alta, ≥40 Média, <40 Baixa.
   */
  private calcularConfiancaV3(
    numFontes: number,
    votosTotal: number,
    detalhes: MediaScoreV3Result["detalhes"],
    threshold: number,
    atualizadoEm: Date | null,
  ): number {
    const cobertura = Math.min(1, numFontes / 5) * 40;
    const volume = Math.min(1, votosTotal / Math.max(1, threshold)) * 30;
    let concordancia = 0;
    if (detalhes.length > 1) {
      const zScores = detalhes.map((d) => d.z_score);
      const meanZ = zScores.reduce((a, b) => a + b, 0) / zScores.length;
      const variance = zScores.reduce((acc, z) => acc + (z - meanZ) ** 2, 0) / zScores.length;
      const stdDev = Math.sqrt(variance);
      concordancia = (1 - Math.min(1, stdDev / 2.5)) * 20;
    }
    const dias = atualizadoEm ? (Date.now() - atualizadoEm.getTime()) / 86_400_000 : null;
    const atualizacao =
      (dias == null ? 0 : dias <= 30 ? 1 : Math.max(0, 1 - (dias - 30) / 150)) * 10;
    const cs = cobertura + volume + concordancia + atualizacao;
    return Math.max(0, Math.min(100, Math.round(cs)));
  }

  /**
   * Média do catálogo (0–100) para a mesma categoria — prior Bayesiano C.
   * Retorna null (→ padrão 70) quando a categoria ainda não tem scores.
   *
   * Cache TTL de 5 min por tipo: o job diário recalcula mídia a mídia e não
   * deve re-agregar a categoria inteira a cada chamada (O(N²) no run).
   * Resultados não finitos (score NaN persistido antes do guarda) viram null.
   */
  async obterMediaCatalogoPublico(tipo: string): Promise<number | null> {
    const agora = Date.now();
    const cache = this.catalogoCache.get(tipo);
    if (cache && agora - cache.at < CATALOGO_CACHE_TTL_MS) {
      return cache.valor;
    }
    let valor: number | null = null;
    try {
      const agg = await this.prisma.mediaScore.aggregate({
        where: { midia: { tipo: tipo as TipoMidia } },
        _avg: { score: true },
      });
      valor = agg._avg?.score != null && Number.isFinite(agg._avg.score) ? agg._avg.score : null;
    } catch {
      valor = null;
    }
    this.catalogoCache.set(tipo, { valor, at: agora });
    return valor;
  }

  /** Média ponderada de z-scores do bucket → score 0–100 (1 casa decimal). */
  private scoreDoBucket(bucket: DetalheFonte[]): number | null {
    if (bucket.length === 0) return null;
    const somaPonderada = bucket.reduce((acc, d) => acc + d.contribuicao, 0);
    const somaPesos = bucket.reduce((acc, d) => acc + d.peso, 0);
    if (somaPesos === 0) return null;
    const zMedio = somaPonderada / somaPesos;
    const raw = Math.max(0, Math.min(100, 50 + zMedio * 25));
    return Math.round(raw * 10) / 10;
  }

  /**
   * Recalcula e persiste MEDIA Score (v3 — MET-03) para uma mídia específica.
   *
   * Lê as avaliações persistidas na tabela `avaliacao_fonte` (preenchida
   * pela rota de coleta), soma os votos das fontes (v), obtém a média do
   * catálogo da mesma categoria (prior C), recalcula com `calcularScoreV3`
   * e faz upsert no `media_score` (score, buckets crítica/público, consenso,
   * índice de consenso, votos totais, confiança 0–100 e detalhes por fonte).
   * Chamado pelo job cron diário e pela rota POST /api/v1/midias/:id/coletar.
   */
  async recalcularEPersistir(
    midia_id: string,
  ): Promise<(MediaScoreV3Result & { calculado_em: Date }) | null> {
    const midia = await this.prisma.midia.findUnique({
      where: { id: midia_id },
      include: { avaliacoes: true },
    });
    if (!midia) return null;

    const avaliacoes: FonteAvaliacao[] = midia.avaliacoes.map((a) => ({
      fonte: a.fonte,
      rating: a.rating,
      media_fonte: a.media_fonte,
      desvio_fonte: a.desvio_fonte,
      votos: a.votos ?? undefined,
    }));
    const votosTotal = avaliacoes.reduce((acc, a) => acc + (a.votos ?? 0), 0);
    const mediaCatalogo = await this.obterMediaCatalogoPublico(midia.tipo);

    const resultado = this.calcularScoreV3(midia.tipo, avaliacoes, {
      votosTotal,
      mediaCatalogo,
      atualizadoEm: midia.avaliacoes_atualizadas_em,
    });
    const data = {
      score: resultado.score,
      num_fontes: resultado.num_fontes,
      pesos_usados: resultado.pesos_usados,
      score_critica: resultado.criticosScore,
      score_publico: resultado.publicoScore,
      consenso: resultado.consenso,
      indice_consenso: resultado.indiceConsenso,
      votos_total: resultado.votosTotal,
      confianca: resultado.confianca,
      // Interface não satisfaz o índice de assinatura do Json do Prisma.
      detalhes: resultado.detalhes as unknown as Prisma.InputJsonValue,
    };

    await this.prisma.mediaScore.upsert({
      where: { midia_id },
      create: { midia_id, ...data },
      update: data,
    });

    return { ...resultado, calculado_em: new Date() };
  }
}
