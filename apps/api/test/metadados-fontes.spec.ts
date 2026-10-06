/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  mapearIgdb,
  mapearComicvine,
  mapearOpenlibrary,
} from "../scripts/backfill-metadados-fontes.mjs";

/**
 * T164 (Onda C2) — mappers de produtoras/editoras por fonte:
 * IGDB involved_companies (ESTUDIO/PRODUTORA), Comic Vine publisher
 * (EDITORA), OpenLibrary editions.publishers (EDITORA, máx 5, dedupe).
 * NUNCA fabrica: payload vazio → [].
 */

describe("mapearIgdb (T164)", () => {
  it("separa developer (ESTUDIO) e publisher (PRODUTORA) por flag", () => {
    const r = mapearIgdb({
      involved_companies: [
        { company: { id: 1, name: "Naughty Dog" }, developer: true, publisher: false },
        { company: { id: 2, name: "Sony Interactive" }, developer: false, publisher: true },
        { company: { id: 3, name: "Só envolvida" }, developer: false, publisher: false },
      ],
    });
    expect(r).toEqual([
      { fonte_id: "1", nome: "Naughty Dog", papel: "ESTUDIO" },
      { fonte_id: "2", nome: "Sony Interactive", papel: "PRODUTORA" },
    ]);
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("empresa com os dois papeis gera duas linhas; sem name sai fora", () => {
    const r = mapearIgdb({
      involved_companies: [
        { company: { id: 9, name: "Duplo Papel" }, developer: true, publisher: true },
        { company: { id: 10 }, developer: true, publisher: true }, // sem name → fora
      ],
    });
    expect(r).toHaveLength(2);
    expect(r[0].papel).toBe("ESTUDIO");
    expect(r[1].papel).toBe("PRODUTORA");
  });

  it("payload vazio → []", () => {
    expect(mapearIgdb({})).toEqual([]);
  });
});

describe("mapearComicvine (T164)", () => {
  it("publisher do volume vira EDITORA", () => {
    const r = mapearComicvine({
      results: { name: "Watchmen", publisher: { id: 816, name: "DC Comics" } },
    });
    expect(r).toEqual([{ fonte_id: "816", nome: "DC Comics", papel: "EDITORA" }]);
  });

  it("sem publisher → []", () => {
    expect(mapearComicvine({ results: { name: "X" } })).toEqual([]);
    expect(mapearComicvine({})).toEqual([]);
  });
});

describe("mapearOpenlibrary (T164)", () => {
  it("editoras por FREQUÊNCIA entre editions, cap 3; junk print-on-demand fora", () => {
    const payload = {
      results: {
        size: 4,
        entries: [
          { publishers: ["Companhia das Letras", "CreateSpace Independent Publishing Platform"] },
          { publishers: ["Companhia das Letras"] },
          { publishers: ["Editora", "Sextante"] },
          { publishers: ["A", "B", "C", "D"] },
        ],
      },
    };
    const r = mapearOpenlibrary(payload);
    // Companhia (2x) lidera; junk ("Editora", CreateSpace) filtrado; cap 3.
    expect(r.map((e) => e.nome)).toEqual(["Companhia das Letras", "Sextante", "A"]);
    expect(r.every((e) => e.papel === "EDITORA")).toBe(true);
  });

  it("formato editions.json (results.entries) e legado (entries) — ambos funcionam", () => {
    expect(mapearOpenlibrary({ results: { entries: [{ publishers: ["Alpha"] }] } })).toHaveLength(
      1,
    );
    expect(mapearOpenlibrary({ entries: [{ publishers: ["Beta"] }] })).toHaveLength(1);
    expect(mapearOpenlibrary({})).toEqual([]);
  });
});
