import type { CatalogFilters, CatalogResponse, Media, MediaSearchResult, PricingPlan, UserProfile } from "./types";

function delay(ms = 400): Promise<void> { return new Promise((r) => setTimeout(r, ms + Math.random() * 200)); }
let errorSimulated = false;
export function toggleApiError() { errorSimulated = !errorSimulated; }
function maybeThrow() { if (errorSimulated) throw new Error("Simulated API error"); }

const CAST_MOCK = { cast: [{ name: "Tim Robbins", role: "Andy Dufresne", photoUrl: null }, { name: "Morgan Freeman", role: "Ellis Boyd 'Red' Redding", photoUrl: null }, { name: "Bob Gunton", role: "Warden Samuel Norton", photoUrl: null }], crew: [{ name: "Frank Darabont", role: "Diretor" }, { name: "Stephen King", role: "Autor original" }], reviews: [{ author: "Roger Ebert", rating: 100, text: "Uma obra-prima sobre esperança e redenção.", date: "2024-09-15" }, { author: "Empire", rating: 95, text: "Um dos filmes mais amados de todos os tempos por um motivo.", date: "2024-08-20" }], streaming: [{ name: "Netflix" }, { name: "Prime Video" }, { name: "Max" }] };

const MOCK_MEDIA: Media[] = [
  { id: "1", slug: "the-shawshank-redemption", title: "The Shawshank Redemption", type: "movie", year: 1994, genres: ["Drama"], duration: "142 min", synopsis: "Dois homens presos criam um vínculo ao longo dos anos, encontrando consolo e redenção através de atos de decência comum.", posterUrl: null, backdropUrl: null, score: { consolidated: 92, confidence: "high", sources: [{ source: "imdb", score: 9.3, maxScore: 10 }, { source: "tmdb", score: 8.7, maxScore: 10 }, { source: "metacritic", score: 80, maxScore: 100 }], explanation: "Baseado em 2.9M avaliações. Alta confiança." }, ...CAST_MOCK },
  { id: "2", slug: "breaking-bad", title: "Breaking Bad", type: "series", year: 2008, genres: ["Drama", "Crime", "Thriller"], duration: "5 temporadas", synopsis: "Um professor de química com câncer terminal começa a fabricar metanfetamina.", posterUrl: null, backdropUrl: null, score: { consolidated: 95, confidence: "high", sources: [{ source: "imdb", score: 9.5, maxScore: 10 }, { source: "tmdb", score: 8.9, maxScore: 10 }], explanation: "Baseado em 2.2M avaliações. Alta confiança." }, cast: [{ name: "Bryan Cranston", role: "Walter White", photoUrl: null }, { name: "Aaron Paul", role: "Jesse Pinkman", photoUrl: null }], crew: [{ name: "Vince Gilligan", role: "Criador" }], reviews: [{ author: "IMDb Users", rating: 97, text: "A melhor série já feita. Atuação impecável.", date: "2024-10-01" }], streaming: [{ name: "Netflix" }] },
  { id: "3", slug: "zelda-breath-of-the-wild", title: "The Legend of Zelda: Breath of the Wild", type: "game", year: 2017, genres: ["Action", "Adventure", "RPG"], synopsis: "Link desperta de um sono centenário em Hyrule para derrotar Calamity Ganon.", posterUrl: null, backdropUrl: null, score: { consolidated: 97, confidence: "high", sources: [{ source: "metacritic", score: 97, maxScore: 100 }, { source: "igdb", score: 96, maxScore: 100 }], explanation: "Baseado em 150 avaliações. Alta confiança." }, cast: [{ name: "Nintendo", role: "Desenvolvedora", photoUrl: null }], crew: [{ name: "Hidemaro Fujibayashi", role: "Diretor" }, { name: "Eiji Aonuma", role: "Produtor" }], reviews: [{ author: "GameSpot", rating: 100, text: "Uma reinvenção magistral do gênero.", date: "2024-06-12" }], streaming: [{ name: "Nintendo Switch" }] },
  { id: "4", slug: "1984", title: "1984", type: "book", year: 1949, genres: ["Ficção Científica", "Distopia", "Clássico"], synopsis: "Em uma sociedade totalitária, Winston Smith luta para manter sua humanidade.", posterUrl: null, backdropUrl: null, score: { consolidated: 89, confidence: "medium", sources: [{ source: "openlibrary", score: 4.2, maxScore: 5 }], explanation: "Baseado em avaliações de leitores. Confiança moderada." }, cast: [], crew: [{ name: "George Orwell", role: "Autor" }], reviews: [{ author: "The Guardian", rating: 92, text: "A obra distópica definitiva. Mais relevante do que nunca.", date: "2024-01-30" }, { author: "Goodreads", rating: 89, text: "Uma leitura essencial para entender o século XX.", date: "2023-11-15" }], streaming: [{ name: "Amazon Books" }] },
  { id: "5", slug: "inception", title: "Inception", type: "movie", year: 2010, genres: ["Ação", "Ficção Científica", "Thriller"], duration: "148 min", synopsis: "Um ladrão especializado em roubar segredos do subconsciente recebe a missão de implantar uma ideia.", posterUrl: null, backdropUrl: null, score: { consolidated: 88, confidence: "high", sources: [{ source: "imdb", score: 8.8, maxScore: 10 }, { source: "tmdb", score: 8.4, maxScore: 10 }, { source: "metacritic", score: 74, maxScore: 100 }], explanation: "Baseado em 2.6M avaliações. Alta confiança." }, cast: [{ name: "Leonardo DiCaprio", role: "Dom Cobb", photoUrl: null }, { name: "Joseph Gordon-Levitt", role: "Arthur", photoUrl: null }, { name: "Elliot Page", role: "Ariadne", photoUrl: null }], crew: [{ name: "Christopher Nolan", role: "Diretor / Roteirista" }, { name: "Hans Zimmer", role: "Compositor" }], reviews: [{ author: "Variety", rating: 94, text: "Nolan redefine o que um blockbuster pode ser.", date: "2024-07-04" }], streaming: [{ name: "Max" }, { name: "Prime Video" }] },
  { id: "6", slug: "interstellar", title: "Interstellar", type: "movie", year: 2014, genres: ["Ficção Científica", "Aventura", "Drama"], duration: "169 min", synopsis: "Em um futuro distópico, astronautas viajam por um buraco de minhoca em busca de um novo lar para a humanidade.", posterUrl: null, backdropUrl: null, score: { consolidated: 90, confidence: "high", sources: [{ source: "imdb", score: 8.7, maxScore: 10 }, { source: "tmdb", score: 8.4, maxScore: 10 }, { source: "metacritic", score: 74, maxScore: 100 }], explanation: "Baseado em 2.2M avaliações. Alta confiança." }, cast: [{ name: "Matthew McConaughey", role: "Cooper", photoUrl: null }, { name: "Anne Hathaway", role: "Dra. Brand", photoUrl: null }], crew: [{ name: "Christopher Nolan", role: "Diretor" }, { name: "Hans Zimmer", role: "Compositor" }], reviews: [{ author: "The Atlantic", rating: 93, text: "Uma experiência cinematográfica transcendental.", date: "2024-05-20" }], streaming: [{ name: "Prime Video" }, { name: "Paramount+" }] },
];

export async function getCatalog(filters?: CatalogFilters): Promise<CatalogResponse> {
  await delay(500); maybeThrow();
  const p = filters?.page ?? 1; const l = filters?.limit ?? 12;
  const start = (p - 1) * l; const items = MOCK_MEDIA.slice(start, start + l);
  return { items, total: MOCK_MEDIA.length, page: p, limit: l, hasMore: start + l < MOCK_MEDIA.length };
}

export async function getMediaBySlug(slug: string): Promise<Media | null> {
  await delay(400); maybeThrow();
  return MOCK_MEDIA.find((m) => m.slug === slug) ?? null;
}

export async function searchMedia(q: string): Promise<MediaSearchResult[]> {
  await delay(300); maybeThrow();
  const lower = q.toLowerCase();
  return MOCK_MEDIA.filter((m) => m.title.toLowerCase().includes(lower)).map((m, i) => ({ media: m, relevance: 1 - i * 0.1 }));
}

export async function getTrending(): Promise<Media[]> { await delay(350); maybeThrow(); return MOCK_MEDIA.slice(0, 4); }

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
