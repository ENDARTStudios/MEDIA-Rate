import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";
import { BibliotecaClient } from "@/components/biblioteca/BibliotecaClient";
import { PageShell } from "@/components/ui/page-shell";
import { colors } from "@/lib/design-tokens";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

// T412 (D-390): página autenticada — nunca em cache ISR/CDN.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_VALIDOS = ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"] as const;
const TIPOS_VALIDOS = ["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"] as const;

/** Valor de query validado contra allowlist (inválido → fallback, nunca quebra). */
function queryValida<T extends readonly string[]>(
  valor: string | string[] | undefined,
  permitidos: T,
): T[number] | null {
  if (typeof valor !== "string") return null;
  return (permitidos as readonly string[]).includes(valor) ? (valor as T[number]) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "biblioteca" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/biblioteca"),
      languages: localizedAlternates("/biblioteca"),
    },
    robots: { index: false, follow: false },
  };
}

export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("biblioteca");
  const sp = await searchParams;
  // D-525: query params validados contra enum — inválidos caem no padrão.
  const initialStatus = queryValida(sp.status, STATUS_VALIDOS);
  const initialTipo = queryValida(sp.tipo, TIPOS_VALIDOS);

  return (
    <ProtectedPage>
      <PageShell
        top={
          // T388: faixa de identidade do plano (cor via --plan-accent).
          <div
            className="h-1 w-24 rounded-full"
            style={{ backgroundColor: `var(--plan-accent, ${colors.accent.indigo})` }}
            aria-hidden="true"
          />
        }
        title={t("title")}
        intro={t("subtitle")}
      >
        <BibliotecaClient initialStatus={initialStatus} initialTipo={initialTipo} />
      </PageShell>
    </ProtectedPage>
  );
}
