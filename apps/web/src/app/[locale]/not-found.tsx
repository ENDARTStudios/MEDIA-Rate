import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { MotionFooter } from "@/components/MotionFooter";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NotFound({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
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
      <MotionFooter />
    </div>
  );
}
