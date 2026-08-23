"use client";

/**
 * CardIslands (D-383) — as 2 ilhas client do card (coração + status) agrupadas
 * em UM componente client, com os filhos carregados via dynamic ssr:false.
 * motion/zustand saem do bundle inicial da home e as ilhas montam APÓS a
 * hidratação (não bloqueiam main-thread/TTI). Os 60 links do card continuam no
 * HTML SSR — só os ícones interativos são client-only.
 */
import dynamic from "next/dynamic";
import { LazyMount } from "./LazyMount";
import type { MediaType } from "@/lib/types";

const WatchlistButton = dynamic(
  () => import("@/components/WatchlistButton").then((m) => m.WatchlistButton),
  { ssr: false },
);
const StatusReactionControl = dynamic(
  () =>
    import("@/components/interaction/StatusReactionControl").then((m) => m.StatusReactionControl),
  { ssr: false },
);

export function CardIslands({ mediaId, mediaType }: { mediaId: string; mediaType: MediaType }) {
  return (
    <>
      <LazyMount className="absolute top-2 left-2 z-20 min-w-8 min-h-8">
        <WatchlistButton mediaId={mediaId} />
      </LazyMount>
      <LazyMount className="absolute bottom-2 right-2 z-20 min-w-8 min-h-8">
        <StatusReactionControl midiaId={mediaId} mediaType={mediaType} compact />
      </LazyMount>
    </>
  );
}
