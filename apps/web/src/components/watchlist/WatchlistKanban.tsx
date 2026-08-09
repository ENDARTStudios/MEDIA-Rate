"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useInteractionStore } from "@/stores/use-interaction-store";
import type { WatchlistEntry } from "@/stores/use-watchlist-store";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";
import { REACOES } from "@/lib/api-interactions";
import { MediaCard } from "@/components/MediaCard";
import { ReactionGlyph, StatusGlyph } from "@/components/interaction/StatusIcons";
import { WatchlistCard, interactionMidiaToItem } from "./WatchlistCard";

interface ColumnDef {
  key: string;
  i18nKey: string;
  accentKey: "movie" | "series" | "game" | "book" | "comic" | "manga";
}

const COLUMNS: ColumnDef[] = [
  { key: "WANT", i18nKey: "queroVer", accentKey: "movie" },
  { key: "WATCHING", i18nKey: "vendo", accentKey: "series" },
  { key: "COMPLETED", i18nKey: "vi", accentKey: "game" },
];

/** Map Watchlist → interação (sinal do motor). */
export const STATUS_MAP: Record<string, "QUERO_CONSUMIR" | "CONSUMINDO" | "CONCLUIDO"> = {
  WANT: "QUERO_CONSUMIR",
  WATCHING: "CONSUMINDO",
  COMPLETED: "CONCLUIDO",
};

/** Resolve o status-alvo de um drop (coluna ou card) — null = no-op. */
export function resolveDropTarget(
  activeId: string,
  overId: string,
  entries: WatchlistEntry[],
): string | null {
  if (!overId || activeId === overId) return null;
  if (COLUMNS.some((c) => c.key === overId)) return String(overId);
  const overEntry = entries.find((e) => e.id === overId);
  if (overEntry) return overEntry.status ?? "WANT";
  return null;
}

function Column({
  col,
  entries,
  onRemove,
  onMove,
  removingId,
  pendingReaction,
  onReactionDone,
}: {
  col: ColumnDef;
  entries: WatchlistEntry[];
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, coluna: string) => void;
  removingId: string | null;
  pendingReaction: string | null;
  onReactionDone: () => void;
}) {
  const t = useTranslations("watchlist");
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const accent = MEDIA_ACCENTS[col.accentKey];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border bg-[#12121C] p-3 min-h-[220px] transition-colors ${isOver ? "border-[#818CF8]" : "border-[#2A2A3D]"}`}
      data-testid={`watchlist-column-${col.key}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#F5F5F7]">{t(col.i18nKey)}</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {entries.length}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-md border border-dashed border-[#2A2A3D]">
          <p className="text-xs text-[#6B6B85]">{t("emptyColumn")}</p>
        </div>
      ) : (
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 flex-1">
            {entries.map((entry) => (
              <WatchlistCard
                key={entry.id}
                entry={entry}
                mediaType={entry.media?.type}
                onRemove={onRemove}
                onMove={onMove}
                removing={removingId === entry.id}
                showReactionPrompt={pendingReaction === entry.id}
                onReactionDone={onReactionDone}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

/**
 * Kanban reconciliado (T200, §7): 3 colunas (Quero/Consumindo/Concluído) +
 * aba Abandonados como 'arquivo' (não 4ª coluna). Drag atualiza o status
 * (watchlist + interação/sinal); mover para Concluído abre a reação na hora.
 */
export function WatchlistKanban({
  entries,
  onRemove,
  onMove,
  removingId,
}: {
  entries: WatchlistEntry[];
  onRemove: (entryId: string) => void;
  onMove: (entryId: string, coluna: string) => void;
  removingId: string | null;
}) {
  const t = useTranslations("watchlist");
  const [view, setView] = useState<"ativos" | "abandonados">("ativos");
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);
  const map = useInteractionStore((s) => s.map);
  const setStatus = useInteractionStore((s) => s.setStatus);
  const setReaction = useInteractionStore((s) => s.setReaction);
  const fetchAll = useInteractionStore((s) => s.fetchAll);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const abandonados = useMemo(
    () => Object.values(map).filter((e) => e.status === "ABANDONADO" && e.midia?.id),
    [map],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const entry = entries.find((e) => e.id === active.id);
    if (!entry) return;
    const targetStatus = resolveDropTarget(String(active.id), String(over.id), entries);
    if (!targetStatus || targetStatus === (entry.status ?? "WANT")) return;

    onMove(String(active.id), targetStatus);
    const status = STATUS_MAP[targetStatus];
    if (status) void setStatus(entry.mediaId, status);

    // Mover para Concluído abre a reação na hora.
    if (targetStatus === "COMPLETED") {
      setPendingReaction(String(active.id));
    }
  }

  return (
    <div>
      {/* Tabs: Ativos (3 colunas) / Abandonados (arquivo). */}
      <div
        className="mb-4 flex rounded-lg border border-[#2A2A3D] overflow-hidden w-fit"
        role="group"
        aria-label={t("kanbanTabs")}
      >
        <button
          type="button"
          onClick={() => setView("ativos")}
          aria-pressed={view === "ativos"}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "ativos" ? "bg-[#818CF8] text-[#0F172A]" : "bg-[#12121C] text-[#A0A0B8] hover:text-[#F5F5F7]"}`}
        >
          {t("tabAtivos")}
        </button>
        <button
          type="button"
          onClick={() => setView("abandonados")}
          aria-pressed={view === "abandonados"}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "abandonados" ? "bg-[#818CF8] text-[#0F172A]" : "bg-[#12121C] text-[#A0A0B8] hover:text-[#F5F5F7]"}`}
        >
          {t("tabAbandonados")}
        </button>
      </div>

      {view === "ativos" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                col={col}
                entries={entries.filter((e) => (e.status ?? e.coluna) === col.key)}
                onRemove={onRemove}
                onMove={onMove}
                removingId={removingId}
                pendingReaction={pendingReaction}
                onReactionDone={() => setPendingReaction(null)}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="flex flex-wrap gap-5" data-testid="abandonados-list">
          {abandonados.length === 0 ? (
            <div className="w-full flex items-center justify-center rounded-md border border-dashed border-[#2A2A3D] p-10">
              <p className="text-sm text-[#6B6B85]">{t("emptyAbandonados")}</p>
            </div>
          ) : (
            abandonados.map((e) => {
              const midiaId = String(e.midia?.id);
              const item = interactionMidiaToItem(e.midia ?? {});
              return (
                <div key={midiaId} className="max-w-[200px]" data-testid="abandonado-card">
                  {item && <MediaCard media={item} />}
                  <div className="mt-1 flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                      <StatusGlyph status="ABANDONADO" size={12} />
                      {t("abandonado")}
                    </span>
                    {e.reacao && (
                      <span
                        data-testid="reaction-badge"
                        title={t(e.reacao === "GOSTEI" ? "gostei" : "naoGostei")}
                      >
                        <ReactionGlyph reacao={e.reacao} size={14} asBadge />
                      </span>
                    )}
                  </div>
                  {e.reacao != null && (
                    <div
                      className="mt-1 flex items-center gap-1.5 px-1"
                      data-testid="reaction-inline"
                    >
                      {REACOES.map((r) => {
                        const active = e.reacao === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setReaction(midiaId, e.reacao === r ? null : r)}
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
            })
          )}
        </div>
      )}
    </div>
  );
}
