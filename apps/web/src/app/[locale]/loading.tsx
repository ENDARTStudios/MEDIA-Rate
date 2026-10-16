"use client";

import { useTranslations } from "next-intl";
import { RouteSkeleton } from "@/components/ui/RouteSkeleton";

/**
 * D-582.5 (T211) — `loading.tsx` do segmento `[locale]`: cobre TODAS as rotas
 * localizadas (navegação instantânea) sem 45 arquivos duplicados.
 *
 * Importante: no App Router o `loading.tsx` **não recebe `params`** (só
 * `page`/`layout`/`generateMetadata` recebem). A primeira versão deste arquivo
 * tentava `await params` e derrubava TODA rota com 500
 * ("Cannot destructure property 'locale' of '(intermediate value)'").
 * O rótulo vem do `NextIntlClientProvider` do layout de locale (logo acima
 * deste limite de Suspense), por isso é client component.
 */
export default function LocaleLoading() {
  const t = useTranslations("common");
  return <RouteSkeleton label={t("loading")} />;
}
