import type { CatalogFilters, CatalogResponse, Media, MediaSearchResult, PricingPlan, UserProfile } from "./types";
import { SEED_MEDIA } from "./seed-data";

function delay(ms = 400): Promise<void> { return new Promise((r) => setTimeout(r, ms + Math.random() * 200)); }
let errorSimulated = false;
export function toggleApiError() { errorSimulated = !errorSimulated; }
function maybeThrow() { if (errorSimulated) throw new Error("Simulated API error"); }

function game(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, conf: "high" | "medium" | "low", platforms: string[]): any {
  return { id, slug, title, type: "game", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: conf, sources: [{ source: "metacritic", score: scoreC, maxScore: 100 }, { source: "igdb", score: Math.round(scoreC * 0.95), maxScore: 100 }], explanation: conf === "high" ? "Alto consenso da crítica." : "Avaliações mistas da crítica." }, cast: [], crew: [{ name: "Disponível em breve", role: "Desenvolvedora" }], reviews: [], streaming: platforms.map((p) => ({ name: p })) };
}

function anime(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, poster: string | null, backdrop: string | null): any {
  return { id, slug, title, type: "anime", year, genres, synopsis: synopsis.slice(0, 200), posterUrl: poster ? `https://image.tmdb.org/t/p/w500${poster}` : null, backdropUrl: backdrop ? `https://image.tmdb.org/t/p/w1280${backdrop}` : null, score: { consolidated: Math.round(scoreC * 10), confidence: scoreC > 8 ? "high" : scoreC > 7 ? "medium" : "low", sources: [{ source: "imdb", score: scoreC, maxScore: 10 }, { source: "tmdb", score: Math.round(scoreC * 10) / 10, maxScore: 10 }], explanation: scoreC > 8 ? "Avaliações muito positivas." : "Avaliações positivas." }, cast: [], crew: [], reviews: [], streaming: [{ name: "Crunchyroll" }, { name: "Netflix" }] };
}

function book(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, author: string): any {
  return { id, slug, title, type: "book", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: "medium", sources: [{ source: "openlibrary", score: Math.round(scoreC / 20), maxScore: 5 }], explanation: "Baseado em avaliações de leitores." }, cast: [], crew: [{ name: author, role: "Autor" }], reviews: [], streaming: [{ name: "Amazon Books" }] };
}

function comic(id: string, slug: string, title: string, year: number, genres: string[], synopsis: string, scoreC: number, publisher: string): any {
  return { id, slug, title, type: "comic", year, genres, synopsis, posterUrl: null, backdropUrl: null, score: { consolidated: scoreC, confidence: "medium", sources: [{ source: "tmdb", score: Math.round(scoreC / 10), maxScore: 10 }], explanation: "Baseado em avaliações de fãs." }, cast: [], crew: [{ name: publisher, role: "Editora" }], reviews: [], streaming: [{ name: "Comixology" }] };
}

const MANUAL: any[] = [
  anime("a1", "jujutsu-kaisen", "Jujutsu Kaisen", 2020, ["Ação", "Fantasia", "Sobrenatural"], "Yuji Itadori engole um dedo amaldiçoado e se torna hospedeiro de Sukuna, o Rei das Maldições, entrando no mundo da feitiçaria.", 8.6, "/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg", "/m0bV3qBi3uB1DpV2Rx97dW5q0qe.jpg"),
  anime("a2", "frieren", "Frieren e a Jornada para o Além", 2023, ["Fantasia", "Aventura", "Drama"], "Após derrotar o Rei Demônio, a elfa Frieren embarca em uma jornada para entender o significado da vida e das conexões humanas.", 8.8, null, "/2ECx2GvAz5Qx0SENYnDrYBVsaAR.jpg"),
  anime("a3", "hunter-x-hunter", "Hunter x Hunter", 2011, ["Ação", "Aventura", "Fantasia"], "Gon Freecss descobre que seu pai é um Hunter lendário e decide seguir seus passos, enfrentando desafios e fazendo aliados.", 8.7, null, "/m3xI0Qri29GjhE2oHaNV3G39cNA.jpg"),
  anime("a4", "bleach", "Bleach", 2004, ["Ação", "Sobrenatural", "Fantasia"], "Ichigo Kurosaki ganha poderes de Shinigami e deve proteger os vivos de espíritos malignos enquanto navega pela Soul Society.", 8.4, null, "/dYWdZHCr3ZDEgx4MHjlST1NslR8.jpg"),
  anime("a5", "re-zero", "Re:ZERO - Starting Life in Another World", 2016, ["Fantasia", "Drama", "Psicológico"], "Subaru Natsuki é transportado para um mundo de fantasia e descobre que revive após a morte, enfrentando ciclos de sofrimento.", 8.0, "/5qcUG0pOQ3VKIlJC23UXUMKqLYK.jpg", "/7ON4wL5n1hQlq0gGg9LU5A0E5BJ.jpg"),
  anime("a6", "detetive-conan", "Detetive Conan", 1996, ["Mistério", "Crime", "Suspense"], "Transformado em criança, o detetive adolescente Shinichi Kudo resolve crimes sob o pseudônimo Conan Edogawa.", 8.0, "/gW14n6xxONXrya8CIDhRe5Ada7U.jpg", "/z67lpMtm8YGykJO4p89meuNMvj8.jpg"),
  anime("a7", "pokemon", "Pokémon", 1997, ["Aventura", "Fantasia", "Ação"], "Ash Ketchum viaja pelo mundo capturando e treinando Pokémon para se tornar um Mestre Pokémon.", 8.0, "/i1aGxHlSvRolhdUjx1BYwPvURBF.jpg", "/wz0HujkLBEYwFXnqLx8nFQ8rBYX.jpg"),
  anime("a8", "mushoku-tensei", "Mushoku Tensei: Jobless Reincarnation", 2021, ["Fantasia", "Aventura", "Drama"], "Reencarnado em um mundo de magia, um NEET de 34 anos ganha uma segunda chance e se torna Rudy, um prodígio mágico.", 8.5, "/sviEqFIPJW5gFtuYy8XyE0Uscid.jpg", "/j9fRIimor0AMFJR9kjZubXcABzZ.jpg"),
  anime("a9", "doraemon", "Doraemon: O Gato do Futuro", 2005, ["Comédia", "Ficção Científica", "Aventura"], "Doraemon, um gato robótico do século XXII, viaja ao passado para ajudar Nobita com seus gadgets futuristas.", 8.1, "/jzd80ryL0kTBgvXVLeh01cJdNFv.jpg", "/c2oiRa7V3bQzof4wVGzLXtWJ5QU.jpg"),
  anime("a10", "one-piece", "One Piece", 1999, ["Ação", "Aventura", "Fantasia", "Comédia"], "Monkey D. Luffy reúne uma tripulação pirata em busca do tesouro One Piece para se tornar o Rei dos Piratas.", 8.7, null, "/6GCOlQyjyyRjvYJxQ0GQ0Rg4jBR.jpg"),

  game("g1", "zelda-breath-of-the-wild", "The Legend of Zelda: Breath of the Wild", 2017, ["Action", "Adventure", "RPG"], "Link desperta de um sono centenário em Hyrule para derrotar Calamity Ganon.", 97, "high", ["Nintendo Switch"]),
  game("g2", "elden-ring", "Elden Ring", 2022, ["Action", "RPG", "Fantasy", "Open World"], "Nas Terras Intermédias, um guerreiro busca restaurar o Elden Ring e se tornar Elden Lord.", 96, "high", ["PC", "PlayStation", "Xbox"]),
  game("g3", "baldurs-gate-3", "Baldur's Gate 3", 2023, ["RPG", "Fantasy", "Strategy"], "Um jogo de RPG baseado em Dungeons & Dragons com narrativa ramificada e combate tático.", 96, "high", ["PC", "PlayStation", "Xbox"]),
  game("g4", "god-of-war-ragnarok", "God of War Ragnarök", 2022, ["Action", "Adventure", "Mythology"], "Kratos e Atreus enfrentam o Ragnarök nos Nove Reinos da mitologia nórdica.", 94, "high", ["PlayStation", "PC"]),
  game("g5", "red-dead-redemption-2", "Red Dead Redemption 2", 2018, ["Action", "Adventure", "Western", "Open World"], "Arthur Morgan e a gangue Van der Linde lutam pela sobrevivência no oeste americano.", 97, "high", ["PC", "PlayStation", "Xbox"]),
  game("g6", "the-witcher-3", "The Witcher 3: Wild Hunt", 2015, ["Action", "RPG", "Fantasy", "Open World"], "Geralt de Rívia busca sua filha adotiva Ciri enquanto enfrenta a invasão da Caçada Selvagem.", 93, "high", ["PC", "PlayStation", "Xbox", "Nintendo Switch"]),
  game("g7", "minecraft", "Minecraft", 2011, ["Sandbox", "Survival", "Adventure", "Creative"], "Construa, explore e sobreviva em um mundo infinito feito de blocos.", 82, "medium", ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"]),
  game("g8", "cyberpunk-2077", "Cyberpunk 2077", 2020, ["Action", "RPG", "Sci-Fi", "Open World"], "Em Night City, um mercenário busca um implante que concede a imortalidade.", 86, "medium", ["PC", "PlayStation", "Xbox"]),
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
export { MOCK_MEDIA };

function applyCatalogFilters(items: Media[], filters?: CatalogFilters) {
  let result = [...items];
  if (filters?.type) result = result.filter((m) => m.type === filters.type);
  if (filters?.search) { const q = filters.search.toLowerCase(); result = result.filter((m) => m.title.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q)); }
  if (filters?.sort === "title") result.sort((a, b) => a.title.localeCompare(b.title));
  if (filters?.sort === "year") result.sort((a, b) => b.year - a.year);
  if (filters?.sort === "score") result.sort((a, b) => (b.score?.consolidated ?? 0) - (a.score?.consolidated ?? 0));
  const p = filters?.page ?? 1; const l = filters?.limit ?? 12;
  const start = (p - 1) * l; const sliced = result.slice(start, start + l);
  return { items: sliced, total: result.length, page: p, limit: l, hasMore: start + l < result.length };
}

export function getCatalogSync(filters?: CatalogFilters): CatalogResponse {
  return applyCatalogFilters(MOCK_MEDIA, filters);
}

export async function getCatalog(filters?: CatalogFilters): Promise<CatalogResponse> {
  await delay(400); maybeThrow();
  return applyCatalogFilters(MOCK_MEDIA, filters);
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
