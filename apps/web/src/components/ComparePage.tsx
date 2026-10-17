"use client";

import { formatarScoreLocale } from "@/lib/score-utils";
import { colors } from "@/lib/design-tokens";

/**
 * Comparador de perfis (Premium — D-132): dois usuários lado a lado,
 * com stats públicas (watchlist, tipos, gêneros favoritos, score médio).
 *
 * O h1 e a descrição da página vêm do PageShell — este componente é só a
 * superfície de conteúdo (D-661).
 */
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";

interface PerfilStats {
  usuario: { id: string; nome: string | null };
  total: number;
  por_tipo: Record<string, number>;
  por_coluna: Record<string, number>;
  generos_top: { nome: string; count: number }[];
  score_medio: number | null;
}

// T243: rótulos de tipo via chaves i18n do namespace catalog (nunca PT).
const TIPO_LABEL_KEY: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
  COMIC: "comic",
  MANGA: "manga",
  ANIME: "manga",
};

/**
 * Faixa do score médio (0-100, escala própria deste comparador: 70/40).
 * As cores vêm de `design-tokens` — a escala 0-10 do `scoreColor()` tem outros
 * limiares e aqui trocaria a cor exibida.
 */
function corDoScore(score: number | null): string {
  if (score == null) return colors.text.muted;
  if (score >= 70) return colors.score.high;
  if (score >= 40) return colors.score.medium;
  return colors.score.low;
}

function PerfilCard({ stats, label }: { stats: PerfilStats; label: string }) {
  const locale = useLocale();
  const t = useTranslations("compare");
  const tc = useTranslations("catalog");
  const score = stats.score_medio;
  return (
    <div className="flex-1 rounded-lg border border-surface-border bg-surface-card p-6">
      <p className="mb-1 text-xs uppercase tracking-widest text-fg-muted">{label}</p>
      <h3 className="mb-5 font-heading text-xl font-bold text-fg-primary">
        {stats.usuario.nome ?? t("profile")}
      </h3>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-secondary">{t("total")}</dt>
          <dd className="font-semibold tabular-nums text-fg-primary">{stats.total}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-fg-secondary">{t("scoreMedio")}</dt>
          <dd className="font-semibold tabular-nums" style={{ color: corDoScore(score) }}>
            {score == null ? "—" : formatarScoreLocale(score, locale)}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-fg-secondary">
        {t("byType")}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(stats.por_tipo).length === 0 && (
          <span className="text-xs text-fg-muted">—</span>
        )}
        {Object.entries(stats.por_tipo).map(([tipo, count]) => (
          <span
            key={tipo}
            className="rounded-full border border-surface-border bg-surface-elevated px-2.5 py-1 text-xs text-fg-primary"
          >
            {tc(TIPO_LABEL_KEY[tipo] ?? "") || tipo}: {count}
          </span>
        ))}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-fg-secondary">
        {t("topGenres")}
      </p>
      <ul role="list" className="mt-2 space-y-1">
        {stats.generos_top.length === 0 && <li className="text-xs text-fg-muted">—</li>}
        {stats.generos_top.map((g) => (
          <li key={g.nome} className="flex justify-between text-sm">
            <span className="text-fg-secondary">{g.nome}</span>
            <span className="tabular-nums text-fg-primary">{g.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparePage() {
  const t = useTranslations("compare");
  const [ids, setIds] = useState(["", ""]);
  const [stats, setStats] = useState<(PerfilStats | null)[]>([null, null]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comparar() {
    setBusy(true);
    setError(null);
    try {
      const resultados = await Promise.all(
        ids.map(async (id) => {
          const trimmed = id.trim();
          if (!trimmed) return null;
          const data = await api.get<PerfilStats>(`/api/v1/usuarios/${trimmed}/stats`);
          return data ?? null;
        }),
      );
      setStats(resultados);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        {[0, 1].map((i) => (
          <input
            key={i}
            type="text"
            value={ids[i]}
            onChange={(e) => {
              const next = [...ids];
              next[i] = e.target.value;
              setIds(next);
            }}
            placeholder={t("userId") + ` ${i + 1}`}
            className="flex-1 rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-indigo"
          />
        ))}
        <Button onClick={() => void comparar()} disabled={busy}>
          {busy ? "..." : t("compare")}
        </Button>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {stats[0] != null || stats[1] != null ? (
        <div className="flex flex-col gap-6 md:flex-row">
          {stats[0] ? (
            <PerfilCard stats={stats[0]} label={t("profile") + " 1"} />
          ) : (
            <div className="flex-1" />
          )}
          {stats[1] ? (
            <PerfilCard stats={stats[1]} label={t("profile") + " 2"} />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-surface-border py-20 text-center">
          <p className="text-sm text-fg-muted">{t("hint")}</p>
        </div>
      )}
    </ProtectedPage>
  );
}
