#!/usr/bin/env node
/* global console, process */
// D-655: ideia copiada do Plandex (plandex-ai/plandex) — o "sandbox de diff cumulativo",
// reduzido ao que e util aqui: ANTES de abrir PR, olhar o tamanho e a dispersao do diff
// acumulado. Plandex isola as mudancas ate a revisao; o git ja isola (branch), o que
// faltava era o passo de ENXERGAR o acumulado antes de publica-lo.
//
// Nao e gate de CI (nao bloqueia merge): e ferramenta de linha de comando, advisory.
// Motivo de existir, em um caso real desta sessao: um commit unico de 386 arquivos
// (~21k linhas) arrastou mudancas de areas diferentes e custou varias rodadas de
// conserto. Um diff de 386 arquivos nao e revisavel, e o custo aparece depois.
import { execSync } from "node:child_process";

const BASE = process.env.REVIEW_BASE ?? "origin/main";
const LIMITE_ARQUIVOS = Number(process.env.REVIEW_MAX_FILES ?? 40);
const LIMITE_LINHAS = Number(process.env.REVIEW_MAX_LINES ?? 1500);

const git = (cmd) => {
  try { return execSync(cmd, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return ""; }
};

const numstat = git(`git diff --numstat ${BASE}...HEAD`).trim();
const area = (arq) => {
  const p = arq.split("/");
  if (p[0] === "apps" && p[1]) return `apps/${p[1]}`;
  if (p[0] === ".github") return ".github (CI)";
  if (p[0] === "docs") return "docs";
  if (p[0] === ".zcode") return ".zcode (skills/agentes)";
  if (p[0] === "scripts") return "scripts";
  return p[0] ?? "(raiz)";
};

const porArea = new Map();
let arquivos = 0, add = 0, del = 0;
for (const linha of (numstat ? numstat.split("\n") : [])) {
  const [a, d, arq] = linha.split("\t");
  if (!arq) continue;
  const nA = a === "-" ? 0 : Number(a), nD = d === "-" ? 0 : Number(d);
  arquivos++; add += nA; del += nD;
  const k = area(arq);
  const cur = porArea.get(k) ?? { arquivos: 0, add: 0, del: 0 };
  cur.arquivos++; cur.add += nA; cur.del += nD;
  porArea.set(k, cur);
}

// Achado ao RODAR o script (nao ao escreve-lo): contar so "??" deixava passar arquivo
// MODIFICADO e nao commitado (ex.: package.json), que e o caso mais comum de esquecimento.
// Agora conta qualquer pendencia do working tree.
const pendentes = git("git status --porcelain").split("\n").filter((l) => l.trim().length > 0);
const naoVersionados = pendentes.length;

console.log(`\n  Diff acumulado contra ${BASE}`);
console.log(`  ${arquivos} arquivo(s) · +${add} / -${del} linhas${naoVersionados ? ` · ${naoVersionados} pendencia(s) no working tree` : ""}\n`);
for (const [k, v] of [...porArea.entries()].sort((x, y) => (y[1].add + y[1].del) - (x[1].add + x[1].del))) {
  console.log(`    ${k.padEnd(22)} ${String(v.arquivos).padStart(4)} arq  +${String(v.add).padStart(6)} / -${String(v.del).padStart(6)}`);
}
if (porArea.size > 1) console.log(`\n    ${porArea.size} areas tocadas — se o objetivo era uma, o diff esta disperso.`);

const total = add + del;
let alerta = false;
if (arquivos > LIMITE_ARQUIVOS) { console.log(`\n  ATENCAO: ${arquivos} arquivos > limite ${LIMITE_ARQUIVOS}. Diff deste tamanho nao e revisavel.`); alerta = true; }
if (total > LIMITE_LINHAS) { console.log(`\n  ATENCAO: ${total} linhas > limite ${LIMITE_LINHAS}.`); alerta = true; }
if (naoVersionados > 0) console.log(`\n  ATENCAO: ${naoVersionados} arquivo(s) pendente(s) no working tree (novo, modificado ou removido) — confirme se entram no commit.`);
if (alerta || naoVersionados > 0) {
  console.log("\n  Sugestao: divida em commits por assunto antes de abrir o PR (uma branch por item).");
  process.exit(1);
}
console.log("\n  OK — diff dentro dos limites.\n");
