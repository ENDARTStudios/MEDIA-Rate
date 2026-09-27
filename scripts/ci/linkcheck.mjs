#!/usr/bin/env node
/* global console */
/**
 * T115 - linkcheck OFFLINE de docs (links relativos + ancoras). Sem rede.
 * Varre todos os arquivos .md de docs/ e os .md da raiz; ignora code fences e URLs externas.
 * Saida contem APENAS caminhos/links (nunca conteudo). Exit != 0 se houver quebrados.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = process.cwd();
export const IGNORAR_ESQUEMA = /^(https?:|mailto:|tel:|data:)/i;

export function removerCodeFences(md) {
  const out = [];
  let dentro = false;
  for (const l of String(md ?? "").split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(l)) {
      dentro = !dentro;
      out.push("");
      continue;
    }
    out.push(dentro ? "" : l);
  }
  return out.join("\n");
}

export function extrairLinks(md) {
  const texto = removerCodeFences(md);
  const links = [];
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(texto)) !== null) links.push(m[1]);
  return links;
}

export function slug(titulo) {
  return String(titulo)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function ancorasDe(md) {
  const set = new Set();
  const re = /^#{1,6}\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(removerCodeFences(md))) !== null) set.add(slug(m[1]));
  return set;
}

export function validar(arquivo, conteudo) {
  const quebrados = [];
  const dir = dirname(arquivo);
  for (const alvo of extrairLinks(conteudo)) {
    if (IGNORAR_ESQUEMA.test(alvo)) continue;
    // Ignora falsos positivos de prosa/codigo: `[Tipo]($false)`, JSX/placeholders etc.
    if (/[$`{}<>|\\" ]/.test(alvo)) continue;
    const [caminhoBruto, ancora] = alvo.split("#");
    if (!caminhoBruto) {
      if (ancora && !ancorasDe(conteudo).has(slug(ancora)))
        quebrados.push({ arquivo, alvo, motivo: "ancora" });
      continue;
    }
    let dest;
    try {
      dest = resolve(RAIZ, dir, decodeURIComponent(caminhoBruto));
    } catch {
      quebrados.push({ arquivo, alvo, motivo: "arquivo" });
      continue;
    }
    if (!existsSync(dest)) {
      quebrados.push({ arquivo, alvo, motivo: "arquivo" });
      continue;
    }
    if (ancora && extname(dest).toLowerCase() === ".md") {
      if (!ancorasDe(readFileSync(dest, "utf8")).has(slug(ancora)))
        quebrados.push({ arquivo, alvo, motivo: "ancora" });
    }
  }
  return quebrados;
}

export function listarMd() {
  const out = [];
  const andar = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && !e.name.startsWith(".")) andar(join(d, e.name));
      } else if (e.name.endsWith(".md")) out.push(join(d, e.name));
    }
  };
  const docs = join(RAIZ, "docs");
  if (existsSync(docs)) andar(docs);
  for (const e of readdirSync(RAIZ, { withFileTypes: true }))
    if (e.isFile() && e.name.endsWith(".md")) out.push(join(RAIZ, e.name));
  return out;
}

export function rodar() {
  const todos = [];
  for (const f of listarMd()) todos.push(...validar(f, readFileSync(f, "utf8")));
  return todos;
}

const esteArquivo = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === esteArquivo) {
  const quebrados = rodar();
  if (quebrados.length) {
    console.error(`linkcheck: ${quebrados.length} link(s) quebrado(s)`);
    for (const q of quebrados.slice(0, 50))
      console.error(`- ${relative(RAIZ, q.arquivo)} -> ${q.alvo} (${q.motivo})`);
    process.exit(1);
  }
  console.log("linkcheck: OK (0 links quebrados)");
}
