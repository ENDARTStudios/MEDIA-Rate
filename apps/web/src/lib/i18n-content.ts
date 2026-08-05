import type { LocalizedString } from "./types";
import { SEED_I18N } from "./seed-i18n";

export function localized(field: LocalizedString | undefined, locale: string): string {
  if (!field) return "";
  const key = locale as keyof LocalizedString;
  if (key in field && field[key]) return field[key];
  return field.pt || "";
}

export function localizedOrUndefined(
  field: LocalizedString | undefined,
  locale: string,
): string | undefined {
  if (!field) return undefined;
  const key = locale as keyof LocalizedString;
  if (key in field && field[key]) return field[key];
  if (field.pt) return field.pt;
  return undefined;
}

const PT_TO_SLUG: Record<string, string> = {
  "Ação": "acao",
  "Aventura": "aventura",
  "Animação": "animacao",
  "Biografia": "biografia",
  "Comédia": "comedia",
  "Crime": "crime",
  "Curta": "curta",
  "Documentário": "documentario",
  "Drama": "drama",
  "Esporte": "esporte",
  "Família": "familia",
  "Fantasia": "fantasia",
  "Faroeste": "faroeste",
  "Ficção científica": "ficcao",
  "Ficção Científica": "ficcao",
  "Guerra": "guerra",
  "História": "historia",
  "Infantil": "infantil",
  "Mistério": "misterio",
  "Musical": "musical",
  "Policial": "policial",
  "Reality Show": "reality",
  "Romance": "romance",
  "Suspense": "suspense",
  "Talk Show": "talk",
  "Terror": "terror",
  "Épico": "epico",
  "Sandbox": "sandbox",
  "Survival": "survival",
  "Adventure": "aventura",
  "Creative": "creative",
  "Indie": "indie",
  "RPG": "rpg",
  "Souls-like": "soulslike",
  "Cyberpunk": "cyberpunk",
  "Mundo Aberto": "openworld",
  "Open World": "openworld",
  "Plataforma": "plataforma",
  "Estratégia": "estrategia",
  "Simulação": "simulacao",
  "Corrida": "corrida",
  "Luta": "luta",
  "Esportes": "esports",
  "Sports": "esports",
  "Fighting": "luta",
  "Family": "familia",
  "Animation": "animacao",
  "Horror": "terror",
  "Thriller": "suspense",
  "Science Fiction": "ficcao",
  "Sci-Fi": "ficcao",
  "Documentary": "documentario",
  "History": "historia",
  "War": "guerra",
  "Western": "faroeste",
  "Music": "musical",
  "Mystery": "misterio",
  "Action": "acao",
};

export function genreSlug(label: string): string {
  if (PT_TO_SLUG[label]) return PT_TO_SLUG[label];
  // Normalize: strip accents, lowercase, keep alphanumeric
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Traduz um rótulo de gênero com fallback: se o slug não existir nas
 * mensagens, exibe o rótulo original em vez de MISSING_MESSAGE.
 */
export function generoTraduzido(
  tg: { has: (key: string) => boolean; (key: string): string },
  label: string,
): string {
  const slug = genreSlug(label);
  return tg.has(slug) ? tg(slug) : label;
}

export function titleForLocale(
  media: { title: string; titleLocalized?: LocalizedString; id?: string; slug?: string },
  locale: string,
): string {
  // Try seed-i18n derived map first
  const key = (media.slug ?? media.id) as string;
  const d = key ? SEED_I18N[key] : undefined;
  if (d?.titleLocalized) {
    const lang = locale.split("-")[0] as keyof LocalizedString;
    return d.titleLocalized[lang] || d.titleLocalized.pt;
  }
  // Fallback to inline titleLocalized field
  if (media.titleLocalized) {
    const lang = locale.split("-")[0] as keyof LocalizedString;
    if (lang in media.titleLocalized && media.titleLocalized[lang])
      return media.titleLocalized[lang];
    return media.titleLocalized.pt || media.title;
  }
  return media.title;
}

export function genreSlugsFor(media: { id?: string; slug?: string; genres?: string[] }): string[] {
  const key = (media.slug ?? media.id) as string;
  const d = key ? SEED_I18N[key] : undefined;
  if (d?.genreSlugs?.length) return d.genreSlugs;
  // Fallback: compute from genres
  return (media.genres || []).map((g) => genreSlug(g));
}

export function synopsisForLocale(
  media: { synopsis: string; id?: string; slug?: string },
  locale: string,
): string {
  const key = (media.slug ?? media.id) as string;
  const d = key ? SEED_I18N[key] : undefined;
  if (d?.synopsis) {
    const lang = locale.split("-")[0] as "pt" | "en" | "es";
    return d.synopsis[lang] || d.synopsis.pt;
  }
  return media.synopsis;
}
