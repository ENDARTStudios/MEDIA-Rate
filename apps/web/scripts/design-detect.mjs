#!/usr/bin/env node
/**
 * design-detect.mjs — roda o detector determinístico do Impeccable sobre o app web.
 *
 * Por que existe um wrapper (e não `npx impeccable` direto nos scripts):
 *  - fixa a versão do CLI (reprodutibilidade entre máquinas/CI);
 *  - desliga telemetria de forma PORTÁVEL (env var cross-platform);
 *  - resume os achados em texto legível e preserva os exit codes do detector
 *    (0 = limpo, 2 = achados, 1 = falha operacional).
 *
 * Uso (da raiz do monorepo):
 *   node apps/web/scripts/design-detect.mjs                # varre apps/web/src
 *   node apps/web/scripts/design-detect.mjs --json         # JSON cru (CI/tooling)
 *   node apps/web/scripts/design-detect.mjs src/components # alvo específico
 *
 * Fonte/instalação: https://github.com/pbakaus/impeccable (Apache-2.0).
 * Contexto e triagem dos achados: .zcode/skills/design-review/references/design-linter.md
 * Achados intencionais (fundo em grade, fontes travadas) estão em .impeccable/config.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IMPECCABLE_VERSION = "4.5.2";
const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..", "..");

/** Telemetria desligada por padrão (privacidade do projeto). */
const env = { ...process.env, DO_NOT_TRACK: "1", IMPECCABLE_NO_TELEMETRY: "1" };

const argv = process.argv.slice(2);
const wantsJson = argv.includes("--json");
const targets = argv.filter((a) => !a.startsWith("--"));
const defaultTarget = join("apps", "web", "src");
const finalTargets = (targets.length > 0 ? targets : [defaultTarget]).map((t) =>
  // Alvos relativos são resolvidos a partir da raiz do monorepo.
  existsSync(resolve(REPO_ROOT, t)) ? t : resolve(WEB_ROOT, t),
);

const run = (() => {
  // 1) CLI local (devDependency fixa — sem rede, sem shell, portátil).
  const localCli = join(REPO_ROOT, "node_modules", "impeccable", "cli", "bin", "cli.js");
  if (existsSync(localCli)) {
    return spawnSync(process.execPath, [localCli, "detect", "--json", ...finalTargets], {
      cwd: REPO_ROOT,
      env,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  }
  // 2) Fallback: npx pinado (exige shell no Windows por causa do npx.cmd).
  return spawnSync(
    "npx",
    ["--yes", `impeccable@${IMPECCABLE_VERSION}`, "detect", "--json", ...finalTargets],
    { cwd: REPO_ROOT, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, shell: true },
  );
})();

const stdout = run.stdout ?? "";
const stderr = run.stderr ?? "";

if (run.error) {
  console.error(`design-detect: falha ao executar o detector — ${run.error.message}`);
  process.exit(1);
}

if (run.status === 1 || stdout.trim() === "") {
  console.error("design-detect: o detector não conseguiu varrer todo o alvo.");
  if (stderr.trim()) console.error(stderr.trim().split("\n").slice(-6).join("\n"));
  process.exit(run.status ?? 1);
}

let findings = [];
try {
  findings = JSON.parse(stdout);
} catch {
  console.error("design-detect: saída do detector não é JSON válido.");
  console.error(stdout.slice(0, 400));
  process.exit(1);
}

if (wantsJson) {
  process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
  process.exit(findings.length === 0 ? 0 : 2);
}

const relative = (file) => file.replace(`${REPO_ROOT}\\`, "").replace(`${REPO_ROOT}/`, "");

if (findings.length === 0) {
  console.log(
    `design-detect: 0 achados em ${finalTargets.join(", ")} (impeccable ${IMPECCABLE_VERSION})`,
  );
  process.exit(0);
}

const byRule = new Map();
for (const finding of findings) {
  const list = byRule.get(finding.antipattern) ?? [];
  list.push(finding);
  byRule.set(finding.antipattern, list);
}

console.log(
  `design-detect: ${findings.length} achado(s) em ${byRule.size} regra(s) — impeccable ${IMPECCABLE_VERSION}\n`,
);
for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const { name, severity, category } = list[0];
  console.log(`▸ ${rule} [${severity}/${category}] — ${name}`);
  for (const finding of list) {
    console.log(
      `    ${relative(finding.file)}:${finding.line}  ${finding.snippet ?? ""}`.trimEnd(),
    );
  }
  console.log(`    → ${list[0].description.replace(/\s+/g, " ").slice(0, 220)}`);
  console.log("");
}
console.log(
  "Triagem: .zcode/skills/design-review/references/design-linter.md · " +
    "aceitos por decisão: .impeccable/config.json (impeccable ignores list)",
);
process.exit(2);
