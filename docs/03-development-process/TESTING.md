# TESTING — Estratégia de testes

Aprofundamentos: [E2E](E2E.md) (Playwright) · `docs/LOAD_TESTING.md` (carga) ·
mutação e DAST no CI (`docs/CI.md`).

## Suítes e comandos

| Suíte | Comando | Guarda |
|---|---|---|
| API unit/e2e (supertest) | `cd apps/api && NODE_ENV=test npx vitest run` | ~900 testes/117 arqs (pós-T028) |
| Web unit | `cd apps/web && NODE_ENV=test npx vitest run` | incl. guard i18n (chaves ausentes ×3 línguas) |
| E2E Playwright | `E2E_FULL=1 npx playwright test` (web) | `apiLogin` via `context.request` + `dismissConsentIfPresent`; `--dns-result-order=ipv4first` |
| Acessibilidade | `npm run test:a11y` (axe) | `apps/web/e2e/a11y.spec.ts` |
| Evidência local integrada | `node scripts/evidence-local.mjs` | docker PG → migrate → provision → fixture → E2E; **recusa DATABASE_URL fora de localhost** (D-530) |
| Isolamento RLS | job CI `RLS Isolation` | Postgres service, migrate em DB virgem, casos A≠B (T290/299/301) |
| Mutação | job CI `Stryker Mutation` | score de sobrevivência |
| DAST | job CI `ZAP Baseline` | roda contra o preview do PR |

## Regras do projeto

1. **TDD nos gaps** apontados por review/smoke: vermelho pelo motivo certo →
   verde mínimo (evidência no worklog). Exemplo canônico: `param-uuid-404.spec.ts`.
2. **Fidelidade de mocks do Prisma** (D-447): tipos reais do driver
   (`bigint`→`BigInt`, `bytea`→`Buffer`). Mock "quase certo" = 500 só em produção.
3. **Todo endpoint novo** tem teste que serializa a resposta (`JSON.stringify`) —
   é o que pega erro de serialização sem produção.
4. **Mock in-memory não emula o Postgres**: para "nunca chega ao Prisma" (P2023),
   espiar o service (spy não chamado) — padrão de `param-uuid-404.spec`.
5. **E2E muta estado** (watchlist-flow cria interações): specs que assumem clean
   state precisam de reset/ordem — armadilha #143.
6. **Pipe no parâmetro**, não no método (`@Body(new ZodValidationPipe(schema))`).
7. Suíte verde local ANTES do push (CI demora ~5-10 min para te dizer o mesmo).

## Fixtures e contas

- `apps/api/prisma/fixtures/evidence-fixture.cjs` — mídias + interações versionadas.
- Contas de teste: `npm run db:provision:test-users` (local) · conta E2E de smoke
  em produção (creds no `.env` raiz; uso de leitura + limpeza — ver [QA_TESTING](QA_TESTING.md)).
