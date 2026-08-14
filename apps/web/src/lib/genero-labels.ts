/**
 * T321/T317 — labels localizados de gêneros canônicos (dado-i18n).
 * Fallback: retorna o nome bruto do banco (nunca vazio).
 */
export type Locale = "pt-BR" | "en-US" | "es-ES";

const GENERO_LABELS: Record<string, Record<Locale, string>> = {
  "Ação": { "pt-BR": "Ação", "en-US": "Action", "es-ES": "Acción" },
  "Action": { "pt-BR": "Ação", "en-US": "Action", "es-ES": "Acción" },
  "Acción": { "pt-BR": "Ação", "en-US": "Action", "es-ES": "Acción" },
  "Drama": { "pt-BR": "Drama", "en-US": "Drama", "es-ES": "Drama" },
  "Comédia": { "pt-BR": "Comédia", "en-US": "Comedy", "es-ES": "Comedia" },
  "Comedy": { "pt-BR": "Comédia", "en-US": "Comedy", "es-ES": "Comedia" },
  "Comedia": { "pt-BR": "Comédia", "en-US": "Comedy", "es-ES": "Comedia" },
  "Ficção científica": {
    "pt-BR": "Ficção científica",
    "en-US": "Sci-Fi",
    "es-ES": "Ciencia ficción",
  },
  "Sci-Fi": { "pt-BR": "Ficção científica", "en-US": "Sci-Fi", "es-ES": "Ciencia ficción" },
  "Ficção": { "pt-BR": "Ficção científica", "en-US": "Sci-Fi", "es-ES": "Ciencia ficción" },
  "Terror": { "pt-BR": "Terror", "en-US": "Horror", "es-ES": "Terror" },
  "Horror": { "pt-BR": "Terror", "en-US": "Horror", "es-ES": "Terror" },
  "Animação": { "pt-BR": "Animação", "en-US": "Animation", "es-ES": "Animación" },
  "Animation": { "pt-BR": "Animação", "en-US": "Animation", "es-ES": "Animación" },
  "Animación": { "pt-BR": "Animação", "en-US": "Animation", "es-ES": "Animación" },
  "Documentário": { "pt-BR": "Documentário", "en-US": "Documentary", "es-ES": "Documental" },
  "Documentary": { "pt-BR": "Documentário", "en-US": "Documentary", "es-ES": "Documental" },
  "Documental": { "pt-BR": "Documentário", "en-US": "Documentary", "es-ES": "Documental" },
  "Romance": { "pt-BR": "Romance", "en-US": "Romance", "es-ES": "Romance" },
  "Thriller": { "pt-BR": "Thriller", "en-US": "Thriller", "es-ES": "Thriller" },
  "Aventura": { "pt-BR": "Aventura", "en-US": "Adventure", "es-ES": "Aventura" },
  "Adventure": { "pt-BR": "Aventura", "en-US": "Adventure", "es-ES": "Aventura" },
  "Fantasia": { "pt-BR": "Fantasia", "en-US": "Fantasy", "es-ES": "Fantasía" },
  "Fantasy": { "pt-BR": "Fantasia", "en-US": "Fantasy", "es-ES": "Fantasía" },
};

export function generoLabel(genero: string, locale: Locale): string {
  const norm = genero.trim();
  if (!norm) return "—";
  const mapa = GENERO_LABELS[norm];
  if (mapa) return mapa[locale];
  // Chave por slug (ex.: 'acao', 'ficcao').
  const porSlug = Object.values(GENERO_LABELS).find((m) =>
    m["pt-BR"].toLowerCase().includes(norm.toLowerCase()),
  );
  if (porSlug) return porSlug[locale];
  return norm; // fallback: nome do banco
}
