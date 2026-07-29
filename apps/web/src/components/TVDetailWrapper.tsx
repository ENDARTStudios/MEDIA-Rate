"use client";

import dynamic from "next/dynamic";
import { MediaDetailPage } from "@/components/MediaDetailPage";

const Seasons = dynamic(() => import("@/components/Seasons").then((m) => ({ default: m.Seasons })), { ssr: false });
const Episodes = dynamic(() => import("@/components/Episodes").then((m) => ({ default: m.Episodes })), { ssr: false });

export function TVDetailWrapper({ id }: { id: string }) {
  return (
    <MediaDetailPage id={id} type="tv">
      <div className="space-y-6 mt-8">
        <Seasons
          seasons={[
            { number: 1, title: "Temporada 1", episodeCount: 10, score: 85 },
            { number: 2, title: "Temporada 2", episodeCount: 10, score: 88 },
            { number: 3, title: "Temporada 3", episodeCount: 8, score: 82 },
          ]}
          activeSeason={1}
        />
        <Episodes
          seasonNumber={1}
          episodes={[
            { number: 1, title: "Episódio 1", synopsis: "O início da jornada.", score: 82, runtime: "45min" },
            { number: 2, title: "Episódio 2", synopsis: "A descoberta inesperada.", score: 79, runtime: "42min" },
            { number: 3, title: "Episódio 3", synopsis: "O confronto inevitável.", score: 91, runtime: "48min" },
          ]}
        />
      </div>
    </MediaDetailPage>
  );
}
