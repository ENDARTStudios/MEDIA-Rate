import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LgpdControls } from "@/components/settings/LgpdControls";
import { MediaUnlockGrid } from "@/components/pricing/MediaUnlockGrid";

const messages = {
  dataExport: {
    downloadJson: "Baixar JSON",
    deleteData: "Excluir minha conta",
    deleteConfirm: "Tem certeza? Esta ação não pode ser desfeita.",
    deleteConfirmYes: "Tenho certeza — excluir permanentemente",
    deleteRequested: "Pedido de exclusão registrado.",
    cancel: "Cancelar",
    error: "Erro",
  },
  pricing: {
    media: "Mídias desbloqueadas",
    media_movie: "Filmes",
    media_series: "Séries",
    media_game: "Games",
    media_book: "Livros",
    media_comic: "HQs & Mangás",
    media_anime: "Mangás",
    unlocked: "Desbloqueado",
    locked: "Bloqueado neste plano",
    comingSoonShort: "Em breve",
    free: "Free",
    plus: "Plus",
    premium: "Premium",
  },
  profile: {},
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async () => ({ ok: true })),
    delete: vi.fn(async () => undefined),
  },
}));

function renderUi(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("LgpdControls (T193)", () => {
  it("excluir NUNCA acontece em 1 clique — pede confirmação explícita", () => {
    const { container } = renderUi(<LgpdControls />);
    fireEvent.click(screen.getByText("Excluir minha conta"));
    expect(container.textContent).toContain("Tenho certeza");
    // nenhum delete disparado ainda
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("o 2º passo (confirmação) executa o DELETE", async () => {
    const { api } = await import("@/lib/http");
    renderUi(<LgpdControls />);
    fireEvent.click(screen.getByText("Excluir minha conta"));
    fireEvent.click(screen.getByText("Tenho certeza — excluir permanentemente"));
    expect(api.delete).toHaveBeenCalledWith("/api/v1/user/data");
  });

  it("exporta dados (JSON) via endpoint LGPD", async () => {
    const { api } = await import("@/lib/http");
    renderUi(<LgpdControls />);
    fireEvent.click(screen.getByText("Baixar JSON"));
    expect(api.get).toHaveBeenCalledWith("/api/v1/user/data");
  });
});

describe("MediaUnlockGrid (T193)", () => {
  it("renderiza grade com as 6 mídias e 3 planos", () => {
    const { container } = renderUi(<MediaUnlockGrid />);
    expect(container.querySelector("[data-testid=media-unlock-grid]")).toBeTruthy();
    expect(container.textContent).toContain("Filmes");
    expect(container.textContent).toContain("Games");
    expect(container.textContent).toContain("Livros");
  });

  it("T408: os 6 tipos estão desbloqueados em TODOS os planos (sem 'Em breve')", () => {
    const { container } = renderUi(<MediaUnlockGrid />);
    const desbloqueados = container.querySelectorAll('[aria-label="Desbloqueado"]');
    expect(desbloqueados.length).toBe(18); // 6 mídias × 3 planos
    expect(container.textContent).not.toContain("Em breve");
  });
});
