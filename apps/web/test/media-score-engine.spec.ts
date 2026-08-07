import { describe, it, expect } from "vitest";
import {
  calculateGlobalScore,
  calculateConsensus,
  calculatePolarization,
  calculatePublisherConsensus,
  aplicarCurvaInflacao,
  calculateConfidenceScore,
  confidenceLevel,
  aggregateAudienceScore,
  filterOutliers,
  derivarScores,
  CONFIG_V3,
  ALGORITHM_VERSION,
} from "@/lib/media-score-engine";
import type { SourceRating } from "@/lib/types";

/** CRIT-02 — Zelda BotW: fontes reais da especificação (jogo). */
const ZELDA_SOURCES: SourceRating[] = [
  { source: "metacritic", score: 97, maxScore: 100 },
  { source: "igdb", score: 92, maxScore: 100 },
  { source: "igdb_publico", score: 85, maxScore: 100 },
  { source: "steam", score: 0.9, maxScore: 1 },
];

describe("Configuração v3 por mídia (MET-03)", () => {
  it("pesos e thresholds da metodologia", () => {
    expect(CONFIG_V3.movie.pesos).toEqual({ critica: 0.4, publico: 0.4, consenso: 0.2 });
    expect(CONFIG_V3.movie.m).toBe(60);
    expect(CONFIG_V3.series.m).toBe(60);
    expect(CONFIG_V3.game.pesos).toEqual({ critica: 0.55, publico: 0.35, consenso: 0.1 });
    expect(CONFIG_V3.game.m).toBe(1015);
    expect(CONFIG_V3.game.escala).toBe("0-100");
    expect(CONFIG_V3.book.pesos).toEqual({ critica: 0.25, publico: 0.55, consenso: 0.2 });
    expect(CONFIG_V3.book.m).toBe(100);
    expect(CONFIG_V3.book.inflacao).toBe(true);
    expect(CONFIG_V3.comic.pesos).toEqual({ critica: 0, publico: 0.6, consenso: 0.4 });
    expect(CONFIG_V3.comic.m).toBe(250);
    expect(CONFIG_V3.comic.modoConsenso).toBe("editoras");
    expect(CONFIG_V3.anime.pesos).toEqual({ critica: 0.45, publico: 0.45, consenso: 0.1 });
    expect(CONFIG_V3.anime.m).toBe(500);
    expect(CONFIG_V3.anime.modoConsenso).toBe("polarizacao");
  });
});

describe("Fórmula v3 — estimador Bayesiano", () => {
  it("filme: MEDIA = (v/(v+m))·S + (m/(v+m))·C com S ponderado", () => {
    // crit 8, pub 6 → I = 8.0 → S = 0.4·8 + 0.4·6 + 0.2·8 = 7.2
    // v=1000, m=60, C=7 → 7.19
    const r = calculateGlobalScore({
      criticosScore: 8,
      publicoScore: 6,
      votos: 1000,
      mediaType: "movie",
    });
    expect(r).toBe(7.2);
  });

  it("obra nova (v=0) usa S direto — pull Bayesiano exige votos reais", () => {
    expect(
      calculateGlobalScore({ criticosScore: 8, publicoScore: 6, votos: 0, mediaType: "movie" }),
    ).toBe(7.2); // S = 7.2, sem pull
    expect(
      calculateGlobalScore({
        criticosScore: null,
        publicoScore: null,
        votos: 0,
        mediaType: "movie",
      }),
    ).toBe(7); // sem nenhum componente → prior C
  });

  it("v alto reflete fielmente as fontes (S domina o pull)", () => {
    const r = calculateGlobalScore({
      criticosScore: 9,
      publicoScore: 9,
      votos: 100000,
      mediaType: "movie",
    });
    // I=10 → S = 0.4·9 + 0.4·9 + 0.2·10 = 9.2 → 9.2 (C quase não puxa)
    expect(r).toBe(9.2);
  });

  it("consenso realimenta o score: polarização crítica/público penaliza", () => {
    const consenso = calculateGlobalScore({
      criticosScore: 10,
      publicoScore: 10,
      votos: 1000,
      mediaType: "movie",
    });
    const polarizado = calculateGlobalScore({
      criticosScore: 10,
      publicoScore: 0,
      votos: 1000,
      mediaType: "movie",
    });
    // 10/10: I=10 → S=10 → 9.8 | 10/0: I=0 → S=4.0 → 4.2
    expect(consenso).toBe(9.8);
    expect(polarizado).toBe(4.2);
  });

  it("game: escala 0–100 (×10) com m=1015", () => {
    const r = calculateGlobalScore({
      criticosScore: 8,
      publicoScore: 6,
      votos: 5000,
      mediaType: "game",
    });
    // I=8 → S = 0.55·8 + 0.35·6 + 0.1·8 = 7.3
    // (5000/6015)·7.3 + (1015/6015)·7 = 7.249 ×10 = 72.5
    expect(r).toBe(72.5);
  });

  it("livro: curva de inflação ativa quando C > 8.5", () => {
    const inflado = calculateGlobalScore({
      criticosScore: 8.4,
      publicoScore: null,
      votos: 500,
      mediaType: "book",
      mediaCatalogo: 8.8,
    });
    // S=8.4 → curva → 7.2 → (500/600)·7.2 + (100/600)·8.8 = 7.5
    expect(inflado).toBe(7.5);

    const normal = calculateGlobalScore({
      criticosScore: 8.4,
      publicoScore: null,
      votos: 500,
      mediaType: "book",
      mediaCatalogo: 8.4,
    });
    expect(normal).toBe(8.4);
  });

  it("anime: índice de polarização penaliza distribuição bimodal", () => {
    const bimodal = calculateGlobalScore({
      criticosScore: 9,
      publicoScore: 7,
      votos: 10000,
      mediaType: "anime",
      distribuicaoNotas: [
        { nota: 1, votos: 400 },
        { nota: 10, votos: 600 },
      ],
    });
    const centrada = calculateGlobalScore({
      criticosScore: 9,
      publicoScore: 7,
      votos: 10000,
      mediaType: "anime",
      distribuicaoNotas: [
        { nota: 5, votos: 500 },
        { nota: 6, votos: 500 },
      ],
    });
    expect(bimodal).toBe(7.2); // I=0 → S=7.2
    expect(centrada).toBe(8.1); // I=10 → S=8.2 → 8.14
  });

  it("HQ: consenso entre editoras substitui a crítica", () => {
    const consensoAlto = calculateGlobalScore({
      criticosScore: null,
      publicoScore: 8,
      votos: 500,
      mediaType: "comic",
      mediaPorEditora: [
        { editora: "Marvel", media: 8 },
        { editora: "DC", media: 8 },
        { editora: "Image", media: 8 },
      ],
    });
    const consensoBaixo = calculateGlobalScore({
      criticosScore: null,
      publicoScore: 8,
      votos: 500,
      mediaType: "comic",
      mediaPorEditora: [
        { editora: "Marvel", media: 8 },
        { editora: "DC", media: 5 },
      ],
    });
    // I=10 → S = 0.6·8 + 0.4·10 = 8.8 → 8.2 | I=4 → S=6.4 → 6.6
    expect(consensoAlto).toBe(8.2);
    expect(consensoBaixo).toBe(6.6);
  });
});

describe("Índice de Consenso I (v3 — realimenta o score)", () => {
  it("I = 1 − |crítica − público| em 0–10", () => {
    expect(calculateConsensus(8, 6)).toBe(8);
    expect(calculateConsensus(8, 8)).toBe(10);
    expect(calculateConsensus(10, 0)).toBe(0);
  });

  it("I = null quando só um score existe", () => {
    expect(calculateConsensus(null, 8)).toBeNull();
    expect(calculateConsensus(7.5, null)).toBeNull();
  });
});

describe("Índice de Polarização (mangás/LN)", () => {
  it("distribuição bimodal (10 e 1) → I = 0", () => {
    expect(
      calculatePolarization([
        { nota: 1, votos: 400 },
        { nota: 10, votos: 600 },
      ]),
    ).toBe(0);
  });

  it("distribuição centrada → I = 10", () => {
    expect(
      calculatePolarization([
        { nota: 5, votos: 500 },
        { nota: 6, votos: 500 },
      ]),
    ).toBe(10);
  });

  it("60% extremas → I = 2.5", () => {
    expect(
      calculatePolarization([
        { nota: 1, votos: 100 },
        { nota: 5, votos: 400 },
        { nota: 10, votos: 500 },
      ]),
    ).toBe(2.5);
  });

  it("sem votos → null", () => {
    expect(calculatePolarization([])).toBeNull();
  });
});

describe("Índice de Consenso de Editoras (HQs)", () => {
  it("leitores de editoras diferentes concordam → I alto", () => {
    expect(
      calculatePublisherConsensus([
        { editora: "Marvel", media: 8 },
        { editora: "DC", media: 8 },
        { editora: "Image", media: 8 },
      ]),
    ).toBe(10);
  });

  it("divergência entre editoras penaliza", () => {
    expect(
      calculatePublisherConsensus([
        { editora: "Marvel", media: 8 },
        { editora: "DC", media: 5 },
      ]),
    ).toBe(4);
  });

  it("menos de 2 editoras → null", () => {
    expect(calculatePublisherConsensus([{ editora: "Marvel", media: 8 }])).toBeNull();
  });
});

describe("Correção de Inflação de livros", () => {
  it("C > 8.5: 8 → 7 e 9 → 7.5 (curva S' = min(S, 0.5S + 3))", () => {
    expect(aplicarCurvaInflacao(8, 8.8)).toBe(7);
    expect(aplicarCurvaInflacao(9, 8.8)).toBe(7.5);
    expect(aplicarCurvaInflacao(10, 8.8)).toBe(8);
  });

  it("C ≤ 8.5: curva inativa", () => {
    expect(aplicarCurvaInflacao(8, 8.4)).toBe(8);
    expect(aplicarCurvaInflacao(9, 8.4)).toBe(9);
  });
});

describe("Confidence Score v3 (0–100)", () => {
  it("CS = Cobertura·40 + Volume·30 + Concordância·20 + Atualização·10", () => {
    const cs = calculateConfidenceScore(500, 2, 1.5, 90);
    // 40×0.4 + 30×0.5 + 20×0.4 + 10×0.6 = 16 + 15 + 8 + 6 = 45
    expect(cs).toBe(45);
  });

  it("concordância sem 2+ fontes = 0 (espelho da API)", () => {
    // 1 fonte, 50 votos, threshold 60: 8 + 25 + 0 + 10 = 43
    expect(calculateConfidenceScore(50, 1, 0, 0, 60)).toBe(43);
  });

  it("clamp entre 0 e 100", () => {
    expect(calculateConfidenceScore(10000, 10, 0, 10)).toBe(100);
    expect(calculateConfidenceScore(0, 0, 10, null)).toBe(0);
    expect(calculateConfidenceScore(0, 0, 10, 1000)).toBe(0);
  });

  it("volume satura no threshold m da mídia", () => {
    const game = calculateConfidenceScore(1015, 5, 0, 0, 1015);
    expect(game).toBe(100);
    const movie = calculateConfidenceScore(60, 5, 0, 0, 60);
    expect(movie).toBe(100);
  });

  it("confidenceLevel: ≥70 alta (verde), ≥40 média (amarelo), <40 baixa (cinza)", () => {
    expect(confidenceLevel(70)).toBe("high");
    expect(confidenceLevel(69)).toBe("medium");
    expect(confidenceLevel(40)).toBe("medium");
    expect(confidenceLevel(39)).toBe("low");
  });
});

describe("Agregação multi-fonte §3.3b", () => {
  it("weight = log(1 + votos)", () => {
    const result = aggregateAudienceScore([
      { value: 8, votes: 500 },
      { value: 7, votes: 100 },
    ]);
    expect(result).toBeGreaterThan(7.5);
    expect(result).toBeLessThan(8);
  });
});

describe("Outlier detection §3.3", () => {
  it("exclui valores com desvio > 3.0 da mediana", () => {
    const result = filterOutliers([7, 8, 7.5, 15, 8.5], 3.0);
    expect(result[3]?.excluded).toBe(true); // 15 é outlier
    expect(result[0]?.excluded).toBe(false);
  });
});

describe("algorithmVersion", () => {
  it("é media-score-v3.0", () => {
    expect(ALGORITHM_VERSION).toBe("media-score-v3.0");
  });
});

describe("derivarScores — Crítica vs Público (CRIT-02)", () => {
  it("Zelda BotW: separa crítica (metacritic 97 + igdb 92) do público", () => {
    const r = derivarScores(ZELDA_SOURCES, "game");
    // crítica: z = (97-70)/15=1.8 (peso 0.2) + (92-70)/15=1.4667 (peso 0.5)
    // zMedio = (0.36+0.7333)/0.7 = 1.5619 → 89.0
    expect(r.criticosScore).toBe(89);
    // público: igdb_publico z=1.0 (0.35) + steam z=0.75 (0.25)
    // zMedio = (0.35 + 0.1875)/0.6 = 0.8958 → 72.4
    expect(r.publicoScore).toBe(72.4);
    expect(r.consenso).toBe(16.6);
    expect(r.detalhes).toHaveLength(4);
    const metacritic = r.detalhes.find((d) => d.fonte === "metacritic");
    expect(metacritic?.classificacao).toBe("critica");
    expect(metacritic?.rating_100).toBe(97);
    const steam = r.detalhes.find((d) => d.fonte === "steam");
    expect(steam?.classificacao).toBe("publico");
  });

  it("só crítica quando o mock antigo não tem fontes públicas", () => {
    const r = derivarScores(
      [
        { source: "metacritic", score: 90, maxScore: 100 },
        { source: "rottentomatoes", score: 80, maxScore: 100 },
      ],
      "movie",
    );
    expect(r.criticosScore).toBe(76.7);
    expect(r.publicoScore).toBeNull();
    expect(r.consenso).toBeNull();
  });

  it("fontes fora do registro são ignoradas", () => {
    const r = derivarScores(
      [{ source: "fonte_inventada" as SourceRating["source"], score: 99, maxScore: 100 }],
      "movie",
    );
    expect(r.detalhes).toEqual([]);
    expect(r.criticosScore).toBeNull();
    expect(r.publicoScore).toBeNull();
  });

  it("normaliza escalas diferentes para 0–100", () => {
    const r = derivarScores([{ source: "imdb", score: 8.0, maxScore: 10 }], "movie");
    const imdb = r.detalhes[0];
    expect(imdb?.rating_100).toBe(80);
    expect(imdb?.classificacao).toBe("publico");
  });

  it("anime usa pesos do bucket público (jikan/anilist)", () => {
    const r = derivarScores(
      [
        { source: "jikan", score: 9.0, maxScore: 10 },
        { source: "anilist", score: 90, maxScore: 100 },
      ],
      "anime",
    );
    expect(r.publicoScore).not.toBeNull();
    expect(r.criticosScore).toBeNull();
  });
});

describe("P1-1 — Calibração Bayesiana (auditoria de reverificação)", () => {
  it("o pull do prior é proporcional ao volume — não domina independente de v", () => {
    // S = 9.2 (crit 9/pub 9/I 10), C = 7, movie m = 60.
    const base = { criticosScore: 9, publicoScore: 9, mediaType: "movie" } as const;
    const vPoucos = calculateGlobalScore({ ...base, votos: 10 });
    const vMil = calculateGlobalScore({ ...base, votos: 1000 });
    const vMilhao = calculateGlobalScore({ ...base, votos: 1_000_000 });

    // v=10 → pull m/(v+m) ≈ 86% → perto de C (7)
    expect(vPoucos).toBeLessThan(7.5);
    // v=1000 → pull ≈ 5.7% → perto de S (9.2)
    expect(vMil).toBeGreaterThan(9);
    // v=1M → pull ≈ 0 → S exato
    expect(vMilhao).toBe(9.2);
    // convergência monotônica e proporcional ao volume real
    expect(vPoucos).toBeLessThan(vMil);
    expect(vMil).toBeLessThan(vMilhao);
  });

  it("diferença ~10,5 pts vs média simples é o rescale z-score (50 + z·25), não o prior", () => {
    // Uma única fonte 85/100 → rating100=85 → z=(85−70)/15=1 → raw=50+25=75.
    // O offset (85 → 75 ≈ 10 pts) é CONSTANTE com o rating, independente de
    // votos — explica o ~10,5–10,75 observado entre média simples e score
    // agregado em títulos com volumes diferentes (mesmo rating → mesmo offset).
    const movie = derivarScores([{ source: "metacritic", score: 85, maxScore: 100 }], "movie");
    const series = derivarScores([{ source: "metacritic", score: 85, maxScore: 100 }], "series");
    expect(movie.criticosScore).toBe(75);
    expect(series.criticosScore).toBe(75);

    // Com v alto, o score agregado S=75 NÃO é puxado pelo prior (C não muda o offset).
    const agregado = calculateGlobalScore({
      criticosScore: 7.5,
      publicoScore: null,
      votos: 5000,
      mediaType: "movie",
    });
    expect(agregado).toBeGreaterThan(7.4);
    expect(agregado).toBeLessThan(7.6);
  });
});
