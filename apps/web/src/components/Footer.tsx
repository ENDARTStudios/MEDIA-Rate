import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-black border-t border-surface-border mt-auto"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-accent-500">MEDIA Rate</span>
            <span className="text-xs text-gray-500">&copy; {year}. {t("rights")}</span>
          </div>
          <nav aria-label="Links do rodapé">
            <ul className="flex gap-6 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-gray-200 transition-colors">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-gray-200 transition-colors">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/user/data" className="text-gray-400 hover:text-gray-200 transition-colors">
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
