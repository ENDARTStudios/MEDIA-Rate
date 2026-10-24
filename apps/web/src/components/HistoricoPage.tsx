"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/http";
import { ProtectedPage } from "@/components/ProtectedPage";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { PageContainer, PageTitle } from "@/components/ui/page-shell";
import { useAuthStore } from "@/stores/use-auth-store";
import { affinityFromHistograma } from "@/lib/dashboard-overview-data";

interface HistoricoItem {
  midia_id: string;
  viewed_at: string;
  titulo: string | null;
  tipo: string | null;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score: number | null;
}

interface HistoricoResponse {
  items: HistoricoItem[];
  limite: number;
  limite_atingido: boolean;
  plano: string;
}

/** Resumo de evolução (/api/v1/user/stats) — UAT-41: o destino de "Metas e
 *  evolução" precisa mostrar evolução, não só a lista de mídias vistas. */
interface UserStatsResumo {
  total: number;
  concluidos: number;
  streak: number;
  histograma: { faixa: string; total: number }[];
  evolucao: { mes: string; total: number }[] | null;
}

function toMediaItem(i: HistoricoItem): MediaItem {
  const tipo =
    i.tipo === "FILME"
      ? "FILME"
      : i.tipo === "SERIE"
        ? "SERIE"
        : i.tipo === "GAME"
          ? "GAME"
          : "FILME";
  return {
    id: i.midia_id,
    titulo: i.titulo ?? "—",
    tipo,
    ano_lancamento: i.ano_lancamento,
    imagem_url: i.imagem_url,
    score: i.score,
  };
}

export function HistoricoPage() {
  const t = useTranslations("historico");
  const { isAuthenticated, hydrated: authHydrated } = useAuthStore();
  const [data, setData] = useState<HistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumo, setResumo] = useState<UserStatsResumo | null>(null);

  useEffect(() => {
    // D-619: espera saber quem e antes de decidir (mantem o skeleton).
    if (!authHydrated) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let ativo = true;
    void api
      .get<HistoricoResponse>("/api/v1/historico")
      .then((r) => {
        if (ativo) setData(r);
      })
      .catch((e: Error) => {
        if (ativo) setError(e.message);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    // UAT-41: resumo de evolução — falha aqui não derruba a página (é bônus).
    void api
      .get<UserStatsResumo>("/api/v1/user/stats")
      .then((r) => {
        if (ativo) setResumo(r);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [authHydrated, isAuthenticated]);

  // Delta do mês (evolução Premium; sem série, o card fica de fora).
  const ultimos = resumo?.evolucao?.slice(-2) ?? [];
  const mesAtual = resumo?.evolucao?.[resumo.evolucao.length - 1]?.total ?? null;
  const deltaMes =
    ultimos.length === 2 && ultimos[0].total > 0 ? ultimos[1].total - ultimos[0].total : null;
  const afinidade = resumo ? affinityFromHistograma(resumo.histograma) : null;

  return (
    <ProtectedPage>
      <PageContainer className="max-w-6xl">
        <PageTitle className="mb-2">{t("title")}</PageTitle>

        {resumo && (
          <section
            data-testid="historico-resumo"
            aria-label={t("summaryTitle")}
            className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { label: t("summaryRated"), value: String(resumo.total) },
              {
                label: t("summaryCompleted"),
                value:
                  resumo.total > 0
                    ? `${Math.round((resumo.concluidos / resumo.total) * 100)}%`
                    : "—",
              },
              { label: t("summaryStreak"), value: String(resumo.streak) },
              {
                label: t("summaryAffinity"),
                value: afinidade == null ? "—" : afinidade.toFixed(1).replace(".", ","),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-surface-border bg-surface-card px-4 py-3"
              >
                <p className="text-xs text-fg-muted">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-fg-primary tabular-nums">{card.value}</p>
              </div>
            ))}
            {mesAtual != null && (
              <div className="col-span-2 rounded-lg border border-surface-border bg-surface-card px-4 py-3 sm:col-span-4">
                <p className="text-xs text-fg-muted">{t("summaryMonth")}</p>
                <p className="mt-1 text-2xl font-bold text-fg-primary tabular-nums">
                  {mesAtual}{" "}
                  {deltaMes != null && (
                    <span
                      className={
                        deltaMes >= 0
                          ? "text-sm font-semibold text-accent-emerald"
                          : "text-sm font-semibold text-accent-audience"
                      }
                    >
                      {deltaMes >= 0 ? "+" : ""}
                      {deltaMes} {t("summaryVsLast")}
                    </span>
                  )}
                </p>
              </div>
            )}
          </section>
        )}

        {loading && <CatalogSkeleton count={6} />}

        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-fg-secondary mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t("retry")}</Button>
          </div>
        )}

        {!loading && data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-fg-secondary mb-4">{t("empty")}</p>
            <Link href="/catalog">
              <Button>{t("exploreCatalog")}</Button>
            </Link>
          </div>
        )}

        {data?.limite_atingido && (
          <div className="mt-4 mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-4 py-3">
            <span className="text-sm text-accent-amber">
              {t("freeLimit", { count: data.limite })}
            </span>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-accent-indigo hover:text-accent-indigo-hover"
            >
              {t("upgrade")}
            </Link>
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {data.items.map((item) => (
              // D-582 (T211): o <MediaCard> já renderiza <a href="/media/...">.
              // Envolvê-lo em outro <Link> produzia <a> dentro de <a> (HTML
              // inválido, dois alvos de clique e risco de erro de hidratação).
              <MediaCard key={item.midia_id} media={toMediaItem(item)} />
            ))}
          </div>
        )}
      </PageContainer>
    </ProtectedPage>
  );
}
