import { Link } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";

const linkHover =
  "relative text-sm text-[#9CA3AF] transition-colors duration-200 hover:text-[#818CF8] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[#818CF8] after:transition-all after:duration-200 hover:after:w-full";

/**
 * MotionFooter (T405/D-401 lote b) — agora SERVER COMPONENT estático: sem
 * framer-motion e sem hidratação (o fade-up/whileInView não justificava o
 * custo de motion no shell global). Conteúdo idêntico, renderizado como HTML.
 */
export async function MotionFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative bg-[#09090F] pt-20 pb-8 border-t border-[rgba(129,140,248,0.08)]"
      role="contentinfo"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(129,140,248,0.03)_0%,transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-heading font-bold text-[#EDE7DC] mb-2">MEDIA Rate</div>
            <p className="text-sm text-[#6B7280] leading-relaxed">{t("tagline")}</p>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              {tNav("catalog")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/catalog" className={linkHover}>
                  {tNav("catalog")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkHover}>
                  {tNav("pricing")}
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkHover}>
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/methodology" className={linkHover}>
                  MEDIA Score™
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              {t("legal")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className={linkHover}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkHover}>
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/user/data" className={linkHover}>
                  {t("lgpd")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#EDE7DC] uppercase tracking-widest mb-4">
              {t("social")}
            </h4>
            <div className="flex gap-4">
              {[
                { label: t("socialGithub"), href: "https://github.com/ENDARTStudios/MEDIA-Rate" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-sm text-[#9CA3AF] hover:text-[#818CF8] transition-colors duration-200"
                  aria-label={social.label}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(129,140,248,0.08)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#6B7280]">
            {/* Expressão única: texto contíguo (sem marcadores <!-- --> do React),
                garantindo a string literal exata no HTML renderizado. */}
            {`Copyright © ${year} END ART Studios · MEDIA Rate. ${t("rights")}`}
          </p>
          <p className="text-xs text-[#6B7280]">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
