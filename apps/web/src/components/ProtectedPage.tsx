"use client";

import { Suspense } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function ProtectedPage({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const authed = useRequireAuth();

  if (!authed) {
    return <Suspense>{fallback ?? <div className="min-h-[50vh] flex items-center justify-center"><p className="text-gray-400 text-sm">Redirecionando...</p></div>}</Suspense>;
  }

  return <>{children}</>;
}
