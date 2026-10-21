import { describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { useAtalhosDeFiltros } from "@/components/catalog/useAtalhosDeFiltros";

/**
 * Atalhos de filtro (spec §11, P2).
 *
 * Contrato:
 *  - **Alt+F** foca os filtros, **Alt+L** limpa;
 *  - letra solta NÃO dispara (senão a busca textual fica impossível);
 *  - com o foco num campo de digitação, o atalho **não** rouba o foco;
 *  - modificadores a mais (Ctrl/Meta) são ignorados para não interceptar atalhos do
 *    navegador/sistema.
 */

function Harness({
  aoFocar = vi.fn(),
  aoLimpar = vi.fn(),
}: {
  aoFocar?: () => void;
  aoLimpar?: () => void;
}) {
  useAtalhosDeFiltros({ aoFocar, aoLimpar });
  return <input data-testid="campo" aria-label="campo" />;
}

describe("atalhos de filtro do catálogo", () => {
  it("Alt+F foca os filtros", () => {
    const aoFocar = vi.fn();
    render(<Harness aoFocar={aoFocar} />);
    fireEvent.keyDown(window, { key: "f", altKey: true });
    expect(aoFocar).toHaveBeenCalledTimes(1);
  });

  it("Alt+L limpa os filtros", () => {
    const aoLimpar = vi.fn();
    render(<Harness aoLimpar={aoLimpar} />);
    fireEvent.keyDown(window, { key: "l", altKey: true });
    expect(aoLimpar).toHaveBeenCalledTimes(1);
  });

  it("letra sem Alt não dispara nada", () => {
    const aoFocar = vi.fn();
    const aoLimpar = vi.fn();
    render(<Harness aoFocar={aoFocar} aoLimpar={aoLimpar} />);
    fireEvent.keyDown(window, { key: "f" });
    fireEvent.keyDown(window, { key: "l" });
    expect(aoFocar).not.toHaveBeenCalled();
    expect(aoLimpar).not.toHaveBeenCalled();
  });

  it("não dispara enquanto a pessoa digita num campo", () => {
    const aoFocar = vi.fn();
    render(<Harness aoFocar={aoFocar} />);
    const campo = screen.getByTestId("campo");
    campo.focus();
    fireEvent.keyDown(campo, { key: "f", altKey: true });
    expect(aoFocar).not.toHaveBeenCalled();
  });

  it("ignora Ctrl/⌘ junto do Alt para não capturar atalho do sistema", () => {
    const aoFocar = vi.fn();
    render(<Harness aoFocar={aoFocar} />);
    fireEvent.keyDown(window, { key: "f", altKey: true, ctrlKey: true });
    fireEvent.keyDown(window, { key: "f", altKey: true, metaKey: true });
    expect(aoFocar).not.toHaveBeenCalled();
  });
});
