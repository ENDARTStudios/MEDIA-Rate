"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { motion, useReducedMotion } from "motion/react";

const STATUS_LABELS: Record<string, string> = {
  WANT: "queroVer",
  WATCHING: "vendo",
  COMPLETED: "vi",
};

const NEXT_STATUS: Record<string, string> = {
  WANT: "WATCHING",
  WATCHING: "COMPLETED",
  COMPLETED: "WANT",
};

interface Props {
  mediaId: string;
  className?: string;
}

export function WatchlistButton({ mediaId, className = "" }: Props) {
  const t = useTranslations("watchlist");
  const shouldReduce = useReducedMotion();
  const { isInWatchlist, getEntryStatus, addToWatchlist, moveItem, removeItem, entries } = useWatchlistStore();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const inWatchlist = isInWatchlist(mediaId);
  const status = getEntryStatus(mediaId);
  const entry = entries.find(
    (e) => e.mediaId === mediaId || e.midia_id === mediaId || (e.media && e.media.id === mediaId)
  );

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    if (!inWatchlist) {
      handleAdd();
    } else {
      setOpen((prev) => !prev);
    }
  }

  async function handleAdd() {
    setLoading(true);
    try {
      await addToWatchlist(mediaId);
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(newStatus: string) {
    setLoading(true);
    setOpen(false);
    try {
      if (entry) await moveItem(entry.id, newStatus);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    setOpen(false);
    try {
      if (entry) await removeItem(entry.id);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = status ? t(STATUS_LABELS[status] ?? "queroVer") : "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.button
        onClick={handleClick}
        initial={false}
        animate={inWatchlist && animate ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
          inWatchlist
            ? "bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25"
            : "bg-[#11111E]/80 text-[#9CA3AF] hover:bg-[#1C1C2E] hover:text-[#EDE7DC]"
        }`}
        title={inWatchlist ? statusLabel : t("addToWatchlist")}
        aria-label={inWatchlist ? statusLabel : t("addToWatchlist")}
        disabled={loading}
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${inWatchlist ? "fill-[#EF4444] text-[#EF4444]" : "text-[#9CA3AF]"}`}
            viewBox="0 0 24 24"
            fill={inWatchlist ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </motion.button>

      {open && inWatchlist && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-[#1C1C2E] border border-[#2A2A3E] rounded-lg shadow-floating z-50 overflow-hidden">
          <button onClick={(e) => { e.stopPropagation(); handleMove("WANT"); }} className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#11111E] hover:text-[#EDE7DC] transition-colors">{t("queroVer")}</button>
          <button onClick={(e) => { e.stopPropagation(); handleMove("WATCHING"); }} className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#11111E] hover:text-[#EDE7DC] transition-colors">{t("vendo")}</button>
          <button onClick={(e) => { e.stopPropagation(); handleMove("COMPLETED"); }} className="w-full text-left px-3 py-2 text-xs text-[#9CA3AF] hover:bg-[#11111E] hover:text-[#EDE7DC] transition-colors">{t("vi")}</button>
          <button onClick={(e) => { e.stopPropagation(); handleRemove(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors border-t border-[#2A2A3E]">{t("removeFromWatchlist")}</button>
        </div>
      )}
    </div>
  );
}
