"use client";

import { Link, useRouter } from "@/lib/navigation";

/**
 * Onda 3 feedback do Operador — navegação da Área de Administrador presente
 * em TODAS as páginas /admin/* (App Router layout) + botão de retorno à
 * página anterior. Rotas @Roles("ADMIN") no backend.
 */
const ITENS: { href: string; label: string }[] = [
  { href: "/admin/diagnostics", label: "Diagnóstico" },
  { href: "/admin/usuarios", label: "Gestão de usuários" },
  { href: "/admin/catalogo", label: "Catálogo" },
  { href: "/admin/metricas", label: "Métricas" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/lgpd", label: "LGPD" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div>
      <nav
        aria-label="Área de administrador"
        data-testid="admin-nav"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
          <button
            type="button"
            onClick={() => router.back()}
            data-testid="admin-voltar"
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ← Voltar
          </button>
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`admin-nav-link-${item.href.replace("/admin/", "")}`}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-gray-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
