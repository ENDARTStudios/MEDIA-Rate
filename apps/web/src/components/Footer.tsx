import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            &copy; {year} MEDIA Rate. {t("rights")}
          </p>
          <nav aria-label="Links do rodapé">
            <ul className="flex space-x-6 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-100"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-100"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link
                  href="/user/data"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-100"
                >
                  LGPD
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
