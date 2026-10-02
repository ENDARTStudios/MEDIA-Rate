#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * T080/D-555 — guarda determinística de contrato Swagger/DTO.
 *
 * Offline (só lê arquivos locais). Regras:
 *  (1) Método de controller que usa `UuidParamPipe` em `@Param` deve ter
 *      `@ApiNotFoundResponse` documentado no bloco de decorators do método.
 *  (2) DTOs públicos de interações não podem declarar colunas internas/legadas
 *      (`usuario_id`, `tenant_id`, `rating`, `comentario`, `created_at`).
 *  (3) Mapper de interações não pode fazer pass-through cru (spread/return cru).
 *  (4) Exemplos/properties Swagger (`example:`/`examples:`/`default:`) não podem
 *      conter PII/segredos (email, token, cookie, authorization, DATABASE_URL…).
 *
 * Puro e testável: as funções são exportadas; `main()` varre o repo.
 * NÃO imprime valores sensíveis (apenas nomes de arquivo + regra).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Campos internos/legados proibidos no contrato público de interações. */
export const CAMPOS_PROIBIDOS = ["usuario_id", "tenant_id", "rating", "comentario", "created_at"];

const RE_EXEMPLO_SENSIVEL =
  /(?:example|examples|default)\s*:\s*["'`]?[^"'`\n]*?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|sk_live|sk_test|whsec_|Bearer\s|password\s*[:=]|DATABASE_URL|authorization\s*[:=]|x-csrf-token|cookie\s*[:=])/i;

/** Regra 1 — UuidParamPipe exige @ApiNotFoundResponse no mesmo bloco. */
export function verificarApiNotFound(textoController, arquivo = "?") {
  const violacoes = [];
  const linhas = textoController.split("\n");
  for (let i = 0; i < linhas.length; i++) {
    if (!/@Param\([^)]*UuidParamPipe/.test(linhas[i])) continue;
    // Bloco do método: de ~30 linhas acima (decorators) até a linha do @Param.
    const inicio = Math.max(0, i - 30);
    const bloco = linhas.slice(inicio, i + 1).join("\n");
    if (!bloco.includes("@ApiNotFoundResponse")) {
      violacoes.push({ regra: "UuidParamPipe-sem-404", arquivo, linha: i + 1 });
    }
  }
  return violacoes;
}

/** Regra 2 — DTO público não declara campos internos/legados. */
export function verificarDtoAllowlist(textoDto, arquivo = "?") {
  const violacoes = [];
  textoDto.split("\n").forEach((linha, idx) => {
    // ignora comentários (o DTO documenta os campos proibidos em comentário).
    const limpa = linha.replace(/\/\/.*$/, "");
    for (const campo of CAMPOS_PROIBIDOS) {
      const re = new RegExp(`^\\s*${campo}\\s*[?:]`);
      if (re.test(limpa)) {
        violacoes.push({ regra: `dto-campo-interno:${campo}`, arquivo, linha: idx + 1 });
      }
    }
  });
  return violacoes;
}

/** Regra 3 — mapper sem pass-through cru. */
export function verificarMapperSemPassThrough(textoMapper, arquivo = "?") {
  const violacoes = [];
  if (/return\s+row\s*;/.test(textoMapper) || /return\s*\{[^}]*\.\.\./.test(textoMapper)) {
    violacoes.push({ regra: "mapper-pass-through", arquivo, linha: 0 });
  }
  return violacoes;
}

/** Regra 4 — exemplos Swagger sem PII/segredos. */
export function verificarExemplosSensiveis(texto, arquivo = "?") {
  const violacoes = [];
  texto.split("\n").forEach((linha, idx) => {
    if (RE_EXEMPLO_SENSIVEL.test(linha)) {
      // Não imprime a linha (pode conter valor) — só o motivo genérico.
      violacoes.push({ regra: "exemplo-sensivel", arquivo, linha: idx + 1 });
    }
  });
  return violacoes;
}

function arquivosTs(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...arquivosTs(p));
    else if (e.endsWith(".ts") && !e.endsWith(".spec.ts")) out.push(p);
  }
  return out;
}

function main() {
  const raiz = process.argv[2] ?? "apps/api/src";
  const violacoes = [];
  for (const f of arquivosTs(raiz)) {
    let txt = "";
    try {
      txt = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    if (f.endsWith(".controller.ts")) {
      violacoes.push(...verificarApiNotFound(txt, f));
      violacoes.push(...verificarExemplosSensiveis(txt, f));
    }
    if (f.endsWith("interacoes-response.dto.ts")) {
      violacoes.push(...verificarDtoAllowlist(txt, f));
    }
    if (f.endsWith("interacoes.mapper.ts")) {
      violacoes.push(...verificarMapperSemPassThrough(txt, f));
    }
  }
  if (violacoes.length === 0) {
    console.log("swagger-contract-guard: OK (0 violações)");
    process.exit(0);
  }
  console.error(`swagger-contract-guard: ${violacoes.length} violação(ões):`);
  for (const v of violacoes) {
    console.error(`  - ${v.regra} em ${v.arquivo}${v.linha ? ":" + v.linha : ""}`);
  }
  process.exit(1);
}

if (process.argv[1]?.endsWith("swagger-contract-guard.mjs")) main();
