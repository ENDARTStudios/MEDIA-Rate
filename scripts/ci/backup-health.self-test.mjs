/* global console: readonly */

// T227 — self-test determinístico do backup-health (sem rede/segredos/banco).
import {
  avaliarBackup,
  decidirAcao,
  motivosDePrometheus,
  renderIssueBody,
  snapshotDePrometheus,
  valorGauge,
} from "./backup-health.mjs";

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

// --- texto Prometheus saudável --------------------------------------------
const saudavel = [
  "# HELP backup_health_ok x",
  "backup_health_probe_ok 1",
  "backup_health_ok 1",
  "backup_health_level 0",
  'backup_health_reason{reason="ok"} 1',
  "backup_archive_mode_on 1",
  "backup_archiver_archived_total 2662",
  "backup_archiver_failed_total 0",
  "backup_archiver_last_archived_age_seconds 14",
  "backup_archiver_last_failed_age_seconds -1",
].join("\n");
const s = snapshotDePrometheus(saudavel);
t("saudável: ok=true, probeOk=true", s.ok === true && s.probeOk === true);
t("saudável: idade do último arquivamento = 14", s.idadeUltimoArquivamentoSegundos === 14);
t("saudável: idade de falha -1 vira null", s.idadeUltimaFalhaSegundos === null);
t("saudável: motivos = [ok]", s.motivos.length === 1 && s.motivos[0] === "ok");
t("saudável → sem alertas", avaliarBackup(s).alertas.length === 0);
t("saudável → ação none (sem issue)", decidirAcao(avaliarBackup(s), false) === "none");
t("saudável + issue aberta → close", decidirAcao(avaliarBackup(s), true) === "close");

// --- arquivamento parado (CRITICAL) ---------------------------------------
const parado = [
  "backup_health_probe_ok 1",
  "backup_health_ok 0",
  "backup_health_level 2",
  'backup_health_reason{reason="arquivamento_atrasado_crit"} 1',
  "backup_archiver_archived_total 2662",
  "backup_archiver_failed_total 3",
  "backup_archiver_last_archived_age_seconds 86400",
  "backup_archiver_last_failed_age_seconds 60",
].join("\n");
const sp2 = snapshotDePrometheus(parado);
const av2 = avaliarBackup(sp2);
t(
  "arquivamento parado → CRITICAL",
  av2.alertas.some((a) => a.nome === "backup_health" && a.severidade === "CRITICAL"),
);
t("arquivamento parado → create (sem issue)", decidirAcao(av2, false) === "create");
t("arquivamento parado → update (issue aberta)", decidirAcao(av2, true) === "update");
t("motivos extraídos do label", sp2.motivos.includes("arquivamento_atrasado_crit"));

// --- probe indisponível (fail-closed, CRITICAL) ---------------------------
const semProbe = [
  "backup_health_probe_ok 0",
  "backup_health_ok 0",
  "backup_health_level 2",
  'backup_health_reason{reason="probe_indisponivel"} 1',
].join("\n");
const av3 = avaliarBackup(snapshotDePrometheus(semProbe));
t(
  "probe indisponível → CRITICAL probe_indisponivel",
  av3.alertas.some((a) => a.nome === "probe_indisponivel" && a.severidade === "CRITICAL"),
);

// --- métricas ausentes (deploy antigo / /metrics sem o gauge) -------------
const semMetricas = "http_requests_total 10\nhttp_errors_total 0\n";
const av4 = avaliarBackup(snapshotDePrometheus(semMetricas));
t(
  "métricas ausentes → CRITICAL metricas_ausentes (fail-closed)",
  av4.alertas.some((a) => a.nome === "metricas_ausentes" && a.severidade === "CRITICAL"),
);

// --- nível warn mantém severidade WARNING ---------------------------------
const warn = [
  "backup_health_probe_ok 1",
  "backup_health_ok 0",
  "backup_health_level 1",
  'backup_health_reason{reason="arquivamento_atrasado_warn"} 1',
  "backup_archiver_last_archived_age_seconds 7201",
].join("\n");
t(
  "nível 1 → WARNING (não CRITICAL)",
  avaliarBackup(snapshotDePrometheus(warn)).alertas.some(
    (a) => a.severidade === "WARNING" && a.nome === "backup_health",
  ),
);

// --- helpers de parsing ----------------------------------------------------
t("valorGauge ausente → null", valorGauge(semMetricas, "backup_health_ok") === null);
t(
  "motivosDePrometheus ignora linhas inválidas",
  motivosDePrometheus("backup_health_reason 1").length === 0,
);

// --- corpo da issue sem PII/segredos --------------------------------------
const body = renderIssueBody(sp2, av2, new Date("2026-10-15T00:00:00Z"));
t(
  "corpo sem PII/segredos",
  !/comentario|email|cpf|password|senha|token|whsec|sk_live|usuario_id|tenant_id|DATABASE_URL|cookie|postgres:\/\//i.test(
    body,
  ),
);
t(
  "corpo tem a tabela e o resumo",
  body.includes("| Métrica | Valor |") && body.includes("CRITICAL"),
);

console.log(`\nself-test backup-health: ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);
