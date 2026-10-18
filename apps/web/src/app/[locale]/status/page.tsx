import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/ui/page-shell";

/**
 * /status — status do serviço medido AGORA (não é média histórica).
 *
 * Existe porque a faixa final do rodapé precisava de "status" e não havia página
 * pública para onde apontar: qualquer selo verde fixo seria promessa inventada (a
 * regra do `home-truthfulness`). Aqui o servidor consulta `GET /health` da API a
 * cada abertura e mostra o que voltou — inclusive quando não voltou nada.
 *
 * `force-dynamic` de propósito: um status em cache de 5 min não é status.
 */
export const dynamic = "force-dynamic";

const API_BASE = process.env.API_PROXY_TARGET ?? "https://media-rate-production.up.railway.app";
const TIMEOUT_MS = 3000;

type Sonda =
  | { estado: "operational"; ms: number; version: string; uptimeSegundos: number }
  | { estado: "degraded"; ms: number }
  | { estado: "unavailable" };

async function sondar(): Promise<Sonda> {
  const inicio = Date.now();
  try {
    const res = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    const ms = Date.now() - inicio;
    if (!res.ok) return { estado: "degraded", ms };
    const corpo = (await res.json()) as { status?: string; version?: string; uptime?: number };
    if (corpo.status !== "ok") return { estado: "degraded", ms };
    return {
      estado: "operational",
      ms,
      version: corpo.version ?? "—",
      uptimeSegundos: typeof corpo.uptime === "number" ? corpo.uptime : 0,
    };
  } catch {
    // timeout, DNS, 502: sem resposta é "unavailable", nunca "operational".
    return { estado: "unavailable" };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "status" });
  return {
    title: t("title"),
    description: t("intro"),
    robots: { index: false, follow: false },
  };
}

const CORES = {
  operational: { ponto: "bg-accent-emerald", texto: "text-accent-emerald" },
  degraded: { ponto: "bg-accent-amber", texto: "text-accent-amber" },
  unavailable: { ponto: "bg-score-low", texto: "text-score-low" },
} as const;

function humana(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  if (h >= 24) return `${Math.floor(h / 24)} d`;
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.floor(segundos / 60))} min`;
}

export default async function StatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "status" });

  const sonda = await sondar();
  const cor = CORES[sonda.estado];
  const hora = new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(new Date());

  return (
    <PageShell title={t("title")} intro={t("intro")}>
      <div
        className="max-w-xl rounded-xl border border-surface-border bg-surface-card p-6"
        data-testid="status-sonda"
      >
        <p className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cor.ponto}`}
            aria-hidden="true"
          />
          <span className={`font-heading text-xl font-bold ${cor.texto} sm:text-2xl`}>
            {t(sonda.estado)}
          </span>
        </p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-fg-secondary">{t("checkedAt", { time: hora })}</dt>
            <dd className="tabular-nums text-fg-muted">
              {sonda.estado === "unavailable" ? "—" : t("latency", { ms: sonda.ms })}
            </dd>
          </div>
          {sonda.estado === "operational" ? (
            <>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-fg-secondary">{t("version", { version: sonda.version })}</dt>
                <dd className="tabular-nums text-fg-muted">
                  {t("uptime", { hours: humana(sonda.uptimeSegundos) })}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-fg-muted">{t("explain")}</p>
      </div>
    </PageShell>
  );
}
