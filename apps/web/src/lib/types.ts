export type MediaType = "movie" | "series" | "game" | "book" | "anime" | "comic";

export type Confidence = "high" | "medium" | "low";

export type SourceName = "imdb" | "rottentomatoes" | "tmdb" | "metacritic" | "igdb" | "rawg" | "openlibrary";

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
}

export interface Media {
  id: string;
  slug: string;
  title: string;
  type: MediaType;
  year: number;
  genres: string[];
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
}

export interface CatalogResponse {
  items: Media[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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
