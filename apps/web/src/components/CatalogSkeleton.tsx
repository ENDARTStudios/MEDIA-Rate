"use client";

import { useReducedMotionPref } from "@/lib/useReducedMotionPref";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { animate } from "animejs/animation";
import { stagger } from "animejs/utils";

interface CatalogSkeletonProps {
  count?: number;
}

export function CatalogSkeleton({ count = 10 }: CatalogSkeletonProps) {
  // D-584/M3 (T211): valor reativo (o matchMedia era lido uma vez dentro do efeito).
  const prefersReduced = useReducedMotionPref();
  const t = useTranslations("common");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced || !ref.current) return;

    const ctrl = animate(ref.current.querySelectorAll(".sk-shimmer"), {
      backgroundPosition: ["200% 0", "-200% 0"],
      duration: 2000,
      delay: stagger(100),
      loop: true,
      ease: "linear",
    });
    return () => {
      ctrl.pause();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("loadingCatalog")}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md bg-surface-bg overflow-hidden shadow-surface-1">
          <div
            className="aspect-[2/3] sk-shimmer bg-[length:200%_100%]"
            style={{
              backgroundImage: "linear-gradient(110deg, #09090F 40%, #12121C 50%, #09090F 60%)",
            }}
          />
          <div className="p-3 space-y-2.5">
            <div
              className="h-3.5 w-3/4 rounded-md sk-shimmer bg-[length:200%_100%]"
              style={{
                backgroundImage: "linear-gradient(110deg, #12121C 40%, #1C1C2E 50%, #12121C 60%)",
              }}
            />
            <div
              className="h-3 w-1/2 rounded-md sk-shimmer bg-[length:200%_100%]"
              style={{
                backgroundImage: "linear-gradient(110deg, #12121C 40%, #1C1C2E 50%, #12121C 60%)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
