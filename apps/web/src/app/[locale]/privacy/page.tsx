import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: localizedUrl(locale, "/privacy"),
      languages: localizedAlternates("/privacy"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">{t("h1")}</h1>
      <p className="text-sm text-[#6B7280] mb-8">{t("lastUpdated")}</p>
      <div className="space-y-8 text-[#9CA3AF] leading-relaxed">
        {[1, 2, 3, 4, 5].map((n) => (
          <section key={n}>
            <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
              {t("s" + n + "h")}
            </h2>
            <p className="whitespace-pre-line">{t("s" + n + "b")}</p>
          </section>
        ))}
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
            {t("sRetTableTitle")}
          </h2>
          <PipeTable source={t("sRetTable")} />
          <p className="mt-3 text-sm">{t("sRetNote")}</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">{t("sAiH")}</h2>
          <p className="whitespace-pre-line">{t("sAiB")}</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">{t("sMinH")}</h2>
          <p className="whitespace-pre-line">{t("sMinB")}</p>
        </section>
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
            {t("sCookTableTitle")}
          </h2>
          <PipeTable source={t("sCookTable")} />
        </section>
        {[6, 7, 8, 9].map((n) => (
          <section key={n}>
            <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
              {t("s" + n + "h")}
            </h2>
            <p className="whitespace-pre-line">{t("s" + n + "b")}</p>
          </section>
        ))}
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
            {t("sTrTableTitle")}
          </h2>
          <PipeTable source={t("sTrTable")} />
          <p className="mt-3 text-sm">{t("sTrNote")}</p>
        </section>
        {[10, 11, 12].map((n) => (
          <section key={n}>
            <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">
              {t("s" + n + "h")}
            </h2>
            <p className="whitespace-pre-line">{t("s" + n + "b")}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Tabela renderizada de string i18n: primeira linha = cabeçalho, células
 * separadas por "|" e linhas por "\n" (mesmo formato de sCookTable).
 * T472: usada pelas matrizes de retenção e transferências (fonte única
 * docs/PRIVACY_MATRIX.md, guard apps/web/test/i18n-parity.spec.ts).
 */
function PipeTable({ source }: { source: string }) {
  const rows = source.split("\n");
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-[#2A2A3D]">
        <thead>
          <tr className="bg-[#12121C] text-left text-[#818CF8]">
            {header.split("|").map((h, k) => (
              <th key={k} className="px-2 py-2 font-semibold">
                {h.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-t border-[#2A2A3D]">
              {row.split("|").map((cell, k) => (
                <td key={k} className="px-2 py-2 text-[#9CA3AF]">
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
