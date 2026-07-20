import { Injectable, Logger } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- PrismaService precisa ser import como valor para NestJS DI
import { PrismaService } from "../../prisma/prisma.service.js";

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
