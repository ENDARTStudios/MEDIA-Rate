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
