import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsentPreferences } from "@/components/ConsentPreferences";

/**
 * D-622 (T211) — Gerenciar cookies (A CRIAR).
 *
 * O P1 medido: a única superfície de gestão era o **dialog dentro do `ConsentBanner`**, que
 * desaparece depois da primeira decisão (`if (decided && !open) return null`) — quem aceitou
 * ou recusou não tinha como mudar de ideia. Esta rota é a porta de entrada permanente, e usa
 * o **mesmo** componente do banner (`ConsentPreferences`), para não existirem duas regras.
 *
 * Estática: o componente lê o cookie de consentimento no cliente (nada de dado de servidor).
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consent" });
  return {
    title: t("manageTitle"),
    // Página utilitária: não deve competir com a Política de Privacidade na busca.
    robots: { index: false, follow: true },
  };
}

export default async function ManageCookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "consent" });

  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-fg-primary mb-6">
        {t("manageTitle")}
      </h1>
      <p className="text-fg-secondary leading-relaxed [&_p]:max-w-[38rem]">{t("manageIntro")}</p>
      <div className="mt-8 rounded-xl border border-surface-border bg-surface-card p-6">
        <ConsentPreferences />
      </div>
      <p className="mt-6 text-sm text-fg-secondary">{t("manageEffect")}</p>
    </article>
  );
}
