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
| T097 ADR LGPD/cifragem | P017 | ✅ **DONE** | D-542 + `docs/05-security-compliance/lgpd-column-encryption-plan.md` + `schema-sensitive-columns.spec.ts` |
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

---

# T102 — Integração final (#286) e efeito do reconciliador

**PR #286:** já **MERGED** (merge commit; `feat/t092-t093...`); checks verdes (Build, CodeQL, Docs Gate, E2E Full 3x, Lint & Audit, Migration Safety, RLS, Semgrep, Stryker).

**Self-tests (executados neste ciclo):** `deploy-reconciler.mjs --self-test` → **8/8 ok**; `migration-destructive-guard.mjs --self-test` → **6/6 ok**.

**Workflow `deploy-reconciler.yml`:** `workflow_dispatch` + `schedule */30`; permissões mínimas (`actions: write`, `contents: read`, `deployments: write`); concurrency não-cancelável.

**Primeiro ciclo (dispatch `36289081333`, success, 23s) — efeito real medido:**
- fila `waiting` ANTES: 6 runs (merges #286, #287, #290, #292, #293, #294)
- fila DEPOIS: **5 runs superseded → `completed` (canceladas)**; apenas a do head atual (#294) permanece `waiting`
- Limitação documentada do próprio workflow: `GITHUB_TOKEN` pode não aprovar environment com required reviewer → o step de aprovação emite WARN sanitizado; a aprovação condicionada do run do head fica a cargo de CLI admin (mesmo algoritmo).

**Smoke passivo:** 7/7 → **200** (health, pt-BR, en-US, es-ES, catalog, pricing, login).

## Veredito T102
| Gate exigido | Status |
|---|---|
| merge do #286 verde | ✅ |
| self-tests 8/8 e 6/6 | ✅ |
| CI/Security em main | ✅ |
| reconciliador ativo sem erro (1º ciclo) | ✅ (success; cancelou 5 superseded) |
| guarda de migration ativa | ✅ |
| smoke 7/7 | ✅ |

**STATUS FINAL: BETA_GO_TECNICO_CONFIRMADO** — condição binária satisfeita (todos os gates técnicos verdes).
**Ressalva honesta:** o run `waiting` do head atual depende de aprovação de reviewer (limitação de `GITHUB_TOKEN`),
portanto o gate Promoção-para-Produção não é 100% autônomo; o deploy nativo (Railway/Vercel) já ocorre por push.
---

# T103/T104 — Higiene de repositório (strays locais)

**Diagnóstico:** `git status --short` → 14 entradas, **todas untracked** (0 staged/modified) ⇒ limpeza segura.
**Correção (PR #296, merge `a288f8a2`):** +20 linhas no `.gitignore` para `.od-skills/`, `graft/`, `.ignore`,
`*.sketch.json`, `.wrangler/`, `apps/web/.wrangler/`, `/media-rate-home-prototype.html(+.artifact.json)`,
`/rw-promote.js`, `apps/web/scripts/_*.mjs`, `docs/07-operations-marketing/lighthouse-reports/s1-*.json`. Validado com `git check-ignore` (10/10).
**Over-ignore evitado:** `docs/07-operations-marketing/lighthouse-reports/` **não** foi ignorado inteiro (17 arquivos versionados legítimos;
`catalog-pt.json` confirmado NÃO ignorado). Itens especulativos inexistentes (`INDEX.xml`, `wiring.json`,
`vitest.config.md`, `audit-igdb-ids.md`) **não** foram adicionados.
**Silenciamento local (não versionado):** padrões anexados a `.git/info/exclude` → `git status --short` **0** entradas.

**Beta:** higiene de repositório **não reabre** bloqueios técnicos — **Beta GO técnico mantido**.