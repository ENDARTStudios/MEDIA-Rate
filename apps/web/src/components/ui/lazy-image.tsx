"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * T351 — imagem com lazy-load NATIVO (`loading="lazy"`) + placeholder blur +
 * fade-in no load + fallback em erro. Dimensões via width/height para evitar
 * CLS (Core Web Vitals). Reutilizável em cards, rails e fichas.
 */
export function LazyImage({ src, alt, width, height, className }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-[#1C1C2E]", className)}>
      {!loaded && !errored && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-[#1C1C2E]" />
      )}
      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#6B7280]">
          {alt.slice(0, 1).toUpperCase()}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
