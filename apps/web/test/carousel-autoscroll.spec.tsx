import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AutoScrollTrack } from "../src/components/media-rate-ui/AutoScrollTrack";

/**
 * Auto-avanço dos carrosséis (conceito v9 §4).
 *
 * O que este spec protege, na ordem em que o conceito cobra:
 *  - avança UM card a cada 5 s (o passo é medido do card, não chutado);
 *  - **não** avança com `prefers-reduced-motion: reduce` (WCAG 2.3.3 / regra do repo);
 *  - **pausa** em hover e em focus;
 *  - **para de vez** quando a pessoa interage (wheel/pointerdown) — insistir é o que irrita;
 *  - ao chegar no fim, volta ao início.
 *
 * jsdom não tem layout: `offsetWidth`/`scrollWidth` são zero. Por isso o teste define
 * esses valores na trilha e no card antes de disparar o timer — medir zero e "avançar
 * zero" passaria como sucesso falso.
 */

const reduzido = { valor: false };

vi.mock("../src/lib/useReducedMotionPref", () => ({
  useReducedMotionPref: () => reduzido.valor,
}));

const CARDS = ["a", "b", "c", "d", "e"];

function montar() {
  const { container } = render(
    <AutoScrollTrack rotulo="Filmes" id="trilha" passoMs={5000}>
      {CARDS.map((id) => (
        <div key={id} data-testid={`card-${id}`}>
          {id}
        </div>
      ))}
    </AutoScrollTrack>,
  );
  const trilha = container.querySelector("#trilha") as HTMLDivElement;

  // "Layout" do card: 180 px de largura, 16 px de gap, 5 cards.
  Object.defineProperty(trilha, "clientWidth", { value: 560, configurable: true });
  Object.defineProperty(trilha, "scrollWidth", { value: 980, configurable: true });
  for (const card of Array.from(trilha.children) as HTMLElement[]) {
    Object.defineProperty(card, "offsetWidth", { value: 180, configurable: true });
  }
  // Gap real no elemento (o componente lê getComputedStyle; trocar a função global
  // quebrava os matchers do testing-library que também consultam estilo).
  trilha.style.gap = "16px";

  const scrollTo = vi.fn();
  trilha.scrollTo = scrollTo as unknown as typeof trilha.scrollTo;
  return { trilha, scrollTo };
}

describe("auto-avanço do carrossel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduzido.valor = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avança um card (largura + gap) a cada 5 s", () => {
    const { scrollTo } = montar();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 196, behavior: "smooth" });
  });

  it("não avança com prefers-reduced-motion: reduce", () => {
    reduzido.valor = true;
    const { trilha, scrollTo } = montar();
    expect(trilha.dataset.autoscroll).toBe("off");
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("pausa em hover e retoma ao sair", () => {
    const { trilha, scrollTo } = montar();
    fireEvent.pointerEnter(trilha);
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.pointerLeave(trilha);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("pausa enquanto o foco está na trilha", () => {
    const { trilha, scrollTo } = montar();
    fireEvent.focusIn(trilha);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("para de vez quando a pessoa rola por conta própria", () => {
    const { trilha, scrollTo } = montar();
    fireEvent.wheel(trilha);
    fireEvent.pointerLeave(trilha);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("volta ao início ao chegar no fim", () => {
    const { trilha, scrollTo } = montar();
    Object.defineProperty(trilha, "scrollLeft", { value: 420, configurable: true });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
  });

  it("expõe a trilha como carrossel acessível", () => {
    montar();
    const grupo = screen.getByRole("group", { name: "Filmes" });
    expect(grupo).toHaveAttribute("aria-roledescription", "carrossel");
  });
});
