/* global console: readonly */

// T040/D-538 — alertas métricos para a Beta (5xx + falhas de auth).
//
// Lê um SNAPSHOT de métricas (JSON) — de um arquivo (--input) ou da env
// METRICS_JSON — e decide se há alerta, renderizando o corpo da issue e a
// ação de deduplicação (create/update/close/none). Sem banco, sem PII, sem
// segredos. Determinístico (ver metric-alerts.self-test.mjs).
//
// Snapshot esperado (JSON):
// { "janela5xxMin":5, "requisicoes":1000, "erros5xx":20,
//   "authFalhas1min":12, "authFalhas5min":30 }
//
// Thresholds (defaults conservadores; overrides por env NÃO-secreta):
// - 5xx: taxa > 1% OU >= 5 erros absolutos (janela de 5 min) → CRITICAL.
// - auth: > 50 em 1 min OU >= 10 em 5 min → WARNING.
//
// CLI:
//   node scripts/ci/metric-alerts.mjs --input metricas.json            (dry-run)
//   node scripts/ci/metric-alerts.mjs --input metricas.json --apply    (abre/atualiza issue)
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const DEFAULTS = {
  taxa5xxPct: 1, // > 1%
  absoluto5xx: 5, // >= 5
  auth1min: 50, // > 50
  auth5min: 10, // >= 10
};

export const ISSUE_LABEL = "alerta-metrico";
export const ISSUE_TITLE = "[alerta-metrico] Pico de erros detectado (5xx/auth)";

/** Overrides de threshold a partir de env NÃO-secreta. */
export function thresholdsDeEnv(env = {}) {
  const num = (k, d) => {
    const v = env[k];
    if (v === undefined || v === "") return d;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  return {
    taxa5xxPct: num("ALERT_5XX_PCT", DEFAULTS.taxa5xxPct),
    absoluto5xx: num("ALERT_5XX_ABS", DEFAULTS.absoluto5xx),
    auth1min: num("ALERT_AUTH_1MIN", DEFAULTS.auth1min),
    auth5min: num("ALERT_AUTH_5MIN", DEFAULTS.auth5min),
  };
}

/** Avalia o snapshot → { taxa5xx, janela5xxMin, alertas[] }. Puro. */
export function avaliarSnapshot(snapshot, thresholds = {}) {
  const t = { ...DEFAULTS, ...thresholds };
  const requisicoes = Number(snapshot?.requisicoes ?? 0);
  const erros5xx = Number(snapshot?.erros5xx ?? 0);
  const auth1 = Number(snapshot?.authFalhas1min ?? 0);
  const auth5 = Number(snapshot?.authFalhas5min ?? 0);
  const janela = Number(snapshot?.janela5xxMin ?? 5);

  const taxa = requisicoes > 0 ? erros5xx / requisicoes : 0;
  const alertas = [];

  if (taxa > t.taxa5xxPct / 100 || erros5xx >= t.absoluto5xx) {
    alertas.push({
      nome: "5xx",
      severidade: "CRITICAL",
      valor: Number(taxa.toFixed(4)),
      threshold: `>${t.taxa5xxPct}% ou >=${t.absoluto5xx} abs`,
      janela: `${janela}min`,
      detalhe: `erros5xx=${erros5xx}, requisicoes=${requisicoes}`,
    });
  }
  if (auth1 > t.auth1min || auth5 >= t.auth5min) {
    alertas.push({
      nome: "auth_failures",
      severidade: "WARNING",
      valor: auth1,
      threshold: `>${t.auth1min}/1min ou >=${t.auth5min}/5min`,
      janela: "1min/5min",
      detalhe: `authFalhas1min=${auth1}, authFalhas5min=${auth5}`,
    });
  }

  return { taxa5xx: Number(taxa.toFixed(4)), janela5xxMin: janela, alertas };
}

/** Corpo da issue — apenas contadores/limiares (nunca PII/segredos). Puro. */
export function renderIssueBody(snapshot, avaliacao, agora = new Date()) {
  const criticos = avaliacao.alertas.filter((a) => a.severidade === "CRITICAL").length;
  const warns = avaliacao.alertas.filter((a) => a.severidade === "WARNING").length;
  return [
    `## Alerta métrico — MEDIA Rate (\`${ISSUE_LABEL}\`)`,
    "",
    `Detectado em ${agora.toISOString()} (janela 5xx: ${avaliacao.janela5xxMin} min).`,
    "",
    `- **5xx (taxa):** ${(avaliacao.taxa5xx * 100).toFixed(2)}%`,
    `- **requisições (janela):** ${Number(snapshot?.requisicoes ?? 0)}`,
    `- **erros 5xx (janela):** ${Number(snapshot?.erros5xx ?? 0)}`,
    `- **falhas de auth (1 min):** ${Number(snapshot?.authFalhas1min ?? 0)}`,
    `- **falhas de auth (5 min):** ${Number(snapshot?.authFalhas5min ?? 0)}`,
    "",
    "### Alertas disparados",
    ...(avaliacao.alertas.length > 0
      ? avaliacao.alertas.map(
          (a) =>
            `- **[${a.severidade}] ${a.nome}** (${a.janela}) — ${a.detalhe} — limiar ${a.threshold}`,
        )
      : ["- (nenhum)"]),
    "",
    `**Resumo:** ${criticos} CRITICAL, ${warns} WARNING.`,
    "",
    "> Playbook: `docs/INCIDENT_RESPONSE.md` · Métricas: `/metrics` (protegido).",
    "> Esta issue contém apenas contadores agregados — sem dados pessoais, credenciais ou payloads.",
  ].join("\n");
}

/** Ação de deduplicação. Puro. */
export function decidirAcao(avaliacao, issueAberta) {
  if (avaliacao.alertas.length > 0) return issueAberta ? "update" : "create";
  return issueAberta ? "close" : "none";
}

/**
 * Converte o texto Prometheus de `/metrics` num snapshot.
 * - `requisicoes` = Σ `http_requests_total`; `erros5xx` = Σ `http_errors_total`
 *   (contadores cumulativos → a "taxa" é a razão desde o boot, proxy razoável).
 * - `authFalhas*` = 0 (o /metrics não expõe janela de auth; esse dado vem do
 *   snapshot JSON/in-app AlertsService).
 */
export function snapshotDePrometheus(texto) {
  const soma = (nome) => {
    const re = new RegExp(`^${nome}(?:\\{[^}]*\\})?\\s+([0-9.eE+-]+)\\s*$`, "gm");
    let total = 0;
    let m;
    while ((m = re.exec(texto)) !== null) total += Number(m[1]);
    return total;
  };
  return {
    janela5xxMin: Number(process.env.ALERT_5XX_WINDOW_MIN ?? 5),
    requisicoes: soma("http_requests_total"),
    erros5xx: soma("http_errors_total"),
    authFalhas1min: soma("auth_failures_total"),
    authFalhas5min: 0,
  };
}

function lerSnapshot(env) {
  const idx = process.argv.indexOf("--input");
  let texto;
  if (idx >= 0 && process.argv[idx + 1]) {
    texto = readFileSync(process.argv[idx + 1], "utf8");
  } else if (env.METRICS_JSON) {
    texto = env.METRICS_JSON;
  } else {
    throw new Error("sem snapshot: passe --input <arquivo> ou METRICS_JSON");
  }
  // Auto-detecta Prometheus text (`/metrics`) vs JSON.
  const trimmed = texto.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(texto);
  return snapshotDePrometheus(texto);
}

function issueAberta() {
  try {
    const out = execFileSync(
      "gh",
      [
        "issue",
        "list",
        "--label",
        ISSUE_LABEL,
        "--state",
        "open",
        "--json",
        "number",
        "--limit",
        "1",
      ],
      { encoding: "utf8" },
    );
    const arr = JSON.parse(out || "[]");
    return arr.length > 0 ? arr[0].number : null;
  } catch {
    return null; // sem gh/rede → trata como fechada
  }
}

function aplicar(acao, body, num) {
  if (acao === "create") {
    execFileSync(
      "gh",
      ["issue", "create", "--title", ISSUE_TITLE, "--body", body, "--label", ISSUE_LABEL],
      {
        stdio: "inherit",
      },
    );
  } else if (acao === "update" && num) {
    execFileSync("gh", ["issue", "comment", String(num), "--body", body], { stdio: "inherit" });
  } else if (acao === "close" && num) {
    execFileSync(
      "gh",
      ["issue", "close", String(num), "--comment", "Alerta normalizado (abaixo do limiar)."],
      { stdio: "inherit" },
    );
  }
}

function main() {
  const dryRun = !process.argv.includes("--apply");
  const snapshot = lerSnapshot(process.env);
  const thresholds = thresholdsDeEnv(process.env);
  const avaliacao = avaliarSnapshot(snapshot, thresholds);
  const body = renderIssueBody(snapshot, avaliacao);
  const num = issueAberta();
  const acao = decidirAcao(avaliacao, num !== null);

  console.log(
    JSON.stringify(
      {
        taxa5xx: avaliacao.taxa5xx,
        alertas: avaliacao.alertas.map((a) => `${a.severidade}:${a.nome}`),
        thresholds,
        issueAberta: num,
        acao,
        dryRun,
      },
      null,
      2,
    ),
  );
  if (dryRun) {
    console.log("--- dry-run: corpo da issue (pré-visualização) ---");
    console.log(body);
  } else {
    aplicar(acao, body, num);
  }
}

const ehMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (ehMain) main();
