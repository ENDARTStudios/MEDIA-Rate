"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/use-auth-store";

/**
 * D-630 — "este usuário é admin?", para a UI poder oferecer a entrada da área administrativa.
 *
 * Por que existe: o `/auth/me` **não** devolve o papel (`MeResult` em `auth.service.ts:56-69` tem
 * plano, status e trial, mas não `role`), e a única forma confiável de saber é o **gate** do
 * admin (`/api/v1/admin/gate`, 200 = admin) — o mesmo que o `layout` de `/admin` usa no servidor.
 *
 * Custos cuidados de propósito:
 * - **cache por usuário** (não por navegação): uma consulta por sessão, não uma por página;
 * - consulta **apenas autenticado** (visitante não gera requisição);
 * - o cache guarda o **id do usuário** a que se refere, então trocar de conta invalida sozinho
 *   (sem isso, um login novo herdaria a resposta do anterior).
 *
 * Segurança: isto decide **apenas se o link aparece**. Quem barra de verdade é o gate server-side
 * do layout de `/admin` (deny-by-default) — a UI nunca é a fronteira.
 */
let cache: { userId: string; isAdmin: boolean } | null = null;
let emAndamento: Promise<boolean> | null = null;

async function consultarGate(userId: string): Promise<boolean> {
  if (cache?.userId === userId) return cache.isAdmin;
  if (!emAndamento) {
    emAndamento = fetch("/api/v1/admin/gate", { credentials: "include" })
      .then(async (r) => ({ userId, isAdmin: r.ok }))
      .catch(() => ({ userId, isAdmin: false }))
      .then((v) => {
        cache = v;
        return v.isAdmin;
      })
      .finally(() => {
        emAndamento = null;
      });
  }
  return emAndamento;
}

export function useIsAdmin(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !userId) {
      setIsAdmin(false);
      return;
    }
    let ativo = true;
    void consultarGate(userId).then((valor) => {
      if (ativo) setIsAdmin(valor);
    });
    return () => {
      ativo = false;
    };
  }, [hydrated, isAuthenticated, userId]);

  return isAdmin;
}
