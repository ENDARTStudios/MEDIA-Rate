/* global console: readonly */

// T227 — alerta de falha de backup do PostgreSQL/Railway PITR.
//
// Fonte: o texto Prometheus de `/metrics`, que agora expõe `backup_health_*`
// (lidos pelo app de `pg_stat_archiver`, read-only, sem PII). Este script é um
// LEITOR fino: a decisão (ok/warn/crit + motivos) é do app, testada em
// `apps/api/test/backup-health.spec.ts` — aqui só traduzimos isso em alerta e
// fazemos o dedup da issue. Sem banco, sem GitHub token próprio, sem segredos.
//
// CLI:
//   node scripts/ci/backup-health.mjs --input metricas.txt          (dry-run)
//   node scripts/ci/backup-health.mjs --input metricas.txt --apply  (abre/atualiza issue)
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ISSUE_LABEL = "backup-health-alert";
export const ISSUE_TITLE = "[backup-health] Falha de backup do PostgreSQL (PITR/arquivador)";

/** Extrai um gauge escalar do texto Prometheus. Ausente ⇒ null. Puro. */
export function valorGauge(texto, nome) {
  const re = new RegExp(`^${nome}\\s+([0-9.eE+-]+)\\s*$`, "m");
  const m = String(texto ?? "").match(re);
  return m ? Number(m[1]) : null;
}

/** Extrai os labels `reason` das séries `backup_health_reason{...}`. Puro. */
export function motivosDePrometheus(texto) {
  const re = /^backup_health_reason\{reason="([a-z_]+)"\}\s+1\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(String(texto ?? ""))) !== null) out.push(m[1]);
  return out;
}

/**
 * Converte o texto Prometheus de `/metrics` no snapshot de saúde do backup.
 * `metricas_ausentes` = o gauge não está exposto (fail-closed: alerta). Puro.
 */
export function snapshotDePrometheus(texto) {
  const probe = valorGauge(texto, "backup_health_probe_ok");
  const ok = valorGauge(texto, "backup_health_ok");
  const level = valorGauge(texto, "backup_health_level");
  const idadeFalha = valorGauge(texto, "backup_archiver_last_failed_age_seconds");
  return {
    metricasAusentes: probe === null || ok === null,
    probeOk: probe === 1,
    ok: ok === 1,
    level: level === null ? null : level,
    motivos: motivosDePrometheus(texto),
    archivedTotal: valorGauge(texto, "backup_archiver_archived_total"),
    failedTotal: valorGauge(texto, "backup_archiver_failed_total"),
    idadeUltimoArquivamentoSegundos: valorGauge(texto, "backup_archiver_last_archived_age_seconds"),
    idadeUltimaFalhaSegundos: idadeFalha !== null && idadeFalha >= 0 ? idadeFalha : null,
  };
}

/** Avalia o snapshot → { alertas[] }. Puro e determinístico. */
export function avaliarBackup(snapshot) {
  const alertas = [];
  if (snapshot?.metricasAusentes) {
    alertas.push({
      nome: "metricas_ausentes",
      severidade: "CRITICAL",
      detalhe: "as métricas backup_health_* não estão expostas em /metrics",
    });
    return { alertas };
  }
  if (!snapshot.probeOk) {
    alertas.push({
      nome: "probe_indisponivel",
      severidade: "CRITICAL",
      detalhe: "o app não conseguiu medir a saúde do backup (fail-closed)",
    });
    return { alertas };
  }
  if (!snapshot.ok) {
    const motivos = (snapshot.motivos ?? []).filter((m) => m !== "ok");
    alertas.push({
      nome: "backup_health",
      severidade: snapshot.level === 2 ? "CRITICAL" : "WARNING",
      detalhe: `motivos=${motivos.length > 0 ? motivos.join(",") : "desconhecido"} · último arquivamento há ${
        snapshot.idadeUltimoArquivamentoSegundos ?? "?"
      }s · falhas=${snapshot.failedTotal ?? "?"}`,
    });
  }
  return { alertas };
}

/** Corpo da issue — apenas contadores/enums (nunca PII/segredos/IDs). Puro. */
export function renderIssueBody(snapshot, avaliacao, agora = new Date()) {
  const criticos = avaliacao.alertas.filter((a) => a.severidade === "CRITICAL").length;
  const warns = avaliacao.alertas.filter((a) => a.severidade === "WARNING").length;
  const n = (v) => (v === null || v === undefined ? "?" : v);
  return [
    `## Alerta de backup — MEDIA Rate (\`${ISSUE_LABEL}\`)`,
    "",
    `Detectado em ${agora.toISOString()} (fonte: \`/metrics\` → \`backup_health_*\`).`,
    "",
    "| Métrica | Valor |",
    "|---|---|",
    `| probe OK | ${snapshot?.probeOk ? "sim" : "não"} |`,
    `| backup saudável | ${snapshot?.ok ? "sim" : "não"} |`,
    `| nível (0=ok,1=warn,2=crit) | ${n(snapshot?.level)} |`,
    `| último arquivamento (s) | ${n(snapshot?.idadeUltimoArquivamentoSegundos)} |`,
    `| última falha (s) | ${n(snapshot?.idadeUltimaFalhaSegundos)} |`,
    `| WALs arquivados (total) | ${n(snapshot?.archivedTotal)} |`,
    `| falhas de arquivamento (total) | ${n(snapshot?.failedTotal)} |`,
    `| motivos | ${(snapshot?.motivos ?? []).join(", ") || "?"} |`,
    "",
    "### Alertas disparados",
    ...(avaliacao.alertas.length > 0
      ? avaliacao.alertas.map((a) => `- **[${a.severidade}] ${a.nome}** — ${a.detalhe}`)
      : ["- (nenhum)"]),
    "",
    `**Resumo:** ${criticos} CRITICAL, ${warns} WARNING.`,
    "",
    "### Interpretação",
    "- O PITR gerenciado depende do **arquivamento contínuo de WAL** (`pg_stat_archiver`).",
    "- `backup_health_ok=0` significa que a janela de recuperação **deixou de avançar** ou não pôde ser medida.",
    "- O alerta fecha automaticamente quando a saúde normaliza.",
    "",
    "> Playbook: `docs/06-devops-deployment/BACKUP_DR.md` · `docs/05-security-compliance/INCIDENT_RESPONSE.md`",
    "> Esta issue contém apenas contadores agregados — sem dados pessoais, credenciais, IDs ou payloads.",
  ].join("\n");
}

/** Ação de deduplicação. Puro. */
export function decidirAcao(avaliacao, issueAberta) {
  if (avaliacao.alertas.length > 0) return issueAberta ? "update" : "create";
  return issueAberta ? "close" : "none";
}

function lerSnapshot(env) {
  const idx = process.argv.indexOf("--input");
  if (idx >= 0 && process.argv[idx + 1]) return readFileSync(process.argv[idx + 1], "utf8");
  if (env.METRICS_TEXT) return env.METRICS_TEXT;
  if (env.METRICS_JSON) return env.METRICS_JSON;
  throw new Error("sem snapshot: passe --input <arquivo> ou METRICS_TEXT");
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
      { stdio: "inherit" },
    );
  } else if (acao === "update" && num) {
    execFileSync("gh", ["issue", "comment", String(num), "--body", body], { stdio: "inherit" });
  } else if (acao === "close" && num) {
    execFileSync(
      "gh",
      ["issue", "close", String(num), "--comment", "Saúde do backup normalizada."],
      { stdio: "inherit" },
    );
  }
}

function main() {
  const dryRun = !process.argv.includes("--apply");
  const snapshot = snapshotDePrometheus(lerSnapshot(process.env));
  const avaliacao = avaliarBackup(snapshot);
  const body = renderIssueBody(snapshot, avaliacao);
  const num = issueAberta();
  const acao = decidirAcao(avaliacao, num !== null);

  console.log(
    JSON.stringify(
      {
        ok: snapshot.ok,
        probeOk: snapshot.probeOk,
        motivos: snapshot.motivos,
        alertas: avaliacao.alertas.map((a) => `${a.severidade}:${a.nome}`),
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
