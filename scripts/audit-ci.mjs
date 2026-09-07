// T039/D-462 — gate de audit com allowlist cirúrgica (sem better-npm-audit).
// Uso: npm run audit:ci  (job lint-audit do ci.yml).
// Lê `npm audit --json` e falha se houver high/critical NÃO allowlistado.
// Allowlist: package.json → config.auditAllowlist [{ ghsa, motivo, revisao }].
// Critério estrito: a vulnerabilidade só passa se TODOS os seus GHSAs
// estiverem allowlistados (e houver ao menos um); sem GHSA na URL → bloqueia.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const allow = new Map((pkg?.config?.auditAllowlist ?? []).map((e) => [e.ghsa, e]));

function ghsaDe(via) {
  return (via ?? [])
    .filter((x) => typeof x === "object" && typeof x.url === "string")
    .map((x) => (x.url.match(/GHSA-[a-z0-9-]+/) ?? [])[0])
    .filter(Boolean);
}

let report;
// shell:true: no Windows o npm é .cmd (exige interpretador); no CI (ubuntu)
// o sh resolve o binário normalmente.
try {
  const out = execFileSync("npm audit --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  report = JSON.parse(out);
} catch (e) {
  // npm audit sai != 0 quando há vulns — o JSON vem no stdout mesmo assim.
  const out = e.stdout?.toString() ?? "";
  if (!out) {
    console.error("audit-ci: npm audit sem saída JSON");
    process.exit(2);
  }
  report = JSON.parse(out);
}

const bloqueantes = [];
const vulns = report.vulnerabilities ?? {};

// Regra recursiva: passa se todos os GHSAs próprios estão allowlistados E
// (carrega ≥1 GHSA OU todos os pais-vulneráveis do `via` passam).
// Pais ausentes do mapa = dependentes limpos (neutros). Ciclos = true.
function permitido(nome, visitados = new Set()) {
  if (visitados.has(nome)) return true;
  visitados.add(nome);
  const v = vulns[nome];
  if (!v) return true;
  const ghsas = ghsaDe(v.via);
  if (!ghsas.every((g) => allow.has(g))) return false;
  const paisVuln = (v.via ?? []).filter((x) => typeof x === "string" && x !== nome && vulns[x]);
  if (ghsas.length === 0 && paisVuln.length === 0) return false;
  return paisVuln.every((p) => permitido(p, visitados));
}

for (const [name, v] of Object.entries(vulns)) {
  if (v.severity !== "high" && v.severity !== "critical") continue;
  if (permitido(name)) {
    const ghsas = [...new Set(ghsaDe(v.via))];
    const viaPais = (v.via ?? []).filter((x) => typeof x === "string" && x !== name);
    const detalhe = ghsas.length > 0 ? ghsas.join(",") : `via ${viaPais.join(",")}`;
    const motivos = [...new Set(ghsas.map((g) => allow.get(g)?.motivo).filter(Boolean))];
    console.log(
      `audit-ci: allowlist ${detalhe} (${name}) — ${motivos.join("; ") || "cadeia de advisory allowlistado"}`,
    );
    continue;
  }
  bloqueantes.push({
    name,
    severity: v.severity,
    range: v.range,
    ghsas: [...new Set(ghsaDe(v.via))],
  });
}

if (bloqueantes.length > 0) {
  console.error(`audit-ci: ${bloqueantes.length} HIGH/CRITICAL bloqueante(s):`);
  console.error(JSON.stringify(bloqueantes, null, 2));
  process.exit(1);
}
console.log("audit-ci: OK (alto/crítico zerados fora da allowlist governada)");
