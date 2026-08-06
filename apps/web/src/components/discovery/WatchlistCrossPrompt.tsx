"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useInteractionStore } from "@/stores/use-interaction-store";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import { getRelacoes, type RelacoesResponse } from "@/lib/api-relations";
import { Link } from "@/lib/navigation";

/**
 * Prompt proativo não bloqueante (T199, Addendum 3 §3.3): ao adicionar um
 * título à watchlist, se houver relação cross-mídia, oferece "adicionar
 * também" em 1 clique. Momento de maior intenção = ponto de conversão.
 */
export function WatchlistCrossPrompt({
  mediaId,
  open,
  onDismiss,
}: {
  mediaId: string;
  open: boolean;
  onDismiss: () => void;
}) {
  const t = useTranslations("discovery");
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);
  const setInteractionStatus = useInteractionStore((s) => s.setStatus);
  const [data, setData] = useState<RelacoesResponse | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setData(null);
      return;
    }
    let ativo = true;
    void getRelacoes(mediaId).then((r) => {
      if (!ativo) return;
      setData(r);
    });
    return () => {
      ativo = false;
    };
  }, [open, mediaId]);

  if (!open || !data || data.relacoes.length === 0) return null;

  const relacoes = data.relacoes.slice(0, 3);

  return (
    <div
      data-testid="watchlist-cross-prompt"
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-modal w-[min(92vw,22rem)] rounded-lg border border-[rgba(129,140,248,0.25)] bg-[#151524] p-4 shadow-floating"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-heading font-semibold text-[#EDE7DC]">{t("crossPromptTitle")}</p>
        <button
          onClick={onDismiss}
          aria-label={t("dismiss")}
          className="rounded p-1 text-[#6B7280] hover:text-[#EDE7DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {relacoes.map((r) => {
          const token = CATEGORY_TOKENS[r.midia.tipo.toLowerCase() as MediaType];
          const Icon = token?.icon ?? CATEGORY_TOKENS.movie.icon;
          const jaAdicionado = addedIds.has(r.midia.id);
          return (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[rgba(129,140,248,0.08)] bg-[#1C1C2E] px-3 py-2"
            >
              <Link
                href={`/media/${r.midia.slug}`}
                className="flex min-w-0 items-center gap-2 text-sm text-[#EDE7DC] hover:text-[#A5B4FC]"
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: token?.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{r.midia.titulo}</span>
              </Link>
              <button
                onClick={() => {
                  void addToWatchlist(r.midia.id).catch(() => undefined);
                  // T201 (G4): registra a origem da descoberta — a aresta que
                  // levou o usuário a este título alimenta o /discoveries.
                  void setInteractionStatus(r.midia.id, "QUERO_CONSUMIR", {
                    origemRelacaoId: r.id,
                  }).catch(() => undefined);
                  setAddedIds((prev) => new Set(prev).add(r.midia.id));
                }}
                disabled={jaAdicionado}
                className="shrink-0 rounded-md bg-[#818CF8] px-2.5 py-1 text-xs font-semibold text-[#0F172A] transition-colors hover:brightness-110 disabled:bg-[#2A2A3E] disabled:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5B4FC]"
              >
                {jaAdicionado ? t("added") : t("addToo")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
