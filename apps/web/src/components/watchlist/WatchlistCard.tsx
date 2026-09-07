"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useInteractionStore } from "@/stores/use-interaction-store";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { searchMedia } from "@/lib/api";
import { REACOES, type Reacao } from "@/lib/api-interactions";
import { ReactionGlyph } from "@/components/interaction/StatusIcons";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { colunaLabelKey, type WatchlistColuna } from "@/lib/watchlist-labels";
import type { WatchlistEntry } from "@/stores/use-watchlist-store";

const TIPO_MAP: Record<string, string> = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** T310: humaniza um id não-UUID tipo slug ("the-last-of-us" → "The last of us"). */
export function humanizarId(id: string): string | null {
  if (!id) return null;
  if (UUID_RE.test(id)) return null; // UUID nunca vira título
  if (/^\d+$/.test(id)) return null; // id numérico puro não é legível
  if (!/[a-z]/i.test(id)) return null;
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * T310: fallback chain de título — localizado → original → id humanizado →
 * null (a UI mostra o rótulo i18n "título indisponível"). Nunca o UUID cru.
 */
export function tituloHumano(
  media?: { title?: string; tituloOriginal?: string } | null,
  id?: string,
): string | null {
  const titulo = media?.title?.trim();
  if (titulo) return titulo;
  const original = media?.tituloOriginal?.trim();
  if (original) return original;
  if (id) return humanizarId(id);
  return null;
}

export function entryToMediaItem(
  e: WatchlistEntry,
  tituloFallback: string | null = null,
): MediaItem | null {
  const media = e.media;
  if (!e.mediaId) return null;
  const tipo =
    media?.type === "movie"
      ? "FILME"
      : media?.type === "series"
        ? "SERIE"
        : media?.type === "game"
          ? "GAME"
          : media?.type === "comic"
            ? "COMIC"
            : media?.type === "manga"
              ? "MANGA"
              : "FILME";
  return {
    id: String(media?.id ?? e.mediaId),
    // T310: fallback chain — título localizado → original → id humanizado →
    // rótulo i18n; nunca o UUID/slug cru na superfície visível.
    titulo: tituloHumano(media, e.mediaId) ?? tituloFallback ?? "…",
    tipo,
    ano_lancamento: media?.year ?? null,
    imagem_url: media?.posterUrl ?? null,
    score: media?.score ?? null,
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

/** T239: chave i18n do rótulo por tipo de mídia (ver/jogar/ler + DROPPED). */

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
      className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums"
      style={{ color: subiu ? "#34D399" : "#F87171" }}
      title={`${subiu ? "Subiu" : "Caiu"} de ${anterior.toFixed(1)} para ${atual.toFixed(1)}`}
      data-testid="score-delta"
    >
      {subiu ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

/**
 * T322: fluxo de recuperação de item órfão — busca o título correto e
 * re-vincula a entrada à mídia canônica escolhida (preserva reação/status).
 */
function BuscarSubstituta({ entryId, palpite }: { entryId: string; palpite: string }) {
  const t = useTranslations("watchlist");
  const relinkItem = useWatchlistStore((s) => s.relinkItem);
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<{ id: string; title: string; year: number }[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    setErro(false);
    const timer = setTimeout(() => {
      searchMedia(query)
        .then((r) => {
          if (cancelado) return;
          setResultados(
            r
              .slice(0, 8)
              .map(({ media }) => ({ id: media.id, title: media.title, year: media.year })),
          );
        })
        .catch(() => {
          if (!cancelado) setErro(true);
        });
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [aberto, query]);

  if (!aberto) {
    return (
      <button
        type="button"
        data-testid="relink-cta"
        onClick={() => {
          setAberto(true);
          setQuery(palpite);
        }}
        className="w-full rounded border border-[#2A2A3D] bg-[#12121C] px-1.5 py-1 text-xs text-[#818CF8] hover:bg-[#2A2A3D] transition-colors"
      >
        {t("buscarSubstituta")}
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1" data-testid="relink-search">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("relinkPlaceholder")}
        aria-label={t("buscarSubstituta")}
        className="w-full rounded border border-[#2A2A3D] bg-[#12121C] px-1.5 py-1 text-xs text-[#EDE7DC] placeholder-[#6B7280] outline-none focus:border-[#818CF8]"
      />
      {erro && <p className="text-xs text-red-400">{t("relinkError")}</p>}
      <div className="max-h-32 overflow-y-auto rounded border border-[#2A2A3D]">
        {resultados.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => void relinkItem(entryId, r.id)}
            className="block w-full text-left rounded px-1.5 py-1 text-xs text-[#A0A0B8] hover:bg-[#2A2A3D] hover:text-[#F5F5F7]"
          >
            {r.title} <span className="text-[#6B7280]">{r.year}</span>
          </button>
        ))}
      </div>
    </div>
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
  // T310: fallback chain nunca expõe UUID cru — humaniza o id quando é
  // slug-like e cai no rótulo i18n "título indisponível".
  const tituloResolvido = tituloHumano(entry.media, entry.mediaId);
  const ehOrfao = !tituloResolvido;
  const tituloFinal = tituloResolvido ?? t("tituloIndisponivel");
  const item = ehOrfao ? null : entryToMediaItem(entry, tituloFinal);
  // T322: melhor palpite de título para pré-preencher a busca de recuperação.
  const palpite = humanizarId(entry.mediaId) ?? "";
  // T320/D-309: botão rápido do canto abre o MENU de status (mesmo handler do
  // dropdown da ficha) — estado único, nunca handler morto.
  const [menuAberto, setMenuAberto] = useState(false);
  const OPCOES_STATUS: WatchlistColuna[] = ["WANT", "WATCHING", "COMPLETED", "DROPPED"];

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
      aria-label={tituloFinal}
      data-testid="watchlist-card"
    >
      {item ? (
        <MediaCard media={item} />
      ) : (
        // T322: órfão sem título resolvível — NUNCA um beco "Título
        // indisponível" estático; oferece a recuperação "Buscar substituta".
        <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[#2A2A3D] bg-[#0D0D1A] p-2">
          <span className="text-center text-xs leading-tight text-[#6B6B85]">{tituloFinal}</span>
          <BuscarSubstituta entryId={entry.id} palpite={palpite} />
        </div>
      )}

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
          className="flex-1 min-w-0 rounded border border-[#2A2A3D] bg-[#12121C] px-1.5 py-0.5 text-xs text-[#A0A0B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
        >
          {["WANT", "WATCHING", "COMPLETED"].map((c) => (
            <option key={c} value={c}>
              {t(colunaLabelKey(mediaType, c))}
            </option>
          ))}
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAberto((v) => !v);
            }}
            aria-label={t("moveTo")}
            aria-expanded={menuAberto}
            className="text-xs text-[#6B6B85] hover:text-[#F5F5F7] transition-colors px-1"
          >
            ⋮
          </button>
          {menuAberto && (
            <div
              role="menu"
              data-testid="card-status-menu"
              className="absolute right-0 bottom-full mb-1 z-20 min-w-[140px] rounded-md border border-[#2A2A3D] bg-[#1A1A28] p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {OPCOES_STATUS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="menuitemradio"
                  aria-checked={(entry.status ?? entry.coluna) === c}
                  onClick={() => {
                    onMove(entry.id, c);
                    setMenuAberto(false);
                  }}
                  className="block w-full text-left rounded px-2 py-1 text-xs text-[#A0A0B8] hover:bg-[#2A2A3D] hover:text-[#F5F5F7]"
                >
                  {t(colunaLabelKey(mediaType, c))}
                </button>
              ))}
              <div className="my-1 border-t border-[#2A2A3D]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRemove(entry.id);
                  setMenuAberto(false);
                }}
                disabled={removing}
                className="block w-full text-left rounded px-2 py-1 text-xs text-red-400 hover:bg-[#2A2A3D]"
              >
                {removing ? "..." : t("removeFromWatchlist")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reação rápida — habilitada ao mover para Concluído/Abandonado. */}
      {(showReactionPrompt || reacao != null) && (
        <div
          className="mt-1 flex items-center gap-1.5 px-1"
          data-testid={showReactionPrompt ? "reaction-prompt" : "reaction-inline"}
        >
          {showReactionPrompt && <span className="text-xs text-[#80809B]">{t("reactNow")}</span>}
          {REACOES.map((r) => {
            const active = reacao === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => react(r)}
                aria-pressed={active}
                aria-label={t(r === "GOSTEI" ? "gostei" : "naoGostei")}
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
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
