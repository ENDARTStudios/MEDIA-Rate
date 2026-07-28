"use client";

import { useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { MediaCard, type MediaItem } from "./MediaCard";

function EmptyState() {
  const t = useTranslations("catalog");
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center" role="status">
      <svg className="w-16 h-16 text-[#6B7280] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p className="text-[#9CA3AF] text-lg">{t("noResults")}</p>
    </div>
  );
}

export function CatalogGrid({ medias }: { medias: MediaItem[] }) {
  const t = useTranslations("catalog");
  const shouldReduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  if (medias.length === 0) {
    return <EmptyState />;
  }

  return (
    <motion.div
      ref={gridRef}
      layout
      className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      transition={{ duration: shouldReduce ? 0 : 0.3, ease: "easeInOut" }}
      role="feed"
      aria-label={t("catalogAria")}
    >
      <AnimatePresence mode="popLayout">
        {medias.map((media) => (
          <motion.div
            key={media.id}
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
