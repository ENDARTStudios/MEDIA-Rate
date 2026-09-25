/* global console: readonly */
/**
 * T084/D-556 — self-test offline do smoke-auth (sem rede/banco/segredos).
 * Rodar: node scripts/ci/smoke-auth.self-test.mjs
 */
import { readFileSync } from "node:fs";
import {
  validarBaseUrlLocal,
  nomesDeCookies,
  validarEnvelopeInteracoes,
  itemTemColunasInternas,
  sumarioSanitizado,
} from "./smoke-auth.mjs";

let ok = 0;
let fail = 0;
const t = (nome, cond) => {
  if (cond) {
    ok += 1;
    console.log("  ok  " + nome);
  } else {
    fail += 1;
    console.log("  FAIL " + nome);
  }
};

const fix = JSON.parse(
  readFileSync(new URL("./fixtures/smoke-auth/responses.json", import.meta.url), "utf8"),
);

t("aceita localhost", validarBaseUrlLocal("http://localhost:4000").ok);
t("aceita 127.0.0.1", validarBaseUrlLocal("http://127.0.0.1:4000").ok);
t("recusa railway", !validarBaseUrlLocal("http://x.railway.internal:4000").ok);
t("recusa mediarate.app", !validarBaseUrlLocal("https://media-rate-production.up.railway.app").ok);
t("recusa host remoto", !validarBaseUrlLocal("http://10.0.0.9:4000").ok);

t(
  "cookie: só nomes (sem valor)",
  JSON.stringify(nomesDeCookies(fix.setCookie)) === '["sess","csrf_token"]',
);
t("cookie: nunca contém o valor", !nomesDeCookies(fix.setCookie).join(",").includes("abc123"));

t("envelope ok", validarEnvelopeInteracoes(fix.envelopeOk).ok);
t(
  "envelope sem nextCursor → falha",
  !validarEnvelopeInteracoes({ items: [], total: 0, porStatus: {} }).ok,
);
t(
  "envelope items não-array → falha",
  !validarEnvelopeInteracoes({ items: {}, total: 0, porStatus: {}, nextCursor: null }).ok,
);

t("item cru tem colunas internas", itemTemColunasInternas(fix.itemCru));
t("item allowlist está limpo", !itemTemColunasInternas(fix.itemAllowlist));

const resumo = sumarioSanitizado({
  login: 200,
  cookies: nomesDeCookies(fix.setCookie),
  internas_ausentes: true,
});
t("resumo não vaza valor de cookie", !resumo.includes("abc123"));
t("resumo não vaza email", !resumo.includes("@"));

console.log(`\nself-test smoke-auth: ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);

// T085 — hardening: sentinel negativo + checagem estática do workflow.
{
  const sentinel = ["SENHA", "FIXTURE", "XYZ"].join("-"); // construído (não parece secret)
  const resumoSentinel = sumarioSanitizado({
    login: 200,
    cookies: ["sess", "csrf_token"],
    internas_ausentes: true,
    production_access: false,
    refleto: sentinel,
  });
  t("sentinel detectado quando presente (prova do mecanismo)", resumoSentinel.includes(sentinel));
  const resumoSeguro = sumarioSanitizado({
    login: 200,
    cookies: ["sess", "csrf_token"],
    internas_ausentes: true,
    production_access: false,
  });
  t("sumário seguro NÃO contém o sentinel", !resumoSeguro.includes(sentinel));
  t(
    "sumário seguro NÃO contém Set-Cookie/Authorization",
    !/set-cookie|authorization/i.test(resumoSeguro),
  );

  const wf = readFileSync(
    new URL("../../.github/workflows/smoke-auth.yml", import.meta.url),
    "utf8",
  );
  t("workflow: sem SMOKE_TEST_PASSWORD em env", !/^\s*SMOKE_TEST_PASSWORD\s*:/m.test(wf));
  t("workflow: sem curl --user", !/--user\b/.test(wf));
  t("workflow: sem Authorization literal", !/Authorization:\s*Bearer/i.test(wf));
  t("workflow: permissions contents: read", /permissions:\s*\r?\n\s*contents:\s*read/.test(wf));
}
if (fail > 0) process.exit(1);
