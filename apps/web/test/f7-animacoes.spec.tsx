import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { PageTransition } from "@/components/PageTransition";
import { ScoreDial } from "@/components/media-rate-ui/ScoreDial";

// next/navigation mock para PageTransition (usePathname)
vi.mock("next/navigation", () => ({ usePathname: () => "/pt-BR" }));

let reduced = false;
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => reduced,
  };
});

describe("F7 — reduced-motion desabilita animações", () => {
  beforeEach(() => {
    reduced = false;
  });

  it("ScrollReveal renderiza filhos direto (sem animação) com reduced-motion", () => {
    reduced = true;
    const { container } = render(
      <ScrollReveal>
        <p>conteúdo</p>
      </ScrollReveal>,
    );
    expect(container.textContent).toContain("conteúdo");
    expect(container.querySelector("[data-testid=scroll-reveal]")).toBeTruthy();
  });

  it("PageTransition renderiza filhos direto com reduced-motion (sem fade)", () => {
    reduced = true;
    const { container } = render(<PageTransition>página</PageTransition>);
    expect(container.textContent).toContain("página");
    expect(container.querySelector("[data-testid=page-transition]")).toBeNull();
  });

  it("PageTransition aplica fade com animação habilitada", () => {
    reduced = false;
    const { container } = render(<PageTransition>página</PageTransition>);
    expect(container.querySelector("[data-testid=page-transition]")).toBeTruthy();
  });

  it("ScoreDial contador pula direto ao valor final com reduced-motion", () => {
    reduced = true;
    const { container } = render(<ScoreDial value={8.4} scale="0-10" size="md" />);
    expect(container.textContent).toContain("8,4");
  });

  it("ScoreDial mantém aria-label com valor final", () => {
    reduced = true;
    render(<ScoreDial value={9.2} scale="0-10" />);
    expect(screen.getByRole("img", { name: /9,2 de 10/ })).toBeTruthy();
  });
});
