/* global console: readonly */

// T040/D-538 — self-test determinístico do metric-alerts (sem rede/segredos/banco).
import {
  avaliarSnapshot,
  decidirAcao,
  thresholdsDeEnv,
  renderIssueBody,
  snapshotDePrometheus,
  DEFAULTS,
} from "./metric-alerts.mjs";

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

// --- abaixo do limiar ------------------------------------------------------
const abaixo = {
  janela5xxMin: 5,
  requisicoes: 1000,
  erros5xx: 2,
  authFalhas1min: 1,
  authFalhas5min: 3,
};
const av = avaliarSnapshot(abaixo);
t("abaixo do limiar → sem alertas", av.alertas.length === 0);
t("abaixo → ação none (sem issue aberta)", decidirAcao(av, false) === "none");
t("abaixo + issue aberta → close", decidirAcao(av, true) === "close");

// --- 5xx por taxa ----------------------------------------------------------
const alta5xx = {
  janela5xxMin: 5,
  requisicoes: 1000,
  erros5xx: 20,
  authFalhas1min: 0,
  authFalhas5min: 0,
};
const a5 = avaliarSnapshot(alta5xx);
t(
  "5xx taxa 2% → CRITICAL 5xx",
  a5.alertas.some((a) => a.nome === "5xx" && a.severidade === "CRITICAL"),
);
t("5xx → ação create (sem issue)", decidirAcao(a5, false) === "create");
t("5xx → ação update (issue aberta)", decidirAcao(a5, true) === "update");
t("taxa5xx calculada (0.02)", a5.taxa5xx === 0.02);

// --- 5xx por absoluto (taxa baixa) ----------------------------------------
const abs5xx = {
  janela5xxMin: 5,
  requisicoes: 10000,
  erros5xx: 6,
  authFalhas1min: 0,
  authFalhas5min: 0,
};
t(
  "5xx absoluto >= 5 → alerta (mesmo com taxa baixa)",
  avaliarSnapshot(abs5xx).alertas.some((a) => a.nome === "5xx"),
);

// --- auth 1 min (tráfego alto) --------------------------------------------
const altaAuth1 = {
  janela5xxMin: 5,
  requisicoes: 1000,
  erros5xx: 0,
  authFalhas1min: 60,
  authFalhas5min: 60,
};
t(
  "auth > 50/1min → WARNING",
  avaliarSnapshot(altaAuth1).alertas.some(
    (a) => a.nome === "auth_failures" && a.severidade === "WARNING",
  ),
);

// --- auth 5 min (tráfego baixo — evita cegueira) --------------------------
const altaAuth5 = {
  janela5xxMin: 5,
  requisicoes: 1000,
  erros5xx: 0,
  authFalhas1min: 2,
  authFalhas5min: 12,
};
t(
  "auth >= 10/5min → alerta (tráfego baixo)",
  avaliarSnapshot(altaAuth5).alertas.some((a) => a.nome === "auth_failures"),
);

// --- thresholds configuráveis ---------------------------------------------
t(
  "thresholds de env respeitados",
  thresholdsDeEnv({ ALERT_5XX_PCT: "2", ALERT_AUTH_1MIN: "10" }).taxa5xxPct === 2 &&
    thresholdsDeEnv({ ALERT_AUTH_1MIN: "10" }).auth1min === 10,
);
t(
  "threshold inválido cai no default",
  thresholdsDeEnv({ ALERT_5XX_PCT: "abc" }).taxa5xxPct === DEFAULTS.taxa5xxPct,
);
t(
  "threshold custom suprime alerta abaixo dele",
  avaliarSnapshot({ requisicoes: 1000, erros5xx: 15 }, { taxa5xxPct: 5, absoluto5xx: 500 }).alertas
    .length === 0,
);

// --- corpo da issue sem PII/segredos --------------------------------------
const body = renderIssueBody(alta5xx, a5, new Date("2026-09-22T00:00:00Z"));
t(
  "corpo sem PII/segredos",
  !/comentario|email|cpf|password|senha|token|whsec|sk_live|usuario_id|tenant_id|DATABASE_URL|cookie/i.test(
    body,
  ),
);
t("corpo tem a janela e o resumo", body.includes("janela 5xx") && body.includes("CRITICAL"));

// --- parser Prometheus (/metrics) -----------------------------------------
const prom = [
  "# HELP http_requests_total x",
  'http_requests_total{method="GET",route="/x",status="200"} 1000',
  'http_requests_total{method="POST",route="/y",status="500"} 30',
  'http_errors_total{method="POST",route="/y",status="500"} 30',
].join("\n");
const sp = snapshotDePrometheus(prom);
t("prometheus: requisicoes somadas (1030)", sp.requisicoes === 1030);
t("prometheus: erros5xx somados (30)", sp.erros5xx === 30);
t(
  "prometheus: taxa ~2.9% dispara 5xx",
  avaliarSnapshot(sp).alertas.some((a) => a.nome === "5xx"),
);

console.log(`\nself-test metric-alerts: ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);
