/**
 * uiux-auth-env.mjs — sobe um ambiente **descartável** para capturar/validar as sessões
 * autenticadas (Dashboard, Biblioteca, Assinaturas, Watchlist, Listas, Perfil,
 * Configurações) e para rodar `test:auth`.
 *
 * Por que existe: no D-605 eu montei esse ambiente à mão em ~17 passos e depois desmontei
 * tudo. Repetir isso a cada sessão autenticada (são 7) seria caro e frágil. Este script
 * faz o ciclo completo e **não encosta em nada compartilhado**:
 *
 *   - Postgres EFÊMERO: usa os binários já instalados (`initdb --auth=trust`) na porta
 *     55432, num diretório em TEMP. Nenhuma credencial de banco de terceiros.
 *   - Redis local descartável (`redis-memory-server`, instalado em TEMP se faltar).
 *     Sem Redis o guard de admin responde 403 e a tela volta para /login, porque o papel
 *     vem de cache.
 *   - Usuário de teste com papel **ADMIN e sem 2FA**: `free@mediarate.test` (criado pelo
 *     `provision-test-users.ts` do próprio repo) promovido por SQL. O `admin@mediarate.test`
 *     NÃO serve: ele exige step-up e as telas de admin redirecionam para /login.
 *   - **NÃO** roda `provision-lgpd-test-user.ts`, que escreveria `E2E_TEST_*` no `.env` da
 *     raiz. O `.env` fica intocado; a senha gerada vai para um arquivo em TEMP.
 *   - Nada de Railway: as URLs internas do `.env` não resolvem fora da Railway, então o
 *     banco é o local mesmo.
 *
 * Uso:
 *   node apps/web/scripts/uiux-auth-env.mjs --start         # sobe tudo e grava o storageState
 *   node apps/web/scripts/uiux-auth-env.mjs --stop          # desmonta (mantém o dump do banco)
 *   node apps/web/scripts/uiux-auth-env.mjs --stop --purge  # desmonta e apaga os dados
 *   node apps/web/scripts/uiux-auth-env.mjs --state         # só regrava o storageState
 *
 * Saídas (em TEMP, nunca no repo):
 *   mr-uiux-auth/state.json    → storageState do Playwright
 *   mr-uiux-auth/password.txt  → senha efêmera do usuário de teste
 *   mr-uiux-auth/{api,redis,pg}.log
 *
 * Depois de `--start`, o web precisa estar no ar apontando para a API local:
 *   API_PROXY_TARGET=http://localhost:4000 npm run dev --workspace apps/web
 * e as capturas usam `--state`:
 *   npm run uiux:evidence -- --state <TEMP>/mr-uiux-auth/state.json dashboard=/dashboard
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..", "..");
const WORK = join(tmpdir(), "mr-uiux-auth");
const PG_DATA = join(WORK, "pg-data");
const PG_PORT = 55432;
const API_PORT = 4000;
const REDIS_PORT = 6379;
const EMAIL = "free@mediarate.test"; // provisionado pelo repo; promovido a ADMIN sem 2FA
const BIN = "D:\\Program Files\\PostgreSQL\\18\\bin";
const args = process.argv.slice(2);
const QUER_PURGE = args.includes("--purge");

mkdirSync(WORK, { recursive: true });
const log = (m) => console.log(m);

function rodar(cmd, cmdArgs, opts = {}) {
  // Windows: `npx`/`npm` são shims .cmd — sem shell o spawnSync falha com status null.
  const shell = cmd === "npx" || cmd === "npm";
  const r = spawnSync(cmd, cmdArgs, { cwd: RAIZ, encoding: "utf8", shell, ...opts });
  if (r.status !== 0 && !opts.tolerarErro) {
    throw new Error(`${cmd} falhou (${r.status}): ${(r.stderr || "").slice(0, 300)}`);
  }
  return r;
}

function ouvindo(porta) {
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `(Get-NetTCPConnection -State Listen -LocalPort ${porta} -ErrorAction SilentlyContinue | Measure-Object).Count`,
    ],
    { encoding: "utf8" },
  );
  return Number((r.stdout || "0").trim()) > 0;
}

function matarPorta(porta, assinatura) {
  if (!ouvindo(porta)) return false;
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `$c = Get-NetTCPConnection -State Listen -LocalPort ${porta} | Select-Object -First 1;` +
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId = $($c.OwningProcess)";` +
        `if ($p.CommandLine -match '${assinatura}') { Stop-Process -Id $c.OwningProcess -Force; 'morto' } else { 'nao-e-meu' }`,
    ],
    { encoding: "utf8" },
  );
  return (r.stdout || "").includes("morto");
}

function senha() {
  const arquivo = join(WORK, "password.txt");
  if (existsSync(arquivo)) return readFileSync(arquivo, "utf8").trim();
  const nova = `E2e-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  writeFileSync(arquivo, nova, { encoding: "utf8" });
  return nova;
}

function databaseUrl() {
  return `postgresql://postgres@127.0.0.1:${PG_PORT}/e2e_full`;
}

function ambienteApi(extra = {}) {
  const vars = {};
  for (const arquivo of [".env", ".env.local", "apps/api/.env.local"]) {
    const caminho = join(RAIZ, arquivo);
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const valor = m[2].trim().replace(/^["']|["']$/g, "");
      if (valor) vars[m[1]] = valor;
    }
  }
  return {
    ...process.env,
    ...vars,
    DATABASE_URL: databaseUrl(),
    REDIS_URL: `redis://127.0.0.1:${REDIS_PORT}`,
    PORT: String(API_PORT),
    NODE_ENV: "test",
    APP_ENV: "test",
    CORS_ORIGIN: "http://localhost:3000",
    ALLOWED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
    SITE_URL: "http://localhost:3000",
    RATE_LIMIT_API_PER_MIN: "100000",
    RATE_LIMIT_LOGIN_PER_MIN: "1000",
    ...extra,
  };
}

// ───────────────────────────────────────────────────────────── start ──
async function subir() {
  if (!existsSync(BIN)) throw new Error(`binários do Postgres não encontrados em ${BIN}`);

  if (!existsSync(join(PG_DATA, "PG_VERSION"))) {
    log("1/6 cluster Postgres efêmero (initdb, trust)…");
    rodar(join(BIN, "initdb.exe"), [
      "-D",
      PG_DATA,
      "-U",
      "postgres",
      "--auth=trust",
      "-E",
      "UTF8",
      "--locale=C",
    ]);
  } else {
    log("1/6 cluster Postgres já existe");
  }

  if (!ouvindo(PG_PORT)) {
    log("2/6 subindo Postgres na porta " + PG_PORT + "…");
    spawnSync(
      join(BIN, "pg_ctl.exe"),
      [
        "-D",
        PG_DATA,
        "-o",
        `-p ${PG_PORT} -c listen_addresses=127.0.0.1`,
        "-l",
        join(WORK, "pg.log"),
        "start",
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    for (let i = 0; i < 20 && !ouvindo(PG_PORT); i++)
      spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Seconds 1"]);
  } else {
    log("2/6 Postgres já estava no ar");
  }
  spawnSync(
    join(BIN, "createdb.exe"),
    ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "postgres", "e2e_full"],
    { encoding: "utf8" },
  );

  log("3/6 migrações…");
  rodar("npx", ["prisma", "migrate", "deploy", "--schema", "apps/api/prisma/schema.prisma"], {
    env: { ...process.env, DATABASE_URL: databaseUrl() },
  });

  log("4/6 usuários de teste + ADMIN sem 2FA…");
  const pw = senha();
  rodar("node", ["--import", "@swc-node/register/esm-register", "prisma/provision-test-users.ts"], {
    cwd: join(RAIZ, "apps", "api"),
    env: ambienteApi({ TEST_USERS_PASSWORD: pw }),
  });
  const sql =
    `INSERT INTO usuario_papel (usuario_id, papel_id, atribuido_em) ` +
    `SELECT u.id, p.id, now() FROM usuario u CROSS JOIN papel p ` +
    `WHERE u.email = '${EMAIL}' AND p.nome = 'ADMIN' ON CONFLICT (usuario_id, papel_id) DO NOTHING;`;
  rodar(join(BIN, "psql.exe"), [
    "-h",
    "127.0.0.1",
    "-p",
    String(PG_PORT),
    "-U",
    "postgres",
    "-d",
    "e2e_full",
    "-c",
    sql,
  ]);

  log("5/6 Redis local descartável…");
  const redisDir = join(WORK, "redis");
  if (!existsSync(join(redisDir, "node_modules", "redis-memory-server"))) {
    mkdirSync(redisDir, { recursive: true });
    writeFileSync(
      join(redisDir, "package.json"),
      // npm 11 exige aprovação explícita do postinstall (que baixa o binário do Redis).
      '{"name":"mr-redis","private":true,"allowScripts":{"redis-memory-server":true}}',
    );
    rodar("npm", ["i", "redis-memory-server", "--no-audit", "--no-fund"], { cwd: redisDir });
  }
  if (!ouvindo(REDIS_PORT)) {
    writeFileSync(
      join(redisDir, "serve.mjs"),
      `import { RedisMemoryServer } from "redis-memory-server";\n` +
        `const s = await RedisMemoryServer.create({ instance: { port: ${REDIS_PORT}, ip: "127.0.0.1" } });\n` +
        `console.log("redis pronto");\nsetInterval(() => {}, 1 << 30);\n`,
    );
    const out = spawn(process.execPath, ["serve.mjs"], {
      cwd: redisDir,
      detached: true,
      stdio: "ignore",
    });
    out.unref();
    for (let i = 0; i < 40 && !ouvindo(REDIS_PORT); i++)
      spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Seconds 1"]);
  }

  log("6/6 API na porta " + API_PORT + "…");
  if (!ouvindo(API_PORT)) {
    const logApi = join(WORK, "api.log");
    writeFileSync(logApi, "");
    const api = spawn(
      process.execPath,
      ["--import", "@swc-node/register/esm-register", "src/main.ts"],
      {
        cwd: join(RAIZ, "apps", "api"),
        env: ambienteApi(),
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    api.unref();
    for (let i = 0; i < 60 && !ouvindo(API_PORT); i++)
      spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Seconds 1"]);
  }

  if (!ouvindo(API_PORT)) throw new Error("API não subiu — ver " + join(WORK, "api.log"));
  await gravarEstado(pw);
  log(
    `\nPRONTO. web: API_PROXY_TARGET=http://localhost:${API_PORT} npm run dev --workspace apps/web`,
  );
  log(
    `capturas autenticadas: npm run uiux:evidence -- --state "${join(WORK, "state.json")}" dashboard=/dashboard`,
  );
}

// ───────────────────────────────────────────────────── storageState ──
async function gravarEstado(pwForcada) {
  const pw = pwForcada ?? senha();
  const destino = join(WORK, "state.json");
  const r = spawnSync(
    "node",
    [
      "-e",
      `
    const { request } = require("@playwright/test");
    (async () => {
      const ctx = await request.newContext({ baseURL: "http://localhost:${API_PORT}" });
      const res = await ctx.post("/api/v1/auth/login", { data: { email: "${EMAIL}", password: process.env.MR_PW } });
      if (res.status() !== 200) { console.error("login falhou: " + res.status()); process.exit(1); }
      await ctx.storageState({ path: ${JSON.stringify(destino)} });
      const me = await ctx.get("/api/v1/auth/me");
      console.log("login OK (" + me.status() + " em /auth/me)");
    })();
  `,
    ],
    { cwd: RAIZ, encoding: "utf8", env: { ...process.env, MR_PW: pw } },
  );
  if (r.status !== 0)
    throw new Error("não consegui gravar o storageState: " + (r.stderr || r.stdout));
  log("  " + (r.stdout || "").trim());
}

// ────────────────────────────────────────────────────────────── stop ──
function desmontar() {
  const parouApi = matarPorta(API_PORT, "src[/\\\\]main\\.ts");
  const parouRedis = matarPorta(REDIS_PORT, "serve\\.mjs|redis");
  log(`API parada: ${parouApi} | Redis parado: ${parouRedis}`);
  if (ouvindo(PG_PORT)) {
    spawnSync(join(BIN, "pg_ctl.exe"), ["-D", PG_DATA, "stop", "-m", "fast"], {
      encoding: "utf8",
      timeout: 60000,
    });
    log("Postgres parado");
  }
  if (QUER_PURGE) {
    rmSync(PG_DATA, { recursive: true, force: true });
    rmSync(join(WORK, "redis"), { recursive: true, force: true });
    log("dados apagados (--purge)");
  }
}

if (args.includes("--stop")) desmontar();
else if (args.includes("--state")) await gravarEstado();
else await subir();
