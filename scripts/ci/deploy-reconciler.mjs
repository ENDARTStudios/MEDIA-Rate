#!/usr/bin/env node
/**
 * T092 (REPLAN) — reconciliador da fila de deploy `waiting` no environment
 * `Production` (P012 convertido em decisão técnica).
 *
 * Regras (puras, self-testadas — a parte de rede vive no workflow/CLI):
 *   - run Deploy `waiting` com head_sha != origin/main atual        → CANCELAR (superseded)
 *   - run Deploy `waiting` com head_sha == origin/main e gates verdes → APROVAR
 *     (gates: CI success + Security success + smoke passivo 4/4 200)
 *   - gates incompletos/vermelhos                                    → IGNORAR (reavaliar no próximo ciclo)
 *   - runs em outro estado                                           → IGNORAR
 *
 * Uso:
 *   node scripts/ci/deploy-reconciler.mjs --self-test
 *   node scripts/ci/deploy-reconciler.mjs --decide --runs-file R --head-sha S --gates-file G
 * O workflow (.github/workflows/deploy-reconciler.yml) coleta runs/gates e APLICA as
 * decisões (cancel/approve via gh api) com log sanitizado.
 */

const SMOKE_TOTAL = 4;

/**
 * Decisão pura a partir de runs waiting e gates medidos.
 * runs: [{id, name, head_sha, status}] · gates: {ci, security, smoke:[status...] , smokeOk}
 */
export function decidir(runs, { headSha, gates }) {
  const decisao = { aprovar: [], cancelar: [], ignorar: [] };
  for (const r of runs ?? []) {
    if (r.status !== "waiting" && r.status !== "pending") {
      decisao.ignorar.push({ id: r.id, motivo: `estado ${r.status}` });
      continue;
    }
    if ((r.head_sha ?? "") !== headSha) {
      decisao.cancelar.push({ id: r.id, motivo: "superseded (head != origin/main)" });
      continue;
    }
    const gatesOk =
      gates?.ci === "success" &&
      gates?.security === "success" &&
      gates?.smokeOk === true &&
      Array.isArray(gates?.smoke) &&
      gates.smoke.length === SMOKE_TOTAL &&
      gates.smoke.every((s) => s === 200);
    if (gatesOk) {
      decisao.aprovar.push({ id: r.id, motivo: "head atual + gates verdes" });
    } else {
      decisao.ignorar.push({
        id: r.id,
        motivo: `gates incompletos (ci=${gates?.ci}, security=${gates?.security}, smokeOk=${gates?.smokeOk})`,
      });
    }
  }
  return decisao;
}

/** Avalia o smoke passivo coletado pelo workflow: 4 checks 200 → true. */
export function smokeOk(statuses) {
  return Array.isArray(statuses) && statuses.length === SMOKE_TOTAL && statuses.every((s) => s === 200);
}

export function rodarSelfTest() {
  const casos = [];
  const ok = (nome, fn) => casos.push([nome, fn]);
  const gate = { ci: "success", security: "success", smokeOk: true, smoke: [200, 200, 200, 200] };
  const HEAD = "aaaa1111";

  ok("run do head atual + gates verdes → aprovar", () => {
    const d = decidir([{ id: 1, status: "waiting", head_sha: HEAD }], { headSha: HEAD, gates: gate });
    if (d.aprovar.length !== 1 || d.cancelar.length || d.ignorar.length) throw new Error(JSON.stringify(d));
  });

  ok("run de commit antigo → cancelar (superseded)", () => {
    const d = decidir([{ id: 2, status: "waiting", head_sha: "0000ddd0" }], { headSha: HEAD, gates: gate });
    if (d.cancelar.length !== 1) throw new Error(JSON.stringify(d));
  });

  ok("run do head atual com Security pendente → ignorar", () => {
    const d = decidir([{ id: 3, status: "waiting", head_sha: HEAD }], {
      headSha: HEAD,
      gates: { ...gate, security: undefined },
    });
    if (d.ignorar.length !== 1) throw new Error(JSON.stringify(d));
  });

  ok("run do head atual com CI vermelho → ignorar (nunca aprovar)", () => {
    const d = decidir([{ id: 4, status: "waiting", head_sha: HEAD }], {
      headSha: HEAD,
      gates: { ...gate, ci: "failure" },
    });
    if (d.ignorar.length !== 1 || d.aprovar.length) throw new Error(JSON.stringify(d));
  });

  ok("smoke com 1 endpoint 5xx → ignorar", () => {
    const d = decidir([{ id: 5, status: "waiting", head_sha: HEAD }], {
      headSha: HEAD,
      gates: { ci: "success", security: "success", smokeOk: smokeOk([200, 200, 500, 200]), smoke: [200, 200, 500, 200] },
    });
    if (d.ignorar.length !== 1 || d.aprovar.length) throw new Error(JSON.stringify(d));
  });

  ok("run em estado não-waiting → ignorar", () => {
    const d = decidir([{ id: 6, status: "completed", head_sha: HEAD }], { headSha: HEAD, gates: gate });
    if (d.ignorar.length !== 1) throw new Error(JSON.stringify(d));
  });

  ok("múltiplos runs mistos → decisões separadas", () => {
    const d = decidir(
      [
        { id: 7, status: "waiting", head_sha: HEAD },
        { id: 8, status: "waiting", head_sha: "0000ddd1" },
      ],
      { headSha: HEAD, gates: gate },
    );
    if (d.aprovar.length !== 1 || d.cancelar.length !== 1) throw new Error(JSON.stringify(d));
  });

  ok("smokeOk exige exatamente 4 checks 200", () => {
    if (smokeOk([200, 200, 200]) !== false) throw new Error("3 checks não deveria bastar");
    if (smokeOk([200, 200, 200, 200]) !== true) throw new Error("4×200 deveria passar");
  });

  let falhas = 0;
  for (const [nome, fn] of casos) {
    try {
      fn();
      console.log(`  ✓ ${nome}`);
    } catch (e) {
      falhas++;
      console.error(`  ✗ ${nome}\n    ${e.message}`);
    }
  }
  console.log(`self-test: ${casos.length - falhas}/${casos.length} ok`);
  return falhas === 0;
}

function argValor(flag, argv) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) process.exit(rodarSelfTest() ? 0 : 1);

  if (argv.includes("--decide")) {
    const runs = JSON.parse(
      require_fs(argValor("--runs-file", argv) ?? errorUso("--runs-file"), "runs"),
    );
    const gates = JSON.parse(
      require_fs(argValor("--gates-file", argv) ?? errorUso("--gates-file"), "gates"),
    );
    const headSha = argValor("--head-sha", argv) ?? errorUso("--head-sha");
    process.stdout.write(JSON.stringify(decidir(runs, { headSha, gates })));
    return;
  }
  errorUso("modo ausente (use --self-test ou --decide)");
}

function errorUso(msg) {
  console.error(`::error::deploy-reconciler: ${msg}`);
  process.exit(1);
}

import { readFileSync as _rf } from "node:fs";
function require_fs(path, oque) {
  try {
    return _rf(path, "utf8");
  } catch (e) {
    return errorUso(`falha ao ler ${oque}: ${e.message}`);
  }
}

const executadoDireto =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/ci/deploy-reconciler.mjs");
if (executadoDireto) {
  main();
}
