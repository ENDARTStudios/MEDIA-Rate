"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Link } from "@/lib/navigation";
import {
  addToWatchlist,
  moveWatchlistItem,
  removeWatchlistItem,
  fetchWatchlist,
  fetchInteraction,
  setStatus,
} from "@/lib/watchlist-status-bridge";
import { ApiError, SessionExpiredError } from "@/lib/http";
import { CONSUMO_STATUSES, podeTransicionar, type ConsumoStatus } from "@/lib/api-interactions";
import { colunaLabelKey } from "@/lib/watchlist-labels";
import { STATUS_COLORS, StatusGlyph, statusLabelKey } from "@/components/interaction/StatusIcons";
import { getRelacoes, type RelacoesResponse } from "@/lib/api-relations";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

/**
 * CarouselInteractions (T405/D-399 U2) — ilha ÚNICA de event delegation para
 * os cards estáticos do carrossel (MediaCardShell). Substitui 60 ilhas por
 * card (CardIslands → WatchlistButton/StatusReactionControl + zustand/motion)
 * por UM handler delegado + UM popover reutilizável.
 *
 * - Coração: add/remove + picker de coluna; estado inicial vem do cookie
 *   `mediarate_watchlist` e é reconciliado com a API (fonte da verdade).
 * - Status (+): popover com 4 status (máquina validada no server).
 * - 401 → redirect para /login?callbackUrl=... (T238). Cross-prompt (T199)
 *   renderizado inline sem zustand/motion.
 * - A11y: focus trap, Esc, outside-click, aria-expanded no botão âncora.
 */

// Caminhos SVG mínimos por status (paridade visual com StatusGlyph, sem
// depender de lucide no DOM estático).
const STATUS_PATH: Record<ConsumoStatus, string> = {
  QUERO_CONSUMIR: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  CONSUMINDO: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2 5.5l8 4.5-8 4.5z",
  CONCLUIDO: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2 13l-4-4 1.4-1.4L10 12.2l4.6-4.6L16 9z",
  ABANDONADO: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2 13h4v-2h-4zm0-8h4v2h-4z",
};

const WL_COLUMNS = ["WANT", "WATCHING", "COMPLETED"] as const;

interface WlEntry {
  entryId: string;
  status: string;
}

interface PopoverState {
  kind: "watchlist" | "status";
  mediaId: string;
  mediaType: string;
  rect: { top: number; left: number; bottom: number };
}

interface CrossPromptState {
  mediaId: string;
  relacoes: RelacoesResponse;
  added: Set<string>;
}

function readCookie(): string[] {
  if (typeof document === "undefined") return [];
  const m = document.cookie.match(/(?:^|;\s*)mediarate_watchlist=([^;]+)/);
  if (!m) return [];
  try {
    const v: unknown = JSON.parse(decodeURIComponent(m[1]));
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function writeCookie(ids: string[]): void {
  if (typeof document === "undefined") return;
  document.cookie = `mediarate_watchlist=${encodeURIComponent(
    JSON.stringify(ids),
  )}; SameSite=Lax; Path=/; max-age=31536000`;
}

function isAuthError(e: unknown): boolean {
  return e instanceof SessionExpiredError || (e instanceof ApiError && e.status === 401);
}

export function CarouselInteractions({ children }: { children: ReactNode }) {
  const tWatch = useTranslations("watchlist");
  const tInter = useTranslations("interaction");
  const tDisc = useTranslations("discovery");
  const router = useRouter();
  const pathname = usePathname();

  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const [wl, setWl] = useState<Record<string, WlEntry>>({});
  const [statusMap, setStatusMap] = useState<Record<string, ConsumoStatus | null>>({});
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [crossPrompt, setCrossPrompt] = useState<CrossPromptState | null>(null);

  // ---- helpers de DOM (botões estáticos do shell) -----------------------

  function paintHearts(map: Record<string, WlEntry>) {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-card-action="watchlist"]').forEach((b) => {
      const id = b.dataset.mediaId ?? "";
      const type = b.dataset.mediaType ?? "movie";
      const inWl = id in map;
      b.setAttribute("data-in-watchlist", inWl ? "true" : "false");
      const label = inWl ? tWatch(colunaLabelKey(type, map[id].status)) : tWatch("addToWatchlist");
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
    });
  }

  function paintStatusButtons(map: Record<string, ConsumoStatus | null>) {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-card-action="status"]').forEach((b) => {
      const id = b.dataset.mediaId ?? "";
      const type = b.dataset.mediaType ?? "movie";
      const st = map[id] ?? null;
      const label = st
        ? tInter(statusLabelKey(type, st))
        : tInter(statusLabelKey(type, "QUERO_CONSUMIR"));
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
      if (st) {
        b.setAttribute("data-status", st);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        svg.style.color = STATUS_COLORS[st];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", STATUS_PATH[st]);
        svg.appendChild(path);
        b.replaceChildren(svg);
      }
    });
  }

  async function refreshWatchlist(): Promise<Record<string, WlEntry>> {
    const items = await fetchWatchlist();
    const map: Record<string, WlEntry> = {};
    for (const it of items) map[it.mediaId] = { entryId: it.id, status: it.status };
    setWl(map);
    setAuthed(true);
    writeCookie(Object.keys(map));
    paintHearts(map);
    return map;
  }

  function redirectLogin() {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const callbackUrl = encodeURIComponent(pathname + search);
    router.replace(`/login?callbackUrl=${callbackUrl}`);
  }

  function openPopover(p: PopoverState, btn: HTMLButtonElement) {
    setPopover(p);
    anchorRef.current = btn;
    btn.setAttribute("aria-expanded", "true");
  }

  function closePopover() {
    if (anchorRef.current) anchorRef.current.setAttribute("aria-expanded", "false");
    setPopover(null);
  }

  // ---- handlers ----------------------------------------------------------

  async function handleHeart(mediaId: string, mediaType: string) {
    if (loading.has(mediaId)) return;
    if (mediaId in wl) {
      const btn = rootRef.current?.querySelector<HTMLButtonElement>(
        `[data-card-action="watchlist"][data-media-id="${mediaId}"]`,
      );
      if (btn) {
        const r = btn.getBoundingClientRect();
        openPopover(
          {
            kind: "watchlist",
            mediaId,
            mediaType,
            rect: { top: r.top, left: r.left, bottom: r.bottom },
          },
          btn,
        );
      }
      return;
    }
    setLoading((s) => new Set(s).add(mediaId));
    try {
      await addToWatchlist(mediaId, "WANT");
      await refreshWatchlist();
      void openCrossPrompt(mediaId);
    } catch (e) {
      if (isAuthError(e)) {
        redirectLogin();
        return;
      }
      // 409 (duplicata) ou falha silenciosa — refresh mantém a verdade.
      void refreshWatchlist().catch(() => undefined);
    } finally {
      setLoading((s) => {
        const n = new Set(s);
        n.delete(mediaId);
        return n;
      });
    }
  }

  async function handleStatus(mediaId: string, mediaType: string) {
    if (authed === false) {
      redirectLogin();
      return;
    }
    const btn = rootRef.current?.querySelector<HTMLButtonElement>(
      `[data-card-action="status"][data-media-id="${mediaId}"]`,
    );
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    openPopover(
      { kind: "status", mediaId, mediaType, rect: { top: r.top, left: r.left, bottom: r.bottom } },
      btn,
    );
    // Refina o status atual (lazy) — o popover já abre com o estado conhecido.
    if (!(mediaId in statusMap)) {
      try {
        const st = await fetchInteraction(mediaId);
        setStatusMap((m) => ({ ...m, [mediaId]: st?.status ?? null }));
        if (st?.status) paintStatusButtons({ ...statusMap, [mediaId]: st.status });
      } catch (e) {
        if (isAuthError(e)) {
          setAuthed(false);
          closePopover();
          redirectLogin();
        }
      }
    }
  }

  async function selectStatus(mediaId: string, mediaType: string, next: ConsumoStatus) {
    closePopover();
    try {
      await setStatus(mediaId, next);
      const nextMap = { ...statusMap, [mediaId]: next };
      setStatusMap(nextMap);
      paintStatusButtons(nextMap);
      // T320: status dirige a coluna — re-sincroniza o coração/watchlist.
      void refreshWatchlist().catch(() => undefined);
    } catch (e) {
      if (isAuthError(e)) redirectLogin();
    }
  }

  async function selectColumn(mediaId: string, col: string) {
    closePopover();
    const entry = wl[mediaId];
    if (!entry) return;
    try {
      await moveWatchlistItem(entry.entryId, col);
      await refreshWatchlist();
    } catch (e) {
      if (isAuthError(e)) redirectLogin();
    }
  }

  async function removeFromWl(mediaId: string) {
    closePopover();
    const entry = wl[mediaId];
    if (!entry) return;
    try {
      await removeWatchlistItem(entry.entryId);
      await refreshWatchlist();
    } catch (e) {
      if (isAuthError(e)) redirectLogin();
    }
  }

  async function openCrossPrompt(mediaId: string) {
    try {
      const rel = await getRelacoes(mediaId);
      if (rel && rel.relacoes.length > 0) {
        setCrossPrompt({ mediaId, relacoes: rel, added: new Set() });
      }
    } catch {
      // Prompt é não bloqueante — falha silenciosa.
    }
  }

  async function addRelated(r: { id: string; midia: { id: string } }) {
    try {
      await addToWatchlist(r.midia.id);
      await setStatus(r.midia.id, "QUERO_CONSUMIR", { origemRelacaoId: r.id });
      setCrossPrompt((c) => (c ? { ...c, added: new Set(c.added).add(r.midia.id) } : c));
      void refreshWatchlist().catch(() => undefined);
    } catch {
      // Não bloqueante.
    }
  }

  // ---- efeitos -----------------------------------------------------------

  // Delegateção de clique (listener nativo: pega cliques em filhos RSC).
  const handlersRef = useRef({ heart: handleHeart, status: handleStatus });
  handlersRef.current = { heart: handleHeart, status: handleStatus };

  useEffect(() => {
    const container: HTMLDivElement = rootRef.current as HTMLDivElement;
    if (!container) return;
    function onClick(e: globalThis.MouseEvent) {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.("[data-card-action]") as HTMLElement | null;
      if (!btn || !container.contains(btn)) return;
      const action = btn.dataset.cardAction;
      const mediaId = btn.dataset.mediaId ?? "";
      const mediaType = btn.dataset.mediaType ?? "movie";
      e.preventDefault();
      e.stopPropagation();
      if (action === "watchlist") void handlersRef.current.heart(mediaId, mediaType);
      else if (action === "status") void handlersRef.current.status(mediaId, mediaType);
    }
    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  // Inicialização: coração via cookie (pintura imediata) + reconciliação.
  useEffect(() => {
    const ids = readCookie();
    if (ids.length > 0) {
      const map: Record<string, WlEntry> = {};
      for (const id of ids) map[id] = { entryId: "", status: "WANT" };
      paintHearts(map);
      setWl(map);
    }
    void refreshWatchlist().catch((e) => {
      if (isAuthError(e)) setAuthed(false);
    });
  }, []);

  // Focus trap + Esc + outside-click enquanto o popover está aberto.
  useEffect(() => {
    if (!popover) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closePopover();
        return;
      }
      if (e.key !== "Tab") return;
      const list = popoverRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!list || list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = popoverRef.current?.contains(active) ?? false;
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      closePopover();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    const first = popoverRef.current?.querySelector<HTMLElement>("button, [href]");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [popover]);

  // ---- render ------------------------------------------------------------

  const clampLeft = (left: number) => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    return Math.max(8, Math.min(left, width - 200));
  };

  return (
    <div ref={rootRef}>
      {children}

      {popover &&
        createPortal(
          <div
            ref={popoverRef}
            role={popover.kind === "watchlist" ? "menu" : "dialog"}
            aria-label={popover.kind === "watchlist" ? tWatch("moveTo") : tInter("updateStatus")}
            data-testid={popover.kind === "watchlist" ? "watchlist-popover" : "status-popover"}
            className="fixed z-70 w-48 rounded-xl border border-[#2A2A3D] bg-[#1B1B2C] p-2 shadow-floating"
            style={{
              position: "fixed",
              top: popover.rect.bottom + 8,
              left: clampLeft(popover.rect.left),
            }}
          >
            {popover.kind === "watchlist" ? (
              <>
                {WL_COLUMNS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="menuitem"
                    onClick={() => void selectColumn(popover.mediaId, c)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A3D] hover:text-[#EDE7DC] focus-visible:ring-2 focus-visible:ring-[#818CF8]"
                  >
                    {tWatch(colunaLabelKey(popover.mediaType, c))}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void removeFromWl(popover.mediaId)}
                  className="mt-1 w-full rounded-md border-t border-[#2A2A3E] px-2 py-1.5 text-left text-xs text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-[#818CF8]"
                >
                  {tWatch("removeFromWatchlist")}
                </button>
              </>
            ) : (
              <div
                className="grid grid-cols-1 gap-1"
                role="group"
                aria-label={tInter("statusGroup")}
              >
                {CONSUMO_STATUSES.map((s) => {
                  const cur = statusMap[popover.mediaId] ?? null;
                  const disabled = !podeTransicionar(cur, s);
                  const active = cur === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void selectStatus(popover.mediaId, popover.mediaType, s)}
                      disabled={disabled}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] ${
                        disabled
                          ? "cursor-not-allowed text-[#4A4A60]"
                          : active
                            ? "bg-[#2A2A3D] text-[#EDE7DC]"
                            : "text-[#A0A0B8] hover:bg-[#2A2A3D] hover:text-[#EDE7DC]"
                      }`}
                    >
                      <StatusGlyph status={s} size={13} filled={active} />
                      {tInter(statusLabelKey(popover.mediaType, s))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )}

      {crossPrompt &&
        createPortal(
          <div
            data-testid="watchlist-cross-prompt"
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-modal w-[min(92vw,22rem)] rounded-lg border border-[rgba(129,140,248,0.25)] bg-[#151524] p-4 shadow-floating"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-heading font-semibold text-[#EDE7DC]">
                {tDisc("crossPromptTitle")}
              </p>
              <button
                onClick={() => setCrossPrompt(null)}
                aria-label={tDisc("dismiss")}
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
              {crossPrompt.relacoes.relacoes.slice(0, 3).map((r) => {
                const token = CATEGORY_TOKENS[r.midia.tipo.toLowerCase() as MediaType];
                const Icon = token?.icon ?? CATEGORY_TOKENS.movie.icon;
                const jaAdicionado = crossPrompt.added.has(r.midia.id);
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
                      onClick={() => void addRelated(r)}
                      disabled={jaAdicionado}
                      className="shrink-0 rounded-md bg-[#818CF8] px-2.5 py-1 text-xs font-semibold text-[#0F172A] transition-colors hover:brightness-110 disabled:bg-[#2A2A3E] disabled:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5B4FC]"
                    >
                      {jaAdicionado ? tDisc("added") : tDisc("addToo")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
