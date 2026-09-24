/* eslint-disable no-undef */
/**
 * T066/D-550 — sanitização de logs/artefatos do job E2E (sem PII/segredos).
 *
 * Redige padrões sensíveis ANTES do upload de artifacts: e-mails, IPv4/IPv6,
 * Bearer/Basic, valores de cookie, `password`/`token`/`secret` em JSON,
 * DATABASE_URL/REDIS_URL com credenciais. Puro e testável.
 *
 * Uso: node scripts/ci/sanitize-logs.mjs <arquivo...>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PADROES = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "***@***"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,3})?\b/g, "***.***.***.***"],
  [/\b(?:[0-9a-fA-F]{0,4}:){2,}[0-9a-fA-F]{0,4}\b/g, "***:ipv6***"],
  [/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 ***"],
  [/(cookie["']?\s*[:=]\s*)["'][^"']*["']/gi, "$1'***'"],
  [/((?:sess|csrf_token|token|refresh_token|password|secret|authorization)=)[^;\s"',]+/gi, "$1***"],
  [/("(?:password|senha|token|secret|authorization|cookie)"\s*:\s*)"[^"]*"/gi, '$1"***"'],
  [/((?:postgres(?:ql)?|redis):\/\/)[^\s"']*@/gi, "$1***@"],
];

/** Sanitiza um texto e devolve a versão redigida. */
export function sanitizarTexto(texto) {
  let saida = String(texto);
  for (const [re, sub] of PADROES) saida = saida.replace(re, sub);
  return saida;
}

function main() {
  const arquivos = process.argv.slice(2);
  if (arquivos.length === 0) {
    console.error("uso: node scripts/ci/sanitize-logs.mjs <arquivo...>");
    process.exit(1);
  }
  for (const f of arquivos) {
    if (!existsSync(f)) continue;
    const antes = readFileSync(f, "utf8");
    writeFileSync(f, sanitizarTexto(antes));
    console.log(`sanitizado: ${f}`);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("sanitize-logs.mjs")
) {
  main();
}
