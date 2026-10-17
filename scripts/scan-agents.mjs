#!/usr/bin/env node
/* global console */
// D-658: ideia copiada do ECC (affaan-m/ECC) — o conceito do AgentShield, aplicado ao que
// este repositorio realmente tem. Gitleaks cobre segredo no CODIGO e CodeQL cobre codigo;
// ninguem verificava os ARQUIVOS DE AGENTE (skills, agentes, hooks, config de MCP), que e
// onde um prompt ou hook malicioso passaria sem ninguem ver. Advisory: nao entra no CI.
import { readFileSync, existsSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.cwd();
const DIRS = [".zcode", ".claude", ".agents", ".github/skills", ".github/agents"];
const ARQUIVOS_SOLTOS = [".mcp.json", "AGENTS.md"];

const segredo = [
  [/sk-[A-Za-z0-9]{16,}/, "chave OpenAI/Anthropic no estilo sk-"],
  [/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/, "token do GitHub"],
  [/AKIA[0-9A-Z]{16}/, "chave de acesso AWS"],
  [/whsec_[A-Za-z0-9]{20,}/, "segredo de webhook Stripe"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "chave privada"],
  [
    /postgres(ql)?:\/\/[^\s"'@/]+:(?!pass\b|password\b|senha\b|\*\*\*)[^\s"'@]{6,}@/,
    "URL de banco com senha embutida",
  ],
];
const risco = [
  [/--allow-tool[=\s]["']?\*/, "--allow-tool liberando todas as ferramentas"],
  [
    /(allowedTools|allowTools|permissions)\s*[:=]\s*\[?\s*["']\*["']/,
    "permissao de ferramenta curinga",
  ],
  [/bypassPermissions|dangerously-skip-permissions|--yolo/, "bypass de aprovacao de permissao"],
  [/\bcurl\b[^\n|]*\|\s*(sh|bash)\b/, "pipe de curl direto para shell"],
  [/\b(npx|pnpm\s+dlx|bunx)\s+-y\s+[a-z@]/i, "execucao de pacote sem versao fixada (npx -y)"],
  [
    /command["']?\s*:\s*["'][^"']*\b(?:\/tmp|%TEMP%|\$HOME\/\.cache)\b/,
    "comando de MCP em diretorio temporario",
  ],
];

const arquivos = [];
const anda = (rel) => {
  const abs = join(RAIZ, rel);
  if (!existsSync(abs)) return;
  const st = statSync(abs);
  if (st.isFile()) {
    arquivos.push(rel);
    return;
  }
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    anda(join(rel, e.name));
  }
};
for (const d of DIRS) anda(d);
for (const f of ARQUIVOS_SOLTOS) if (existsSync(join(RAIZ, f))) arquivos.push(f);

const texto = (f) => {
  try {
    return readFileSync(join(RAIZ, f), "utf8");
  } catch {
    return "";
  }
};
const achados = [];
for (const f of arquivos) {
  const linhas = texto(f).split("\n");
  linhas.forEach((l, i) => {
    for (const [re, desc] of segredo)
      if (re.test(l))
        achados.push({ tipo: "SEGREDO", f, linha: i + 1, desc, trecho: l.trim().slice(0, 90) });
    for (const [re, desc] of risco)
      if (re.test(l))
        achados.push({ tipo: "RISCO", f, linha: i + 1, desc, trecho: l.trim().slice(0, 90) });
  });
}

console.log(`\n  scan-agents — ${arquivos.length} arquivo(s) de agente inspecionado(s)`);
console.log(
  `  superficies: ${DIRS.filter((d) => existsSync(join(RAIZ, d))).join(", ") || "(nenhuma)"}\n`,
);
if (achados.length === 0) {
  console.log("  OK — nenhum segredo nem permissao permissiva encontrada.\n");
  process.exit(0);
}
const porTipo = {
  SEGREDO: achados.filter((a) => a.tipo === "SEGREDO"),
  RISCO: achados.filter((a) => a.tipo === "RISCO"),
};
for (const [tipo, lista] of Object.entries(porTipo)) {
  if (!lista.length) continue;
  console.log(`  ${tipo}: ${lista.length} achado(s)`);
  for (const a of lista) {
    console.log(`    ${relative(".", join(RAIZ, a.f))}:${a.linha} — ${a.desc}`);
    console.log(`      ${a.trecho}`);
  }
  console.log("");
}
console.log(
  `  ${porTipo.SEGREDO.length ? "ATENCAO: segredo em arquivo de agente e mais grave que em codigo — esses arquivos sao lidos por modelos.\n" : ""}  Total: ${achados.length} achado(s).`,
);
process.exit(1);
