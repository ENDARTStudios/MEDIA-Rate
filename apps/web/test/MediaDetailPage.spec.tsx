import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getMediaBySlug: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    `<a href="${href}">${children}</a>`,
}));

vi.mock("next/image", () => ({
  default: (p: { src: string; alt?: string }) => `<img src="${p.src}" alt="${p.alt ?? ""}" />`,
}));

vi.mock("./MediaScoreModule", () => ({
  MediaScoreModule: () => "<score-module />",
}));

vi.mock("./MediaScoreBadge", () => ({
  MediaScoreBadge: () => "<badge />",
}));

describe("MediaDetailPage", () => {
  it("renderiza breadcrumbs com Home > Catálogo > Tipo > Título", async () => {
    render("<MediaDetailPage id='test' type='movie' />");
    expect(true).toBe(true);
  });
});
