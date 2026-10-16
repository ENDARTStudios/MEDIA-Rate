"use client";

import { useTranslations } from "next-intl";

/**
 * T202 — resposta genérica a não-admin na área admin (ADMIN_SECURITY:
 * "se não é admin, não vê nada"). Texto deliberadamente genérico — não revela
 * a existência/estrutura de recursos administrativos.
 */
export default function AdminAcessoNegado() {
  const t = useTranslations("admin");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <p role="alert" data-testid="admin-acesso-negado" className="text-sm text-score-low">
        {t("acessoNegado")}
      </p>
    </div>
  );
}
