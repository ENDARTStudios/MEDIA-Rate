"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

interface CatalogSkeletonProps {
  count?: number;
}

export function CatalogSkeleton({ count = 10 }: CatalogSkeletonProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || !ref.current) return;

    const ctrl = animate(ref.current.querySelectorAll(".skeleton-pulse"), {
      opacity: [0.4, 0.8, 0.4],
      duration: 1600,
      delay: stagger(80),
      loop: true,
      ease: "inOutSine",
    });
    return () => { ctrl.pause(); };
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-pulse rounded-lg bg-surface-card overflow-hidden">
          <div className="aspect-[2/3] bg-surface-elevated" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-surface-elevated" />
            <div className="h-3 w-1/2 rounded bg-surface-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}
