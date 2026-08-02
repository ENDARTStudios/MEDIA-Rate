import type { LocalizedString } from "./types";

export function localized(field: LocalizedString | undefined, locale: string): string {
  if (!field) return "";
  const key = locale as keyof LocalizedString;
  if (key in field && field[key]) return field[key];
  return field.pt || "";
}

export function localizedOrUndefined(field: LocalizedString | undefined, locale: string): string | undefined {
  if (!field) return undefined;
  const key = locale as keyof LocalizedString;
  if (key in field && field[key]) return field[key];
  if (field.pt) return field.pt;
  return undefined;
}

const PT_TO_SLUG: Record<string, string> = {
  "Ação":"acao","Aventura":"aventura","Animação":"animacao","Biografia":"biografia",
  "Comédia":"comedia","Crime":"crime","Curta":"curta","Documentário":"documentario",
  "Drama":"drama","Esporte":"esporte","Família":"familia","Fantasia":"fantasia",
  "Faroeste":"faroeste","Ficção científica":"ficcao","Ficção Científica":"ficcao",
  "Guerra":"guerra","História":"historia","Infantil":"infantil","Mistério":"misterio",
  "Musical":"musical","Policial":"policial","Reality Show":"reality","Romance":"romance",
  "Suspense":"suspense","Talk Show":"talk","Terror":"terror","Épico":"epico",
  "Sandbox":"sandbox","Survival":"survival","Adventure":"aventura","Creative":"creative",
  "Indie":"indie","RPG":"rpg","Souls-like":"soulslike","Cyberpunk":"cyberpunk",
  "Mundo Aberto":"openworld","Open World":"openworld","Plataforma":"plataforma",
  "Estratégia":"estrategia","Simulação":"simulacao","Corrida":"corrida",
  "Luta":"luta","Esportes":"esports","Sports":"esports","Fighting":"luta",
  "Family":"familia","Animation":"animacao","Horror":"terror","Thriller":"suspense",
  "Science Fiction":"ficcao","Sci-Fi":"ficcao","Documentary":"documentario",
  "History":"historia","War":"guerra","Western":"faroeste",
  "Music":"musical","Mystery":"misterio","Action":"acao"
};

export function genreSlug(label: string): string {
  return PT_TO_SLUG[label] || label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function titleForLocale(media: { title: string; titleLocalized?: import("./types").LocalizedString }, locale: string): string {
  if (media.titleLocalized) {
    const key = locale as keyof import("./types").LocalizedString;
    if (key in media.titleLocalized && media.titleLocalized[key]) return media.titleLocalized[key];
    return media.titleLocalized.pt || media.title;
  }
  return media.title;
}
