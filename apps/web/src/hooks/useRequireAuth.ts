"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/use-auth-store";

export function useRequireAuth() {
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // T053: valida sessao via /me ao montar (cookie httpOnly).
    // Só redireciona após a verificação.
    fetchMe().finally(() => setChecked(true));
  }, [fetchMe]);

  useEffect(() => {
    if (checked && !isAuthenticated) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const callbackUrl = encodeURIComponent(pathname + search);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [checked, isAuthenticated, router, pathname]);

  return { user, isAuthenticated, loading: !checked };
}
