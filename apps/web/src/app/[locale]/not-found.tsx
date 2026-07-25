import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "404 — MEDIA Rate" };

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-100">404</h1>
        <p className="mt-4 text-lg text-gray-400">{t("notFound")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400"
        >
          {t("notFoundCta")}
        </Link>
      </div>
    </div>
  );
}
