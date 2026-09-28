# Registro — Programa BETA-GAP-2026-09-27

> Estado inicial: **ABERTO / 0 de 18 concluídas.**
> Regra: nenhum item vira `DONE` sem evidência real (commit, PR, teste, run, smoke ou relatório sanitizado).
> Atualizado por: Doer · Base: `origin/main` (sincronizar antes de cada ciclo).

| ID | Status | PR | Commit | Evidência sanitizada | Data |
|---|---|---:|---|---|---|
| BETA-GAP-01 | DONE | #330 | a8e56420 | Fix commit `5de0201c`. Fluxo OAuth (GIS ID token) já existia e está habilitado em produção (Vercel `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; CSP permite GSI). Endurecido: `GoogleAuthService` exige `email_verified=true` (senão 401); `SocialButtons` não renderiza botão sem client id (fallback honesto; e-mail/senha intacto). CI run 36353609357/job 108716910941 (API 960). tsc/eslint/prettier 0. Required verdes; Vercel rate-limit não-required benigno. Smoke 7/7 -> 200. | 2026-09-28 |
| BETA-GAP-02 | DONE | #325 | d7b661f8 | Fix commit `adee0e37`. Causa real: `STATUS_AS_REMOVE_METRICS_INCLUDE_INACTIVE`. Não há `DELETE /interacoes`; UI "remove" via `ABANDONADO` (D-528 reclassificável). `CURRENT_STATE_STATUSES` (enum real) exclui ABANDONADO de `total/tipos/generos/streak`; `porStatus` preservado. TDD `apps/api/test/dashboard-reactivity.spec.ts` vermelho->verde (5 tests no CI, job 108710083039/run 36351185889). tsc api/web 0; eslint/prettier 0; cache auditado (dashboard force-dynamic + fetch client no mount). Required checks verdes; Vercel rate-limit benigno (não-required). Smoke 7/7 -> 200. | 2026-09-28 |
| BETA-GAP-03 | DONE | #327 | 0ef87378 | Fix commit `58c9f047`. RBAC já existia (`@Roles`+`RolesGuard` global; `Papel`/`UsuarioPapel`); opção menos destrutiva reutilizada (sem schema). `admin-rbac.spec.ts` (guards reais): FREE+ADMIN=200; PREMIUM sem ADMIN=403; comum=403; @RequirePlan=402; registro não autopromove. UI `/admin` real (sem mock). CLI interna `db:set-role` (anti-lockout, log sanitizado). Fixture `admin-free@mediarate.test`. CI run 36352593309/job 108714010810 (6 tests). tsc/eslint/prettier 0. Required verdes; Vercel rate-limit não-required benigno (web deploy pode atrasar; RBAC é backend). Smoke 7/7 -> 200. | 2026-09-28 |
| BETA-GAP-04 | PENDENTE | — | — | — | — |
| BETA-GAP-05 | DONE | #332 | 6dca4b01 | Fix `595e3eea` (+`db35904b`). Auditoria da home (3 locales): sem links quebrados; `landing.feature1..3` e `auth.socialComingSoon` não renderizados; pago descrito como pago. Corrigido: home/pricing FAQ diziam "mangás de 0 a 100" (real: manga 0–10 pós-BETA-GAP-09) → copy corrigida nos 3 locales. Regressão: `web/test/home-truthfulness.spec.ts` (4, no CI required) + `web/e2e/home-truthfulness.spec.ts` (E2E pass). CI run 36361364174; web 430/430. Smoke 7/7; produção `/pt-BR` sem a alegação antiga. | 2026-09-28 |
| BETA-GAP-06 | PENDENTE | — | — | — | — |
| BETA-GAP-07 | PENDENTE | — | — | — | — |
| BETA-GAP-08 | PENDENTE | — | — | — | — |
| BETA-GAP-09 | DONE | #301 | bc5f2a2c | manga->0-10; truncar1 (sem arredondar); formatScoreValue trunca; vitest 29/29; tsc/eslint limpos; smoke 4/4 200 | 2026-09-27 |
| BETA-GAP-10 | PENDENTE | — | — | — | — |
| BETA-GAP-11 | PENDENTE | — | — | — | — |
| BETA-GAP-12 | PENDENTE | — | — | — | — |
| BETA-GAP-13 | DONE | #303 | 565750be | run 36340154322 / job 108678561019 / step 15 success; y/altura CTAs e altura cards <=1px (3 locales) + mobile CTA>=40px; causa raiz era 23px; fix: CTA ultimo elemento | 2026-09-28 |
| BETA-GAP-14 | BLOCKED | #324 | 638895b7 | PR #324 OPEN, `mergeStateStatus=UNSTABLE` (não mergeável neste ciclo). Baseline da Biblioteca (spec autenticado) ainda pendente — rota/seletor autenticados a descobrir. Follow-up próprio (T117). | 2026-09-28 |
| BETA-GAP-15 | PENDENTE | — | — | — | — |
| BETA-GAP-16 | PENDENTE | — | — | — | — |
| BETA-GAP-17 | PENDENTE | — | — | — | — |
| BETA-GAP-18 | PENDENTE | — | — | — | — |

## Diagnóstico (inventário read-only)

_(preenchido conforme os ciclos avançam; sem PII/segredo)_

### Ciclo 2026-09-27 (Doer) — diagnóstico

**BETA-GAP-09 (score) — DIAGNÓSTICO CONFIRMADO (bug real, 2 causas):**
- `apps/web/src/lib/score-utils.ts:14` — `normalizeDisplayScore` trata **manga como 0–100** (`mediaType !== "game" && mediaType !== "manga"`), contrariando o requisito (manga = 0–10).
- `apps/web/src/lib/score-utils.ts:10` — usa `Math.round(n*10)/10` → **arredonda** (7,95 → 8,0), requisito pede sem arredondamento.
- Também `apps/web/src/lib/dashboard-overview-data.ts:196` (`formatScoreValue`) usa `toFixed(1)` (arredonda) e rotula fixo `/10`.
- Teste existente `apps/web/test/score-utils.spec.ts:18` **fixa** o comportamento errado do manga → precisa ser corrigido junto.
- Proposta: manga entra em 0–10; trocar `Math.round` por **truncamento** (`Math.floor(n*10+1e-9)/10`); atualizar spec com casos de manga + não-arredondamento.
- **Implementação NÃO aplicada neste ciclo** (sem PR/commit). Nada foi alterado no repo.

**Fricção de tooling registrada:** rodar `vitest` em worktree isolado exige `node_modules` (junction quebrou o `git status`); usar `npx vitest --root <worktree>/apps/web` com junction **ou** clonar node_modules é o caminho; alternativa = deixar o CI executar o spec.

**Demais 17 itens:** PENDENTE (sem diagnóstico iniciado).
**Status do programa:** ABERTO — 0/18 concluídos. GO para convites permanece **suspenso**.