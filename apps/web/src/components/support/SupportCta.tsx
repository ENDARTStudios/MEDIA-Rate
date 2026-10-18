"use client";

import type { ReactNode } from "react";

/**
 * SupportCta — o único pedaço de JS da página /apoie.
 *
 * Existe por um motivo específico: **clique em `mailto:` não é medível no servidor**.
 * Sem este handler, a estratégia de apoio/parceria/patrocínio não teria como saber
 * qual dos três públicos responde — e decidir canal "no achismo" é o que a página
 * justamente evita. O evento carrega só o público e o locale (nada de PII).
 *
 * Sem `usePostHog()` de propósito: o hook exige o provider e quebraria em qualquer
 * render fora dele (testes, ilha isolada). O `window.posthog` é o mesmo objeto que o
 * provider instala, e o acesso é opcional — se o analytics não estiver carregado, o
 * link funciona igual.
 */
export function SupportCta({
  href,
  audience,
  className,
  children,
}: {
  href: string;
  audience: "apoiador" | "parceiro" | "patrocinador";
  className?: string;
  children: ReactNode;
}) {
  function registrar() {
    try {
      const w = window as unknown as {
        posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
      };
      w.posthog?.capture?.("support_cta_click", { audience });
    } catch {
      /* analytics nunca quebra a UI */
    }
  }

  return (
    <a
      href={href}
      onClick={registrar}
      className={className}
      data-testid={`support-cta-${audience}`}
    >
      {children}
    </a>
  );
}
