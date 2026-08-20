import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/lib/navigation";
import { ConfettiCelebration } from "@/components/ui/ConfettiCelebration";

export const metadata: Metadata = { robots: { index: false, follow: true } };

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

/**
 * T363 (D-336) — página de sucesso pós-compra com confete + copy por plano.
 */
export default async function BillingSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("billing");
  const { plan } = await searchParams;

  const title =
    plan === "premium"
      ? t("successPremiumTitle")
      : plan === "plus"
        ? t("successPlusTitle")
        : t("successTitle");
  const subtitle =
    plan === "premium"
      ? t("successPremiumSubtitle")
      : plan === "plus"
        ? t("successPlusSubtitle")
        : t("successSubtitle");

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <ConfettiCelebration />
      <div className="relative z-10 max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#E11D48]/15 text-[#E11D48]">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-4 font-heading text-3xl font-bold text-[#F5F5F7]">{title}</h1>
        <p className="mb-8 leading-relaxed text-[#9CA3AF]">{subtitle}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110"
        >
          {t("startExploring")}
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
