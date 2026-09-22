/* global console: readonly */

// T042/D-539 — self-test determinístico do uptime-check (sem rede/banco/gh).
import {
  avaliarUptime,
  decidirAcaoUptime,
  renderUptimeBody,
  coletarUm,
  ENDPOINTS,
} from "./uptime-check.mjs";

let ok = 0;
let fail = 0;
const t = (nome, cond) => {
  if (cond) {
    ok += 1;
    console.log("ok - " + nome);
  } else {
    fail += 1;
    console.error("FAIL - " + nome);
  }
};

const todosOk = ENDPOINTS.map((e) => ({
  nome: e.nome,
  url: e.url,
  httpStatus: 200,
  okStatuses: e.okStatuses,
}));

// --- sucesso total ---------------------------------------------------------
const avOk = avaliarUptime(todosOk);
t("todos ok → ok=true sem falhas", avOk.ok && avOk.falhas.length === 0);
t("sucesso + sem issue → none", decidirAcaoUptime(avOk, false) === "none");
t("sucesso + issue aberta → close", decidirAcaoUptime(avOk, true) === "close");

// --- falha ----------------------------------------------------------------
const comFalha = [
  { nome: "api-health", url: "u/health", httpStatus: 503, okStatuses: [200] },
  ...todosOk.filter((r) => r.nome !== "api-health"),
];
const avF = avaliarUptime(comFalha);
t("falha 503 na api-health → ok=false", !avF.ok && avF.falhas.some((f) => f.nome === "api-health"));
t("falha + sem issue → create", decidirAcaoUptime(avF, false) === "create");
t("falha + issue aberta → update (sem spam)", decidirAcaoUptime(avF, true) === "update");

// --- erro/timeout ---------------------------------------------------------
const comErro = [{ nome: "web-pt-BR", url: "u/pt-BR", httpStatus: null, erro: "TimeoutError" }];
const avE = avaliarUptime(comErro);
t("erro/timeout conta como falha", !avE.ok && avE.falhas[0].erro === "TimeoutError");

// --- redirect aceitável por default --------------------------------------
const comRedirect = [{ nome: "x", url: "u/x", httpStatus: 307 }];
t("307 é aceitável por default", avaliarUptime(comRedirect).ok);
const soRedir = [{ nome: "y", url: "u/y", httpStatus: 307, okStatuses: [200] }];
t("okStatuses estrito reprova 307", !avaliarUptime(soRedir).ok);

// --- corpo sem PII/segredos ----------------------------------------------
const body = renderUptimeBody(avF, new Date("2026-09-22T00:00:00Z"));
t(
  "corpo sem PII/segredos",
  !/comentario|email|cpf|password|senha|whsec|sk_live|usuario_id|tenant_id|DATABASE_URL|cookie|authorization/i.test(
    body,
  ),
);
t("corpo lista o endpoint falho", body.includes("api-health") && body.includes("HTTP 503"));

// --- retry mínimo (falha transitória → sucesso) --------------------------
const ep = { nome: "t", url: "u/t", okStatuses: [200] };
let chamadas = 0;
const fetchTransitorio = async () => {
  chamadas += 1;
  if (chamadas === 1) throw new Error("ECONNRESET");
  return { status: 200 };
};
const rTrans = await coletarUm(ep, fetchTransitorio, { tentativas: 2, backoffMs: 0 });
t(
  "retry: falha transitória resolve no 2º (tentativas=2)",
  rTrans.httpStatus === 200 && rTrans.tentativas === 2,
);
t("retry: transitório → avaliarUptime ok", avaliarUptime([rTrans]).ok);
t("retry: transitório → acao=none", decidirAcaoUptime(avaliarUptime([rTrans]), false) === "none");

const fetch503 = async () => ({ status: 503 });
const r503 = await coletarUm(ep, fetch503, { tentativas: 2, backoffMs: 0 });
t(
  "retry: falha persistente marca falha (tentativas=2)",
  r503.httpStatus === 503 && r503.tentativas === 2 && !avaliarUptime([r503]).ok,
);

let m = 0;
const fetch500entao200 = async () => {
  m += 1;
  return { status: m === 1 ? 500 : 200 };
};
t(
  "retry: 500→200 resolve no retry",
  (await coletarUm(ep, fetch500entao200, { tentativas: 2, backoffMs: 0 })).httpStatus === 200,
);

console.log(`\nself-test uptime-check: ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);
