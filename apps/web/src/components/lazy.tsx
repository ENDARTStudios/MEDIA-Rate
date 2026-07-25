"use client";

import dynamic from "next/dynamic";

export const LazyAnimatedHeading = dynamic(
  () => import("./AnimatedHeading").then((m) => ({ default: m.AnimatedHeading })),
  { ssr: false }
);

export const LazyScrollReveal = dynamic(
  () => import("./ScrollReveal").then((m) => ({ default: m.ScrollReveal })),
  { ssr: false }
);

export const LazyParallaxBackground = dynamic(
  () =>
    import("./ParallaxBackground").then((m) => ({
      default: m.ParallaxBackground,
    })),
  { ssr: false }
);

export const LazyCatalogGrid = dynamic(
  () => import("./CatalogGrid").then((m) => ({ default: m.CatalogGrid })),
  { ssr: false, loading: () => <CatalogSkeletonFallback /> }
);

export const LazyMediaScoreBadge = dynamic(
  () =>
    import("./MediaScoreBadge").then((m) => ({
      default: m.MediaScoreBadge,
    })),
  { ssr: false }
);

export const LazyLogo = dynamic(
  () => import("./Logo").then((m) => ({ default: m.Logo })),
  { ssr: false }
);

function CatalogSkeletonFallback() {
  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" aria-busy="true" role="status" aria-label="Carregando catálogo">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-[#0A0A0F] overflow-hidden shadow-surface-1">
          <div className="aspect-[2/3] bg-[#141420]" />
          <div className="p-3 space-y-2.5">
            <div className="h-3.5 w-3/4 rounded-md bg-[#141420]" />
            <div className="h-3 w-1/2 rounded-md bg-[#141420]" />
          </div>
        </div>
      ))}
    </div>
  );
}
