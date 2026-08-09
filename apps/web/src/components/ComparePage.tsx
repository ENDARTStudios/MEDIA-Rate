"use client";

/**
 * Comparador de perfis (Premium — D-132): dois usuários lado a lado,
 * com stats públicas (watchlist, tipos, gêneros favoritos, score médio).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
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

function PerfilCard({ stats, label }: { stats: PerfilStats; label: string }) {
  const t = useTranslations("compare");
  const tc = useTranslations("catalog");
  const score = stats.score_medio;
  return (
    <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6 flex-1">
      <p className="text-xs uppercase tracking-widest text-[#6B6B85] mb-1">{label}</p>
      <h3 className="text-xl font-heading font-bold text-[#F5F5F7] mb-5">
        {stats.usuario.nome ?? "Perfil"}
      </h3>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-[#A0A0B8]">{t("total")}</dt>
          <dd className="tabular-nums text-[#F5F5F7] font-semibold">{stats.total}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#A0A0B8]">{t("scoreMedio")}</dt>
          <dd
            className="tabular-nums font-semibold"
            style={{
              color:
                score == null
                  ? "#6B6B85"
                  : score >= 70
                    ? "#34D399"
                    : score >= 40
                      ? "#FBBF24"
                      : "#F87171",
            }}
          >
            {score == null ? "—" : score.toFixed(1)}
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#A0A0B8]">
        {t("byType")}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(stats.por_tipo).length === 0 && (
          <span className="text-xs text-[#6B6B85]">—</span>
        )}
        {Object.entries(stats.por_tipo).map(([tipo, count]) => (
          <span
            key={tipo}
            className="rounded-full border border-[#2A2A3D] bg-[#1B1B2C] px-2.5 py-1 text-xs text-[#F5F5F7]"
          >
            {tc(TIPO_LABEL_KEY[tipo] ?? "") || tipo}: {count}
          </span>
        ))}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#A0A0B8]">
        {t("topGenres")}
      </p>
      <ul className="mt-2 space-y-1">
        {stats.generos_top.length === 0 && <li className="text-xs text-[#6B6B85]">—</li>}
        {stats.generos_top.map((g) => (
          <li key={g.nome} className="flex justify-between text-sm">
            <span className="text-[#A0A0B8]">{g.nome}</span>
            <span className="tabular-nums text-[#F5F5F7]">{g.count}</span>
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
      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">{t("title")}</h1>
        <p className="text-sm text-[#A0A0B8] mb-8">{t("description")}</p>

        <div className="mb-8 flex flex-col sm:flex-row gap-3">
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
              className="flex-1 rounded-md border border-[#2A2A3D] bg-[#12121C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
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
          <div className="flex flex-col md:flex-row gap-6">
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
          <div className="rounded-lg border border-dashed border-[#2A2A3D] py-20 text-center">
            <p className="text-sm text-[#6B6B85]">{t("hint")}</p>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
