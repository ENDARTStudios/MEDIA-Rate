"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/lib/navigation";

/**
 * Onda 3 feedback do Operador — navegação da Área de Administrador presente
 * em TODAS as páginas /admin/* (App Router layout) + botão de retorno à
 * página anterior. Rotas @Roles("ADMIN") no backend.
 *
 * T202: este shell SÓ é renderizado depois do gate server-side do layout
 * (sessão + papel ADMIN validados via getServerAdminGate) — nunca antes.
 */

/**
 * D-623 (T211) — três correções medidas nesta sessão:
 *
 * 1. **i18n**: os rótulos eram literais em português aqui dentro (o censo `i18n:source` mediu
 *    um deles), então o admin aparecia em PT mesmo com a interface em EN/ES. Agora vêm do
 *    namespace `admin`.
 * 2. **Tokens**: o shell usava `bg-surface-card` / `border-surface-border` — classes de
 *    **modo claro** num produto dark-only, ou seja, um segundo design system dentro da mesma
 *    tela. Trocadas pelos tokens (`bg-surface-card`, `border-surface-border`, `text-fg-*`),
 *    que também resolvem o contraste medido pelo axe nas telas do admin.
 * 3. **`aria-current`**: o item ativo da navegação não era anunciado a leitor de tela. O
 *    padrão correto já existe no produto (`TopPageClient.tsx:113`).
 */
const ITENS: { href: string; chave: string }[] = [
  { href: "/admin/diagnostics", chave: "navDiagnostics" },
  { href: "/admin/usuarios", chave: "navUsers" },
  { href: "/admin/catalogo", chave: "navCatalog" },
  { href: "/admin/metricas", chave: "navMetrics" },
  { href: "/admin/auditoria", chave: "navAudit" },
  { href: "/admin/lgpd", chave: "navLgpd" },
];

export default function AdminShell() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin");

  return (
    <nav
      aria-label={t("navLabel")}
      data-testid="admin-nav"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-card p-2">
        <button
          type="button"
          onClick={() => router.back()}
          data-testid="admin-voltar"
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-fg-secondary hover:bg-surface-elevated"
        >
          ← {t("navBack")}
        </button>
        {ITENS.map((item) => {
          // D-623: `/admin` é prefixo de todas as rotas — o ativo tem de ser o caminho exato.
          const ativo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              data-testid={`admin-nav-link-${item.href.replace("/admin/", "")}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-surface-elevated ${
                ativo ? "bg-surface-elevated text-fg-primary" : "text-accent-indigo"
              }`}
            >
              {t(item.chave)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
