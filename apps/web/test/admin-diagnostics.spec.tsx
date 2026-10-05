import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { api } from "@/lib/http";

// B1 — ferramenta de remoção (soft delete) no painel /admin/diagnostics.
// A rota DELETE /api/v1/midias/:id é @Roles("ADMIN") no backend; o formulário
// exige confirmação e exibe resultado/erro.

const MIDIA_ID = "424e6a91-5b5c-4659-b805-bb06ed13547d";
const MIDIA = {
  ok: true,
  message: "Mídia removida (soft delete).",
};

const DIAG = {
  server: { node_env: "production", versao: "1", uptime_segundos: 60, agora: "" },
  database: { ok: true, latencia_ms: 5 },
  feature_flags: [],
  contagens: { midias: 625, usuarios: 30 },
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async () => DIAG),
    delete: vi.fn(),
  },
}));

import DiagnosticsPage from "@/app/[locale]/admin/diagnostics/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <DiagnosticsPage />
    </NextIntlClientProvider>,
  );
}

describe("DiagnosticsPage — remover mídia (B1)", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.delete).mockResolvedValue(MIDIA);
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("confirma e chama DELETE /midias/:id, exibindo o resultado", async () => {
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: MIDIA_ID } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/v1/midias/${MIDIA_ID}`);
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      // exibe a mensagem do CONTRATO da rota ({ ok, message }) — nunca "undefined"
      expect(screen.getByTestId("admin-remove-result").textContent).toBe(MIDIA.message);
      expect(screen.getByTestId("admin-remove-result").textContent).not.toContain("undefined");
    });
  });

  it("sem confirmação do usuário não chama a rota", async () => {
    confirmSpy.mockReturnValue(false);
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: MIDIA_ID } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it("UUID inválido → erro local, sem chamada", async () => {
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: "nao-e-uuid" } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-remove-error").textContent).toContain("UUID");
    });
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("404 da rota → mensagem de erro visível", async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error("Mídia não encontrada."));
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: MIDIA_ID } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-remove-error").textContent).toContain(
        "Mídia não encontrada",
      );
    });
  });
});
