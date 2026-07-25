"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

export function Logo({ className }: { className?: string }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const path = pathRef.current;
    if (prefersReduced || !path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    animate(path, {
      strokeDashoffset: [length, 0],
      duration: 800,
      ease: "outCubic",
    });
  }, []);

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        ref={pathRef}
        d="M8 40 V12 L24 28 L40 12 V40"
      />
    </svg>
  );
}
