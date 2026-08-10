import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EmptyStateComingSoon } from "@/components/media-rate-ui/EmptyStateComingSoon";

const messages = {
  catalog: {
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    anime: "Animes",
    noResults: "Em breve",
    notifyButton: "Avisar-me",
    notifyDone: "Cadastrado! Avisaremos quando chegar.",
    comingSoonEmailPlaceholder: "seu@email.com",
    comingSoonEmailLabel: "E-mail",
    comingSoonTag: "Em breve",
    emConstrucao: "Em construção",
    comingSoonSubscribe: "Esta categoria chega em breve. Cadastre-se para ser avisado.",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Catalog empty state (T186)", () => {
  it("categorias futuras mostram 'Em construção' + captura de lead", () => {
    renderWithProviders(<EmptyStateComingSoon type="book" />);
    const el = screen.getByTestId("coming-soon-book");
    expect(el.textContent).toContain("Em construção");
    expect(el.textContent).toContain("Livros");
  });

  it("onNotify envia o email capturado", async () => {
    let capturado = "";
    renderWithProviders(
      <EmptyStateComingSoon
        type="comic"
        onNotify={async (email) => {
          capturado = email;
        }}
      />,
    );
    const input = screen.getByLabelText("E-mail");
    fireEvent.change(input, { target: { value: "lead@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Avisar-me" }));
    expect(capturado).toBe("lead@exemplo.com");
  });

  it("sem onNotify, o form de captura não renderiza", () => {
    renderWithProviders(<EmptyStateComingSoon type="manga" />);
    expect(screen.queryByLabelText("E-mail")).toBeNull();
  });
});
