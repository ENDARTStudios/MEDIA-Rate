import { MOCK_MEDIA } from "./api";

export function getMediaById(id: string) {
  return MOCK_MEDIA.find((m) => m.id === id) ?? null;
}

export function getMediaByIds(ids: string[]) {
  return ids.map((id) => getMediaById(id)).filter(Boolean);
}

export function getGenreDistribution(ids: string[]) {
  const genres: Record<string, number> = {};
  const items = getMediaByIds(ids);
  let total = 0;
  for (const item of items) {
    for (const g of (item as any).genres || []) {
      genres[g] = (genres[g] || 0) + 1;
      total++;
    }
  }
  const sorted = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return sorted.map(([genre, count]) => ({ genre, pct: Math.round((count / total) * 100), count }));
}

export function getStreamingDistribution(ids: string[]) {
  const services: Record<string, number> = {};
  const items = getMediaByIds(ids);
  for (const item of items) {
    for (const s of (item as any).streaming || []) {
      services[s.name] = (services[s.name] || 0) + 1;
    }
  }
  const sorted = Object.entries(services).sort((a, b) => b[1] - a[1]);
  return sorted.map(([name, count]) => ({ name, count }));
}
