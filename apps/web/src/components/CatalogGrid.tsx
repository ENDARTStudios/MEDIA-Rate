"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { gsap, ScrollTrigger } from "@/lib/gsap-config";
import { MediaCard, type MediaItem } from "./MediaCard";

export function CatalogGrid({ medias }: { medias: MediaItem[] }) {
  const shouldReduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !gridRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.batch(gridRef.current?.children || [], {
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0,
            y: 40,
            stagger: 0.05,
            duration: 0.6,
            ease: "power2.out",
          });
        },
      });
    }, gridRef);

    return () => ctx.revert();
  }, [medias]);

  return (
    <motion.div
      ref={gridRef}
      layout
      className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      transition={{ duration: shouldReduce ? 0 : 0.3, ease: "easeInOut" }}
    >
      <AnimatePresence mode="popLayout">
        {medias.map((media) => (
          <motion.div
            key={media.id}
            layout
            initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduce ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ duration: shouldReduce ? 0 : 0.25, ease: "easeOut" }}
          >
            <MediaCard media={media} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
