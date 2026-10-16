import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import type { OverviewNiche } from "@/lib/dashboard-overview-data";

/**
 * D-586 (T211/B3): helpers extraídos de `DashboardOverview.tsx` (arquivo de
 * 1.757 linhas) sem nenhuma alteração de comportamento — só movimentação, para
 * que a convergência de paleta e a quebra em componentes tenham onde acontecer.
 */

export function nicheIcon(niche: OverviewNiche) {
  return CATEGORY_TOKENS[niche as MediaType].icon;
}

export function resolveTimeKey(
  t: (k: string, p?: Record<string, string | number>) => string,
  timeKey: string,
): string {
  const [key, param] = timeKey.split(":");
  if (key === "recentHours" || key === "recentDays" || key === "recentMonths")
    return t(key, { n: param });
  return t(key);
}

export function ptNumber(value: number): string {
  return value.toFixed(1).replace(".", ",");
}
