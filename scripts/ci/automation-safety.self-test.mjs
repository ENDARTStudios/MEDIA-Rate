#!/usr/bin/env node
/* global console */
/**
 * T096 (REPLAN) — guarda de política de automações (P016).
 * Lê os YAMLs do repo e FALHA se uma trigger perigosa reaparecer:
 *  - create-pr-from-branch.yml: nunca mais `push:` para feature/** (T047/D-541);
 *  - release.yml: nunca `push:` em branch — release é workflow_dispatch (D-541);
 *  - uptime-check.yml: dispatch manual permanece DRY por default (T078);
 *  - alertas-metricos.yml: nunca APPLY com fonte fixture (só com fonte live configurada).
 * Determinístico, sem rede, sem segredos.
 */
import { readFileSync } from "node:fs";

/** Extrai o bloco `on:` (incl. linhas seguintes de nível superior) de forma conservadora. */
export function blocoOn(yaml) {
  const linhas = String(yaml ?? "").split(/\r?\n/);
  const i = linhas.findIndex((l) => l.trim() === "on:" || l.trim() === '"on":');
  if (i < 0) return "";
  const bloco = [linhas[i]];
  for (let j = i + 1; j < linhas.length; j++) {
    const l = linhas[j];
    if (l.trim().startsWith("-") || l.trim().startsWith("#")) {
      bloco.push(l);
      continue;
    }
    if (/^[A-Za-z_"]/.test(l)) break;
    bloco.push(l);
  }
  return bloco.join("\n");
}

export function rodarSelfTest(repositorio) {
  const yamlDe = (p) => String(repositorio?.[p] ?? "");
  const falhas = [];
  const exige = (nome, cond, detalhe) => {
    if (!cond) falhas.push(`${nome}: ${detalhe}`);
  };

  const onCpr = blocoOn(yamlDe("create-pr-from-branch"));
  exige(
    "create-pr-from-branch",
    !/^\s*(?:-\s*)?push:/m.test(onCpr) && !/feature\/\*\*/m.test(onCpr),
    "trigger push feature/** reapareceu (T047/D-541 — manter manual)",
  );

  const onRel = blocoOn(yamlDe("release"));
  exige(
    "release",
    !/^\s*(?:-\s*)?push:/m.test(onRel),
    "release disparada por push (D-541 — deve ser workflow_dispatch)",
  );

  const up = yamlDe("uptime-check");
  const dryDefault = /dry_run:(?:[^\n]*\n){0,6}?\s*default:\s*true/.test(up);
  exige("uptime-check", dryDefault, "default de dry_run em dispatch deve permanecer true (T078)");

  const al = yamlDe("alertas-metricos");
  exige(
    "alertas-metricos",
    /METRICS_URL/.test(al) && /ADMIN_TOKEN/.test(al),
    "fonte live deve continuar condicionada a METRICS_URL+ADMIN_TOKEN (nunca APPLY com fixture)",
  );

  for (const f of falhas) console.error(`  ✗ ${f}`);
  if (falhas.length === 0) console.log("  ✓ política de automações íntegra (T096)");
  else console.error(`automation-safety: ${falhas.length} violação(ões)`);
  return falhas.length === 0;
}

function main() {
  const repo = {
    "create-pr-from-branch": readFileSyncSafe(".github/workflows/create-pr-from-branch.yml"),
    "release": readFileSyncSafe(".github/workflows/release.yml"),
    "uptime-check": readFileSyncSafe(".github/workflows/uptime-check.yml"),
    "alertas-metricos": readFileSyncSafe(".github/workflows/alertas-metricos.yml"),
  };
  process.exit(rodarSelfTest(repo) ? 0 : 1);
}

function readFileSyncSafe(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

const executadoDireto =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/ci/automation-safety.self-test.mjs");
if (executadoDireto) {
  main();
}
