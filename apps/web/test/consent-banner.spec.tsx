import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ConsentBanner } from "@/components/ConsentBanner";

// estado da store controlável para os 2 cenários
let state: { decided: boolean; analytics: boolean; monitoring: boolean };
const setConsent = vi.fn();
vi.mock("@/stores/use-consent-store", () => ({
  useConsentStore: () => ({ ...state, setConsent, reset: vi.fn() }),
}));

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <ConsentBanner />
    </NextIntlClientProvider>,
  );
}

describe("ConsentBanner (fix hidratação — não exibe com consentimento persistido)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decided=true (cookie persistido): NÃO renderiza o banner após o mount", async () => {
    state = { decided: true, analytics: true, monitoring: true };
    renderBanner();
    // antes do mount não renderiza (evita mismatch do SSR/hidratação)
    expect(document.querySelector('[role="region"]')).toBeNull();
    // após o mount continua oculto (consentimento já existe)
    await waitFor(() => {
      expect(document.querySelector('[role="region"]')).toBeNull();
    });
  });

  it("decided=false (primeira visita): renderiza o banner após o mount", async () => {
    state = { decided: false, analytics: false, monitoring: false };
    renderBanner();
    await waitFor(() => {
      expect(document.querySelector('[role="region"]')).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: /acceptAll|Aceitar todos/i })).toBeTruthy();
  });

  // T474 (a11y): o banner NÃO é modal — `aria-modal="true"` removia a landing
  // page inteira da árvore de acessibilidade na primeira visita. Regressão
  // coberta para o rótulo continuar sendo acessível sem esconder o resto.
  it("T474: não declara aria-modal nem role=dialog (banner não bloqueia a página)", async () => {
    state = { decided: false, analytics: false, monitoring: false };
    const { container } = renderBanner();
    await waitFor(() => {
      expect(container.querySelector('[role="region"]')).not.toBeNull();
    });
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-modal")).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    // a região continua nomeada para leitores de tela
    expect(region?.getAttribute("aria-label")).toBeTruthy();
  });
});
