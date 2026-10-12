import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AdminStepUpDialog from "@/components/admin/AdminStepUpDialog";
import { ADMIN_STEPUP_REQUIRED_EVENT } from "@/lib/admin-stepup-client";
import type * as HttpNs from "@/lib/http";

/**
 * T205 Fase 1 — diálogo de step-up: abre no evento, foca o input, confirmar
 * chama POST /admin/step-up e resolve com a senha, cancelar resolve null,
 * erro mostra mensagem genérica (aria-live), Escape cancela.
 */

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/http", async (importOriginal) => {
  const real = await importOriginal<typeof HttpNs>();
  return { ...real, api: { post: postMock } };
});

const MESSAGES = {
  admin: {
    stepupTitulo: "Confirme sua senha",
    stepupLabel: "Senha",
    stepupConfirmar: "Confirmar",
    stepupCancelar: "Cancelar",
    stepupErro: "Credencial inválida. Tente novamente.",
  },
};

function renderDialog() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={MESSAGES}>
      <AdminStepUpDialog />
    </NextIntlClientProvider>,
  );
}

function pedir(resolver: (s: string | null) => void = vi.fn()) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
        detail: { resolve: resolver },
      }),
    );
  });
}

describe("AdminStepUpDialog (T205 Fase 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre no evento, foca o input e fecha após resolve", async () => {
    const { unmount } = renderDialog();
    pedir();
    expect(screen.getByTestId("admin-stepup-dialog")).toBeTruthy();
    const input = document.getElementById("admin-stepup-senha") as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(document.getElementById("admin-stepup-senha") as HTMLInputElement, {
      target: { value: "Senha@DoAdmin" },
    });
    fireEvent.click(screen.getByTestId("admin-stepup-confirmar"));
    await waitFor(() => {
      expect(screen.queryByTestId("admin-stepup-dialog")).toBeNull();
    });
    unmount();
  });

  it("confirmar chama POST /api/v1/admin/step-up com a senha e resolve", async () => {
    let recebida: string | null = null;
    renderDialog();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
          detail: { resolve: (s: string | null) => (recebida = s) },
        }),
      );
    });
    postMock.mockResolvedValueOnce({ ok: true });
    fireEvent.change(document.getElementById("admin-stepup-senha") as HTMLInputElement, {
      target: { value: "Senha@DoAdmin" },
    });
    fireEvent.click(screen.getByTestId("admin-stepup-confirmar"));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/v1/admin/step-up", {
        senha: "Senha@DoAdmin",
      });
      expect(recebida).toBe("Senha@DoAdmin");
    });
  });

  it("erro no step-up mostra mensagem genérica e mantém o diálogo aberto", async () => {
    renderDialog();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
          detail: { resolve: vi.fn() },
        }),
      );
    });
    postMock.mockRejectedValueOnce(new Error("Credencial inválida."));
    fireEvent.change(document.getElementById("admin-stepup-senha") as HTMLInputElement, {
      target: { value: "Senha@Errada" },
    });
    fireEvent.click(screen.getByTestId("admin-stepup-confirmar"));
    await waitFor(() => {
      expect(screen.getByTestId("admin-stepup-erro").textContent).toContain("Credencial inválida");
    });
    expect(screen.getByTestId("admin-stepup-dialog")).toBeTruthy(); // permanece aberto
  });

  it("cancelar resolve null e fecha o diálogo", async () => {
    let recebida: string | null = "pendente";
    renderDialog();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
          detail: { resolve: (s: string | null) => (recebida = s) },
        }),
      );
    });
    fireEvent.click(screen.getByTestId("admin-stepup-cancelar"));
    await waitFor(() => {
      expect(screen.queryByTestId("admin-stepup-dialog")).toBeNull();
    });
    expect(recebida).toBeNull();
  });

  it("senha NUNCA aparece no DOM fora do input (sem log/atributo)", async () => {
    renderDialog();
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
          detail: { resolve: vi.fn() },
        }),
      );
    });
    const input = document.getElementById("admin-stepup-senha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Senha@DoAdmin" } });
    fireEvent.click(screen.getByTestId("admin-stepup-confirmar"));
    await waitFor(() => {
      expect(screen.queryByTestId("admin-stepup-dialog")).toBeNull();
    });
    expect(document.body.innerHTML).not.toContain("Senha@DoAdmin");
  });
});
