#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * T084/D-556 — smoke autenticado determinístico (login 1× + leituras críticas).
 *
 * Modo padrão: **local/efêmero**. Executa:
 *   1 POST /api/v1/auth/login  (UMA vez; aborta em != 200, sem retry)
 *   2 GET  /api/v1/auth/me
 *   3 GET  /api/v1/interacoes?limit=1  (envelope + allowlist do item)
 *
 * Segurança: recusa URL não-local; NUNCA imprime cookie/token/senha/email/IP/corpo;
 * a saída contém apenas status, NOMES de cookie/chave, contadores e booleanos.
 * As funções puras são exportadas para o self-test offline.
 */

const GRUPOS_PROIBIDOS = [
  "railway.internal",
  "railway.app",
  "mediarate.app",
  "production",
  "prod.",
];
const CAMPOS_INTERNOS = ["usuario_id", "tenant_id", "created_at", "tipo", "rating", "comentario"];

/** Recusa URL não-local (localhost/loopback) e marcadores de produção. */
export function validarBaseUrlLocal(url) {
  if (typeof url !== "string" || url.trim() === "") return { ok: false, motivo: "vazio" };
  const baixo = url.toLowerCase();
  for (const g of GRUPOS_PROIBIDOS)
    if (baixo.includes(g)) return { ok: false, motivo: "host proibido" };
  let host;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return { ok: false, motivo: "URL inválida" };
  }
  const locais = new Set(["localhost", "127.0.0.1", "::1"]);
  return locais.has(host) ? { ok: true, host } : { ok: false, motivo: "host não-local" };
}

/** Extrai apenas os NOMES de cookie de headers Set-Cookie (nunca valores). */
export function nomesDeCookies(setCookie) {
  const arr = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return arr.map((c) => String(c).split("=")[0].trim()).filter(Boolean);
}

/** Valida o envelope paginado de /interacoes. */
export function validarEnvelopeInteracoes(json) {
  if (!json || typeof json !== "object") return { ok: false, motivo: "não-objeto" };
  for (const k of ["items", "total", "porStatus", "nextCursor"]) {
    if (!(k in json)) return { ok: false, motivo: `falta ${k}` };
  }
  return Array.isArray(json.items) ? { ok: true } : { ok: false, motivo: "items não-array" };
}

/** O item expõe alguma coluna interna/legada? (allowlist do B3/D-536). */
export function itemTemColunasInternas(item) {
  if (!item || typeof item !== "object") return false;
  return CAMPOS_INTERNOS.some((c) => c in item);
}

/** Sumário sanitizado (apenas status/nomes/contadores/booleanos). */
export function sumarioSanitizado(dados) {
  return JSON.stringify(dados, null, 2);
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";
  const guard = validarBaseUrlLocal(baseUrl);
  if (!guard.ok) {
    console.error(`smoke-auth: base URL recusada (${guard.motivo})`);
    process.exit(1);
  }
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;
  if (!email || !password) {
    console.error("smoke-auth: SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD ausentes");
    process.exit(1);
  }

  const jar = new Map(); // nome -> valor (mantido em memória; nunca impresso)
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const absorverCookies = (res) => {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [nome, ...resto] = String(c).split("=");
      const valor = resto.join("=").split(";")[0];
      jar.set(nome.trim(), valor);
    }
    return nomesDeCookies(set);
  };

  const out = {
    login: 0,
    auth_me: 0,
    interacoes: 0,
    cookies: [],
    chaves: [],
    internas_ausentes: null,
    production_access: false,
  };
  try {
    // 1 login (ÚNICO)
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    out.login = login.status;
    out.cookies = absorverCookies(login);
    if (login.status !== 200) {
      console.error(`smoke-auth: login != 200 (${login.status}) — abortando (sem retry)`);
      process.exit(1);
    }

    // 2 auth/me
    const me = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: cookieHeader() } });
    out.auth_me = me.status;
    if (me.status !== 200) {
      console.error(`smoke-auth: /auth/me != 200 (${me.status})`);
      process.exit(1);
    }

    // 3 interacoes (read-only)
    const it = await fetch(`${baseUrl}/api/v1/interacoes?limit=1`, {
      headers: { Cookie: cookieHeader() },
    });
    out.interacoes = it.status;
    if (it.status !== 200) {
      console.error(`smoke-auth: /interacoes != 200 (${it.status})`);
      process.exit(1);
    }
    const json = await it.json();
    const env = validarEnvelopeInteracoes(json);
    if (!env.ok) {
      console.error(`smoke-auth: envelope inválido (${env.motivo})`);
      process.exit(1);
    }
    out.chaves = Object.keys(json);
    out.internas_ausentes = json.items.length === 0 ? true : !itemTemColunasInternas(json.items[0]);

    console.log(sumarioSanitizado(out));
    if (out.internas_ausentes !== true) {
      console.error("smoke-auth: item expõe colunas internas");
      process.exit(1);
    }
    console.log("smoke-auth: OK");
  } catch (e) {
    console.error(`smoke-auth: falha (${(e && e.message) || "erro"})`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("smoke-auth.mjs")) main();
