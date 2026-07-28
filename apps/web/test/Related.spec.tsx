import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Related } from "@/components/Related";
import type { MediaItem } from "@/components/MediaCard";

vi.mock("@/components/MediaCard", () => ({
  MediaCard: ({ media }: { media: MediaItem }) => (
    <div data-testid="media-card">{media.titulo}</div>
  ),
}));

const mockItems: MediaItem[] = [
  { id: "r1", titulo: "Item 1", tipo: "FILME", ano_lancamento: 2024, imagem_url: null, score: 75 },
  { id: "r2", titulo: "Item 2", tipo: "GAME", ano_lancamento: 2023, imagem_url: null, score: 88 },
];

describe("Related", () => {
  it("renderiza carousel com items", () => {
    const { getByTestId, getByText } = render(<Related items={mockItems} />);
    expect(getByTestId("related")).toBeTruthy();
    expect(getByText("Item 1")).toBeTruthy();
    expect(getByText("Item 2")).toBeTruthy();
  });

  it("renderiza titulo personalizado", () => {
    const { getByText } = render(<Related items={mockItems} title="Franquia" />);
    expect(getByText("Franquia")).toBeTruthy();
  });

  it("retorna null com items vazio", () => {
    const { container } = render(<Related items={[]} />);
    expect(container.querySelector("[data-testid=related]")).toBeNull();
  });
});
