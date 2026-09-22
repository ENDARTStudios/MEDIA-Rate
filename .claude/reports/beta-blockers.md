# T029 — Reconciliação Beta: mapa evidenciado das Fases 2-4 e bloqueadores propostos

**Data:** 2026-09-21 · **Autor:** Doer · **Base:** `origin/main` @ `cccea6b` (pós-#163/#166)
**Método:** evidência primária (grep/leitura de código, schema Prisma, workflows, issues/PRs
#143/#153/#160/#163, #147/#148, smokes de produção 2026-09-21). Nenhuma tarefa foi marcada
`[x]` neste passe; apenas divergências classificadas e notas de evidência.

---

## 1. Mapa FASE 2 — DADOS

| Item | Status no plano | Estado real (evidência) | Veredito |
|---|---|---|---|
| 2.1-2.3 schema/tabelas domínio | [x] | 20+ models; midia/media_score/genero/streaming presentes | Confere |
| 2.4 auth | [~] | `permissions` **AUSENTE** do schema (grep = 0 matches); RBAC via `@Roles`/`@RequirePlan` | **Confirma [~]** |
| 2.6 audit_log | [x] | `audit-log.service.ts` com `verificarIntegridade()` (cadeia SHA-256); smoke #160 mostrou AuditLog ativo em PROD | Confere |
| 2.7 governança | [ ] | `data_sources`/`entity_revisions` **AUSENTES** (grep = 0 matches) | **Confirma [ ]** |
| 2.10 criptografia coluna | [~] | `common/column-encryption.service.ts` existe; **0 usos** em `src/modules/**` → não wired | **Confirma [~]** |
| 2.14 TipoMidia | [x] | enum com MANGA; ANIME deprecated (D-233, comentário no schema) | Confere |
| 2.2 migrations | [x] | 50 diretórios de migration versionados | Confere |

**Conclusão Fase 2:** anotações do plano estão CORRETAS. Os 3 gaps de governança
(permissions, data_sources, entity_revisions) + cripto não-wired são reais e bem anotados.
**Nenhuma divergência.**

## 2. Mapa FASE 3 — AUTH `[CONCLUÍDA — 11/11]`

| Item | Evidência | Veredito |
|---|---|---|
| 3.2-3.3 rotas | `auth.controller.ts`: register, login, logout, me, refresh, verify-email, resend-verification, forgot-password, reset-password + **google/callback** (não citado no plano — OAuth Google completo) | Confere, +1 rota extra |
| 3.6/3.7 audit auth | eventos no service: USER_REGISTERED, LOGIN_SUCCESS/FAILED, LOGOUT, PASSWORD_RESET_REQUESTED/COMPLETED | Confere |
| 3.11 email verification | 403 EMAIL_NOT_VERIFIED enforced (`auth.service.ts` ~L278) — **provado em produção** (smoke T027: register exige verificação real via Resend) | Confere |
| 3.9/3.10 testes/docs | 7 arquivos de teste auth; `docs/api/auth.md` existe | Confere |
| 3.5 RBAC sem permissions | coerente com 2.4 [~] | Confere |

**Conclusão Fase 3:** premissa de divergência **REFUTADA** — auth/reset/audit está
concluído com evidência primária e validação de produção. Única nota: google/callback
não está inventariado no plano (cosmético).

## 3. Mapa FASE 4 — APIs/CRUDs `[CONCLUÍDA]`

| Item | Evidência | Veredito |
|---|---|---|
| 4.3 recommendations | `recommendations.service.ts` (328 linhas) real desde T209 ("substitui stubs") | Confere |
| 4.4/4.13 watchlist | CRUD completo + D-528/D-529 (T027, PR #160) + **smoke PROD 400 D-528** + UuidParamPipe (#163, smoke PROD 404) | Confere |
| 4.5/4.14 discover/search | tsquery sanitizado + trgm GIN + rate limit dedicado; p95 local 14/22ms (T027) | Confere |
| Módulos (linha de inventário) | plano lista **20** módulos; `src/modules/` tem **29** (faltam no plano: watchlist, consent, curadoria, dashboard, diagnostics, discovery, flags, mailer, waitlist-notify) | **DIVERGÊNCIA CONFIRMADA (inventário stale)** |
| Verificação "888 testes, 116 arquivos" | após #163: **897 testes / 117 arquivos** (CI verde PR #163) | **DIVERGÊNCIA CONFIRMADA (contagem stale)** |
| Numeração | dois itens "4.13" (watchlist canônica e endpoints extras) | **DIVERGÊNCIA CONFIRMADA (cosmética)** |

**Conclusão Fase 4:** conteúdo CONCLUÍDO correto; apenas anotações de inventário/contagem
estaleceram. Correções de evidência aplicadas no PLANO_MESTRE neste PR (sem virar status).

## 4. Triagem #148 (itens 1-14) — tarefa, decisão do Operador ou aceite

| # | Item | Classificação T029 |
|---|---|---|
| 1 | DTO explícito `/interacoes` | **Tarefa** (candidata a bloqueador B3) |
| 2 | Accents → tokens semânticos | Tarefa (não-bloqueante p/ Beta) |
| 3 | LimpezaServiceWorker antes de PWA | Aceite (checklist no manual) |
| 4 | CSP/ZAP terceiros | Aceite monitorado |
| 5 | whsec Stripe de teste | **Decisão do Operador** |
| 6 | Conta QA segregada em produção | **Decisão do Operador** (recomendada antes do Beta) |
| 7 | Guarda de migrations em PRs (job `migration-safety`) | **Tarefa — bloqueador B1** |
| 8 | Caminho p/ migration manual (hostname interno) | **Decisão de arquitetura/Operador** (proxy TCP, self-hosted runner ou console) — parte de B1 |
| 9 | Staging/environment protection antes de main | **Tarefa/Decisão — bloqueador B1** |
| 10 | Guarda i18n p/ chaves dinâmicas | Tarefa (não-bloqueante) |
| 11 | Guarda no evidence-local.mjs | ✅ FEITO (#160, D-530) |
| 12 | Security workflow vermelho (trivy pin + highs dev-deps) | **Tarefa — bloqueador B2** (confirmado: failure @ cccea6b) |
| 13 | Params UUID → 404 pré-Prisma | ✅ FEITO (#163, smoke PROD) |
| 14 | Logs duplicados | ✅ FEITO (#163, smoke PROD: 1 linha/request) |

## 5. PROPOSTA_DOER — 3 maiores bloqueadores para Beta Fechada

**B1 — Guardas operacionais de produção (#148 7 + 9, decisão no 8).**
Hoje `main` = produção automática e o entrypoint do Railway aplica migrations no boot de
TODO deploy. Uma migration quebrada mergeada em main vai direto para produção, sem stage
e sem trava. B1 = job `migration-safety` no CI (label + rollback plan), GitHub Environment
protection/branch staging, e decisão do Operador sobre o caminho de migration manual.
*Racional: pré-condição para expor usuários reais a deploys.*

**B2 — Sinais de operação confiáveis (#148 12 + 9.5.4 + triagem Sentry).**
`security.yml` vermelho em main (failure @ cccea6b) mascara sinais novos; uptime externo
(UptimeRobot, 5min) é pendência do Operador desde T218; issues Sentry stale (T466) sem
triagem. B2 = fixar pin do trivy-action + triar highs de dev-deps + Operador cria o monitor
+ passe de triagem Sentry. *Racional: operar Beta às cegas é incêndio garantido.*

**B3 — Higiene LGPD/contrato com usuários reais (#148 1 + PLANO 2.10).**
`GET /interacoes` ainda é pass-through Prisma (colunas internas no contrato público) e
`ColumnEncryptionService` (AES-256-GCM) existe mas não cifra email/telefone em repouso.
B3 = DTO explícito + Swagger + teste de shape; wiring da criptografia de coluna (migração
aditiva + backfill). *Racional: Beta Fechada = dados reais de pessoas reais; o pacote
legal (T464) e a LGPD (T472/T473) já estão no ar — a base técnica deve acompanhar.*

**Explícitamente NÃO-bloqueantes (recomendação de deferimento pós-Beta):**
governança de dados (2.4 permissions, 2.7 data_sources/entity_revisions — ferramenta
interna), 2.10 enquanto B3 não entrar (mesma frente), #148 2/3/4/5/6/10.

---

*Nenhum achado desta auditoria caracteriza risco crítico de segurança/dado novo
(SECURITY_FINDING): o único sinal vermelho (security.yml) já está triado na #148 item 12
e é pré-existente aos merges #143/#152/#153.*
