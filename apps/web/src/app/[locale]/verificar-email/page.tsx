import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * T211: o `title` era hardcoded em pt-BR ("Verificação de email — MEDIA Rate")
 * e aparecia assim em en-US/es-ES. Agora vem do namespace `auth` (3 locales).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("verifyMetaTitle"),
    description: t("verifyMetaDescription"),
    robots: { index: false, follow: false },
  };
}

/**
 * Achado A7 da auditoria (2026-10) — "pós-cadastro sem SSR útil".
 *
 * Esta rota é **ponto de entrada por e-mail**: quem clica no link chega aqui, muitas
 * vezes num navegador embutido de cliente de e-mail, antes de qualquer JS rodar. O que
 * existia era `Suspense fallback={null}` em volta de um componente que usa
 * `useSearchParams` — ou seja, **zero HTML útil** na resposta do servidor: sem JS a tela
 * ficava em branco.
 *
 * Agora o **casco é renderizado no servidor** (cartão, título e a explicação do que é
 * esta página) e o `Suspense` entrega, no lugar do vazio, a linha honesta de
 * "verificando…". O cliente cuida só do desfecho: sucesso, link inválido e reenvio.
 */
export default async function VerifyEmailPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4 py-16">
      <div className="w-full rounded-xl border border-surface-border bg-surface-card p-8 text-center">
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg-primary">
          {t("verifyMetaTitle")}
        </h1>
        <p className="mb-6 text-sm text-fg-secondary">{t("verifyMetaDescription")}</p>

        {/* useSearchParams exige limite Suspense no App Router — mas o limite não pode
            entregar `null`: aqui ele entrega o estado de "verificando…" no HTML. */}
        <Suspense
          fallback={
            <p role="status" aria-live="polite" className="text-sm text-fg-secondary">
              {t("verifyTitle")}
            </p>
          }
        >
          <VerifyEmailClient />
        </Suspense>
      </div>
    </div>
  );
}
