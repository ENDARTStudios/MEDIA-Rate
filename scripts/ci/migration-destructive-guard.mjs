#!/usr/bin/env node
/* global console */
/**
 * T093 (REPLAN) — guarda estática de migrations destrutivas (política expand/contract).
 *
 * Migração nova com SQL destrutivo (DROP TABLE/COLUMN/INDEX, TRUNCATE, DELETE sem
 * WHERE, ALTER TABLE RENAME) não é bloqueada automaticamente — é EXIGIDA uma seção
 * "## Expand/Contract" no PR descrevendo o plano backward-compatible; sem ela, o
 * step falha (fail-closed). Migração aditiva não precisa da seção.
 *
 * Entradas via ARQUIVOS (anti-injeção): --files-file (lista de .sql alterados,
 * caminhos relativos), --body-file (descrição do PR). Self-test determinístico.
 */
import { readFileSync } from "node:fs";

const RE_DESTRUTIVO = [
  { re: /\bDROP\s+TABLE\b/i, tipo: "DROP TABLE" },
  { re: /\bDROP\s+COLUMN\b/i, tipo: "DROP COLUMN" },
  { re: /\bDROP\s+INDEX\b/i, tipo: "DROP INDEX" },
  { re: /\bDROP\s+CONSTRAINT\b/i, tipo: "DROP CONSTRAINT" },
  { re: /\bTRUNCATE\b/i, tipo: "TRUNCATE" },
  { re: /\bDELETE\s+FROM\b(?![^;]*\bWHERE\b)/is, tipo: "DELETE sem WHERE" },
  { re: /\bALTER\s+TABLE\b[^;]*\bRENAME\s+TO\b/is, tipo: "RENAME de tabela" },
];

const MIN_PLANO = 15;

/** Retorna os tipos destrutivos presentes no SQL (array pode ser vazio). */
export function padroesDestrutivos(sql) {
  const achados = [];
  for (const { re, tipo } of RE_DESTRUTIVO) {
    if (re.test(String(sql ?? "")) && !achados.includes(tipo)) achados.push(tipo);
  }
  return achados;
}

/** True se o corpo tem seção "## Expand/Contract" com conteúdo real. */
export function temPlanoExpandContract(corpo) {
  const m =
    /(^|\n)\s*(?:#{1,4}\s*expand\s*\/\s*contract\b|\*\*expand\s*\/\s*contract\b\*\*\s*:?\s*\n)/i.exec(
      String(corpo ?? ""),
    );
  if (!m) return false;
  const depois = String(corpo ?? "")
    .slice(m.index + m[0].length)
    .replace(/\s+/g, " ")
    .trim();
  return depois.length >= MIN_PLANO;
}

/** Avaliação pura: { bloqueado, motivos } — fail-closed em leitura ilegível. */
export function avaliar({ arquivosSql, conteudos, corpo }) {
  const destrutivos = [];
  for (const caminho of arquivosSql ?? []) {
    const sql = conteudos?.[caminho];
    if (sql === undefined) {
      return { bloqueado: true, motivos: [`conteúdo ilegível de ${caminho} (fail-closed)`] };
    }
    for (const t of padroesDestrutivos(sql)) {
      if (!destrutivos.includes(t)) destrutivos.push(t);
    }
  }
  if (destrutivos.length === 0) {
    return { bloqueado: false, motivos: ["nenhum SQL destrutivo nas migrations alteradas"] };
  }
  if (temPlanoExpandContract(corpo)) {
    return {
      bloqueado: false,
      motivos: [`SQL destrutivo (${destrutivos.join(", ")}) com plano Expand/Contract declarado`],
    };
  }
  return {
    bloqueado: true,
    motivos: [
      `SQL destrutivo detectado (${destrutivos.join(", ")}) sem seção '## Expand/Contract' — ` +
        "declare o plano backward-compatible (dual-write/backfill/rollback) na descrição do PR",
    ],
  };
}

export function rodarSelfTest() {
  const casos = [];
  const ok = (nome, fn) => casos.push([nome, fn]);

  ok("migration aditiva → liberado", () => {
    const r = avaliar({
      arquivosSql: ["m/a/migration.sql"],
      conteudos: { "m/a/migration.sql": 'ALTER TABLE "x" ADD COLUMN "y" TEXT;' },
      corpo: "Migration: adiciona coluna.",
    });
    if (r.bloqueado) throw new Error(JSON.stringify(r));
  });

  ok("DROP COLUMN sem plano → bloqueado", () => {
    const r = avaliar({
      arquivosSql: ["m/b/migration.sql"],
      conteudos: { "m/b/migration.sql": 'ALTER TABLE "x" DROP COLUMN "y";' },
      corpo: "Migration: remove coluna.",
    });
    if (!r.bloqueado) throw new Error(JSON.stringify(r));
  });

  ok("DROP COLUMN com plano Expand/Contract → liberado", () => {
    const r = avaliar({
      arquivosSql: ["m/b/migration.sql"],
      conteudos: { "m/b/migration.sql": 'ALTER TABLE "x" DROP COLUMN "y";' },
      corpo:
        "Migration: remove coluna.\n\n## Expand/Contract\nFase 3 de 3: coluna obsoleta após dual-write e backfill verificados em staging; rollback = restore do backup diário.",
    });
    if (r.bloqueado) throw new Error(JSON.stringify(r));
  });

  ok("DELETE sem WHERE → bloqueado; com WHERE → aditivo", () => {
    const r1 = avaliar({
      arquivosSql: ["m/c/migration.sql"],
      conteudos: { "m/c/migration.sql": 'DELETE FROM "x";' },
      corpo: "",
    });
    const r2 = avaliar({
      arquivosSql: ["m/c/migration.sql"],
      conteudos: { "m/c/migration.sql": 'DELETE FROM "x" WHERE id = 1;' },
      corpo: "",
    });
    if (!r1.bloqueado || r2.bloqueado) throw new Error(JSON.stringify({ r1, r2 }));
  });

  ok("conteúdo ilegível → fail-closed", () => {
    const r = avaliar({ arquivosSql: ["m/d/migration.sql"], conteudos: {}, corpo: "" });
    if (!r.bloqueado) throw new Error(JSON.stringify(r));
  });

  ok("plano curto demais não conta", () => {
    const r = avaliar({
      arquivosSql: ["m/e/migration.sql"],
      conteudos: { "m/e/migration.sql": 'TRUNCATE "x";' },
      corpo: "## Expand/Contract\ncurto",
    });
    if (!r.bloqueado) throw new Error(JSON.stringify(r));
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

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) process.exit(rodarSelfTest() ? 0 : 1);

  if (argv.includes("--eval")) {
    const pega = (f) => argv[argv.indexOf(f) + 1];
    let arquivos = [];
    let corpo = "";
    try {
      arquivos = readFileSync(pega("--files-file"), "utf8")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("apps/api/prisma/migrations/") && s.endsWith(".sql"));
    } catch (e) {
      console.error(`::error::migration-destructive-guard: arquivos ilegíveis (${e.message})`);
      process.exit(1);
    }
    try {
      corpo = readFileSync(pega("--body-file"), "utf8");
    } catch {
      corpo = ""; // sem corpo legível: sem plano → guard decide por isso
    }
    const conteudos = {};
    for (const caminho of arquivos) {
      try {
        conteudos[caminho] = readFileSync(caminho, "utf8");
      } catch {
        conteudos[caminho] = undefined;
      }
    }
    const r = avaliar({ arquivosSql: arquivos, conteudos, corpo });
    if (r.bloqueado) {
      console.error("::error::migration-destructive-guard: bloqueado");
      for (const m of r.motivos) console.error(`  - ${m}`);
      process.exit(1);
    }
    console.log(r.motivos[0]);
    process.exit(0);
  }

  console.error("::error::uso: --self-test | --eval --files-file F --body-file B");
  process.exit(1);
}

const executadoDireto =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/ci/migration-destructive-guard.mjs");
if (executadoDireto) {
  main();
}
