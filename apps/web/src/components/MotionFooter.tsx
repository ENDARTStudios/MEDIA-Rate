import { Link } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const linkHover =
  "relative text-sm text-fg-secondary transition-colors duration-200 hover:text-accent-indigo after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent-indigo after:transition-transform after:duration-200 hover:after:w-full";

/**
 * MotionFooter (T405/D-401 lote b) — SERVER COMPONENT estático: sem framer-motion e
 * sem hidratação (o fade-up/whileInView não justificava o custo de motion no shell
 * global). Conteúdo idêntico, renderizado como HTML.
 *
 * A faixa final (idioma · status · identificação legal) fecha o rodapé: o seletor de
 * idioma é o mesmo componente da Navbar, e `/status` mede o serviço na hora em vez de
 * exibir um selo verde fixo — promessa inventada é o que o `home-truthfulness` barra.
 */
export async function MotionFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative bg-surface-bg pt-20 pb-8 border-t border-accent-indigo/10"
      role="contentinfo"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(129,140,248,0.03)_0%,transparent_60%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 mb-12 md:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-heading font-bold text-fg-primary mb-2">MEDIA Rate</div>
            <p className="text-sm text-fg-secondary leading-relaxed">{t("tagline")}</p>
          </div>

          <div>
            <h3 className="text-xs font-heading font-semibold text-fg-primary uppercase tracking-widest mb-4">
              {tNav("catalog")}
            </h3>
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
              {/* Entrada para apoiadores, parceiros e patrocinadores (a página
                  /apoie não vive na Navbar de propósito: é conversa, não navegação). */}
              <li>
                <Link href="/apoie" className={linkHover}>
                  {t("support")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-heading font-semibold text-fg-primary uppercase tracking-widest mb-4">
              {t("groupContent")}
            </h3>
            <ul role="list" className="space-y-3">
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
            <h3 className="text-xs font-heading font-semibold text-fg-primary uppercase tracking-widest mb-4">
              {t("legal")}
            </h3>
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
                <Link href="/status" className={linkHover}>
                  {t("status")}
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
            <h3 className="text-xs font-heading font-semibold text-fg-primary uppercase tracking-widest mb-4">
              {t("social")}
            </h3>
            <div className="flex flex-col gap-2">
              {[
                // Telegram: link real. Instagram: sem link ainda (placeholder).
                { label: t("socialTelegram"), href: "https://t.me/MEDIARate2026" },
              ].map((social) =>
                social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    className="text-sm text-fg-secondary hover:text-accent-indigo transition-colors duration-200"
                    aria-label={social.label}
                  >
                    {social.label}
                  </a>
                ) : (
                  <span
                    key={social.label}
                    className="text-sm text-fg-secondary"
                    aria-label={social.label}
                  >
                    {social.label}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/*
          Faixa final (D-661): idioma · status · identificação legal.
          A identificação (razão social, CNPJ, cidade, contato) é texto legal: fica
          aqui e nos documentos legais, sem paráfrase — só muda com o gate legal.
        */}
        <div className="border-t border-accent-indigo/10 pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-secondary">
              <span className="font-heading font-semibold text-fg-primary">MEDIA Rate</span>
              <span aria-hidden="true" className="text-fg-disabled">
                ·
              </span>
              <span>{`Copyright © ${year} END ART Studios. ${t("rightsReserved")}`}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-fg-muted">{t("language")}</span>
                <LocaleSwitcher placement="top" />
              </div>
              <Link href="/status" className="text-xs text-fg-secondary hover:text-accent-indigo">
                {t("status")}
              </Link>
              <a
                href="mailto:endart.studios+contato@gmail.com"
                className="text-xs text-fg-secondary hover:text-accent-indigo"
              >
                {t("contact")}
              </a>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-fg-muted">
            {`END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, São Paulo — Brasil · endart.studios+contato@gmail.com`}
          </p>
        </div>

        {/* D0 (Onda D): atribuição obrigatória dos provedores de dados — termos
            do TMDB e da IGDB exigem crédito visível. Aprovada pelo Operador. */}
        <p className="px-6 pb-4 pt-6 text-center text-[11px] text-fg-muted">
          {t("atribuicao")}{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent-indigo"
          >
            themoviedb.org
          </a>{" "}
          ·{" "}
          <a
            href="https://www.igdb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent-indigo"
          >
            igdb.com
          </a>
        </p>
      </div>
    </footer>
  );
}
