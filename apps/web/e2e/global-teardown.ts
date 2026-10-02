import { readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * T074/D-553 — `globalTeardown`: remove o `storageState` (cookies de sessão).
 * Nunca imprime valores.
 */
const STORAGE_STATE_PATH =
  process.env.E2E_STORAGE_STATE ?? join(tmpdir(), "mediarate-e2e-auth.json");

export default function globalTeardown(): void {
  try {
    if (existsSync(STORAGE_STATE_PATH)) {
      // Confirma que o arquivo é JSON de storageState antes de remover (sanity).
      readFileSync(STORAGE_STATE_PATH, "utf8");
      rmSync(STORAGE_STATE_PATH, { force: true });
      console.log("[globalTeardown] storageState removido");
    }
  } catch {
    /* teardown não deve falhar a suíte */
  }
}
