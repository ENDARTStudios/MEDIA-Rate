import { describe, it, expect } from "vitest";
import {
  mapearIdadeIGDB,
  melhorCertificacao,
  SEVERIDADE_US,
  SEVERIDADE_ES,
  CURADORIA,
} from "../prisma/seed-metadata.js";

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

  it("T298 — US: certificação mais restritiva vence (mapa explícito, D-283)", () => {
    const releases = [{ certification: "PG-13" }, { certification: "R" }, { certification: "PG" }];
    expect(melhorCertificacao(releases, SEVERIDADE_US)).toBe("R");
    expect(melhorCertificacao([{ certification: "G" }], SEVERIDADE_US)).toBe("G");
    // Desconhecida → ausência graciosa (nunca erro/valor inventado).
    expect(melhorCertificacao([{ certification: "XX" }], SEVERIDADE_US)).toBeNull();
    expect(melhorCertificacao([{ certification: "" }], SEVERIDADE_US)).toBeNull();
  });

  it("T298 — ES: APTA < 7 < 12 < 16 < 18", () => {
    expect(
      melhorCertificacao([{ certification: "12" }, { certification: "18" }], SEVERIDADE_ES),
    ).toBe("18");
    expect(
      melhorCertificacao([{ certification: "TP" }, { certification: "16" }], SEVERIDADE_ES),
    ).toBe("16");
    expect(melhorCertificacao([{ certification: "APTA" }], SEVERIDADE_ES)).toBe("APTA");
  });
});
