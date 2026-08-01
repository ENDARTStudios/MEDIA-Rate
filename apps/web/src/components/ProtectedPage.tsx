"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function ProtectedPage({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAuthenticated, loading } = useRequireAuth();
  const t = useTranslations("common");

  if (loading) {
    return <Suspense>{fallback ?? <div className="min-h-[50vh] flex items-center justify-center"><p className="text-gray-400 text-sm">{t("verifyingSession")}</p></div>}</Suspense>;
  }

  if (!isAuthenticated) {
    return null; // useRequireAuth ja redireciona
  }

  return <>{children}</>;
}
