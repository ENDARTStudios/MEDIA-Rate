import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// B1 — ferramenta de remoção (soft delete) no painel /admin/diagnostics.
// A rota DELETE /api/v1/midias/:id é @Roles("ADMIN") no backend; o formulário
// exige confirmação e exibe resultado/erro.
// Onda 4 — toggle de feature flags (PATCH /admin/flags/:key, audit no serviço).

const MIDIA_ID = "424e6a91-5b5c-4659-b805-bb06ed13547d";

const { getMock, patchMock, deleteMock, estado, DIAG, DIAG_FLAG_OFF } = vi.hoisted(() => {
  const DIAG = {
    server: { node_env: "production", versao: "1", uptime_segundos: 60, agora: "" },
    database: { ok: true, latencia_ms: 5 },
    feature_flags: [{ key: "discovery-feed-v1", enabled: true, rollout_percent: 100 }],
    contagens: { midias: 625, usuarios: 30 },
  };
  const DIAG_FLAG_OFF = {
    ...DIAG,
    feature_flags: [{ key: "discovery-feed-v1", enabled: false, rollout_percent: 100 }],
  };
  const ref = { atual: DIAG as unknown };
  return {
    getMock: vi.fn(async () => ref.atual),
    patchMock: vi.fn(async () => ({ key: "discovery-feed-v1", enabled: false })),
    deleteMock: vi.fn(async () => ({ ok: true, message: "Mídia removida (soft delete)." })),
    estado: ref,
    DIAG,
    DIAG_FLAG_OFF,
  };
});

vi.mock("@/lib/http", () => ({
  api: {
    get: getMock,
    patch: patchMock,
    delete: deleteMock,
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
  beforeEach(() => {
    vi.clearAllMocks();
    estado.atual = DIAG;
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("confirma e chama DELETE /midias/:id, exibindo a mensagem do contrato", async () => {
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: MIDIA_ID } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(`/api/v1/midias/${MIDIA_ID}`);
    });
    expect((window.confirm as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    await waitFor(() => {
      expect(screen.getByTestId("admin-remove-result").textContent).toBe(
        "Mídia removida (soft delete).",
      );
      expect(screen.getByTestId("admin-remove-result").textContent).not.toContain("undefined");
    });
  });

  it("sem confirmação do usuário não chama a rota", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: MIDIA_ID } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("UUID inválido → erro local, sem chamada", async () => {
    renderPage();
    const input = await screen.findByTestId("admin-remove-input");
    fireEvent.change(input, { target: { value: "nao-e-uuid" } });
    fireEvent.click(screen.getByTestId("admin-remove-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-remove-error").textContent).toContain("UUID");
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("404 da rota → mensagem de erro visível", async () => {
    deleteMock.mockRejectedValueOnce(new Error("Mídia não encontrada."));
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

describe("DiagnosticsPage — Onda 4: toggle de feature flags (P1b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.atual = DIAG;
  });

  it("toggle chama PATCH /admin/flags/:key com o estado invertido", async () => {
    renderPage();
    const toggle = await screen.findByTestId("admin-flag-toggle-discovery-feed-v1");
    expect(toggle.textContent).toBe("Desligar");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith("/api/v1/admin/flags/discovery-feed-v1", {
        enabled: false,
      });
    });
  });

  it("refetch após o toggle reflete o novo estado (Desligar → Ligar)", async () => {
    renderPage();
    const toggle = await screen.findByTestId("admin-flag-toggle-discovery-feed-v1");
    expect(toggle.textContent).toBe("Desligar");

    // o estado pós-toggle é definido ANTES do clique — o refetch do painel
    // o lê de forma determinística
    estado.atual = DIAG_FLAG_OFF;
    fireEvent.click(toggle);
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByTestId("admin-flag-toggle-discovery-feed-v1").textContent).toBe("Ligar");
    });
  });
});
