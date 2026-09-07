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

  it("decided=true (cookie persistido): NÃO renderiza o dialog após o mount", async () => {
    state = { decided: true, analytics: true, monitoring: true };
    renderBanner();
    // antes do mount não renderiza (evita mismatch do SSR/hidratação)
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    // após o mount continua oculto (consentimento já existe)
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  it("decided=false (primeira visita): renderiza o dialog após o mount", async () => {
    state = { decided: false, analytics: false, monitoring: false };
    renderBanner();
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: /acceptAll|Aceitar todos/i })).toBeTruthy();
  });
});
