# Contratos de API — regras e guardas (T080/D-555)

**Guarda:** `scripts/ci/swagger-contract-guard.mjs` (+ self-test determinístico
`node scripts/ci/swagger-contract-guard.self-test.mjs`, **12/12**). Roda **offline**
(só lê fontes) no CI (job `Lint & Audit` — step `Guarda de contrato Swagger/DTO`).

## Regras verificadas

1. **404 documentado:** método de controller que usa `UuidParamPipe` em `@Param(...)`
   deve ter `@ApiNotFoundResponse` no bloco de decorators do método.
   (Hoje coberto em `watchlist.controller.ts` e `interacoes.controller.ts`.)
2. **Allowlist de DTO:** `interacoes-response.dto.ts` não pode declarar
   `usuario_id`, `tenant_id`, `rating`, `comentario` nem `created_at`.
3. **Mapper sem pass-through:** `interacoes.mapper.ts` não pode `return row;` nem
   espalhar o objeto cru (`return { ...row }`) — deve montar o DTO explicitamente.
4. **Exemplos/`default` sem PII/segredos:** campos `example`/`examples`/`default`
   do Swagger não podem conter e-mail, `sk_*`, `whsec_`, `Bearer`, `password`,
   `DATABASE_URL`, `authorization`, `x-csrf-token` ou `cookie`.

## Limites

- Análise **estática** (regex/linhas) — não gera o OpenAPI em runtime.
- Falsos positivos são corrigidos **na própria guarda/fixtures**, nunca em produto.
- Violação **real** de metadados: correção mínima em decorator/DTO/mapper de
  apresentação (sem mudança de runtime). Violação de runtime → escalar.
