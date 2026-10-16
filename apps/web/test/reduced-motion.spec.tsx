import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfettiCelebration } from "@/components/ui/ConfettiCelebration";

/**
 * Gate #6 das "cegueiras" da auditoria (§11): **nenhum teste de unidade rodava com
 * `prefers-reduced-motion: reduce`**. Foi assim que o mismatch de `/billing/success`
 * sobreviveu — o harness de hidratação emula a preferência, mas nos dois modos ele só
 * olha o HTML/pixel final; um `if (shouldReduce) return null` no render passa por ele.
 *
 * Este arquivo fecha a lacuna em três frentes: a regra na fonte, o gate global e o
 * comportamento em tempo de execução com a preferência ligada.
 */

const RAIZ = join(__dirname, "..");

/** Liga a preferência de menos movimento para a árvore renderizada. */
function comMovimentoReduzido() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Remove comentários antes de procurar padrões proibidos.
 *
 * Sem isto o teste acusa o **comentário** que documenta o bug antigo (o
 * `if (shouldReduce) return null` do D-587 está citado no próprio arquivo) — a mesma
 * armadilha de "grep em comentário" que já apareceu nesta trilha.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("movimento reduzido — regressão (gate #6 do §11)", () => {
  it("nenhum componente decide markup por prefers-reduced-motion", () => {
    // A regra do D-587: valor que depende de reduced motion NÃO pode decidir markup.
    // O padrão que quebrou a hidratação era `initial={{ opacity: 0 }}` (o servidor
    // renderiza o estado inicial; o cliente, com a preferência ligada, renderiza
    // outro) e o `if (shouldReduce) return null` no corpo do componente.
    const fontes = [
      "src/components/MediaCard.tsx",
      "src/components/ScrollReveal.tsx",
      "src/components/PageTransition.tsx",
      "src/components/ui/ConfettiCelebration.tsx",
      "src/components/ui/glowing-effect.tsx",
    ];
    const proibidos = [
      { padrao: /initial=\{\{\s*opacity:\s*0/, o_que: "initial com opacity 0 (entrada por JS)" },
      {
        padrao: /if\s*\(\s*shouldReduce\s*\)\s*return\s+null/,
        o_que: "return null no render quando há menos movimento",
      },
    ];
    const achados: string[] = [];
    for (const relativo of fontes) {
      const conteudo = semComentarios(readFileSync(join(RAIZ, relativo), "utf8"));
      for (const { padrao, o_que } of proibidos) {
        if (padrao.test(conteudo)) achados.push(`${relativo}: ${o_que}`);
      }
    }
    expect(achados, `padrões que decidem markup por movimento:\n${achados.join("\n")}`).toEqual([]);
  });

  it("o layout de locale mantém o gate global de movimento", () => {
    const provider = readFileSync(join(RAIZ, "src/providers/motion-provider.tsx"), "utf8");
    expect(provider).toContain('reducedMotion="user"');

    const layout = readFileSync(join(RAIZ, "src/app/[locale]/layout.tsx"), "utf8");
    expect(layout, "o provider global precisa estar montado no layout").toContain(
      "<MotionProvider>",
    );
  });

  it("com a preferência ligada, o componente ainda renderiza o conteúdo", () => {
    comMovimentoReduzido();
    const { container } = render(<ConfettiCelebration duration={10} />);
    // O gate fica no `useEffect` (não desenha nada), mas o elemento precisa EXISTIR:
    // devolver `null` no render foi exatamente o defeito do D-587 em /billing/success.
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(screen.queryByRole("presentation")).toBeDefined();
  });
});
