/* eslint-disable no-undef */
/**
 * T061/D-548 — self-test determinístico da guarda anti-produção
 * (`scripts/ci/evidence-guard.mjs`). Sem rede, sem banco, sem segredos.
 *
 * Rodar: node scripts/ci/evidence-guard.self-test.mjs
 */
import { validarDatabaseUrlLocal, parseEvidenceArgs, redigirUrl } from "./evidence-guard.mjs";

let ok = 0;
let fail = 0;

function check(nome, cond) {
  if (cond) {
    ok++;
    console.log(`  ok  ${nome}`);
  } else {
    fail++;
    console.log(`  FAIL ${nome}`);
  }
}

console.log("evidence-guard.self-test");

// ---- validarDatabaseUrlLocal ----
check("aceita localhost com credenciais", validarDatabaseUrlLocal("postgresql://u:p@localhost:5434/db").ok);
check("aceita 127.0.0.1", validarDatabaseUrlLocal("postgresql://127.0.0.1:5432/db").ok);
check("aceita ::1", validarDatabaseUrlLocal("postgresql://[::1]:5432/db").ok);

check("recusa railway.internal", !validarDatabaseUrlLocal("postgresql://u:p@postgres.railway.internal:5432/railway").ok);
check("recusa railway.app", !validarDatabaseUrlLocal("postgresql://u:p@containers-us-west.railway.app:5432/r").ok);
check("recusa mediarate.app", !validarDatabaseUrlLocal("postgresql://u:p@db.mediarate.app:5432/r").ok);
check("recusa host de produção por rótulo", !validarDatabaseUrlLocal("postgresql://u:p@meu-host.prod:5432/r").ok);
check("recusa host remoto qualquer", !validarDatabaseUrlLocal("postgresql://u:p@10.0.0.5:5432/r").ok);
check("recusa string vazia", !validarDatabaseUrlLocal("").ok);
check("recusa URL inválida", !validarDatabaseUrlLocal("nao-e-url").ok);
// host local cujo DB tem 'prod' no nome NÃO deve ser recusado (falso-positivo evitado)
check("aceita localhost com db 'products'", validarDatabaseUrlLocal("postgresql://u:p@localhost:5432/products").ok);

// ---- parseEvidenceArgs ----
check("spec default null", parseEvidenceArgs([]).spec === null);
check("repeat default 1", parseEvidenceArgs([]).repeat === 1);
check("--spec=x", parseEvidenceArgs(["--spec=e2e/jornada-critica.spec.ts"]).spec === "e2e/jornada-critica.spec.ts");
check("--repeat=3", parseEvidenceArgs(["--repeat=3"]).repeat === 3);
check("repeat inválido → 1", parseEvidenceArgs(["--repeat=abc"]).repeat === 1);
check("repeat negativo → 1", parseEvidenceArgs(["--repeat=-2"]).repeat === 1);

// ---- redigirUrl ----
check("redige credenciais", !redigirUrl("postgresql://user:senha@localhost:5432/db").includes("senha"));
check("mantém host", redigirUrl("postgresql://user:senha@localhost:5432/db").includes("localhost"));

console.log(`\n${ok} ok / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
