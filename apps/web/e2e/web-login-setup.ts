import { request } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/**
 * D-588 (T211) — sessão autenticada LOCAL para os harnesses de admin/dashboard.
 *
 * Por que existe: o `e2e/global-setup.ts` só autentica com o back-end no ar
 * (`E2E_API_BASE`, default `http://localhost:4000`) e atrás de `E2E_FULL=1`. Sem
 * isso, nenhum gate cobria `/admin` nem o `/dashboard` — era a cegueira apontada
 * na auditoria (M1: axe sem rota de admin, visual só na home).
 *
 * Estratégia (duas tentativas, na ordem):
 *  1. **API direta** (`E2E_API_BASE`, default `http://localhost:4000`) — é o que o
 *     e2e de CI usa. Funciona quando o back-end local está no ar.
 *  2. **Proxy same-origin do web** (`POST http://localhost:3000/api/v1/auth/login`)
 *     — o caminho do usuário real, e o que grava o cookie `sess` no domínio do web.
 *
 * Cookie é por DOMÍNIO, não por porta: a sessão obtida em `localhost:4000` também
 * vale em `localhost:3000` — por isso a tentativa 1 serve ao harness local.
 *
 * Segurança: credenciais vêm de `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` (ambiente ou
 * `.env.local` da raiz) e **nunca** são impressas; o `storageState` (com o cookie de
 * sessão) é gravado no diretório temporário do SO, fora do repo.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..", "..");

export const WEB_STORAGE_STATE =
  process.env.E2E_WEB_STORAGE_STATE ?? join(tmpdir(), "mediarate-auth-local.json");

function credencialDeArquivo(chave: string): string | undefined {
  for (const arquivo of [".env.local", ".env"]) {
    const caminho = join(RAIZ, arquivo);
    if (!existsSync(caminho)) continue;
    const linha = readFileSync(caminho, "utf8")
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith(`${chave}=`));
    if (!linha) continue;
    const valor = linha
      .slice(linha.indexOf("=") + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (valor) return valor;
  }
  return undefined;
}

function credencial(chave: string): string {
  const valor = process.env[chave] ?? credencialDeArquivo(chave);
  if (!valor) {
    throw new Error(
      `[auth-setup] ${chave} ausente. Defina no ambiente ou em .env.local da raiz ` +
        "(os valores nunca são impressos).",
    );
  }
  return valor;
}

/** Tenta autenticar e devolve o status da última tentativa (sem expor credenciais). */
async function tentarLogin(base: string, origem: string): Promise<number> {
  const ctx = await request.newContext({ baseURL: base });
  try {
    const resposta = await ctx.post("/api/v1/auth/login", {
      data: { email: credencial("E2E_TEST_EMAIL"), password: credencial("E2E_TEST_PASSWORD") },
    });
    if (!resposta.ok()) return resposta.status();

    // Só grava o estado se a sessão estiver realmente ativa.
    const me = await ctx.get("/api/v1/auth/me");
    if (!me.ok()) return me.status();

    mkdirSync(dirname(WEB_STORAGE_STATE), { recursive: true });
    await ctx.storageState({ path: WEB_STORAGE_STATE });
    console.log(`[auth-setup] sessão autenticada gravada via ${origem}.`);
    return 200;
  } finally {
    await ctx.dispose();
  }
}

export default async function globalSetup(): Promise<void> {
  const apiBase = process.env.E2E_API_BASE ?? "http://localhost:4000";
  const webBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  const statusApi = await tentarLogin(apiBase, `API direta (${apiBase})`).catch(() => -1);
  if (statusApi === 200) return;

  const statusWeb = await tentarLogin(webBase, `proxy do web (${webBase})`).catch(() => -1);
  if (statusWeb === 200) return;

  throw new Error(
    "[auth-setup] não foi possível obter sessão autenticada — nenhum gate de admin/dashboard rodou.\n" +
      `  API direta (${apiBase}): ${statusApi === -1 ? "inacessível" : `HTTP ${statusApi}`}\n` +
      `  Proxy do web (${webBase}): ${statusWeb === -1 ? "inacessível" : `HTTP ${statusWeb}`}\n` +
      "  Como destravar (escolha um):\n" +
      "   a) subir a API local (esperada em :4000) com o banco que contém o usuário de teste;\n" +
      "   b) apontar E2E_API_BASE para o ambiente onde E2E_TEST_EMAIL/E2E_TEST_PASSWORD valem;\n" +
      "   c) definir API_PROXY_TARGET para esse mesmo ambiente antes de subir o web.\n" +
      "  As credenciais atuais do .env.local não valem na API que o proxy do web usa.",
  );
}
