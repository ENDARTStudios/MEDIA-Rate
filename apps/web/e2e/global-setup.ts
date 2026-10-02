import { request } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

/**
 * T074/D-553 — `globalSetup` do E2E: autentica **UMA vez** e grava `storageState`.
 *
 * Motivo: o rate limit de `/auth/login` é **6/min**; a suíte antiga fazia um
 * *burst* de ~32 logins (1 por teste) e estourava o limite (429). Aqui há **1
 * login por execução Playwright** (compartilhado pelos projetos).
 *
 * Segurança: o arquivo de `storageState` contém cookies de sessão — é gravado em
 * diretório **temporário** (fora do repositório), **nunca** impresso/commitado, e
 * removido no `globalTeardown`.
 */
const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:4000";

/** Caminho do storageState (temporário, fora do repo). */
export const STORAGE_STATE_PATH =
  process.env.E2E_STORAGE_STATE ?? join(tmpdir(), "mediarate-e2e-auth.json");

export default async function globalSetup(): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("[globalSetup] E2E_TEST_EMAIL/E2E_TEST_PASSWORD ausentes");
  }

  const ctx = await request.newContext({ baseURL: API_BASE });
  try {
    const login = await ctx.post("/api/v1/auth/login", { data: { email, password } });
    if (login.status() !== 200) {
      throw new Error(`[globalSetup] login falhou: ${login.status()}`);
    }
    const me = await ctx.get("/api/v1/auth/me");
    if (me.status() !== 200) {
      throw new Error(`[globalSetup] /auth/me != 200: ${me.status()}`);
    }
    mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
    await ctx.storageState({ path: STORAGE_STATE_PATH });
    // Nunca imprimir valores de cookie — apenas confirmação.
    console.log("[globalSetup] storageState gerado (login único; /auth/me=200)");
  } finally {
    await ctx.dispose();
  }
}
