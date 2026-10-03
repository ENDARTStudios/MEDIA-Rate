import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SocialButtons } from "@/components/SocialButtons";

vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ fetchMe: vi.fn() }),
}));
vi.mock("@/lib/http", () => ({
  api: { post: vi.fn() },
  setCsrfToken: vi.fn(),
}));

const MESSAGES = {
  auth: {
    loginSuccess: "Login efetuado",
    loginError: "Erro no login",
    or: "ou",
    continueWithGoogle: "Continuar com Google",
  },
};

const GIS_SRC = "https://accounts.google.com/gsi/client";

let initialize: ReturnType<typeof vi.fn> = vi.fn();
let renderButton: ReturnType<typeof vi.fn> = vi.fn();

function installGoogle() {
  initialize = vi.fn();
  renderButton = vi.fn();
  (window as unknown as { google?: unknown }).google = {
    accounts: { id: { initialize, prompt: vi.fn(), renderButton } },
  };
}

function renderSocial() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={MESSAGES}>
      <SocialButtons />
    </NextIntlClientProvider>,
  );
}

// UG-01: o botão do login social Google não funcionava — o caminho de
// carregamento a frio do script GSI inicializava o provider mas nunca
// chamava renderButton, e o botão custom chamo prompt() (One Tap suprimido).
describe("SocialButtons (UG-01 — botão Google oficial renderiza em todo caminho)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { google?: unknown }).google;
  });

  afterEach(() => {
    delete (window as unknown as { google?: unknown }).google;
    document.querySelectorAll(`script[src="${GIS_SRC}"]`).forEach((s) => s.remove());
    vi.unstubAllEnvs();
  });

  it("carregamento a frio: renderButton roda no onload do script GSI", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    renderSocial(); // window.google AUSENTE — estado de toda primeira visita a /login

    const script = await waitFor(() => {
      const s = document.querySelector(`script[src="${GIS_SRC}"]`);
      expect(s).not.toBeNull();
      return s as HTMLScriptElement;
    });
    expect(initialize).not.toHaveBeenCalled();

    // o GSI termina de carregar de verdade
    installGoogle();
    act(() => {
      script.dispatchEvent(new Event("load"));
    });

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: "test-client-id" }),
      );
      expect(renderButton).toHaveBeenCalledTimes(1);
    });
    const [parent, opts] = renderButton.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(parent.getAttribute("data-testid")).toBe("gsi-button");
    expect(opts).toEqual(expect.objectContaining({ text: "continue_with", locale: "pt-BR" }));
  });

  it("não renderiza mais o botão custom morto (prompt One Tap suprimido)", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    installGoogle();
    renderSocial();

    expect(screen.queryByRole("button", { name: "Continuar com Google" })).toBeNull();
    expect(document.querySelector("svg[viewBox='0 0 48 48']")).toBeNull();
  });

  it("window.google já presente: renderButton imediato e sem duplicar <script>", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    installGoogle();
    const pre = document.createElement("script");
    pre.src = GIS_SRC;
    document.head.appendChild(pre);

    renderSocial();

    await waitFor(() => {
      expect(renderButton).toHaveBeenCalledTimes(1);
    });
    expect(document.querySelectorAll(`script[src="${GIS_SRC}"]`).length).toBe(1);
  });

  it("sem NEXT_PUBLIC_GOOGLE_CLIENT_ID: não renderiza botão nem divisor", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    const { container } = renderSocial();

    expect(container.querySelector('[data-testid="gsi-button"]')).toBeNull();
    expect(container.textContent).toBe("");
  });
});
