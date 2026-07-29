"use client";

import { MediaDetailPage } from "@/components/MediaDetailPage";

export function MovieDetailWrapper({ id }: { id: string }) {
  return <MediaDetailPage id={id} type="movie" />;
}
