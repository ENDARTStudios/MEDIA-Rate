import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { formatPlanPrice } from "@/lib/pricing";
import { getInstitutionalContent } from "@/lib/institutional-content";

// T405 (home server-first): conteúdo estático — vira server component
// (sem hidratação). Antes era "use client" só por useTranslations/useLocale.
export async function HomeContentSections({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "homeContent" });

  /**
   * M14 da auditoria: a home mantinha 6 perguntas **paralelas** (chaves `faq1Q…faq6A`)
   * que repetiam — e divergiam — do FAQ real, e o CTA apontava para `/pricing#faq` em
   * vez da página canônica. Agora a home mostra as 3 primeiras perguntas da **mesma
   * fonte** de `/faq` e `/methodology` (`institutional-content`) e linka `/faq`.
   */
  const { faqTitle, faqs: faqsInstitucionais } = getInstitutionalContent(locale).methodology;
  const faqsDaHome = faqsInstitucionais.slice(0, 3);

  const plusPrice = formatPlanPrice(4.9, locale, "R$");
  const premiumPrice = formatPlanPrice(9.9, locale, "R$");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* H2 1 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{t("whatIsTitle")}</h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("whatIsProposalTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("whatIsProposalBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("whatIsDifferenceTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("whatIsDifferenceBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("whatIsCategoriesTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("whatIsCategoriesBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 2 */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">
          {t("howItWorksTitle")}
        </h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("howMethodologyTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("howMethodologyBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("howSourcesTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("howSourcesBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("howCoverageTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("howCoverageBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("howConfidenceTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("howConfidenceBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 3 — Catalog */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{t("catalogTitle")}</h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("catalogNavTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("catalogNavBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("catalogDetailTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("catalogDetailBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("catalogSeasonsTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("catalogSeasonsBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 4 — Search */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{t("searchTitle")}</h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("searchQuickTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("searchQuickBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("searchFiltersTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("searchFiltersBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("searchRecommendTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("searchRecommendBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 5 — Plans */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{t("plansTitle")}</h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("plansCompareTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">
              {t("plansCompareBody", { plusPrice, premiumPrice })}
            </p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("plansBenefitsTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("plansBenefitsBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("plansCancelTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("plansCancelBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 6 — Account */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{t("accountTitle")}</h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("accountCreateTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("accountCreateBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("accountWatchlistTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("accountWatchlistBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("accountPrivacyTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">
              {t("accountPrivacyBody")}{" "}
              <Link href="/privacy" className="text-[#818CF8] underline">
                {t("accountPrivacyLink")}
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* H2 7 — Languages */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">
          {t("languagesTitle")}
        </h2>
        <div className="max-w-[30rem] space-y-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("languagesAvailableTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">
              {t("languagesAvailableBody")}{" "}
              <Link href="/" locale="pt-BR" className="text-[#818CF8] underline">
                {t("languagesPt")}
              </Link>
              ,{" "}
              <Link href="/" locale="en-US" className="text-[#818CF8] underline">
                {t("languagesEn")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="/" locale="es-ES" className="text-[#818CF8] underline">
                {t("languagesEs")}
              </Link>
              .
            </p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("languagesSwitchTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("languagesSwitchBody")}</p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#A0A0B8] mb-2">
              {t("languagesSeoTitle")}
            </h3>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("languagesSeoBody")}</p>
          </div>
        </div>
      </section>

      {/* H2 8 — FAQ (M14: 3 perguntas da fonte canônica + link para /faq) */}
      <section>
        <h2 className="font-heading text-2xl font-bold text-[#F5F5F7] mb-8">{faqTitle}</h2>
        <div className="max-w-[30rem] space-y-6">
          {faqsDaHome.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-heading text-base font-semibold text-[#A0A0B8] mb-1">
                {faq.question}
              </h3>
              <p className="text-sm text-[#A0A0B8] leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#A0A0B8] mt-4">
          <Link href="/faq" className="text-[#818CF8] underline">
            {t("faqCta")}
          </Link>
        </p>
      </section>
    </div>
  );
}
