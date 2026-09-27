# Fechamento técnico do backlog REPLAN (T101) — 2026-09-27

**Base:** `origin/main` = `9423369d` · **Método:** worktree isolado (sem tocar no fluxo paralelo).
**Escopo:** serializar e fechar T095/T096/T097 + consolidar o backlog T092–T100.

## Status por tarefa

| Tarefa | Item original | Status | Evidência |
|---|---|---|---|
| T092 deploy-auto-promotion-guard | P012 | ⚠️ **implementado, PR #286 aberto (BLOCKED)** | `deploy-reconciler.mjs` + workflow |
| T093 migration-drift-autopilot | P013 | ⚠️ **implementado, PR #286 aberto (BLOCKED)** | `migration-destructive-guard.mjs`; self-test 10/10 |
| T094/T100 métricas LIVE | P014 | ✅ **DONE (main `9423369d`)** | secret+var; dry-run `36288089780`; LIVE `36288156632`; 0 issue |
| T095 uptime independente | P015 | ✅ **DONE** | `uptime-check.yml` schedule */10 + dry_run default true; self-test **16/16** |
| T096 política de automação | P016 | ✅ **DONE** | `automation-safety.self-test.mjs` ("política íntegra") wired no `ci.yml`; ambos workflows só `workflow_dispatch` |
| T097 ADR LGPD/cifragem | P017 | ✅ **DONE** | D-542 + `docs/lgpd-column-encryption-plan.md` + `schema-sensitive-columns.spec.ts` |
| T098 evidência de acesso | P010 | ✅ **DONE** | `.claude/reports/access-evidence-2026-09-27.md` |
| T099 higiene de PRs | legadas | ✅ **DONE** | #133/#4/#3/#2 fechadas sem merge (branches preservadas) |

## Guardas executadas neste ciclo (todas verdes)
`automation-safety` ✓ · `uptime-check` 16/16 · `migration-safety` 10/10 · `evidence-guard` 19/19 · `metric-alerts` 18/18.

## Riscos residuais (aceitos tecnicamente)
1. `ADMIN_TOKEN` não é read-only dedicado ao `/metrics` (também autoriza rotas admin). Mitigado: Secret + uso só-leitura.
2. Sem monitor externo multi-região (P015): o uptime sintético do Actions é o substituto; limitação residual aceita.
3. Cifragem de colunas LGPD **adiada** (D-542) com plano pós-Beta; compensações ativas (mask de PII, AuditLog sanitizado, DTO allowlist, argon2id).
4. **PR #286 (T092/T093) permanece aberto/BLOCKED** — hardening de deploy/migração, não integrado.

## Recomendação binária
**Guarda técnica:** todas as guardas e testes de observabilidade/automação/LGPD estão **verdes**.
**Beta GO:** **NÃO** neste instante — falta **um** item integrável: merge de **#286** (T092/T093).
Condição de GO: `#286` mergeado com required checks verdes + smoke 7/7. **Nenhum item depende de autorização humana** —
a fila é 100% técnica. **Beta não declarada pronta.**
