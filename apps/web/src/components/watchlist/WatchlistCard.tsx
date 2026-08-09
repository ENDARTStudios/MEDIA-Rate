"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useInteractionStore } from "@/stores/use-interaction-store";
import { REACOES, type Reacao } from "@/lib/api-interactions";
import { ReactionGlyph } from "@/components/interaction/StatusIcons";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import type { WatchlistEntry } from "@/stores/use-watchlist-store";

const TIPO_MAP: Record<string, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
};

export function entryToMediaItem(e: WatchlistEntry): MediaItem | null {
  const media = e.media;
  if (!media?.id || !media.title) return null;
  const tipo =
    media.type === "movie"
      ? "FILME"
      : media.type === "series"
        ? "SERIE"
        : media.type === "game"
          ? "GAME"
          : media.type === "comic"
            ? "COMIC"
            : media.type === "manga"
              ? "MANGA"
              : "FILME";
  return {
    id: String(media.id),
    titulo: media.title,
    tipo,
    ano_lancamento: media.year ?? null,
    imagem_url: media.posterUrl ?? null,
    score: media.score ?? null,
  };
}

/** Converte um midia do /interacoes (string tipo) para MediaItem (p/ cartão). */
export function interactionMidiaToItem(midia: {
  id?: string;
  titulo?: string;
  tipo?: string;
  imagem_url?: string | null;
  score?: number | null;
  ano_lancamento?: number | null;
}): MediaItem | null {
  if (!midia?.id || !midia.titulo) return null;
  const tipo = midia.tipo ? (TIPO_MAP[midia.tipo.toLowerCase()] ?? "FILME") : "FILME";
  return {
    id: String(midia.id),
    titulo: midia.titulo,
    tipo,
    ano_lancamento: midia.ano_lancamento ?? null,
    imagem_url: midia.imagem_url ?? null,
    score: midia.score ?? null,
  };
}

function statusKey(isGame: boolean): Record<string, string> {
  return isGame
    ? { WANT: "queroJogar", WATCHING: "jogando", COMPLETED: "joguei" }
    : { WANT: "queroVer", WATCHING: "vendo", COMPLETED: "vi" };
}

/** T190: indicador "score mudou" — compara score atual com o da adição. */
export function ScoreDelta({ entry }: { entry: WatchlistEntry }) {
  const atual = entry.media?.score ?? null;
  const anterior = entry.scoreAtAdd ?? entry.score_at_add ?? null;
  if (atual == null || anterior == null) return null;
  const diff = atual - anterior;
  if (Math.abs(diff) < 0.5) return null;
  const subiu = diff > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums"
      style={{ color: subiu ? "#34D399" : "#F87171" }}
      title={`${subiu ? "Subiu" : "Caiu"} de ${anterior.toFixed(1)} para ${atual.toFixed(1)}`}
      data-testid="score-delta"
    >
      {subiu ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

/**
 * Card do Kanban (T200, §7): título/poster + status + selo de reação (👍/👎)
 * sobreposto + reação rápida (habilitada ao mover para Concluído/Abandonado).
 */
export function WatchlistCard({
  entry,
  mediaType,
  onRemove,
  onMove,
  removing,
  showReactionPrompt,
  onReactionDone,
}: {
  entry: WatchlistEntry;
  mediaType?: string;
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, coluna: string) => void;
  removing: boolean;
  showReactionPrompt?: boolean;
  onReactionDone?: () => void;
}) {
  const t = useTranslations("watchlist");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });
  const inter = useInteractionStore((s) => s.map[entry.mediaId]);
  const setReaction = useInteractionStore((s) => s.setReaction);
  const reacao = inter?.reacao ?? null;
  const isGame = mediaType === "game";
  const labels = statusKey(isGame);
  const item = entryToMediaItem(entry);

  function react(r: Reacao) {
    void setReaction(entry.mediaId, reacao === r ? null : r);
    onReactionDone?.();
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`max-w-[200px] cursor-grab touch-none rounded-md ${isDragging ? "opacity-60 ring-2 ring-[#818CF8]" : ""}`}
      role="listitem"
      aria-label={item?.titulo ?? entry.mediaId}
      data-testid="watchlist-card"
    >
      {item && <MediaCard media={item} />}

      {/* Selo de reação sobreposto + ações */}
      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <ScoreDelta entry={entry} />
          {reacao && (
            <span
              data-testid="reaction-badge"
              title={t(reacao === "GOSTEI" ? "gostei" : "naoGostei")}
            >
              <ReactionGlyph reacao={reacao} size={14} asBadge />
            </span>
          )}
        </div>
        <select
          value={entry.status ?? entry.coluna ?? "WANT"}
          onChange={(e) => onMove(entry.id, e.target.value)}
          aria-label={t("moveTo")}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 rounded border border-[#2A2A3D] bg-[#12121C] px-1.5 py-0.5 text-[10px] text-[#A0A0B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
        >
          {["WANT", "WATCHING", "COMPLETED"].map((c) => (
            <option key={c} value={c}>
              {t(labels[c] ?? labels.WANT)}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRemove(entry.id)}
          disabled={removing}
          aria-label={t("removeFromWatchlist")}
          className="text-xs text-[#6B6B85] hover:text-red-400 transition-colors"
        >
          {removing ? "..." : t("removeFromWatchlist")}
        </button>
      </div>

      {/* Reação rápida — habilitada ao mover para Concluído/Abandonado. */}
      {(showReactionPrompt || reacao != null) && (
        <div
          className="mt-1 flex items-center gap-1.5 px-1"
          data-testid={showReactionPrompt ? "reaction-prompt" : "reaction-inline"}
        >
          {showReactionPrompt && (
            <span className="text-[10px] text-[#80809B]">{t("reactNow")}</span>
          )}
          {REACOES.map((r) => {
            const active = reacao === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => react(r)}
                aria-pressed={active}
                aria-label={t(r === "GOSTEI" ? "gostei" : "naoGostei")}
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
                  active
                    ? "border-[#818CF8] bg-[#2A2A3D] text-[#EDE7DC]"
                    : "border-[#2A2A3D] text-[#A0A0B8] hover:bg-[#2A2A3D]"
                }`}
              >
                <ReactionGlyph reacao={r} size={12} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
