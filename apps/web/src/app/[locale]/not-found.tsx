import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-700 dark:text-primary-100">404</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Página não encontrada</p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800"
        >
          {t("appName")}
        </Link>
      </div>
    </div>
  );
}
