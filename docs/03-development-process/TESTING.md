# TESTING — Estratégia de testes

Aprofundamentos: [E2E](../06-devops-deployment/E2E.md) (Playwright) · `docs/06-devops-deployment/LOAD_TESTING.md` (carga) ·
mutação e DAST no CI (`docs/06-devops-deployment/CI.md`).

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

## Regressão de reatividade da dashboard (BETA-GAP-02 / T118)

`apps/api/test/dashboard-reactivity.spec.ts` prova, com mocks fiéis ao service
real, que `ABANDONADO` **não** entra nas métricas de estado atual da dashboard
(`total`, `tipos`, `generos`, `streak`) e que a reclassificação
`ABANDONADO → CONSUMINDO` volta a contar (filtro, não exclusão). Prova também
que `porStatus` da Biblioteca **preserva** `ABANDONADO`.

```bash
cd apps/api && NODE_ENV=test npx vitest run test/dashboard-reactivity.spec.ts
```

Fluxo real: não existe `DELETE /interacoes`; a UI "remove" mudando o status para
`ABANDONADO` (D-528 permite reclassificar). A dashboard é `force-dynamic`
(`apps/web/src/app/[locale]/dashboard/layout.tsx`) e o `DashboardClient` refaz
`GET /api/v1/user/stats` no mount — não há cache ISR/estado stale a esperar.

## Autorização / RBAC (BETA-GAP-03 / T119)

`apps/api/test/admin-rbac.spec.ts` sobe guards **reais** (`RolesGuard` +
`PlanGuard`) e prova: `FREE`+`ADMIN` → 200; `PREMIUM` sem `ADMIN` → 403; comum
→ 403; `@RequirePlan` → 402 (eixo separado); registro público não autopromove
(Zod descarta `role`/`papeis`). O 401 de anônimo é coberto por
`auth-guard.spec.ts`; o RBAC do guard por `rbac.spec.ts`.

```bash
cd apps/api && NODE_ENV=test npx vitest run test/admin-rbac.spec.ts test/rbac.spec.ts test/auth-guard.spec.ts
```

## Login Google (BETA-GAP-01 / T120)

`apps/api/test/google-auth.spec.ts` cobre a verificação do ID token do Google
(`jose` mockado): sem `GOOGLE_CLIENT_ID` → 401; token inválido → 401; sem e-mail
→ 401; **`email_verified` ausente/falso/não-booleano → 401**; e-mail verificado
→ perfil. O fallback honesto (ocultar o botão sem
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`) é do web (`SocialButtons`).

```bash
cd apps/api && NODE_ENV=test npx vitest run test/google-auth.spec.ts
```

## Fixtures e contas

- `apps/api/prisma/fixtures/evidence-fixture.cjs` — mídias + interações versionadas.
- Contas de teste: `npm run db:provision:test-users` (local) · conta E2E de smoke
  em produção (creds no `.env` raiz; uso de leitura + limpeza — ver [QA_TESTING](../06-devops-deployment/QA_TESTING.md)).
