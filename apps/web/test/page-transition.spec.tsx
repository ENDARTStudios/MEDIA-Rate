import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageTransition } from "@/components/PageTransition";

/**
 * F16 (Issue #17) — o LCP da home era ~10s porque o PageTransition renderizava
 * o conteúdo com opacity:0 (fade-in) já no SSR, escondendo o H1 até a
 * hidratação + animação. Este teste trava o comportamento correto: o conteúdo
 * server-renderizado deve sair VISÍVEL no primeiro paint.
 */
describe("PageTransition (F16 — LCP visível no primeiro paint)", () => {
  it("SSR renderiza o conteúdo sem opacity:0 (nunca esconde o LCP)", () => {
    const html = renderToStaticMarkup(
      <PageTransition>
        <h1>Conteúdo acima da dobra</h1>
      </PageTransition>,
    );
    expect(html).toContain("Conteúdo acima da dobra");
    // Trava qualquer forma de opacity zero (com ou sem espaço) no primeiro paint.
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});
