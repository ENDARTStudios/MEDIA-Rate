# T051 — Reconciliação de prontidão Beta (pós-T050)

**Data:** 2026-09-22 · **Autor:** Doer · **Base:** `origin/main` @ `8863e8f` (merge #206)
**Método:** evidência primária (leitura de `PLANO_MESTRE.md`, `DECISOES.md` D-530–D-543,
`PENDENCIAS_OPERADOR.md`, `docs/{CI,OBSERVABILITY,LGPD_DADOS,SECURITY_TRIAGE}.md`,
`worklog.md`, runs de CI/Security de `main`, smokes HTTP). Sem alteração de produto.
**Veredito:** **Beta NÃO declarada pronta.** B1/B2/B3 (T029) fechados; restam **6 pendências
do Operador** e itens de baixo risco executáveis pelo Doer.

> **Insumo da tarefa indisponível:** `.claude/scripts/gerar_sync_simbiotico.py` **não
> existe** (há apenas `validar_status.py`). Passo 1 da verificação é **inaplicável**.

---

## 1. Estado por fase (evidência real, pós-T050)

| Fase | Plano | Estado real (evidência) | Veredito |
|---|---|---|---|
| 2 — Dados | `[~] 20/21` | `permissions`, `data_sources`, `entity_revisions` **ausentes** (grep=0); `ColumnEncryptionService` **não wired** | **Confirma [~]** (D-542/P017) |
| 3 — Auth | `[x] 11/11` | register/login/logout/me/refresh/verify-email/resend/forgot/reset + **Google OAuth**; 403 EMAIL_NOT_VERIFIED; audit de auth; PII mascarada em logs (**T049/D-543**) | **Confere** |
| 4 — APIs | `[x]` | interações com **DTO allowlist** (T036–T039); watchlist/discover/recommendations reais | **Confere** (inventário do plano **stale**: 29 módulos vs 20 listados) |
| 6 — Avançado | `[~]` | cache (T210) + **graceful shutdown** (T044/T045, `[x]` 6.10) + upload R2 fail-closed (T453/T457); BullMQ/IA-RAG **postergados** (D-017); feature flags gap (6.14) | **Confirma [~]** |
| 7 — Hardening | `[x] 10/10` | token opaco (não JWT), rotação de refresh, HSTS; 2 N/A condicionais | **Confere** |
| 8 — Testes/Segurança | `[~]` | **API 911/911** (120 arquivos, T049); Semgrep/CodeQL verdes; ZAP baseline | **Confirma [~]** |
| 9 — CI/CD | `[~]` | `security.yml` **verde** (T033); `docs-gate` (T459); `Migration Safety (B1)` required (T034); alertas métricos **dry-run** (T040/T041); uptime sintético (T042/T043); triagem de workflows crônicos (T046/T047) | **Confirma [~]** (domínio/UptimeRobot externos pendentes) |
| 10 — Image Opt. | `[~]` | T029 concluída (D-439); T030–T033 abertas | **Confirma [~]** |
| 11 — PRD/Addenda | `[~]` | T279/T280 concluídas; T285/T286 em curso | **Confirma [~]** |

## 2. Bloqueadores T029 (B1/B2/B3) — status final

| Bloqueador | Status | Evidência |
|---|---|---|
| **B1** — guardas de produção (#148 7+9) | **FECHADO** | `migration-safety` fail-closed + **required** na ruleset (T032/T034, D-532/D-535); runbook de migration manual (P013); environment `Production` preparado (P012=A) |
| **B2** — sinais de operação (#148 12) | **FECHADO** | `security.yml` verde: audit governado + Trivy pinado + CodeQL v4 (T033, D-534); alertas métricos (T040/T041) e uptime sintético (T042/T043) no CI |
| **B3** — higiene LGPD/contrato (#148 1 + 2.10) | **FECHADO (contrato)** | DTO allowlist em `GET` lista/`:id`/`PUT` (T036/T038, D-536/D-537); cifragem de coluna **não implementada** por bloqueio técnico documentado (T048, D-542, P017) |

## 3. O que mudou de T030 → T050 (cadeia de evidência)

- **CI/segurança:** #172/`6215096` (security verde) → #179/`e6375f7` (B1 required) → #182 (evidência).
- **Contrato interações:** #183/`684620e` → #186/`ebf78a1` → #188 (`5f00356`, B3 fechado).
- **Observabilidade:** #189/`8f45d71` (alertas métricos) → #192/`df34558` (uptime + retry).
- **Shutdown:** #195/`8f5afc2` (T044/T045) → docs #198/`799163f`.
- **Workflows crônicos:** #199/`6264601` (`create-pr` e `release` → **manual**) → docs #202/`c884bec`; pós-merge **sem** runs automáticos desses workflows.
- **LGPD:** #203/`b903a7e` (inventário PII + viabilidade) → #204/`96ac104` (mascaramento PII em logs de auth) → docs #206/`8863e8f`.

## 4. Divergências do PLANO_MESTRE (classificação)

| Divergência | Classificação |
|---|---|
| Fase 4 lista **20 módulos**; `src/modules/` tem **29** | **Confirmada (stale)** — correção docs |
| PLANO não cita `google/callback` | **Confirmada (cosmética)** |
| 6.10 graceful shutdown `[x]` com evidência T044/T045 | **Confirmada** (atualizado) |
| 2.10 cifragem `[~]` | **Confirmada** (bloqueio P017) |
| "700+ API" vs **911** atuais | **Confirmada (stale)** |

## 5. Pendências do Operador (separadas das tarefas do Doer)

| ID | Assunto | Nota |
|---|---|---|
| **P011** | `Migration Safety (B1)` required | ✅ **FEITO** (T034) |
| **P012** | staging/environment antes de produção | Opção A preparada; `deploy.yml` fica **waiting** (`Production`) — evidência recorrente P012=A |
| **P013** | caminho de migration manual | Recomendado: console Railway (runbook T034) |
| **P014** | alertas métricos **live** | requer `vars.METRICS_URL` + `secrets.ADMIN_TOKEN` (read-only) |
| **P015** | UptimeRobot externo | guia em `docs/OBSERVABILITY.md` |
| **P016** | reativar auto-PR de `feature/**` | `create-pr-from-branch` **manual** (T046/T047) |
| **P017** | cifragem de colunas (LGPD) | bloqueada (D-542) |
| **P010** | `GITHUB_TOKEN` sombreando login | workaround `scripts/gh-safe.*` |

## 6. Proposta — próximas 5 tarefas (Doer-executáveis)

1. **T052 — Varredura de PII em logs fora de `auth`.** Obj: aplicar `pii-mask.ts` a quaisquer
   outros pontos que loguem e-mail/IP em claro. Risco: baixo. Deps: nenhuma. **Pronto:**
   grep sem PII raw em `logger.*` no `apps/api/src`; suíte verde.
2. **T053 — Reconciliar inventário/contagens do PLANO_MESTRE.** Obj: corrigir módulos (29),
   contagens de teste e rotas stale sem virar status. Risco: baixo. Deps: docs. **Pronto:**
   diff docs-only; Docs Gate verde.
3. **T054 — Minimização de PII no `AuditLog`.** Obj: avaliar/limitar `dados_depois` (hoje grava
   `email`/`userAgent`) sem perder trilha de auditoria. Risco: médio (produto). Deps: LGPD_DADOS.
   **Pronto:** proposta TDD + testes verdes (sem migration).
4. **T055 — Cobertura/limiares e Stryker.** Obj: alinhar thresholds de coverage e escopo do
   mutation às metas Beta. Risco: baixo. Deps: CI. **Pronto:** CI verde com novos limiares.
5. **T056 — E2E de fluxos críticos.** Obj: ampliar Playwright (login/verificação/watchlist/LGPD)
   para regressão de Beta. Risco: médio (infra de teste). Deps: nenhuma. **Pronto:** specs
   verdes no CI.

> Priorização por **impacto × risco × dependência**: T052 (LGPD, baixo risco) → T053 (docs,
> destrava leitura) → T056 → T055 → T054 (produto, maior cuidado).

---

**Nada foi marcado `[x]` neste passe.** Nenhum segredo/PII nas evidências. Nenhuma alteração de
produto, CI executivo, schema, infra ou environment.
