"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { api } from "@/lib/http";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { generoLabel, type Locale } from "@/lib/genero-labels";
import { statusLabelKey } from "@/components/interaction/StatusIcons";
import { ReactionGlyph } from "@/components/interaction/StatusIcons";
import { tituloHumano } from "@/components/watchlist/WatchlistCard";
import type { ConsumoStatus } from "@/lib/api-interactions";

interface StatsShape {
  generos?: Record<string, number>;
  tipos?: Record<string, number>;
}

interface Atividade {
  midia_id?: string;
  status?: string;
  reacao?: string | null;
  atualizado_em?: string;
  midia?: { id?: string; titulo?: string | null; tipo?: string } | null;
}

function tempoRelativo(
  iso: string | undefined,
  t: (k: string, vals?: Record<string, unknown>) => string,
): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("justNow");
  if (min < 60) return t("minutesAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t("hoursAgo", { n: h });
  return t("daysAgo", { n: Math.floor(h / 24) });
}

export function ProfileContent() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { user } = useAuthStore();
  const { entries, isLoading, fetchWatchlist } = useWatchlistStore();
  const [stats, setStats] = useState<StatsShape | null>(null);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWatchlist();
    void api
      .get<StatsShape>("/api/v1/user/stats")
      .then(setStats)
      .catch(() => undefined);
    void api
      .get<Atividade[]>("/api/v1/interacoes")
      .then((d) => setAtividades(Array.isArray(d) ? d : []))
      .catch(() => undefined);
  }, [fetchWatchlist]);

  const total = entries.length;
  const st: Record<string, number> = { WANT: 0, WATCHING: 0, COMPLETED: 0, DROPPED: 0 };
  entries.forEach((e) => {
    st[e.status] = (st[e.status] || 0) + 1;
  });
  const completed = st.COMPLETED || 0;
  const watching = st.WATCHING || 0;
  const dropped = st.DROPPED || 0;

  const badges = [
    { name: t("explorerTitle"), desc: t("explorerDesc"), unlocked: total >= 5 },
    { name: t("marathonerTitle"), desc: t("marathonerDesc"), unlocked: completed >= 3 },
    { name: t("activeTitle"), desc: t("activeDesc"), unlocked: watching >= 1 },
  ];

  // T321: top gêneros do /user/stats com labels localizados.
  const topGeneros = useMemo(() => {
    const g = stats?.generos ?? {};
    return Object.entries(g)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats]);

  // T321: últimas 10 atividades (ordem do API: atualizado_em desc).
  const ultimasAtividades = useMemo(() => (atividades ?? []).slice(0, 10), [atividades]);
  const membroDesde = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale, { month: "short", year: "numeric" })
    : "—";

  if (isLoading && total === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center text-[#9CA3AF]">{tc("loading")}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-full bg-[#818CF8]/20 flex items-center justify-center text-2xl font-heading font-bold text-[#818CF8] shrink-0">
          {user?.name?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#EDE7DC]">
            {user?.name ?? t("user")}
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            {t("planFreeSince", { plan: user?.plan ?? "FREE", date: membroDesde })}
          </p>
          {total > 0 && (
            <p className="text-xs text-[#6B7280] mt-1">
              {total} {t("titles")}
            </p>
          )}
        </div>
      </div>

      {/* Perfil público compartilhável (T193) — link agregado, sem dados sensíveis. */}
      {user?.id && (
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-5 mb-8">
          <p className="text-sm font-semibold text-[#F5F5F7] mb-1">{t("shareLink")}</p>
          <p className="text-xs text-[#80809B] mb-3">{t("shareHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-[#2A2A3D] bg-[#09090F] px-3 py-1.5 text-xs text-[#A0A0B8] break-all">
              {`${window.location.origin}/pt-BR/user/${user.id}`}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${window.location.origin}/pt-BR/user/${user.id}`,
                );
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? t("copied") : t("copyLink")}
            </Button>
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="text-center py-12 text-[#9CA3AF]">
          <p className="mb-4">{t("emptyMessage")}</p>
          <Link href="/catalog">
            <Button variant="outline">{t("exploreCatalog")}</Button>
          </Link>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: t("inWatchlist"), value: total },
              { label: t("completed"), value: completed },
              { label: t("watching"), value: watching },
              { label: t("dropped"), value: dropped },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[#11111E] rounded-md p-5 text-center border border-[rgba(129,140,248,0.08)]"
              >
                <p className="text-3xl font-heading font-bold text-[#EDE7DC] tabular-nums">
                  {value}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {t("favoriteGenres")}
            </h2>
            <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
              {topGeneros.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-8">{t("tasteEmpty")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topGeneros.map(([g, n]) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#818CF8]/30 bg-[#818CF8]/10 px-3 py-1 text-sm font-medium text-[#818CF8]"
                    >
                      {generoLabel(g, locale)}
                      <span className="text-xs opacity-70 tabular-nums">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {t("badges")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${b.unlocked ? "bg-[#818CF8]/10 border-[#818CF8]/30 text-[#818CF8]" : "bg-[#11111E] border-[rgba(129,140,248,0.08)] text-[#6B7280]"}`}
                >
                  {b.unlocked ? "★" : "☆"} {b.name}
                  <span className="ml-2 text-xs opacity-60">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">
              {t("recentActivity")}
            </h2>
            <div className="bg-[#11111E] rounded-md p-6 border border-[rgba(129,140,248,0.08)]">
              {ultimasAtividades.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-8">{t("recentEmpty")}</p>
              ) : (
                <ul className="divide-y divide-[#2A2A3D]">
                  {ultimasAtividades.map((a, i) => {
                    const tipo = a.midia?.tipo?.toLowerCase();
                    const st = a.status as ConsumoStatus | undefined;
                    const label = st ? statusLabelKey(tipo, st) : undefined;
                    const titulo =
                      tituloHumano(
                        { title: a.midia?.titulo ?? undefined },
                        a.midia?.id ?? a.midia_id,
                      ) ??
                      t("tituloIndisponivel") ??
                      "…";
                    return (
                      <li key={a.midia_id ?? i} className="flex items-center gap-3 py-2.5">
                        {a.reacao && (
                          <ReactionGlyph reacao={a.reacao as "GOSTEI" | "NAO_GOSTEI"} size={16} />
                        )}
                        <span className="text-sm text-[#F5F5F7] truncate">{titulo}</span>
                        {label && <span className="text-xs text-[#9CA3AF] shrink-0">{label}</span>}
                        <span className="ml-auto text-xs text-[#6B7280] shrink-0">
                          {tempoRelativo(
                            a.atualizado_em,
                            t as (k: string, vals?: Record<string, unknown>) => string,
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
