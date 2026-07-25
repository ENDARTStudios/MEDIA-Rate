import type { CatalogFilters, CatalogResponse, Media, MediaSearchResult, PricingPlan, UserProfile } from "./types";
import { SEED_MEDIA } from "./seed-data";

function delay(ms = 400): Promise<void> { return new Promise((r) => setTimeout(r, ms + Math.random() * 200)); }
let errorSimulated = false;
export function toggleApiError() { errorSimulated = !errorSimulated; }
function maybeThrow() { if (errorSimulated) throw new Error("Simulated API error"); }

function game(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, conf: "high" | "medium" | "low", platforms: string[]): any {
  return { id, slug, title, type: "game", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: conf, sources: [{ source: "metacritic", score: scoreC, maxScore: 100 }, { source: "igdb", score: Math.round(scoreC * 0.95), maxScore: 100 }], explanation: conf === "high" ? "Alto consenso da crítica." : "Avaliações mistas da crítica." }, cast: [], crew: [{ name: "Disponível em breve", role: "Desenvolvedora" }], reviews: [], streaming: platforms.map((p) => ({ name: p })) };
}

function book(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, author: string): any {
  return { id, slug, title, type: "book", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: "medium", sources: [{ source: "openlibrary", score: Math.round(scoreC / 20), maxScore: 5 }], explanation: "Baseado em avaliações de leitores." }, cast: [], crew: [{ name: author, role: "Autor" }], reviews: [], streaming: [{ name: "Amazon Books" }] };
}

function comic(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, publisher: string): any {
  return { id, slug, title, type: "comic", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: "medium", sources: [{ source: "tmdb", score: Math.round(scoreC / 10), maxScore: 10 }], explanation: "Baseado em avaliações de fãs." }, cast: [], crew: [{ name: publisher, role: "Editora" }], reviews: [], streaming: [{ name: "Comixology" }] };
}

const MANUAL: any[] = [
  game("g1", "zelda-breath-of-the-wild", "The Legend of Zelda: Breath of the Wild", 2017, ["Action", "Adventure", "RPG"], "Link desperta de um sono centenário em Hyrule para derrotar Calamity Ganon.", 97, "high", ["Nintendo Switch"]),
  game("g2", "elden-ring", "Elden Ring", 2022, ["Action", "RPG", "Fantasy", "Open World"], "Nas Terras Intermédias, um guerreiro busca restaurar o Elden Ring e se tornar Elden Lord.", 96, "high", ["PC", "PlayStation", "Xbox"]),
  game("g3", "baldurs-gate-3", "Baldur's Gate 3", 2023, ["RPG", "Fantasy", "Strategy"], "Um jogo de RPG baseado em Dungeons & Dragons com narrativa ramificada e combate tático.", 96, "high", ["PC", "PlayStation", "Xbox"]),
  game("g4", "god-of-war-ragnarok", "God of War Ragnarök", 2022, ["Action", "Adventure", "Mythology"], "Kratos e Atreus enfrentam o Ragnarök nos Nove Reinos da mitologia nórdica.", 94, "high", ["PlayStation", "PC"]),
  game("g5", "red-dead-redemption-2", "Red Dead Redemption 2", 2018, ["Action", "Adventure", "Western", "Open World"], "Arthur Morgan e a gangue Van der Linde lutam pela sobrevivência no oeste americano.", 97, "high", ["PC", "PlayStation", "Xbox"]),
  game("g6", "the-witcher-3", "The Witcher 3: Wild Hunt", 2015, ["Action", "RPG", "Fantasy", "Open World"], "Geralt de Rívia busca sua filha adotiva Ciri enquanto enfrenta a invasão da Caçada Selvagem.", 93, "high", ["PC", "PlayStation", "Xbox", "Nintendo Switch"]),
  game("g7", "minecraft", "Minecraft", 2011, ["Sandbox", "Survival", "Adventure", "Creative"], "Construa, explore e sobreviva em um mundo infinito feito de blocos.", 82, "medium", ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"]),
  game("g8", "cyberpunk-2077", "Cyberpunk 2077", 2020, ["Action", "RPG", "Sci-Fi", "Open World"], "Em Night City, um mercenário busca um implante que concede a imortalidade.", 86, "medium", ["PC", "PlayStation", "Xbox"]),
  game("g9", "hades", "Hades", 2020, ["Action", "RPG", "Roguelike", "Mythology"], "Zagreus, filho de Hades, tenta escapar do submundo com a ajuda dos deuses do Olimpo.", 93, "high", ["PC", "Nintendo Switch", "PlayStation", "Xbox"]),
  game("g10", "stardew-valley", "Stardew Valley", 2016, ["Farming", "Simulation", "RPG", "Indie"], "Herde uma fazenda e transforme-a em um lar próspero enquanto faz amizade com a comunidade.", 89, "high", ["PC", "Nintendo Switch", "PlayStation", "Xbox", "Mobile"]),
  book("b1", "1984", "1984", 1949, ["Ficção Científica", "Distopia", "Clássico"], "Em uma sociedade totalitária, Winston Smith luta para manter sua humanidade sob o olhar do Grande Irmão.", 89, "George Orwell"),
  book("b2", "duna", "Duna", 1965, ["Ficção Científica", "Aventura", "Épico", "Clássico"], "Paul Atreides deve sobreviver no planeta deserto Arrakis e abraçar seu destino como Kwisatz Haderach.", 92, "Frank Herbert"),
  book("b3", "neuromancer", "Neuromancer", 1984, ["Ficção Científica", "Cyberpunk", "Clássico"], "Case, um cowboy do ciberespaço, é contratado para um trabalho que pode custar mais do que sua vida.", 87, "William Gibson"),
  book("b4", "cem-anos-de-solidao", "Cem Anos de Solidão", 1967, ["Realismo Mágico", "Literatura", "Clássico", "Drama"], "A saga da família Buendía em Macondo, entrelaçando realismo mágico com a história latino-americana.", 95, "Gabriel García Márquez"),
  book("b5", "o-hobbit", "O Hobbit", 1937, ["Fantasia", "Aventura", "Clássico"], "Bilbo Bolseiro embarca em uma jornada épica com 13 anões para recuperar o tesouro de Erebor.", 88, "J.R.R. Tolkien"),
  book("b6", "o-guia-do-mochileiro", "O Guia do Mochileiro das Galáxias", 1979, ["Ficção Científica", "Comédia", "Clássico"], "Arthur Dent é salvo da destruição da Terra e embarca em uma viagem hilária pelo universo.", 90, "Douglas Adams"),
  comic("c1", "watchmen", "Watchmen", 1986, ["Super-Herói", "Drama", "Mistério", "Clássico"], "Quem vigia os vigilantes? Uma investigação de assassinato revela segredos sombrios sobre heróis aposentados.", 96, "Alan Moore / Dave Gibbons (DC Comics)"),
  comic("c2", "sandman", "Sandman", 1989, ["Fantasia", "Horror", "Mito", "Clássico"], "Morpheus, o Senhor dos Sonhos, reconstrói seu reino após décadas aprisionado por mortais.", 94, "Neil Gaiman (DC Vertigo)"),
  comic("c3", "saga", "Saga", 2012, ["Fantasia", "Ficção Científica", "Romance", "Épico"], "Dois soldados de lados opostos de uma guerra galáctica se apaixonam e fogem para proteger sua filha.", 92, "Brian K. Vaughan (Image Comics)"),
  comic("c4", "maus", "Maus", 1980, ["Biografia", "História", "Drama", "Clássico"], "Um sobrevivente do Holocausto conta sua história, com judeus como ratos e nazistas como gatos.", 97, "Art Spiegelman (Pantheon)"),
  comic("c5", "the-boys", "The Boys", 2006, ["Super-Herói", "Sátira", "Ação", "Dark"], "Em um mundo onde super-heróis são celebridades corruptas, um grupo financiado pela CIA os mantém na linha.", 84, "Garth Ennis (Dynamite)"),
  comic("c6", "invincible", "Invincible", 2003, ["Super-Herói", "Ação", "Drama", "Ficção Científica"], "Mark Grayson descobre seus poderes e que seu pai herói não é quem parece ser.", 90, "Robert Kirkman (Image Comics)"),
];

const MOCK_MEDIA: Media[] = [...SEED_MEDIA, ...MANUAL] as Media[];

export async function getCatalog(filters?: CatalogFilters): Promise<CatalogResponse> {
  await delay(400); maybeThrow();
  let items = [...MOCK_MEDIA];
  if (filters?.type) items = items.filter((m) => m.type === filters.type);
  if (filters?.search) { const q = filters.search.toLowerCase(); items = items.filter((m) => m.title.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q)); }
  if (filters?.sort === "title") items.sort((a, b) => a.title.localeCompare(b.title));
  if (filters?.sort === "year") items.sort((a, b) => b.year - a.year);
  if (filters?.sort === "score") items.sort((a, b) => (b.score?.consolidated ?? 0) - (a.score?.consolidated ?? 0));
  const p = filters?.page ?? 1; const l = filters?.limit ?? 12;
  const start = (p - 1) * l; const sliced = items.slice(start, start + l);
  return { items: sliced, total: items.length, page: p, limit: l, hasMore: start + l < items.length };
}

export async function getMediaBySlug(slug: string): Promise<Media | null> {
  await delay(300); maybeThrow();
  return MOCK_MEDIA.find((m) => m.slug === slug) ?? null;
}

export async function searchMedia(q: string): Promise<MediaSearchResult[]> {
  await delay(250); maybeThrow();
  const lower = q.toLowerCase();
  return MOCK_MEDIA.filter((m) => m.title.toLowerCase().includes(lower)).slice(0, 10).map((m, i) => ({ media: m, relevance: 1 - i * 0.1 }));
}

export async function getTrending(): Promise<Media[]> { await delay(300); maybeThrow(); return MOCK_MEDIA.slice(0, 8); }

export async function getPricingPlans(): Promise<PricingPlan[]> {
  await delay(300);
  return [
    { id: "free", name: "Free", price: 0, currency: "BRL", period: "monthly", features: ["Catálogo limitado", "MEDIA Score básico", "Watchlist 10 itens"], highlighted: false },
    { id: "plus", name: "Plus", price: 19.90, currency: "BRL", period: "monthly", features: ["Catálogo completo", "MEDIA Score detalhado", "Watchlist ilimitada", "Recomendações IA", "Sem anúncios"], highlighted: true },
    { id: "premium", name: "Premium", price: 39.90, currency: "BRL", period: "monthly", features: ["Tudo do Plus", "Perfil de gosto avançado", "Listas personalizadas", "Exportação de dados", "Suporte prioritário"], highlighted: false },
  ];
}

export async function getUserProfile(): Promise<UserProfile> {
  await delay(450); maybeThrow();
  return { id: "usr_1", displayName: "Usuário MEDIA Rate", email: "usuario@mediarate.app", avatarUrl: null, plan: "plus", joinedAt: "2026-01-15T00:00:00Z", stats: { totalRatings: 47, watchlistSize: 23, completedMedia: 15, favoriteGenre: "Ficção Científica", tasteProfile: [{ genre: "Ficção Científica", score: 85 }, { genre: "Drama", score: 72 }, { genre: "Ação", score: 65 }, { genre: "Thriller", score: 58 }] } };
}
