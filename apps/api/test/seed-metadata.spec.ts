import { describe, it, expect } from "vitest";
import { mapearIdadeIGDB, CURADORIA } from "../prisma/seed-metadata.js";

describe("seed-metadata (T287)", () => {
  it("mapeia categoria IGDB → classificação BR (mais restritivo vence)", () => {
    expect(mapearIdadeIGDB([{ category: 1 }])).toBe("L");
    expect(mapearIdadeIGDB([{ category: 3 }])).toBe("DEZ");
    expect(mapearIdadeIGDB([{ category: 5 }])).toBe("DEZOITO");
    // Misto: o mais restritivo vence (decisão conservadora).
    expect(mapearIdadeIGDB([{ category: 1 }, { category: 4 }])).toBe("CATORZE");
  });

  it("categorias desconhecidas/sem enforcement → null (ausência graciosa)", () => {
    expect(mapearIdadeIGDB([])).toBeNull();
    expect(mapearIdadeIGDB([{ category: 99 }])).toBeNull();
    expect(mapearIdadeIGDB([{ rating: 40 }])).toBeNull();
  });

  it("curadoria editorial cobre títulos-âncora com origem/prêmios", () => {
    const slugs = CURADORIA.map((c) => c.slug);
    expect(slugs).toContain("duna");
    expect(slugs).toContain("elden-ring");
    const duna = CURADORIA.find((c) => c.slug === "duna");
    expect(duna?.origem).toBe("LIVRO");
    expect((duna?.premios ?? []).length).toBeGreaterThan(0);
  });
});
