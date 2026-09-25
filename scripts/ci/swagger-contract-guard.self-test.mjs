/* global console: readonly */
/**
 * T080/D-555 — self-test determinístico da guarda de contrato Swagger/DTO.
 * Sem rede, sem banco, sem segredos.
 *
 * Rodar: node scripts/ci/swagger-contract-guard.self-test.mjs
 */
import {
  verificarApiNotFound,
  verificarDtoAllowlist,
  verificarMapperSemPassThrough,
  verificarExemplosSensiveis,
} from "./swagger-contract-guard.mjs";

let ok = 0;
let fail = 0;
const t = (nome, cond) => {
  if (cond) {
    ok += 1;
    console.log("  ok  " + nome);
  } else {
    fail += 1;
    console.log("  FAIL " + nome);
  }
};

// Regra 1 — UuidParamPipe sem @ApiNotFoundResponse
const ctrlRuim = `
@Get(":id")
async get(@Param("id", UuidParamPipe) id: string) { return this.svc.get(id); }
`;
const ctrlOk = `
@Get(":id")
@ApiNotFoundResponse({ description: "Não encontrado" })
async get(@Param("id", UuidParamPipe) id: string) { return this.svc.get(id); }
`;
t("UuidParamPipe sem 404 → viola", verificarApiNotFound(ctrlRuim).length === 1);
t("UuidParamPipe com 404 → passa", verificarApiNotFound(ctrlOk).length === 0);

// Regra 2 — DTO allowlist
const dtoRuim = `
export interface InteracaoResponseDto {
  id: string;
  usuario_id: string;
  comentario: string | null;
}
`;
const dtoOk = `
export interface InteracaoResponseDto {
  id: string;
  // usuario_id e comentario NÃO expostos
  reacao: string | null;
}
`;
t("DTO com campo interno → viola", verificarDtoAllowlist(dtoRuim).length === 2);
t("DTO allowlist → passa", verificarDtoAllowlist(dtoOk).length === 0);

// Regra 3 — mapper pass-through
t("mapper com return row → viola", verificarMapperSemPassThrough("return row;").length === 1);
t(
  "mapper com return {...row} → viola",
  verificarMapperSemPassThrough("return { ...row };").length === 1,
);
t(
  "mapper com allowlist → passa",
  verificarMapperSemPassThrough("return { id: row.id };").length === 0,
);

// Regra 4 — exemplos sensíveis (sem imprimir valores)
t(
  "exemplo com email → viola",
  verificarExemplosSensiveis('example: "user@example.invalid"').length === 1,
);
t(
  "exemplo com token → viola",
  verificarExemplosSensiveis('example: "' + "sk_" + "live_" + "abc" + '"').length === 1,
);
t(
  "exemplo com cookie → viola",
  verificarExemplosSensiveis('example: "cookie: sess=abc"').length === 1,
);
t("exemplo seguro → passa", verificarExemplosSensiveis('example: "Baldur\'s Gate 3"').length === 0);
t(
  "descrição segura → passa",
  verificarExemplosSensiveis('description: "Media Score"').length === 0,
);

console.log(`\nself-test swagger-contract-guard: ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);
