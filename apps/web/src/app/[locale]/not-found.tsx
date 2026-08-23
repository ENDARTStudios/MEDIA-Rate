import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface PageProps {
  // T331: com renderização estática, o not-found é pré-renderizado SEM o
  // contexto de [locale] → params pode vir undefined. Fallback para o default.
  params?: Promise<{ locale: string }>;
}

export default async function NotFound({ params }: PageProps) {
  const resolved = await params;
  const locale = resolved?.locale ?? "pt-BR";
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  // T413: SEM Navbar/MotionFooter próprios — este not-found renderiza DENTRO
  // do layout de [locale] (que já traz AuthHeader + MotionFooter); antes
  // duplicava header/rodapé (achado do Operador).
  return (
    <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
      <p className="font-heading text-7xl font-bold tabular-nums text-[#818CF8]" aria-hidden="true">
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
    </div>
  );
}
