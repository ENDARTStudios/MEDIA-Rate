"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/use-auth-store";

export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const callbackUrl = encodeURIComponent(pathname + search);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [isAuthenticated, router, pathname]);

  return isAuthenticated;
}
