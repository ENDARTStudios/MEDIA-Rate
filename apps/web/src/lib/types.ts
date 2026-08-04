export type MediaType = "movie" | "series" | "game" | "book" | "anime" | "comic";

export type Confidence = "high" | "medium" | "low";

export type SourceName =
  | "imdb"
  | "imdb_dataset"
  | "omdb"
  | "rottentomatoes"
  | "rottentomatoes_audience"
  | "metacritic"
  | "metacritic_user"
  | "tmdb"
  | "tvmaze"
  | "trakt"
  | "letterboxd"
  | "rogerebert"
  | "igdb"
  | "igdb_publico"
  | "steam"
  | "steamspy"
  | "opencritic"
  | "openlibrary"
  | "googlebooks"
  | "goodreads"
  | "librarything"
  | "skoob"
  | "amazon"
  | "comicvine"
  | "comicbookroundup"
  | "jikan"
  | "anilist"
  | "kitsu"
  | "mangadex"
  | "animeplanet";

export interface LocalizedString {
  pt: string;
  en: string;
  es: string;
}

export interface SourceRating {
  source: SourceName;
  score: number;
  maxScore: number;
  url?: string;
}

export interface MediaScore {
  consolidated: number;
  confidence: Confidence;
  sources: SourceRating[];
  explanation: string;
  updatedAt?: string;
  criticsScore?: number | null;
  audienceScore?: number | null;
  consensus?: number | null;
  /** v3 (MET-03): índice de consenso I = 100 − |crítica − público| (0–100). */
  indiceConsenso?: number | null;
  /** v3 (MET-03): votos totais v — input do pull Bayesiano. */
  votosTotal?: number;
  sampleSize?: number;
  algorithmVersion?: string;
  confidenceScore?: number;
  snapshots?: { date: string; score: number }[];
}

export interface Media {
  id: string;
  slug: string;
  title: string;
  titleLocalized?: LocalizedString;
  type: MediaType;
  year: number;
  genres: string[];
  genreSlugs?: string[];
  duration?: string;
  synopsis: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  score: MediaScore | null;
  cast: CastMember[];
  crew: CrewMember[];
  reviews: Review[];
  streaming: StreamingService[];
}

export interface CastMember {
  name: string;
  role: string;
  photoUrl: string | null;
}

export interface CrewMember {
  name: string;
  role: string;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface StreamingService {
  name: string;
  url?: string;
  logoUrl?: string;
}

export interface MediaSearchResult {
  media: Media;
  relevance: number;
}

export interface CatalogFilters {
  search?: string;
  type?: MediaType;
  genre?: string;
  sort?: "title" | "year" | "score";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  /** Cursor da próxima página (paginação cursor-based da API). */
  cursor?: string;
  /** Filtros avançados (Tarefa 4 do redesign). */
  anoMin?: number;
  anoMax?: number;
  scoreMin?: number;
  scoreMax?: number;
}

export interface CatalogResponse {
  items: Media[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface WatchlistItem {
  id: string;
  mediaId: string;
  media: Media;
  column: "want" | "watching" | "completed" | "dropped";
  addedAt: string;
  notes?: string;
  rating?: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  plan: "free" | "plus" | "premium";
  joinedAt: string;
  stats: {
    totalRatings: number;
    watchlistSize: number;
    completedMedia: number;
    favoriteGenre: string;
    tasteProfile: TasteVector[];
  };
}

export interface TasteVector {
  genre: string;
  score: number;
}

export interface PricingPlan {
  id: "free" | "plus" | "premium";
  name: string;
  price: number;
  currency: string;
  period: "monthly" | "yearly";
  features: string[];
  highlighted: boolean;
}
