import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * BETA-GAP-06 / T122 — a ficha de mídia não pode exibir crédito fabricado.
 *
 * Guarda estática (padrão `hero-promessa-perpetua`): o fallback de demonstração
 * (`src/lib/api.ts`) não pode reintroduzir placeholders genéricos, e os
 * adapters de mídia devem manter `cast`/`crew`/`reviews` vazios quando não há
 * fonte legítima (a UI mostra empty state honesto).
 */

const SRC = fs.readFileSync(path.resolve(process.cwd(), "src/lib/api.ts"), "utf8");

describe("BETA-GAP-06 — sem metadado/crédito fabricado no fallback", () => {
  it("não contém crew/cast placeholder genérico", () => {
    expect(SRC).not.toMatch(/name:\s*"Desenvolvedor"/);
    expect(SRC).not.toMatch(/name:\s*"Disponível em breve"/);
  });

  it("adapters reais mantêm cast/crew/reviews vazios (sem invenção)", () => {
    // Regressão: se alguém popular cast/crew/reviews com dado inventado no
    // mapper, este guard sinaliza (as listas vazias são a política honesta).
    expect(SRC).toMatch(/cast:\s*\[\]/);
    expect(SRC).toMatch(/crew:\s*\[\]/);
    expect(SRC).toMatch(/reviews:\s*\[\]/);
  });
});
