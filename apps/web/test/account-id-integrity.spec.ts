import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * D-519 — integridade de identificadores Cloudflare: o account_id já foi
 * gravado truncado (31) e com dígitos duplicados (33) por transcrição
 * manual. Este teste estrutural impede reincidência no repo: qualquer
 * account_id em wrangler config DEVE ser 32 hex lowercase (formato
 * Cloudflare). A fonte da verdade continua sendo GET /accounts com token
 * autenticado — este teste é a defesa de primeiro nível.
 */
describe("integridade de identificadores Cloudflare (D-519)", () => {
  const CONFIGS = ["wrangler.jsonc", "workers/assets/wrangler.jsonc"];

  it("todo account_id em wrangler config é 32 hex lowercase", () => {
    for (const cfg of CONFIGS) {
      const raw = readFileSync(path.resolve(process.cwd(), cfg), "utf-8");
      const ids = [...raw.matchAll(/"account_id":\s*"([^"]+)"/g)].map((m) => m[1]);
      expect(ids.length, `${cfg} sem account_id`).toBeGreaterThan(0);
      for (const id of ids) {
        expect(id, `${cfg}: formato inválido`).toMatch(/^[a-f0-9]{32}$/);
      }
    }
  });
});
