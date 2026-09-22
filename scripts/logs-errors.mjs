#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * T027 — CLI de observabilidade: resume erros recentes da API de produção
 * a partir dos logs nativos do Railway (stream `railway logs`).
 *
 * Uso:
 *   node scripts/logs-errors.mjs [--minutos 30] [--limite 5000]
 *
 * Saída: contagem por statusCode (4xx/5xx), rotas mais atingidas e amostra
 * de mensagens de erro. Nunca imprime cookies/tokens (o redact do pino já
 * remove headers sensíveis na origem).
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const flag = (nome, def) => {
  const i = args.indexOf(nome);
  return i !== -1 && args[i + 1] !== undefined ? Number(args[i + 1]) : def;
};
const minutos = flag("--minutos", 30);

const janelaMs = minutos * 60_000;

const kid = spawn("railway", ["logs", "--service", "MEDIA Rate"], {
  stdio: ["ignore", "pipe", "inherit"],
});

let buffer = "";
const linhas = [];
kid.stdout.on("data", (c) => {
  buffer += c.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    linhas.push(buffer.slice(0, idx));
    buffer = buffer.slice(idx + 1);
  }
});
kid.on("error", (e) => {
  console.error("Falha ao executar `railway logs`:", e.message);
  console.error("Instale/authentique o Railway CLI: https://docs.railway.com/guides/cli");
  process.exit(1);
});

const timeout = setTimeout(() => kid.kill(), 20_000);

kid.on("close", () => {
  clearTimeout(timeout);
  const contagem = { "4xx": 0, "5xx": 0, "erroApp": 0 };
  const rotas = new Map();
  const amostra = [];

  for (const linha of linhas) {
    // logs pino do Fastify: {"level":30..50,"req":{...},"res":{"statusCode":N},...}
    let obj = null;
    try {
      obj = JSON.parse(linha);
    } catch {
      if (/error|exception|unhandled/i.test(linha)) contagem.erroApp += 1;
      continue;
    }
    const ts = obj.time ?? obj.timestamp ?? 0;
    const dentroDaJanela =
      !ts || Date.now() - (typeof ts === "number" ? ts : Date.parse(ts)) < janelaMs + 60_000;
    const status = obj.res?.statusCode ?? obj.statusCode;
    if (dentroDaJanela && status) {
      if (status >= 500) contagem["5xx"] += 1;
      else if (status >= 400) contagem["4xx"] += 1;
      const rota = obj.req?.url ?? obj.url;
      if (rota && status >= 400) rotas.set(rota, (rotas.get(rota) ?? 0) + 1);
      if (status >= 500 && amostra.length < 5) amostra.push(linha.slice(0, 300));
    }
    if (obj.level >= 50 && amostra.length < 5) amostra.push(linha.slice(0, 300));
  }

  console.log(`Janela: últimos ~${minutos} min (${linhas.length} linhas lidas)`);
  console.log(
    `4xx: ${contagem["4xx"]} · 5xx: ${contagem["5xx"]} · linhas de erro: ${contagem.erroApp}`,
  );
  if (rotas.size > 0) {
    console.log("\nRotas com 4xx/5xx:");
    for (const [rota, n] of [...rotas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${n}× ${rota}`);
    }
  }
  if (amostra.length > 0) {
    console.log("\nAmostra:");
    for (const a of amostra) console.log("  " + a);
  }
  if (contagem["5xx"] > 0) process.exitCode = 1;
});
