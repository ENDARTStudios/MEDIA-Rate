#!/usr/bin/env node
/* eslint-disable no-undef */ // script operacional Node (globals de runtime)
/**
 * P2 (review pós-#143 / D-527) — evidência reproduzível de rotas que exigem
 * API+DB, do zero, sem tocar produção.
 *
 * Uso (da raiz do repo):
 *   node scripts/evidence-local.mjs            # sobe tudo, roda o E2E, derruba
 *   KEEP_ENV=1 node scripts/evidence-local.mjs # mantém API/web/DB de pé (debug)
 *
 * Passos: postgres (docker) → migrate → provisionar usuários → fixture →
 * API :4000 → web :3000 → E2E_FULL=1 (biblioteca+gating) → teardown.
 *
 * Regras: nunca usa DATABASE_URL de produção; nunca imprime segredos;
 * falha se qualquer etapa crítica falhar.
 */
import { spawn, execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const WEB_DIR = `${ROOT}/apps/web`;
const DB_URL =
  process.env.EVIDENCE_DATABASE_URL ??
  "postgresql://mediarate:mediarate_dev@localhost:5434/mediarate";
const API_PORT = 4000;
const WEB_PORT = 3000;

const kids = [];
let shutdown = false;

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

async function waitHttp(url, tentativas = 30, esperaMs = 2000) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return res.status;
    } catch {
      /* ainda não subiu */
    }
    await sleep(esperaMs);
  }
  throw new Error(`timeout aguardando ${url}`);
}

function start(name, cmd, cwd, env = {}) {
  console.log(`\n[start] ${name}: ${cmd}`);
  const kid = spawn(cmd, {
    cwd,
    shell: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });
  kids.push({ name, kid });
  return kid;
}

async function teardown() {
  if (shutdown) return;
  shutdown = true;
  console.log("\n[teardown] encerrando processos locais…");
  for (const { name, kid } of kids.reverse()) {
    try {
      kid.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    console.log(`  - ${name}`);
  }
}

process.on("SIGINT", async () => {
  await teardown();
  process.exit(130);
});

try {
  // 1. Postgres (docker; usa o container padrão do docker-compose.yml)
  console.log("== [1/7] Postgres local (docker) ==");
  run(`docker start mediarate-db || docker compose up -d postgres`);

  // 2. Migrations no banco LOCAL
  console.log("== [2/7] Prisma migrate deploy (LOCAL) ==");
  run(`DATABASE_URL="${DB_URL}" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`);

  // 3. Usuários de teste
  console.log("== [3/7] Provisionar usuários de teste ==");
  run(`DATABASE_URL="${DB_URL}" npm run db:provision:test-users --workspace=apps/api`);

  // 4. Fixture mínima (mídia + interações do premium)
  console.log("== [4/7] Fixture de mídias/interações ==");
  run(`DATABASE_URL="${DB_URL}" node apps/api/prisma/fixtures/evidence-fixture.cjs`);

  // 5. API + web
  console.log("== [5/7] Subindo API (:4000) e web (:3000) ==");
  start("API", "npm run dev --workspace=apps/api", ROOT, {
    DATABASE_URL: DB_URL,
    JWT_SECRET: "evidence-local-jwt",
    SESSION_SECRET: "evidence-local-session",
    ALLOWED_ORIGINS: `http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}`,
    REDIS_URL: "redis://localhost:6379",
  });
  await waitHttp(`http://127.0.0.1:${API_PORT}/api/v1/interacoes`, 30, 2000); // 401 esperado = no ar
  start("WEB", "npm run dev --workspace=apps/web", ROOT, {
    API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`,
  });
  await waitHttp(`http://localhost:${WEB_PORT}/pt-BR`, 30, 2000);

  // 6. E2E
  console.log("== [6/7] E2E (biblioteca + dashboard-gating) ==");
  run(
    `E2E_FULL=1 TEST_USER_FREE_EMAIL=free@mediarate.test TEST_USER_FREE_PASSWORD="Senha@123" NODE_OPTIONS="--dns-result-order=ipv4first" npx playwright test biblioteca dashboard-gating --project=chromium`,
    { cwd: WEB_DIR },
  );

  console.log("\n== [7/7] EVIDÊNCIA VERDE ==");
} catch (e) {
  console.error("\n[EVIDENCE] FALHOU:", e.message);
  process.exitCode = 1;
} finally {
  if (process.env.KEEP_ENV !== "1") await teardown();
  else console.log("\n[keep] KEEP_ENV=1 — API/web deixados de pé.");
}
