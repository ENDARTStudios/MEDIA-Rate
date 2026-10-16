"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/use-auth-store";

/**
 * D-619 (P0) — hidrata a sessão **uma vez por carregamento de página, em qualquer rota**.
 *
 * O defeito medido: só o `ProtectedPage` chamava `fetchMe()`. Nas rotas que leem o store
 * direto — `/dashboard`, `/historico`, `/listas`, `/listas/[slug]`, `/user/data` — e nos
 * componentes globais (`Navbar`, `NotificationBell`), um F5 (ou um link direto, ou uma
 * nova aba) deixava o store no estado inicial. Com **sessão válida**, o resultado era:
 * "Entre para ver seu dashboard", header com "Entrar/Cadastrar", sidebar com "Visitante ·
 * Plano Free" e `/checkout` mandando para o login. Provei que não era ambiente: no mesmo
 * navegador `/api/v1/auth/me` respondia **200** (relativo e absoluto, `credentials: include`).
 *
 * Por que no layout: a sessão é fato global, não de uma rota. Montar aqui conserta as cinco
 * rotas e os dois componentes globais de uma vez, sem espalhar guard por tela.
 *
 * Custo e segurança:
 * - **Uma** requisição por página: o store deduplica (`fetchMe` sai cedo se `hydrated`), então
 *   o `ProtectedPage` de quem já hidratou não consulta de novo.
 * - 401 é resposta esperada para visitante — o store trata como "não autenticado" definitivo.
 * - Não renderiza nada e não decide markup: zero impacto em hidratação (gate `test:hydration`).
 */
export function AuthHydrator() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    void fetchMe();
  }, [fetchMe, hydrated]);

  return null;
}

/**
 * Conveniência de leitura: `true` enquanto a sessão ainda não foi consultada.
 *
 * Use nas telas para escolher entre **carregando** e **visitante** — sem isso, o primeiro
 * render mostra "entre para ver" para quem está logado e o componente troca depois (o
 * "pisca" que a spec do Dashboard registrou como P1).
 */
export function useAuthPendente(): boolean {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoading = useAuthStore((s) => s.isLoading);
  return !hydrated || isLoading;
}
