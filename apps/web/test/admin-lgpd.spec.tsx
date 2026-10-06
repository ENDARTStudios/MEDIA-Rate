import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// Onda 6 admin (P3) — visão LGPD: exclusões agendadas (carência 30d),
// gatilho manual da purga (confirm obrigatório) e contagens de consentimento.

const { getMock, postMock } = vi.hoisted(() => {
  const PAINEL_BASE = {
    agendados: [
      {
        id: "u-lgpd",
        email: "excluir@mediarate.test",
        expira_em: "2026-10-20T00:00:00.000Z",
      },
    ],
    totalAgendados: 1,
    consentimentos: { total: 1000, analyticsAceito: 640, monitoringAceito: 210 },
  };
  const ref = { atual: PAINEL_BASE as unknown };
  return {
    getMock: vi.fn(async (url: string) =>
      String(url).includes("/lgpd/purge") ? { verificados: 1, purgados: 1, falhas: 0 } : ref.atual,
    ),
    postMock: vi.fn(async () => ({ verificados: 1, purgados: 1, falhas: 0 })),
    estado: ref,
  };
});

vi.mock("@/lib/http", () => ({
  api: {
    get: getMock,
    post: postMock,
  },
}));

import AdminLgpdPage from "@/app/[locale]/admin/lgpd/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminLgpdPage />
    </NextIntlClientProvider>,
  );
}

describe("AdminLgpdPage (Onda 6 admin — P3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("mostra agendados, consentimentos e o gatilho da purga", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("excluir@mediarate.test")).toBeTruthy();
    });
    expect(screen.getByTestId("admin-consent-total").textContent).toBe("1000");
    expect(screen.getByTestId("admin-consent-analytics").textContent).toBe("640");
    expect(screen.getByTestId("admin-lgpd-purgar")).toBeTruthy();
  });

  it("purga: confirma, chama POST /admin/lgpd/purge e exibe o resultado", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("admin-lgpd-purgar"));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/v1/admin/lgpd/purge");
    });
    await waitFor(() => {
      expect(screen.getByTestId("admin-lgpd-purga-resultado").textContent).toContain("purgados: 1");
    });
  });

  it("purga sem confirmação não chama a rota", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    fireEvent.click(await screen.findByTestId("admin-lgpd-purgar"));
    await waitFor(() => {
      expect(postMock).not.toHaveBeenCalled();
    });
  });

  it("403 da API vira mensagem de erro na página", async () => {
    getMock.mockRejectedValueOnce(new Error("Você não tem permissão para acessar este recurso."));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/permissão/)).toBeTruthy();
    });
  });
});
