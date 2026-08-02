// One-off seed script — generates api.ts with 100 titles
// Run: npx tsx scripts/seed-catalog.ts
// DO NOT COMMIT the API key — uses .env.local

const API_KEY = (() => {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    console.error("TMDB_API_KEY ausente. Defina em .env.local antes de rodar.");
    process.exit(1);
  }
  return key;
})();
const BASE = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/w1280";

interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genre_ids?: number[];
}

async function fetchTMDB(path: string): Promise<any> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=pt-BR`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB error ${r.status}`);
  return r.json();
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapMovie(m: TMDBItem, genres: string[]) {
  return {
    id: String(m.id),
    slug: slugify(m.title!),
    title: m.title!,
    type: "movie",
    year: Number((m.release_date || "2024").split("-")[0]),
    genres,
    duration: null,
    synopsis: (m.overview || "Sinopse indisponível.").slice(0, 200),
    posterUrl: m.poster_path ? `${POSTER}${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${BACKDROP}${m.backdrop_path}` : null,
    score: synthScore(m.vote_average),
    cast: [],
    crew: [],
    reviews: [],
    streaming: synthStreaming(),
  };
}

function mapSeries(s: TMDBItem, genres: string[]) {
  return {
    id: String(s.id),
    slug: slugify(s.name!),
    title: s.name!,
    type: "series",
    year: Number((s.first_air_date || "2024").split("-")[0]),
    genres,
    duration: null,
    synopsis: (s.overview || "Sinopse indisponível.").slice(0, 200),
    posterUrl: s.poster_path ? `${POSTER}${s.poster_path}` : null,
    backdropUrl: s.backdrop_path ? `${BACKDROP}${s.backdrop_path}` : null,
    score: synthScore(s.vote_average),
    cast: [],
    crew: [],
    reviews: [],
    streaming: synthStreaming(),
  };
}

function synthScore(vote: number) {
  const c = Math.round(vote * 10);
  const imdb = Math.round(vote * 10 + (Math.random() - 0.5) * 5);
  const rt = Math.round(Math.min(100, vote * 10 + Math.random() * 10));
  const mc = Math.round(Math.min(100, vote * 10 + (Math.random() - 0.5) * 10));
  return {
    consolidated: c,
    confidence: c >= 80 ? "high" : c >= 60 ? "medium" : "low",
    sources: [
      { source: "imdb", score: imdb / 10, maxScore: 10 },
      { source: "tmdb", score: c / 10, maxScore: 10 },
      { source: "metacritic", score: mc, maxScore: 100 },
    ],
    explanation:
      c >= 80 ? "Alto consenso entre fontes." : c >= 60 ? "Avaliações mistas." : "Consenso baixo.",
  };
}

const STREAMING_POOL = [
  ["Netflix"],
  ["Prime Video"],
  ["Max"],
  ["Disney+"],
  ["Netflix", "Prime Video"],
  ["Prime Video", "Paramount+"],
  ["Max", "Prime Video"],
  ["Netflix", "Max"],
  ["Disney+", "Star+"],
];

function synthStreaming() {
  return STREAMING_POOL[Math.floor(Math.random() * STREAMING_POOL.length)];
}

async function main() {
  console.log("Fetching movies...");
  const movies: any[] = [];
  for (let p = 1; p <= 3; p++) {
    const data = await fetchTMDB(`/movie/popular?page=${p}`);
    for (const m of data.results) movies.push(mapMovie(m, ["Drama"]));
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`Movies: ${movies.length}`);

  console.log("Fetching series...");
  const series: any[] = [];
  for (let p = 1; p <= 1; p++) {
    const data = await fetchTMDB(`/tv/popular?page=${p}`);
    for (const s of data.results) series.push(mapSeries(s, ["Drama"]));
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`Series: ${series.length}`);

  const total = [...movies.slice(0, 50), ...series.slice(0, 20)];
  console.log(`Total: ${total.length}`);

  const output = `export const SEED_MEDIA = ${JSON.stringify(total, null, 2)};\n`;
  require("fs").writeFileSync("apps/web/src/lib/seed-data.ts", output);
  console.log("Written to apps/web/src/lib/seed-data.ts");
}

main().catch(console.error);
