import { describe, it, expect } from "vitest";
import { ghsaDe, permitido, filtrarBloqueantes } from "../../../scripts/audit-ci.mjs";

const GHSA_OK = "GHSA-ggr8-5vv4-36mx";
const allow = new Map([[GHSA_OK, { motivo: "teste", revisao: "2026-12" }]]);

function advisory(ghsa: string) {
  return {
    source: 1,
    name: "deepmerge-ts",
    dependency: "deepmerge-ts",
    title: "t",
    url: `https://github.com/advisories/${ghsa}`,
    severity: "high",
  };
}

// Mapa sintético que espelha a cadeia real (nunca toca o registry).
function cadeiaReal() {
  return {
    "deepmerge-ts": { severity: "high", range: "<8.0.0", via: [advisory(GHSA_OK)] },
    "@prisma/config": { severity: "high", range: "6.x", via: ["deepmerge-ts"] },
    "prisma": { severity: "high", range: "6.x", via: ["@prisma/config"] },
  };
}

describe("audit-ci gate (T040)", () => {
  it("GHSA próprio allowlistado passa", () => {
    expect(permitido(cadeiaReal(), allow, "deepmerge-ts")).toBe(true);
  });

  it("GHSA próprio NÃO allowlistado bloqueia (CVE futuro distinto)", () => {
    const vulns = {
      "prisma": {
        severity: "high",
        range: "6.x",
        via: [advisory("GHSA-xxxx-yyyy-zzzz"), "@prisma/config"],
      },
      "@prisma/config": { severity: "high", range: "6.x", via: ["deepmerge-ts"] },
      "deepmerge-ts": { severity: "high", range: "<8.0.0", via: [advisory(GHSA_OK)] },
    };
    expect(permitido(vulns, allow, "prisma")).toBe(false);
    expect(filtrarBloqueantes(vulns, allow).map((b) => b.name)).toContain("prisma");
  });

  it("pacote limpo via pai vulnerável allowlistado passa", () => {
    expect(permitido(cadeiaReal(), allow, "@prisma/config")).toBe(true);
    expect(permitido(cadeiaReal(), allow, "prisma")).toBe(true);
  });

  it("pai limpo ausente do mapa é neutro", () => {
    const vulns = {
      "deepmerge-ts": {
        severity: "high",
        range: "<8.0.0",
        via: [advisory(GHSA_OK), "ferramenta-limpa"],
      },
    };
    expect(permitido(vulns, allow, "deepmerge-ts")).toBe(true);
  });

  it("ciclo com âncora allowlistada termina e passa (sem loop)", () => {
    const vulns = {
      a: { severity: "high", range: "1.x", via: [advisory(GHSA_OK), "b"] },
      b: { severity: "high", range: "1.x", via: ["a"] },
    };
    expect(permitido(vulns, allow, "a")).toBe(true);
    expect(permitido(vulns, allow, "b")).toBe(true);
  });

  it("sem allowlist o conjunto atual bloqueia (controle negativo)", () => {
    const bloqueantes = filtrarBloqueantes(cadeiaReal(), new Map());
    expect(bloqueantes.map((b) => b.name).sort()).toEqual([
      "@prisma/config",
      "deepmerge-ts",
      "prisma",
    ]);
  });

  it("severidade moderate é ignorada pelo gate", () => {
    const vulns = {
      qs: {
        severity: "moderate",
        range: "6.x",
        via: [{ ...advisory(GHSA_OK), severity: "moderate" }],
      },
    };
    expect(filtrarBloqueantes(vulns, allow)).toEqual([]);
  });

  it("ghsaDe extrai só GHSAs de objetos com url", () => {
    expect(
      ghsaDe(["pai-limpo", { url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" }, 42]),
    ).toEqual(["GHSA-aaaa-bbbb-cccc"]);
    expect(ghsaDe([])).toEqual([]);
  });
});
