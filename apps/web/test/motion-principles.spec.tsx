import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LazyImage } from "@/components/ui/lazy-image";
import { Progress } from "@/components/ui/progress";
import { useMotionPref } from "@/hooks/use-motion-pref";

const messages = { common: { loading: "Carregando" } };

function renderComProvidera(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function MotionProbe() {
  const pref = useMotionPref();
  return <span data-testid="pref">{pref}</span>;
}

describe("Motion Principles (T351)", () => {
  it("LazyImage usa loading=lazy nativo e mostra fallback em erro", () => {
    const { container } = render(<LazyImage src="/x.png" alt="X" width={100} height={150} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("width")).toBe("100");
    expect(img?.getAttribute("height")).toBe("150");
    fireEvent.error(img as HTMLImageElement);
    expect(container.textContent).toContain("X");
  });

  it("Progress renderiza spinner + rótulo (não-bloqueante)", () => {
    renderComProvidera(<Progress label="Carregando..." />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("useMotionPref retorna full por padrão (jsdom sem matchMedia)", () => {
    renderComProvidera(<MotionProbe />);
    expect(screen.getByTestId("pref").textContent).toBe("full");
  });
});
