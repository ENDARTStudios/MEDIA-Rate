import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * T302 — self-test do security-gate: prova que o gate morre quando deve.
 * - Fixture PROIBIDA (tests/security/fixtures/proibida) com segredos FAKE →
 *   security-gate exit 1.
 * - Diretório limpo → security-gate exit 0.
 * Rodado localmente (não depende de docker).
 */
const GATE = join(process.cwd(), "scripts", "security-gate.ts");
const FIXTURE_PROIBIDA = join(process.cwd(), "tests", "security", "fixtures", "proibida");

describe("T302 — security-gate self-test (fixture)", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gate-limpo-"));
    writeFileSync(join(tempDir, "arquivo.txt"), "conteudo inocuo sem segredos", "utf8");
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("fixture PROIBIDA → gate exit 1 (morre quando deve)", () => {
    let exit: number | null = null;
    try {
      execFileSync(
        "node",
        ["--import", "@swc-node/register/esm-register", GATE, FIXTURE_PROIBIDA],
        {
          stdio: "ignore",
        },
      );
    } catch (err) {
      exit = (err as { status?: number }).status ?? -1;
    }
    expect(exit).toBe(1);
  });

  it("diretório limpo → gate exit 0", () => {
    expect(() =>
      execFileSync("node", ["--import", "@swc-node/register/esm-register", GATE, tempDir], {
        stdio: "ignore",
      }),
    ).not.toThrow();
  });
});
