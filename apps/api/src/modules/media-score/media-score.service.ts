import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import { PESOS_POR_TIPO_V2, type ClassificacaoFonte, obterFonte } from "./source-registry.js";

/**
 * Pesos das fontes por tipo de mídia (DECIDE-01).
 * Soma 1.00 por tipo. Sincronizado com DECISOES.md.
 */
const PESOS_POR_TIPO: Record<string, Record<string, number>> = {
  FILME: { omdb: 0.3, tmdb: 0.4, metacritic: 0.3 },
  SERIE: { omdb: 0.3, tmdb: 0.4, metacritic: 0.3 },
  GAME: { igdb: 0.5, rawg: 0.5 },
  LIVRO: { openlibrary: 0.6, goodreads: 0.4 },
};

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
}

/**
 * Resultado do cálculo do MEDIA Score.
 */
export interface MediaScoreResult {
  score: number; // 0-100 (clipped)
  num_fontes: number;
  confianca: number; // 0-1 (baseado em num_fontes e desvio)
  pesos_usados: Record<string, number>;
  detalhes: {
    fonte: string;
    rating_original: number;
    z_score: number;
    peso: number;
    contribuicao: number;
  }[];
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
 * Serviço do MEDIA Score™ (T4.7).
 *
 * Algoritmo (DECIDE-01):
 * 1. Z-score por fonte: z = (rating - media_fonte) / desvio_fonte
 * 2. Média ponderada: sum(z * peso) / sum(peso)
 * 3. Conversão: score = 50 + (z * 25) → range [-25, 125]
 * 4. Clipping: clamp(0, 100)
 *
 * Confiança (heurística para o Beta):
 * - 0 fontes: 0
 * - 1 fonte: 0.3
 * - 2 fontes: 0.6
 * - 3+ fontes: 0.9
 * - Penalizado por desvio alto da fonte.
 */
@Injectable()
export class MediaScoreService {
  private readonly logger = new Logger(MediaScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula MEDIA Score para uma mídia.
   *
   * @param tipo Tipo da mídia (FILME, SERIE, GAME, LIVRO).
   * @param avaliacoes Avaliações das fontes para a mídia.
   * @returns MediaScoreResult com score 0-100 + confiança + detalhes.
   */
  calcularScore(tipo: string, avaliacoes: FonteAvaliacao[]): MediaScoreResult {
    const pesos = PESOS_POR_TIPO[tipo] ?? {};
    const detalhes: MediaScoreResult["detalhes"] = [];
    let somaPonderada = 0;
    let somaPesos = 0;
    let numFontesValidas = 0;

    for (const av of avaliacoes) {
      const peso = pesos[av.fonte];
      if (!peso || peso <= 0) {
        // Fonte não tem peso para este tipo de mídia — pula.
        continue;
      }
      // Z-score: (rating - media) / desvio. Se desvio=0, z=0.
      const desvio = av.desvio_fonte > 0 ? av.desvio_fonte : 1;
      const z = (av.rating - av.media_fonte) / desvio;
      somaPonderada += z * peso;
      somaPesos += peso;
      numFontesValidas++;
      detalhes.push({
        fonte: av.fonte,
        rating_original: av.rating,
        z_score: z,
        peso,
        contribuicao: z * peso,
      });
    }

    if (somaPesos === 0 || numFontesValidas === 0) {
      return {
        score: 50, // neutro quando não há dados
        num_fontes: 0,
        confianca: 0,
        pesos_usados: pesos,
        detalhes: [],
      };
    }

    const zMedio = somaPonderada / somaPesos;
    // Conversão: z=0 → 50, z=+2 → 100, z=-2 → 0
    const rawScore = 50 + zMedio * 25;
    const clippedScore = Math.max(0, Math.min(100, rawScore));

    const confianca = this.calcularConfianca(numFontesValidas, detalhes);

    return {
      score: Math.round(clippedScore * 10) / 10, // 1 casa decimal
      num_fontes: numFontesValidas,
      confianca,
      pesos_usados: pesos,
      detalhes,
    };
  }

  /**
   * MEDIA Score v2 — classificação Crítica vs Público (fix CRIT-02).
   *
   * Cada fonte é classificada pelo registro (`source-registry.ts`):
   *   - Metacritic Metascore / Rotten Tomatoes / IGDB aggregated_rating /
   *     OpenCritic / ComicBookRoundup / RogerEbert  → CRÍTICA
   *   - TMDB / OMDb / IMDb / TVMaze / Trakt / RAWG / Steam / Letterboxd /
   *     livros e mangás → PÚBLICO
   *
   * Normalização: `rating_100 = rating × fator100` (fórmulas lineares da
   * especificação). O z-score é invariante a escala (meio e desvio escalam
   * junto), então os buckets usam a mecânica z-score da v1.
   *
   * Fontes desconhecidas (fora do registro) ou sem peso para o tipo são
   * ignoradas — mesma semântica da v1.
   */
  calcularScoreV2(tipo: string, avaliacoes: FonteAvaliacao[]): MediaScoreV2Result {
    const pesos = PESOS_POR_TIPO_V2[tipo] ?? {
      critica: {} as Record<string, number>,
      publico: {} as Record<string, number>,
    };
    const buckets: Record<ClassificacaoFonte, MediaScoreV2Result["detalhes"]> = {
      critica: [],
      publico: [],
    };
    const pesosUsados: Record<string, number> = {};

    for (const av of avaliacoes) {
      const meta = obterFonte(av.fonte);
      if (!meta) {
        this.logger.warn(`Fonte fora do registro ignorada: ${av.fonte}`);
        continue;
      }
      const peso = pesos[meta.classificacao][meta.id];
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

    const criticosScore = this.scoreDoBucket(buckets.critica);
    const publicoScore = this.scoreDoBucket(buckets.publico);

    const numFontes = buckets.critica.length + buckets.publico.length;
    if (numFontes === 0) {
      return {
        score: 50,
        criticosScore: null,
        publicoScore: null,
        consenso: null,
        num_fontes: 0,
        confianca: 0,
        pesos_usados: pesosUsados,
        detalhes: [],
      };
    }

    let score: number;
    if (criticosScore != null && publicoScore != null) {
      score = Math.round((0.5 * criticosScore + 0.5 * publicoScore) * 10) / 10;
    } else {
      score = criticosScore ?? publicoScore ?? 50;
    }

    const consenso =
      criticosScore != null && publicoScore != null
        ? Math.round(Math.abs(criticosScore - publicoScore) * 10) / 10
        : null;

    const detalhes = [...buckets.critica, ...buckets.publico];
    const confianca = this.calcularConfianca(numFontes, detalhes);

    return {
      score,
      criticosScore,
      publicoScore,
      consenso,
      num_fontes: numFontes,
      confianca,
      pesos_usados: pesosUsados,
      detalhes,
    };
  }

  /** Média ponderada de z-scores do bucket → score 0–100 (1 casa decimal). */
  private scoreDoBucket(bucket: MediaScoreV2Result["detalhes"]): number | null {
    if (bucket.length === 0) return null;
    const somaPonderada = bucket.reduce((acc, d) => acc + d.contribuicao, 0);
    const somaPesos = bucket.reduce((acc, d) => acc + d.peso, 0);
    if (somaPesos === 0) return null;
    const zMedio = somaPonderada / somaPesos;
    const raw = Math.max(0, Math.min(100, 50 + zMedio * 25));
    return Math.round(raw * 10) / 10;
  }

  /**
   * Calcula confiança heurística.
   */
  private calcularConfianca(numFontes: number, detalhes: MediaScoreResult["detalhes"]): number {
    let base: number;
    switch (numFontes) {
      case 0:
        base = 0;
        break;
      case 1:
        base = 0.3;
        break;
      case 2:
        base = 0.6;
        break;
      default:
        base = 0.9;
    }
    // Penaliza se z-scores divergem muito (alta variância entre fontes).
    if (detalhes.length > 1) {
      const zScores = detalhes.map((d) => d.z_score);
      const meanZ = zScores.reduce((a, b) => a + b, 0) / zScores.length;
      const variance = zScores.reduce((acc, z) => acc + (z - meanZ) ** 2, 0) / zScores.length;
      const stdDev = Math.sqrt(variance);
      // stdDev > 1.5 → penaliza 30%. stdDev < 0.5 → sem penalização.
      const penalizacao = stdDev > 1.5 ? 0.3 : stdDev > 0.5 ? 0.15 : 0;
      base = base * (1 - penalizacao);
    }
    return Math.round(base * 100) / 100;
  }

  /**
   * Recalcula e persiste MEDIA Score para uma mídia específica.
   * Chamado por job cron diário (T4.7 — sem Redis, sem fila externa).
   */
  async recalcularEPersistir(midia_id: string): Promise<MediaScoreResult | null> {
    // Busca mídia + avaliações das fontes.
    // Em produção, viria de tabela `midia_avaliacao_fonte` (a criar em
    // tarefa futura). Por ora, se não houver avaliações, retorna null.
    const midia = await this.prisma.midia.findUnique({
      where: { id: midia_id },
      include: { scores: true },
    });
    if (!midia) return null;

    // Placeholder: se já existe score persistido, retorna ele.
    // Tarefa futura: ler avaliações reais das fontes (TMDB, OMDb, etc)
    // e recalcular.
    if (midia.scores.length > 0) {
      const existing = midia.scores[0];
      if (existing) {
        return {
          score: existing.score,
          num_fontes: existing.num_fontes,
          confianca: 0.6, // placeholder
          pesos_usados: existing.pesos_usados as Record<string, number>,
          detalhes: [],
        };
      }
    }

    return null;
  }
}
