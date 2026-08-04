"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { formatDate } from "@/lib/i18n";
import { animate } from "animejs";
import { useReducedMotion } from "motion/react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "@/lib/navigation";
import { MEDIA_ACCENTS } from "@/components/media-rate-ui/CategoryChip";

interface ColumnDef {
  key: string;
  i18nKey: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "WANT", i18nKey: "queroVer" },
  { key: "WATCHING", i18nKey: "vendo" },
  { key: "COMPLETED", i18nKey: "vi" },
];

function entryToMediaItem(
  e: ReturnType<typeof useWatchlistStore.getState>["entries"][number],
): MediaItem | null {
  const media = e.media;
  if (!media?.id || !media.title) return null;
  const tipo =
    media.type === "movie"
      ? "FILME"
      : media.type === "series"
        ? "SERIE"
        : media.type === "game"
          ? "GAME"
          : "FILME";
  return {
    id: String(media.id),
    titulo: media.title,
    tipo,
    ano_lancamento: media.year ?? null,
    imagem_url: media.posterUrl ?? null,
    score: null,
  };
}

function SortableCard({
  entry,
  onRemove,
  removing,
}: {
  entry: ReturnType<typeof useWatchlistStore.getState>["entries"][number];
  onRemove: (entryId: string) => void;
  removing: boolean;
}) {
  const t = useTranslations("watchlist");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });
  const item = entryToMediaItem(entry);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`max-w-[200px] cursor-grab touch-none rounded-md ${isDragging ? "opacity-60 ring-2 ring-[#818CF8]" : ""}`}
      role="listitem"
      aria-label={item?.titulo ?? entry.id}
    >
      {item && <MediaCard media={item} />}
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-[#6B6B85]">⠿ arrastar</span>
        <button
          onClick={() => onRemove(entry.id)}
          disabled={removing}
          className="text-xs text-[#6B6B85] hover:text-red-400 transition-colors"
        >
          {removing ? "..." : t("removeFromWatchlist")}
        </button>
      </div>
    </div>
  );
}

function Column({
  col,
  entries,
  onRemove,
  removingId,
  t,
}: {
  col: ColumnDef;
  entries: ReturnType<typeof useWatchlistStore.getState>["entries"];
  onRemove: (entryId: string) => void;
  removingId: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const accent =
    MEDIA_ACCENTS[col.key === "WANT" ? "movie" : col.key === "WATCHING" ? "series" : "game"];

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
              <SortableCard
                key={entry.id}
                entry={entry}
                onRemove={onRemove}
                removing={removingId === entry.id}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function WatchlistRoulette({ items }: { items: { id: string; title: string }[] }) {
  const t = useTranslations("watchlist");
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const labelRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    return () => {
      animRef.current.forEach((a) => {
        try {
          a.pause();
        } catch {
          // animação já finalizada
        }
      });
    };
  }, []);

  function sortear() {
    if (rolling || items.length === 0) return;
    setWinner(null);
    setRolling(true);
    const sorteado = items[Math.floor(Math.random() * items.length)];

    if (shouldReduce) {
      setWinner(sorteado);
      setRolling(false);
      return;
    }

    // Roleta: cicla títulos rapidamente (Anime.js) e pousa no sorteado.
    let ciclo = 0;
    const totalCiclos = 14;
    const timer = window.setInterval(() => {
      ciclo++;
      if (labelRef.current) {
        const item = items[ciclo % items.length];
        if (item) labelRef.current.textContent = item.title;
      }
      if (ciclo >= totalCiclos) {
        window.clearInterval(timer);
        setWinner(sorteado);
        if (labelRef.current) labelRef.current.textContent = sorteado.title;
        if (labelRef.current) {
          animRef.current.push(
            animate(labelRef.current, {
              scale: [0.9, 1.15, 1],
              duration: 400,
              ease: "outBack",
            }),
          );
        }
        setRolling(false);
      }
    }, 90);
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] px-4 py-2 min-w-[180px] text-center">
        <span ref={labelRef} className="block truncate text-sm font-medium text-[#F5F5F7]">
          {winner ? winner.title : t("queroVer")}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={sortear} disabled={rolling}>
        {rolling ? "..." : "Sortear"}
      </Button>
      {winner && (
        <Button size="sm" onClick={() => router.push(`/media/${winner.id}`)}>
          Abrir
        </Button>
      )}
    </div>
  );
}

export function WatchlistClient() {
  const t = useTranslations("watchlist");
  const locale = useLocale();
  const { user } = useAuthStore();
  const { entries, isLoading, error, fetchWatchlist, removeItem, moveItem } = useWatchlistStore();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "lista">("kanban");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const wantItems = useMemo(
    () =>
      entries
        .filter((e) => (e.status ?? e.coluna) === "WANT")
        .map((e) => entryToMediaItem(e))
        .filter((m): m is MediaItem => m != null)
        .map((m) => ({ id: m.id, title: m.titulo })),
    [entries],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const entry = entries.find((e) => e.id === active.id);
    if (!entry) return;
    const targetStatus = COLUMNS.some((c) => c.key === over.id) ? String(over.id) : entry.status;
    if (targetStatus === entry.status) return;
    try {
      await moveItem(String(active.id), targetStatus);
    } catch {
      // Falha silenciosa: o store mantém o estado otimista.
    }
  }

  const isTrial =
    user?.plan === "PLUS" &&
    user.trialEndsAt != null &&
    new Date(user.trialEndsAt).getTime() > Date.now();
  const planKey =
    user?.plan === "PREMIUM" ? "planPremium" : user?.plan === "PLUS" ? "planPlus" : "planFree";

  if (isLoading && entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{t("title")}</h1>
        <CatalogSkeleton count={6} />
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{t("title")}</h1>
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => fetchWatchlist()} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    const errorMsg = typeof error === "string" ? error : error.message;
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
          <p className="text-[#A0A0B8] mb-2">{errorMsg}</p>
          <Button onClick={() => fetchWatchlist()} variant="ghost" size="sm">
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{t("title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
          <p className="text-[#A0A0B8] mb-4">{t("empty")}</p>
          <Link href="/catalog">
            <Button>{t("exploreCatalog")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7]">{t("title")}</h1>
        {user?.plan && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#1B1B2C] text-[#A0A0B8] border border-[#2A2A3D]">
            {t(planKey)}
          </span>
        )}
        {isTrial && user?.trialEndsAt && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-[#FBBF24] bg-[#FBBF24]/15 border border-[#FBBF24]/30">
            {t("trialActive", { date: formatDate(user.trialEndsAt, locale) })}
          </span>
        )}
        {user?.plan === "FREE" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-[#A0A0B8] bg-[#1B1B2C] border border-[#2A2A3D]">
            {t("itemsCount", { count: entries.length })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <WatchlistRoulette items={wantItems} />
          <div
            className="flex rounded-lg border border-[#2A2A3D] overflow-hidden"
            role="group"
            aria-label="Vista"
          >
            <button
              type="button"
              onClick={() => setView("kanban")}
              aria-pressed={view === "kanban"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-[#818CF8] text-[#0F172A]" : "bg-[#12121C] text-[#A0A0B8] hover:text-[#F5F5F7]"}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("lista")}
              aria-pressed={view === "lista"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "lista" ? "bg-[#818CF8] text-[#0F172A]" : "bg-[#12121C] text-[#A0A0B8] hover:text-[#F5F5F7]"}`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                col={col}
                entries={entries.filter((e) => (e.status ?? e.coluna) === col.key)}
                onRemove={(entryId) => {
                  setDeleting(entryId);
                  void removeItem(entryId).finally(() => setDeleting(null));
                }}
                removingId={deleting}
                t={t}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <ul className="divide-y divide-[#2A2A3D] rounded-lg border border-[#2A2A3D] bg-[#12121C]">
          {entries.map((entry) => {
            const item = entryToMediaItem(entry);
            const status = entry.status ?? entry.coluna ?? "WANT";
            const statusLabel = COLUMNS.find((c) => c.key === status)?.i18nKey ?? "queroVer";
            return (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                {item ? (
                  <>
                    <Link href={`/media/${item.id}`} className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-[#F5F5F7] hover:text-[#818CF8]">
                        {item.titulo}
                      </span>
                      <span className="text-xs text-[#6B6B85]">{item.ano_lancamento ?? "—"}</span>
                    </Link>
                    <span className="text-xs text-[#A0A0B8]">{t(statusLabel)}</span>
                    <button
                      onClick={() => {
                        setDeleting(entry.id);
                        void removeItem(entry.id).finally(() => setDeleting(null));
                      }}
                      disabled={deleting === entry.id}
                      className="text-xs text-[#6B6B85] hover:text-red-400 transition-colors"
                    >
                      {deleting === entry.id ? "..." : t("removeFromWatchlist")}
                    </button>
                  </>
                ) : (
                  <span className="flex-1 text-sm text-[#A0A0B8]">{entry.mediaId}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
