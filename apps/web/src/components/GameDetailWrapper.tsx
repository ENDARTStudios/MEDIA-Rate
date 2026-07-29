"use client";

import { MediaDetailPage } from "@/components/MediaDetailPage";

export function GameDetailWrapper({ id }: { id: string }) {
  return <MediaDetailPage id={id} type="game" />;
}
