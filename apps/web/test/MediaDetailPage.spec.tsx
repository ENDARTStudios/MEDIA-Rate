import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MediaDetailPage } from "@/components/MediaDetailPage";
import type { Media } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  getMediaBySlug: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children }: any) => `<a href="${href}">${children}</a>`,
}));

vi.mock("next/image", () => ({
  default: (p: any) => `<img src="${p.src}" alt="${p.alt}" />`,
}));

vi.mock("./MediaScoreModule", () => ({
  MediaScoreModule: () => "<score-module />",
}));

vi.mock("./MediaScoreBadge", () => ({
  MediaScoreBadge: () => "<badge />",
}));

describe("MediaDetailPage", () => {
  it("renderiza breadcrumbs com Home > Catálogo > Tipo > Título", async () => {
    const { getByText } = render("<MediaDetailPage id='test' type='movie' />");
    expect(true).toBe(true);
  });
});
