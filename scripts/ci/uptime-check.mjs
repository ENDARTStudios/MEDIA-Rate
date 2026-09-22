/* global console: readonly, fetch: readonly, AbortSignal: readonly */

// T042/D-539 — uptime sintético de endpoints PÚBLICOS (somente leitura).
//
// - `--collect`: faz GET (timeout curto) nos endpoints públicos e grava os
//   resultados em JSON. `--input <file>`: avalia + decide a ação.
// - Lógica PURA e testada offline (uptime-check.self-test.mjs): nunca chama
//   rede no self-test. Sem secret, sem credencial, sem endpoint autenticado.
// - Dedup: cria issue só na 1ª falha; em falha contínua ATUALIZA o corpo
//   (sem comentários em loop); fecha na recuperação. Nunca imprime corpo de
//   resposta/PII/segredos.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export const ISSUE_LABEL = "uptime";
export const ISSUE_TITLE = "[uptime] Indisponibilidade detectada";

// Endpoints PÚBLICOS e somente-leitura (GET). `okStatuses` define o aceitável.
export const ENDPOINTS = [
  {
    nome: "api-health",
    url: "https://media-rate-production.up.railway.app/health",
    okStatuses: [200],
  },
  { nome: "web-pt-BR", url: "https://mediarate.app/pt-BR", okStatuses: [200] },
  { nome: "web-en-US", url: "https://mediarate.app/en-US", okStatuses: [200] },
  { nome: "web-es-ES", url: "https://mediarate.app/es-ES", okStatuses: [200] },
  { nome: "web-catalog", url: "https://mediarate.app/pt-BR/catalog", okStatuses: [200] },
  { nome: "web-pricing", url: "https://mediarate.app/pt-BR/pricing", okStatuses: [200] },
  { nome: "web-login", url: "https://mediarate.app/pt-BR/login", okStatuses: [200] },
];

export const TIMEOUT_MS = 10_000;
/** Retry mínimo contra falha transitória (1 retry por padrão). */
export const MAX_TENTATIVAS = Number(process.env.UPTIME_TENTATIVAS ?? 2);
export const BACKOFF_MS = Number(process.env.UPTIME_BACKOFF_MS ?? 500);
export const OK_DEFAULT = [200, 301, 302, 307, 308];

/** Avalia os resultados → { total, ok, falhas[] }. Puro. */
export function avaliarUptime(resultados, okDefault = OK_DEFAULT) {
  const falhas = [];
  for (const r of resultados ?? []) {
    if (r.erro) {
      falhas.push({
        nome: String(r.nome ?? "?"),
        url: String(r.url ?? ""),
        httpStatus: r.httpStatus ?? null,
        erro: String(r.erro).slice(0, 120),
      });
      continue;
    }
    const ok = Array.isArray(r.okStatuses) && r.okStatuses.length > 0 ? r.okStatuses : okDefault;
    if (!ok.includes(Number(r.httpStatus))) {
      falhas.push({
        nome: String(r.nome ?? "?"),
        url: String(r.url ?? ""),
        httpStatus: r.httpStatus ?? null,
        erro: null,
      });
    }
  }
  return { total: (resultados ?? []).length, ok: falhas.length === 0, falhas };
}

/** Ação de deduplicação. Puro. */
export function decidirAcaoUptime(avaliacao, issueAberta) {
  if (!avaliacao.ok) return issueAberta ? "update" : "create";
  return issueAberta ? "close" : "none";
}

/** Corpo da issue — URL normalizada, status, timestamp. Sem PII/segredos. Puro. */
export function renderUptimeBody(avaliacao, agora = new Date()) {
  const linhas = [
    `## Uptime sintético — MEDIA Rate (\`${ISSUE_LABEL}\`)`,
    "",
    `Verificado em ${agora.toISOString()} (timeout ${TIMEOUT_MS / 1000}s).`,
    "",
    `- **endpoints checados:** ${avaliacao.total}`,
    `- **falhas:** ${avaliacao.falhas.length}`,
    "",
    ...(avaliacao.ok
      ? ["**Status:** todos os endpoints públicos OK. ✅"]
      : [
          "### Endpoints com falha",
          ...avaliacao.falhas.map(
            (f) =>
              `- \`${f.nome}\` — HTTP ${f.httpStatus ?? "sem resposta"}` +
              (f.erro ? ` (${f.erro})` : ""),
          ),
        ]),
    "",
    "> Playbook: `docs/INCIDENT_RESPONSE.md` · Este monitor é sintético e **não**",
    "> substitui monitoramento distribuído externo (UptimeRobot).",
    "> Esta issue contém apenas nomes de endpoint, status HTTP e horário.",
  ];
  return linhas.join("\n");
}

const ehOk = (status, okStatuses) =>
  (Array.isArray(okStatuses) && okStatuses.length > 0 ? okStatuses : OK_DEFAULT).includes(
    Number(status),
  );

/**
 * Coleta UM endpoint com retry mínimo: só marca falha se TODAS as tentativas
 * falharem (transitório → sucesso no retry = OK). `fetchFn` injetável →
 * testável offline. Retorna também `tentativas`.
 */
export async function coletarUm(ep, fetchFn = fetch, opts = {}) {
  const tentativas = opts.tentativas ?? MAX_TENTATIVAS;
  const backoffMs = opts.backoffMs ?? BACKOFF_MS;
  let ultimo = {
    nome: ep.nome,
    url: ep.url,
    httpStatus: null,
    erro: "sem tentativa",
    okStatuses: ep.okStatuses,
    tentativas: 0,
  };
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      const resp = await fetchFn(ep.url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      ultimo = {
        nome: ep.nome,
        url: ep.url,
        httpStatus: resp.status,
        okStatuses: ep.okStatuses,
        tentativas: i,
      };
      if (ehOk(resp.status, ep.okStatuses)) return ultimo;
    } catch (e) {
      ultimo = {
        nome: ep.nome,
        url: ep.url,
        httpStatus: null,
        erro: String(e?.message ?? e).slice(0, 120),
        okStatuses: ep.okStatuses,
        tentativas: i,
      };
    }
    if (i < tentativas && backoffMs > 0) await sleep(backoffMs);
  }
  return ultimo;
}

async function coletar() {
  const resultados = [];
  for (const ep of ENDPOINTS) resultados.push(await coletarUm(ep));
  return resultados;
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
    return null;
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
    // Atualiza o CORPO (não comenta a cada execução — evita spam).
    execFileSync("gh", ["issue", "edit", String(num), "--body", body], { stdio: "inherit" });
  } else if (acao === "close" && num) {
    execFileSync("gh", ["issue", "close", String(num), "--comment", "Serviços normalizados."], {
      stdio: "inherit",
    });
  }
}

function arg(nome) {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  if (process.argv.includes("--collect")) {
    const out = arg("--out") ?? "uptime-resultados.json";
    const resultados = await coletar();
    writeFileSync(out, JSON.stringify(resultados, null, 2));
    console.log("coletado: " + out + " (" + resultados.length + " endpoints)");
    return;
  }
  const entrada = arg("--input");
  if (!entrada) throw new Error("use --collect --out <file> ou --input <file>");
  const resultados = JSON.parse(readFileSync(entrada, "utf8"));
  const avaliacao = avaliarUptime(resultados);
  const dryRun = !process.argv.includes("--apply");
  const num = issueAberta();
  const acao = decidirAcaoUptime(avaliacao, num !== null);
  const body = renderUptimeBody(avaliacao);
  console.log(
    JSON.stringify(
      {
        ok: avaliacao.ok,
        falhas: avaliacao.falhas.map((f) => f.nome),
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
