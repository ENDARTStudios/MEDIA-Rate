import Link from "next/link";
import { headers } from "next/headers";
import { getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Navbar } from "@/components/Navbar";
import { MotionFooter } from "@/components/MotionFooter";

/**
 * 404 localizado (raiz). Como app/layout.tsx existe na raiz, rotas
 * inexistentes caem AQUI (o [locale]/not-found.tsx só cobre notFound()
 * lançado dentro de páginas do segmento). O middleware next-intl seta o
 * header x-next-intl-locale, então renderizamos o provider com o locale
 * correto + navbar/rodapé.
 */
export default async function NotFound() {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-next-intl-locale") || "pt-BR";
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "landing" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-[#05050A] text-[#EDE7DC]">
        <Navbar />
        <main className="flex flex-col items-center justify-center px-4 py-32 text-center">
          <p
            className="font-heading text-7xl font-bold tabular-nums text-[#818CF8]"
            aria-hidden="true"
          >
            404
          </p>
          <h1 className="mt-4 font-heading text-2xl font-semibold">{t("notFoundTitle")}</h1>
          <p className="mt-2 max-w-md text-[#9CA3AF]">{t("notFoundBody")}</p>
          <Link
            href="/"
            className="mt-8 rounded-full bg-[#818CF8] px-6 py-2.5 font-medium text-[#05050A] transition-colors hover:bg-[#A5B4FC]"
          >
            {t("notFoundCta")}
          </Link>
        </main>
        <MotionFooter locale={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
