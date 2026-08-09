import type {
  CatalogFilters,
  CatalogResponse,
  Confidence,
  Media,
  MediaSearchResult,
  MediaType,
  PricingPlan,
  SourceName,
  SourceRating,
  UserProfile,
} from "./types";
import { SEED_MEDIA } from "./seed-data";

/**
 * Camada de dados do frontend.
 *
 * Dados reais vêm da API MEDIA Rate (proxy same-origin /api/* → Railway,
 * ver next.config.ts rewrites). Se a API falhar (rede, 5xx) ou não tiver o
 * item, cai para os mocks locais — o site nunca quebra por indisponibilidade
 * do backend.
 */

const API_TIMEOUT_MS = 7000;
const API_BASE = process.env.API_PROXY_TARGET ?? "https://media-rate-production.up.railway.app";

// ===========================================================================
// Tipos do payload da API (espelho dos endpoints públicos)
// ===========================================================================

interface ApiScoreDetalhe {
  fonte: string;
  classificacao: "critica" | "publico";
  rating_original: number;
  rating_100: number;
  z_score: number;
  peso: number;
  contribuicao: number;
}

interface ApiScore {
  score: number;
  criticosScore: number | null;
  publicoScore: number | null;
  consenso: number | null;
  indiceConsenso?: number | null;
  votosTotal?: number | null;
  num_fontes: number;
  confianca: number;
  calculado_em: string;
  detalhes?: ApiScoreDetalhe[];
}

interface ApiFonte {
  fonte: string;
  url: string | null;
}

interface ApiMidiaSlug {
  id: string;
  slug: string;
  titulo: string;
  titulo_original: string | null;
  tipo: string;
  sinopse: string | null;
  ano_lancamento: number | null;
  imagem_url: string | null;
  classificacao_indicativa: string | null;
  pais_origem: string | null;
  duracao_minutos: number | null;
  generos: string[];
  franquias: {
    id: string;
    nome: string;
    slug: string;
    itens: {
      midia_id: string;
      titulo: string;
      tipo: string;
      ano_lancamento: number | null;
      imagem_url: string | null;
      score: number | null;
      ordem_lancamento: number;
      ordem_cronologica: number | null;
    }[];
  }[];
  streamings: string[];
  score: ApiScore | null;
  fontes: ApiFonte[];
}

interface ApiMidiaList {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
  scores?: { score: number }[];
}

interface ApiSearchItem {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  sinopse: string | null;
  imagem_url: string | null;
  slug: string;
}

// ===========================================================================
// Fetch com timeout e falha graciosa
// ===========================================================================

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    // Cliente: same-origin (rewrite /api/* → Railway) — CSP connect-src 'self'.
    // Servidor: direto no Railway (sem o hop do rewrite, instável no fetch
    // RSC) — também funciona no build/export, que não tem origin própria.
    // Os callers passam o caminho completo "/api/v1/..." — no cliente o
    // prefixo "/api" É o rewrite, então o caminho é normalizado para não
    // virar "/api/api/v1/..." (404 no proxy).
    const isClient = typeof window !== "undefined";
    const cleanPath = path.startsWith("/api/") ? path.slice(4) : path;
    const url = isClient ? `/api${cleanPath}` : `${API_BASE}${path}`;
    const controller = isClient ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), API_TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, {
        ...(controller ? { signal: controller.signal } : {}),
        ...(isClient ? {} : { next: { revalidate: 300 } }),
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return (await res.json()) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    // Rede/5xx/timeout → null: o caller decide o fallback.
    return null;
  }
}

// ===========================================================================
// Mapeamento API → tipo Media do frontend
// ===========================================================================

function mapTipo(tipo: string): MediaType {
  switch (tipo) {
    case "FILME":
      return "movie";
    case "SERIE":
      return "series";
    case "GAME":
      return "game";
    case "LIVRO":
      return "book";
    case "HQ":
    case "COMIC":
      return "comic";
    case "MANGA":
      return "manga";
    case "ANIME":
      // D-233/T231: ANIME ficou deprecated no banco; animação japonesa
      // classifica como série (Berserk 1997, Jujutsu Kaisen, etc.).
      return "series";
    default:
      return "movie";
  }
}

/**
 * Confidence Score v3 (0–100): CS ≥ 70 Alta (verde), ≥ 40 Média (amarelo),
 * < 40 Baixa (cinza). Confianças legadas 0–1 (pré-v3) caem em "low" até o
 * job diário recalcular com o CS v3.
 */
function mapConfidence(c: number | null | undefined): Confidence {
  if (c == null) return "low";
  if (c >= 70) return "high";
  if (c >= 40) return "medium";
  return "low";
}

const TIPOS_PREPARACAO: ReadonlySet<MediaType> = new Set(["book", "comic", "manga"]);

/** Mapeia o enum ClassInd da API (DEZ/DOZE/...) para a exibição (10/12/...). */
function mapClassificacaoIndicativa(value: string | null | undefined): string | null {
  switch (value) {
    case "L":
      return "L";
    case "DEZ":
      return "10";
    case "DOZE":
      return "12";
    case "CATORZE":
      return "14";
    case "DEZESSEIS":
      return "16";
    case "DEZOITO":
      return "18";
    default:
      return value ?? null;
  }
}

function mediaFromApi(m: ApiMidiaSlug, fallbackSlug?: string): Media {
  const urlsByFonte = new Map(m.fontes.map((f) => [f.fonte, f.url]));
  const sources: SourceRating[] =
    m.score?.detalhes?.map((d) => {
      const url = urlsByFonte.get(d.fonte);
      return {
        source: d.fonte as SourceName,
        score: d.rating_100,
        maxScore: 100,
        ...(url ? { url } : {}),
      };
    }) ?? [];

  const confidence = mapConfidence(m.score?.confianca);
  const emPreparacao = TIPOS_PREPARACAO.has(mapTipo(m.tipo));

  return {
    id: m.id,
    slug: fallbackSlug ?? m.slug,
    title: m.titulo,
    type: mapTipo(m.tipo),
    year: m.ano_lancamento ?? new Date().getFullYear(),
    genres: m.generos,
    classificacaoIndicativa: mapClassificacaoIndicativa(m.classificacao_indicativa),
    paisOrigem: m.pais_origem ?? null,
    franquias: (m.franquias ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      slug: f.slug,
      itens: f.itens.map((i) => ({
        midiaId: i.midia_id,
        titulo: i.titulo,
        tipo: mapTipo(i.tipo),
        ano: i.ano_lancamento,
        imagemUrl: i.imagem_url,
        score: i.score,
        ordemLancamento: i.ordem_lancamento,
        ordemCronologica: i.ordem_cronologica,
      })),
    })),
    duration: m.duracao_minutos != null ? `${m.duracao_minutos} min` : undefined,
    synopsis: m.sinopse ?? "",
    posterUrl: m.imagem_url,
    backdropUrl: null,
    score: m.score
      ? {
          consolidated: m.score.score,
          confidence,
          sources,
          // T228: número exibido = lista exibida — a explanation deriva da
          // lista REAL de fontes (detalhes), nunca de num_fontes solto que
          // possa divergir (ex.: seed antigo gravava detalhes não-array).
          explanation: emPreparacao
            ? "Tipo em preparação — fontes ainda não ativadas."
            : sources.length > 0
              ? `MEDIA Score™ consolidado a partir de ${sources.length} ${
                  sources.length === 1 ? "fonte" : "fontes"
                }.`
              : "Sem avaliações suficientes das fontes ainda.",
          updatedAt: m.score.calculado_em,
          criticsScore: m.score.criticosScore,
          audienceScore: m.score.publicoScore,
          consensus: m.score.consenso,
          indiceConsenso: m.score.indiceConsenso ?? null,
          votosTotal: m.score.votosTotal ?? 0,
          sampleSize: sources.length > 0 ? sources.length : m.score.num_fontes,
          algorithmVersion: "v3",
          confidenceScore: m.score.confianca,
        }
      : null,
    cast: [],
    crew: [],
    reviews: [],
    streaming: m.streamings.map((nome) => ({ name: nome })),
  };
}

// ===========================================================================
// Mocks (fallback) — inalterados
// ===========================================================================

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 200));
}
let errorSimulated = false;
export function toggleApiError() {
  errorSimulated = !errorSimulated;
}
function maybeThrow() {
  if (errorSimulated) throw new Error("Simulated API error");
}

function game(
  id: string,
  slug: string,
  title: string,
  year: number,
  genres: string[],
  synopsis: string,
  scoreC: number,
  conf: "high" | "medium" | "low",
  platforms: string[],
  posterUrl: string | null = null,
  sources: SourceRating[] | null = null,
): Media {
  return {
    id,
    slug,
    title,
    type: "game",
    year,
    genres,
    synopsis,
    posterUrl,
    backdropUrl: null,
    score: {
      consolidated: scoreC,
      confidence: conf,
      sources: sources ?? [
        { source: "tmdb", score: scoreC, maxScore: 100 },
        { source: "igdb", score: Math.round(scoreC * 0.95), maxScore: 100 },
      ],
      explanation: conf === "high" ? "Alto consenso da crítica." : "Avaliações mistas da crítica.",
    },
    cast: [{ name: "Desenvolvedor", role: "Desenvolvimento", photoUrl: null }],
    crew: [{ name: "Disponível em breve", role: "Desenvolvedora" }],
    reviews: [],
    streaming: platforms.map((p) => ({ name: p })),
  };
}

function anime(
  id: string,
  slug: string,
  title: string,
  year: number,
  genres: string[],
  synopsis: string,
  scoreC: number,
  poster: string | null,
  backdrop: string | null,
): Media {
  return {
    id,
    slug,
    title,
    // D-233/T231: animação japonesa (anime) NÃO é categoria — classifica
    // como SÉRIE. Mocks de animes (Jujutsu Kaisen, Frieren, etc.) seguem
    // a regra de domínio; mangá é categoria própria ("manga").
    type: "series",
    year,
    genres,
    synopsis: synopsis.slice(0, 200),
    posterUrl: poster ? `https://image.tmdb.org/t/p/w500${poster}` : null,
    backdropUrl: backdrop ? `https://image.tmdb.org/t/p/w1280${backdrop}` : null,
    score: {
      consolidated: Math.round(scoreC * 10),
      confidence: scoreC > 8 ? "high" : scoreC > 7 ? "medium" : "low",
      sources: [
        { source: "imdb", score: scoreC, maxScore: 10 },
        { source: "tmdb", score: Math.round(scoreC * 10) / 10, maxScore: 10 },
      ],
      explanation: scoreC > 8 ? "Avaliações muito positivas." : "Avaliações positivas.",
    },
    cast: [],
    crew: [],
    reviews: [],
    streaming: [{ name: "Crunchyroll" }, { name: "Netflix" }],
  };
}

function book(
  id: string,
  slug: string,
  title: string,
  year: number,
  genres: string[],
  synopsis: string,
  scoreC: number,
  author: string,
): Media {
  return {
    id,
    slug,
    title,
    type: "book",
    year,
    genres,
    synopsis,
    posterUrl: null,
    backdropUrl: null,
    score: {
      consolidated: scoreC,
      confidence: "medium",
      sources: [{ source: "openlibrary", score: Math.round(scoreC / 20), maxScore: 5 }],
      explanation: "Baseado em avaliações de leitores.",
    },
    cast: [],
    crew: [{ name: author, role: "Autor" }],
    reviews: [],
    streaming: [{ name: "Amazon Books" }],
  };
}

function comic(
  id: string,
  slug: string,
  title: string,
  year: number,
  genres: string[],
  synopsis: string,
  scoreC: number,
  publisher: string,
): Media {
  return {
    id,
    slug,
    title,
    type: "comic",
    year,
    genres,
    synopsis,
    posterUrl: null,
    backdropUrl: null,
    score: {
      consolidated: scoreC,
      confidence: "medium",
      sources: [{ source: "tmdb", score: Math.round(scoreC / 10), maxScore: 10 }],
      explanation: "Baseado em avaliações de fãs.",
    },
    cast: [],
    crew: [{ name: publisher, role: "Editora" }],
    reviews: [],
    streaming: [{ name: "Comixology" }],
  };
}

const MANUAL: Media[] = [
  anime(
    "a1",
    "jujutsu-kaisen",
    "Jujutsu Kaisen",
    2020,
    ["Ação", "Fantasia", "Sobrenatural"],
    "Yuji Itadori engole um dedo amaldiçoado e se torna hospedeiro de Sukuna, o Rei das Maldições, entrando no mundo da feitiçaria.",
    8.6,
    "/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg",
    "/m0bV3qBi3uB1DpV2Rx97dW5q0qe.jpg",
  ),
  anime(
    "a2",
    "frieren",
    "Frieren e a Jornada para o Além",
    2023,
    ["Fantasia", "Aventura", "Drama"],
    "Após derrotar o Rei Demônio, a elfa Frieren embarca em uma jornada para entender o significado da vida e das conexões humanas.",
    8.8,
    null,
    "/2ECx2GvAz5Qx0SENYnDrYBVsaAR.jpg",
  ),
  anime(
    "a3",
    "hunter-x-hunter",
    "Hunter x Hunter",
    2011,
    ["Ação", "Aventura", "Fantasia"],
    "Gon Freecss descobre que seu pai é um Hunter lendário e decide seguir seus passos, enfrentando desafios e fazendo aliados.",
    8.7,
    null,
    "/m3xI0Qri29GjhE2oHaNV3G39cNA.jpg",
  ),
  anime(
    "a4",
    "bleach",
    "Bleach",
    2004,
    ["Ação", "Sobrenatural", "Fantasia"],
    "Ichigo Kurosaki ganha poderes de Shinigami e deve proteger os vivos de espíritos malignos enquanto navega pela Soul Society.",
    8.4,
    null,
    "/dYWdZHCr3ZDEgx4MHjlST1NslR8.jpg",
  ),
  anime(
    "a5",
    "re-zero",
    "Re:ZERO - Starting Life in Another World",
    2016,
    ["Fantasia", "Drama", "Psicológico"],
    "Subaru Natsuki é transportado para um mundo de fantasia e descobre que revive após a morte, enfrentando ciclos de sofrimento.",
    8.0,
    "/5qcUG0pOQ3VKIlJC23UXUMKqLYK.jpg",
    "/7ON4wL5n1hQlq0gGg9LU5A0E5BJ.jpg",
  ),
  anime(
    "a6",
    "detetive-conan",
    "Detetive Conan",
    1996,
    ["Mistério", "Crime", "Suspense"],
    "Transformado em criança, o detetive adolescente Shinichi Kudo resolve crimes sob o pseudônimo Conan Edogawa.",
    8.0,
    "/gW14n6xxONXrya8CIDhRe5Ada7U.jpg",
    "/z67lpMtm8YGykJO4p89meuNMvj8.jpg",
  ),
  anime(
    "a7",
    "pokemon",
    "Pokémon",
    1997,
    ["Aventura", "Fantasia", "Ação"],
    "Ash Ketchum viaja pelo mundo capturando e treinando Pokémon para se tornar um Mestre Pokémon.",
    8.0,
    "/i1aGxHlSvRolhdUjx1BYwPvURBF.jpg",
    "/wz0HujkLBEYwFXnqLx8nFQ8rBYX.jpg",
  ),
  anime(
    "a8",
    "mushoku-tensei",
    "Mushoku Tensei: Jobless Reincarnation",
    2021,
    ["Fantasia", "Aventura", "Drama"],
    "Reencarnado em um mundo de magia, um NEET de 34 anos ganha uma segunda chance e se torna Rudy, um prodígio mágico.",
    8.5,
    "/sviEqFIPJW5gFtuYy8XyE0Uscid.jpg",
    "/j9fRIimor0AMFJR9kjZubXcABzZ.jpg",
  ),
  anime(
    "a9",
    "doraemon",
    "Doraemon: O Gato do Futuro",
    2005,
    ["Comédia", "Ficção Científica", "Aventura"],
    "Doraemon, um gato robótico do século XXII, viaja ao passado para ajudar Nobita com seus gadgets futuristas.",
    8.1,
    "/jzd80ryL0kTBgvXVLeh01cJdNFv.jpg",
    "/c2oiRa7V3bQzof4wVGzLXtWJ5QU.jpg",
  ),
  anime(
    "a10",
    "one-piece",
    "One Piece",
    1999,
    ["Ação", "Aventura", "Fantasia", "Comédia"],
    "Monkey D. Luffy reúne uma tripulação pirata em busca do tesouro One Piece para se tornar o Rei dos Piratas.",
    8.7,
    null,
    "/6GCOlQyjyyRjvYJxQ0GQ0Rg4jBR.jpg",
  ),

  game(
    "g1",
    "zelda-breath-of-the-wild",
    "The Legend of Zelda: Breath of the Wild",
    2017,
    ["Action", "Adventure", "RPG"],
    "Link desperta de um sono centenário em Hyrule para derrotar Calamity Ganon.",
    97,
    "high",
    ["Nintendo Switch"],
    "https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg",
    [
      { source: "metacritic", score: 97, maxScore: 100 },
      { source: "igdb", score: 92, maxScore: 100 },
      { source: "igdb_publico", score: 85, maxScore: 100 },
      { source: "opencritic", score: 94, maxScore: 100 },
      { source: "steam", score: 0.9, maxScore: 1 },
    ],
  ),
  game(
    "g2",
    "elden-ring",
    "Elden Ring",
    2022,
    ["Action", "RPG", "Fantasy", "Open World"],
    "Nas Terras Intermédias, um guerreiro busca restaurar o Elden Ring e se tornar Elden Lord.",
    96,
    "high",
    ["PC", "PlayStation", "Xbox"],
    "https://steamcdn-a.akamaihd.net/steam/apps/1245620/header.jpg",
  ),
  game(
    "g3",
    "baldurs-gate-3",
    "Baldur's Gate 3",
    2023,
    ["RPG", "Fantasy", "Strategy"],
    "Um jogo de RPG baseado em Dungeons & Dragons com narrativa ramificada e combate tático.",
    96,
    "high",
    ["PC", "PlayStation", "Xbox"],
    "https://steamcdn-a.akamaihd.net/steam/apps/1086940/header.jpg",
  ),
  game(
    "g4",
    "god-of-war-ragnarok",
    "God of War Ragnarök",
    2022,
    ["Action", "Adventure", "Mythology"],
    "Kratos e Atreus enfrentam o Ragnarök nos Nove Reinos da mitologia nórdica.",
    94,
    "high",
    ["PlayStation", "PC"],
    "https://steamcdn-a.akamaihd.net/steam/apps/2322010/header.jpg",
  ),
  game(
    "g5",
    "red-dead-redemption-2",
    "Red Dead Redemption 2",
    2018,
    ["Action", "Adventure", "Western", "Open World"],
    "Arthur Morgan e a gangue Van der Linde lutam pela sobrevivência no oeste americano.",
    97,
    "high",
    ["PC", "PlayStation", "Xbox"],
    "https://steamcdn-a.akamaihd.net/steam/apps/1174180/header.jpg",
  ),
  game(
    "g6",
    "the-witcher-3",
    "The Witcher 3: Wild Hunt",
    2015,
    ["Action", "RPG", "Fantasy", "Open World"],
    "Geralt de Rívia busca sua filha adotiva Ciri enquanto enfrenta a invasão da Caçada Selvagem.",
    93,
    "high",
    ["PC", "PlayStation", "Xbox", "Nintendo Switch"],
    "https://steamcdn-a.akamaihd.net/steam/apps/292030/header.jpg",
  ),
  game(
    "g7",
    "minecraft",
    "Minecraft",
    2011,
    ["Sandbox", "Survival", "Adventure", "Creative"],
    "Construa, explore e sobreviva em um mundo infinito feito de blocos.",
    82,
    "medium",
    ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"],
    "https://upload.wikimedia.org/wikipedia/en/5/51/Minecraft_cover.png",
  ),
  game(
    "g8",
    "cyberpunk-2077",
    "Cyberpunk 2077",
    2020,
    ["Action", "RPG", "Sci-Fi", "Open World"],
    "Em Night City, um mercenário busca um implante que concede a imortalidade.",
    86,
    "medium",
    ["PC", "PlayStation", "Xbox"],
    "https://steamcdn-a.akamaihd.net/steam/apps/1091500/header.jpg",
  ),
  book(
    "b1",
    "1984",
    "1984",
    1949,
    ["Ficção Científica", "Distopia", "Clássico"],
    "Em uma sociedade totalitária, Winston Smith luta para manter sua humanidade sob o olhar do Grande Irmão.",
    89,
    "George Orwell",
  ),
  book(
    "b2",
    "duna",
    "Duna",
    1965,
    ["Ficção Científica", "Aventura", "Épico", "Clássico"],
    "Paul Atreides deve sobreviver no planeta deserto Arrakis e abraçar seu destino como Kwisatz Haderach.",
    92,
    "Frank Herbert",
  ),
  book(
    "b3",
    "neuromancer",
    "Neuromancer",
    1984,
    ["Ficção Científica", "Cyberpunk", "Clássico"],
    "Case, um cowboy do ciberespaço, é contratado para um trabalho que pode custar mais do que sua vida.",
    87,
    "William Gibson",
  ),
  book(
    "b4",
    "cem-anos-de-solidao",
    "Cem Anos de Solidão",
    1967,
    ["Realismo Mágico", "Literatura", "Clássico", "Drama"],
    "A saga da família Buendía em Macondo, entrelaçando realismo mágico com a história latino-americana.",
    95,
    "Gabriel García Márquez",
  ),
  book(
    "b5",
    "o-hobbit",
    "O Hobbit",
    1937,
    ["Fantasia", "Aventura", "Clássico"],
    "Bilbo Bolseiro embarca em uma jornada épica com 13 anões para recuperar o tesouro de Erebor.",
    88,
    "J.R.R. Tolkien",
  ),
  book(
    "b6",
    "o-guia-do-mochileiro",
    "O Guia do Mochileiro das Galáxias",
    1979,
    ["Ficção Científica", "Comédia", "Clássico"],
    "Arthur Dent é salvo da destruição da Terra e embarca em uma viagem hilária pelo universo.",
    90,
    "Douglas Adams",
  ),
  comic(
    "c1",
    "watchmen",
    "Watchmen",
    1986,
    ["Super-Herói", "Drama", "Mistério", "Clássico"],
    "Quem vigia os vigilantes? Uma investigação de assassinato revela segredos sombrios sobre heróis aposentados.",
    96,
    "Alan Moore / Dave Gibbons (DC Comics)",
  ),
  comic(
    "c2",
    "sandman",
    "Sandman",
    1989,
    ["Fantasia", "Horror", "Mito", "Clássico"],
    "Morpheus, o Senhor dos Sonhos, reconstrói seu reino após décadas aprisionado por mortais.",
    94,
    "Neil Gaiman (DC Vertigo)",
  ),
  comic(
    "c3",
    "saga",
    "Saga",
    2012,
    ["Fantasia", "Ficção Científica", "Romance", "Épico"],
    "Dois soldados de lados opostos de uma guerra galáctica se apaixonam e fogem para proteger sua filha.",
    92,
    "Brian K. Vaughan (Image Comics)",
  ),
  comic(
    "c4",
    "maus",
    "Maus",
    1980,
    ["Biografia", "História", "Drama", "Clássico"],
    "Um sobrevivente do Holocausto conta sua história, com judeus como ratos e nazistas como gatos.",
    97,
    "Art Spiegelman (Pantheon)",
  ),
  comic(
    "c5",
    "the-boys",
    "The Boys",
    2006,
    ["Super-Herói", "Sátira", "Ação", "Dark"],
    "Em um mundo onde super-heróis são celebridades corruptas, um grupo financiado pela CIA os mantém na linha.",
    84,
    "Garth Ennis (Dynamite)",
  ),
  comic(
    "c6",
    "invincible",
    "Invincible",
    2003,
    ["Super-Herói", "Ação", "Drama", "Ficção Científica"],
    "Mark Grayson descobre seus poderes e que seu pai herói não é quem parece ser.",
    90,
    "Robert Kirkman (Image Comics)",
  ),
];

const MOCK_MEDIA: Media[] = [...SEED_MEDIA, ...MANUAL] as Media[];
export { MOCK_MEDIA };

function applyCatalogFilters(items: Media[], filters?: CatalogFilters) {
  let result = [...items];
  if (filters?.type) result = result.filter((m) => m.type === filters.type);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (m) => m.title.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q),
    );
  }
  if (filters?.sort === "title") result.sort((a, b) => a.title.localeCompare(b.title));
  if (filters?.sort === "year") result.sort((a, b) => b.year - a.year);
  if (filters?.sort === "score")
    result.sort((a, b) => (b.score?.consolidated ?? 0) - (a.score?.consolidated ?? 0));
  const p = filters?.page ?? 1;
  const l = filters?.limit ?? 12;
  const start = (p - 1) * l;
  const sliced = result.slice(start, start + l);
  return {
    items: sliced,
    total: result.length,
    page: p,
    limit: l,
    hasMore: start + l < result.length,
  };
}

export function getCatalogSync(filters?: CatalogFilters): CatalogResponse {
  return applyCatalogFilters(MOCK_MEDIA, filters);
}

// D-233/T231: manga é categoria própria (MANGA); não há tipo "anime"
// exposto — animação japonesa é SERIE.
const TIPO_TO_API: Record<MediaType, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  manga: "MANGA",
  comic: "COMIC",
};

const SORT_TO_API: Record<string, string> = {
  title: "titulo",
  year: "ano_lancamento",
  score: "score",
};

/**
 * Catálogo real da API (paginação cursor) com fallback para o mock local.
 * Busca textual usa /api/v1/search (T227: delegado ao discover normalizado —
 * translate() nos dois lados, mesma paridade de acentos); lista usa
 * /api/v1/midias.
 */
export async function getCatalog(filters?: CatalogFilters): Promise<CatalogResponse> {
  if (filters?.search) {
    const data = await apiGet<{ items: ApiSearchItem[]; total: number }>(
      `/api/v1/search?q=${encodeURIComponent(filters.search)}&limit=100`,
    );
    if (data?.items) {
      const items = data.items
        .filter((it) => !filters.type || mapTipo(it.tipo) === filters.type)
        .map((it) => mediaFromSearchItem(it));
      return applyLocalPagination(items, filters);
    }
  } else {
    const params = new URLSearchParams();
    if (filters?.type) params.set("tipo", TIPO_TO_API[filters.type]);
    if (filters?.sort && SORT_TO_API[filters.sort]) {
      params.set(
        "sort",
        `${SORT_TO_API[filters.sort]}:${filters.order === "asc" ? "asc" : "desc"}`,
      );
    }
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.anoMin != null) params.set("ano_min", String(filters.anoMin));
    if (filters?.anoMax != null) params.set("ano_max", String(filters.anoMax));
    if (filters?.scoreMin != null) params.set("score_min", String(filters.scoreMin));
    if (filters?.scoreMax != null) params.set("score_max", String(filters.scoreMax));
    if (filters?.genero) params.set("genero", filters.genero);
    if (filters?.comCritica) params.set("com_critica", "true");
    params.set("limit", String(Math.min(filters?.limit ?? 20, 100)));
    const data = await apiGet<{
      data: ApiMidiaList[];
      next_cursor: string | null;
      has_more: boolean;
      total?: number;
    }>(`/api/v1/midias?${params.toString()}`);
    if (data?.data) {
      const items = data.data.map(mediaFromList);
      return {
        items,
        total: data.total ?? items.length + (data.has_more ? 1 : 0), // fallback: aproximação sem total absoluto
        page: filters?.page ?? 1,
        limit: filters?.limit ?? (items.length || 20),
        hasMore: data.has_more,
        nextCursor: data.next_cursor,
      };
    }
  }

  await delay(400);
  maybeThrow();
  // T233: com busca textual ativa, o fallback mock NUNCA é usado — o
  // applyCatalogFilters filtra por substring client-side (sensível a
  // acentos, diverge do /search normalizado). API fora do ar → lista
  // vazia; o mock só serve para catálogo sem busca (demo/offline).
  if (filters?.search) {
    return { items: [], total: 0, page: filters?.page ?? 1, limit: filters?.limit ?? 12, hasMore: false };
  }
  return applyCatalogFilters(MOCK_MEDIA, filters);
}

function mediaFromSearchItem(it: ApiSearchItem): Media {
  return {
    id: it.id,
    slug: it.slug,
    title: it.titulo,
    type: mapTipo(it.tipo),
    year: it.ano_lancamento ?? new Date().getFullYear(),
    genres: [],
    synopsis: it.sinopse ?? "",
    posterUrl: it.imagem_url,
    backdropUrl: null,
    score: null,
    cast: [],
    crew: [],
    reviews: [],
    streaming: [],
  };
}

function mediaFromList(m: ApiMidiaList): Media {
  return {
    id: m.id,
    slug: slugify(m.titulo),
    title: m.titulo,
    type: mapTipo(m.tipo),
    year: m.ano_lancamento ?? new Date().getFullYear(),
    genres: [],
    synopsis: "",
    posterUrl: m.imagem_url,
    backdropUrl: null,
    score:
      m.scores?.[0]?.score != null
        ? {
            consolidated: m.scores[0].score,
            confidence: "low",
            sources: [],
            explanation: "Consulte os detalhes para ver as fontes do score.",
          }
        : null,
    cast: [],
    crew: [],
    reviews: [],
    streaming: [],
  };
}

function applyLocalPagination(items: Media[], filters?: CatalogFilters): CatalogResponse {
  const p = filters?.page ?? 1;
  const l = filters?.limit ?? 12;
  const start = (p - 1) * l;
  const sliced = items.slice(start, start + l);
  return {
    items: sliced,
    total: items.length,
    page: p,
    limit: l,
    hasMore: start + l < items.length,
  };
}

/** Slug canônico (espelho do slugify da API). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Captura lead de e-mail para categoria futura (T185 — endpoint público
 * /api/v1/waitlist-notify). Retorna true se registrado; lança em erro.
 */
export async function waitlistNotify(email: string, category: string): Promise<void> {
  const res = await fetch("/api/v1/waitlist-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, category }),
  });
  if (!res.ok) {
    throw new Error(`waitlist-notify falhou: ${res.status}`);
  }
}

/** Detalhe de mídia: API real primeiro, mock como fallback. */
export async function getMediaBySlug(slug: string): Promise<Media | null> {
  const api = await apiGet<ApiMidiaSlug>(`/api/v1/midias/slug/${encodeURIComponent(slug)}`);
  if (api) return mediaFromApi(api, slug);

  await delay(300);
  maybeThrow();
  return MOCK_MEDIA.find((m) => m.slug === slug) ?? MOCK_MEDIA.find((m) => m.id === slug) ?? null;
}

/** Item de /api/v1/discover (T227: busca normalizada com translate()). */
interface ApiDiscoverItem {
  id: string;
  titulo: string;
  tipo: string;
  ano: number | null;
  poster_url: string | null;
  score: number | null;
  na_watchlist: boolean;
  slug: string;
}

function mediaFromDiscoverItem(it: ApiDiscoverItem): Media {
  return {
    id: it.id,
    slug: it.slug,
    title: it.titulo,
    type: mapTipo(it.tipo),
    year: it.ano ?? new Date().getFullYear(),
    genres: [],
    synopsis: "",
    posterUrl: it.poster_url,
    backdropUrl: null,
    score:
      it.score != null
        ? {
            consolidated: it.score,
            confidence: "low",
            sources: [],
            explanation: "Consulte os detalhes para ver as fontes do score.",
          }
        : null,
    cast: [],
    crew: [],
    reviews: [],
    streaming: [],
  };
}

/** Busca global: /discover normalizado (T227) — SEM fallback local por
 * substring (T233: a UI deve renderizar exclusivamente a resposta da API;
 * "Coração Partido" para "ação" era resultado de filtro client-side que
 * divergia do backend). API fora do ar → [] (a UI mostra "Nenhum
 * resultado", nunca resultados falsos de mock). */
export async function searchMedia(q: string): Promise<MediaSearchResult[]> {
  if (!q || q.length < 2) return [];
  const data = await apiGet<{ itens: ApiDiscoverItem[] }>(
    `/api/v1/discover?q=${encodeURIComponent(q)}&limit=15`,
  );
  if (data?.itens?.length) {
    return data.itens.map((it, i) => ({
      media: mediaFromDiscoverItem(it),
      relevance: 1 - i * 0.01,
    }));
  }
  return [];
}

export async function getTrending(): Promise<Media[]> {
  await delay(300);
  maybeThrow();
  return MOCK_MEDIA.slice(0, 8);
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  await delay(300);
  return [
    {
      id: "free",
      name: "Free",
      price: 0,
      currency: "BRL",
      period: "monthly",
      features: ["Catálogo limitado", "MEDIA Score básico", "Watchlist 10 itens"],
      highlighted: false,
    },
    {
      id: "plus",
      name: "Plus",
      price: 4.9,
      currency: "BRL",
      period: "monthly",
      features: [
        "Catálogo completo",
        "MEDIA Score detalhado",
        "Watchlist ilimitada",
        "Recomendações IA",
        "Sem anúncios",
      ],
      highlighted: true,
    },
    {
      id: "premium",
      name: "Premium",
      price: 9.9,
      currency: "BRL",
      period: "monthly",
      features: [
        "Tudo do Plus",
        "Perfil de gosto avançado",
        "Listas personalizadas",
        "Exportação de dados",
        "Suporte prioritário",
      ],
      highlighted: false,
    },
  ];
}

export async function getUserProfile(): Promise<UserProfile> {
  await delay(450);
  maybeThrow();
  return {
    id: "usr_1",
    displayName: "Usuário MEDIA Rate",
    email: "usuario@mediarate.app",
    avatarUrl: null,
    plan: "plus",
    joinedAt: "2026-01-15T00:00:00Z",
    stats: {
      totalRatings: 47,
      watchlistSize: 23,
      completedMedia: 15,
      favoriteGenre: "Ficção Científica",
      tasteProfile: [
        { genre: "Ficção Científica", score: 85 },
        { genre: "Drama", score: 72 },
        { genre: "Ação", score: 65 },
        { genre: "Thriller", score: 58 },
      ],
    },
  };
}
