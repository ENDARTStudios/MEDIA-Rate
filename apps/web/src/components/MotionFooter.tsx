import { Link } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";

const linkHover =
  "relative text-sm text-[#A0A0B8] transition-colors duration-200 hover:text-[#818CF8] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[#818CF8] after:transition-transform after:duration-200 hover:after:w-full";

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
            <div className="text-lg font-heading font-bold text-[#F5F5F7] mb-2">MEDIA Rate</div>
            <p className="text-sm text-[#A0A0B8] leading-relaxed">{t("tagline")}</p>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#F5F5F7] uppercase tracking-widest mb-4">
              {tNav("catalog")}
            </h4>
            <ul role="list" className="space-y-3">
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
              {/* T211: /faq e /sources já existiam, estão no sitemap e não eram
                  linkados em nenhum menu (achado da auditoria de UI/UX). */}
              <li>
                <Link href="/faq" className={linkHover}>
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link href="/sources" className={linkHover}>
                  {t("sources")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#F5F5F7] uppercase tracking-widest mb-4">
              {t("legal")}
            </h4>
            <ul role="list" className="space-y-3">
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
              {/* D-622: portas de entrada que faltavam — inventário de cookies, o
                  gerenciador permanente (antes só existia dentro do banner, que some
                  depois da primeira decisão), segurança e direitos do titular. */}
              <li>
                <Link href="/cookies" className={linkHover}>
                  {t("cookies")}
                </Link>
              </li>
              <li>
                <Link href="/cookies/gerenciar" className={linkHover}>
                  {t("manageCookies")}
                </Link>
              </li>
              <li>
                <Link href="/seguranca" className={linkHover}>
                  {t("security")}
                </Link>
              </li>
              <li>
                <Link href="/direitos-do-titular" className={linkHover}>
                  {t("rights")}
                </Link>
              </li>
              <li>
                <Link href="mailto:endart.studios+contato@gmail.com" className={linkHover}>
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-heading font-semibold text-[#F5F5F7] uppercase tracking-widest mb-4">
              {t("social")}
            </h4>
            <div className="flex flex-col gap-2">
              {[
                // Telegram: link real. Instagram: sem link ainda (placeholder).
                { label: t("socialTelegram"), href: "https://t.me/MEDIARate2026" },
              ].map((social) =>
                social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-sm text-[#A0A0B8] hover:text-[#818CF8] transition-colors duration-200"
                    aria-label={social.label}
                  >
                    {social.label}
                  </a>
                ) : (
                  <span
                    key={social.label}
                    className="text-sm text-[#A0A0B8]"
                    aria-label={social.label}
                  >
                    {social.label}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(129,140,248,0.08)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#A0A0B8]">{`MEDIA Rate. ${t("rights")}`}</p>
          <p className="text-xs text-[#A0A0B8]">
            {/* Expressão única: texto contíguo (sem marcadores <!-- --> do React). */}
            {`Copyright © ${year} END ART Studios`}
          </p>
          <p className="text-xs text-[#A0A0B8] mt-1">
            {`END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, São Paulo — Brasil · endart.studios+contato@gmail.com`}
          </p>
        </div>
        {/* D0 (Onda D): atribuição obrigatória dos provedores de dados — termos
            do TMDB e da IGDB exigem crédito visível. Aprovada pelo Operador. */}
        <p className="px-6 pb-4 text-center text-[11px] text-[#85859F]">
          {t("atribuicao")}{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#818CF8]"
          >
            themoviedb.org
          </a>{" "}
          ·{" "}
          <a
            href="https://www.igdb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#818CF8]"
          >
            igdb.com
          </a>
        </p>
      </div>
    </footer>
  );
}
