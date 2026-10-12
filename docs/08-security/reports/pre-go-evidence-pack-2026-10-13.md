# Pacote de evidência pré-GO (T220) — read-only / docs-only

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T220 · **Base:** `8bb38ae0` (`origin/main`)
**Natureza:** read-only/docs-only — **nenhuma** mutação (código, deps, schema, infra, produção escrita,
alertas, backups, purge, GitHub settings). **GO: SUSPENSO** — este documento **não** declara GO.

> Sanitização: apenas contagens, estados, ids de run, SHA e nomes de arquivo/rota. Nenhum segredo/PII.

---

## 1. Veredito

O projeto está **tecnicamente maduro** (segurança admin endurecida, incidente encerrado, alertas
formais, pipeline completo), mas **não está no ponto de GO por inferência**: falta **decisão humana**
em backups, observabilidade de backup, escopo de beta e aprovação de Production. A medida mais
coerente é exatamente esta: **consolidar evidência e decidir com clareza** — não codar mais.

---

## 2. Estado técnico (verificado por GET/leitura)

| Frente | Estado | Evidência |
|---|---|---|
| `main` | `8bb38ae0` | `git log` |
| PRs do ciclo | **todas MERGED** | #549 `9e32e5a` · #550 `564b22d` · #551 `d11b4e9` · #552 `94b6276` · #553 `8bb38ae` |
| PRs antigas de deps | **CLOSED** | #515 · #518 · #522 |
| CI `main` | ✅ `success` | run `38309415248` |
| Security `main` | ✅ `success` | run `38309415263` |
| Deploy `main` | ⏸ `waiting` (environment **Production**) | run `38309415256` — **não aprovado** (autoridade do Operador) |
| Railway (API) | ✅ deploy `SUCCESS` | deploy nativo independe do gate |
| Smoke canônico | ✅ **7/7 → 200** | `/health`, `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` |
| Contaminação `123ce28e` | ✅ ausente | `git merge-base --is-ancestor` → exit 1 |

---

## 3. Segurança

| Frente | Estado | Evidência |
|---|---|---|
| CodeQL open | **1** | `#151` `js/request-forgery`, `open`, `dismissed_at=null`, `updated_at=2026-10-11T19:40:42Z` (**inalterado** — não interagido) |
| Trivy open | **117** | estrutural (D-534; sem crítico/high de *runtime*) |
| **Total open** | **118** | CodeQL 1 + Trivy 117 (baseline pré-T209: 120 → **−2**) |
| `npm audit` | **24** (0 crítico, 14 high, 9 moderate, 1 low) | `audit:ci` **OK** (high/crítico zerados fora da allowlist) |
| Incidente INC-2026-10-11 | ✅ **encerrado** `CLOSED_RISK_ACCEPTED_NO_PURGE` | T210 (`564b22d`) |
| Hardening admin | ✅ **T201–T206 + T205 Fase 1** completos | deny-by-default · rate limit 60/10 · anti-probing · probe dedicado · **step-up por senha** |

---

## 4. Backups / DR — **PENDENTE_OPERADOR (P1)**

**O que EXISTE (versionado):**
- **Script:** `scripts/backup-db.sh` — `pg_dump` diário, **retenção 30 dias**.
- **Runbook de DR:** `docs/06-devops-deployment/BACKUP_DR.md` — procedimento de **restore**
  documentado (`pg_restore` em alvo, validação por `/health`, contagens e cadeia SHA-256 do
  `audit_log`) + tabela de cenários (deploy/migration/dado/vazamento/banco fora) com **RTO**.
- **Limites honestos declarados:** **RPO ≤ 24 h** (dump diário), **sem standby**; aceito para Beta
  Fechada, a revisitar antes de Beta pública.
- **Backup pré-migration** no `migrate-production.yml` (caminho manual P013).

**O que FALTA (bloqueador P1 antes de convites):**
1. **Backup automático NÃO configurado em produção** — `PENDENCIAS_OPERADOR.md` (T181) é explícito:
   *"Hoje não há alerta de uso nem backup automático — o dado existe apenas no volume"*; o header do
   script diz "em produção, **configurar cron job**".
2. **Nenhum alerta de falha de backup** (nada a alertar enquanto não roda).
3. **Restore de ensaio NÃO validado** — `BACKUP_DR.md` §Checklist pré-Beta (pendente): item
   *"Operador valida um restore de ensaio"* ainda aberto.

**Decisão pendente (template T181, A/B/C):** (A) habilitar usage alert + backups automáticos agora ·
(B) adiar com risco aceito · (C) política específica. **Não configurar sem autorização explícita.**

---

## 5. Observabilidade — **PRONTA com uma lacuna**

**Coberto (verificado em `MONITORING.md` + workflows):**
- **5xx:** alerta `5xx_rate` > 1% / 5 min = **CRITICAL** (T218, **sem serviço externo**).
- **Auth:** `auth_failures` > 50 / 1 min = **WARNING**; histerese 10% anti-flapping; transições
  logadas **+ auditadas**; status em `GET /api/v1/admin/alerts/status` (`@Roles('ADMIN')`).
- **Uptime:** monitor sintético **ATIVO** em produção (`uptime-check.yml` `*/10` → Issues com
  etiqueta `uptime`; D-556) — **substitui a pendência antiga de UptimeRobot**.
- **Métricas:** `GET /metrics` (Prometheus) — `http_requests_total`, `http_errors_total` (5xx),
  duração; protegido por allowlist/ADMIN/token.
- **Erros front/back:** **Sentry** (D-503, sourcemaps validados) + logs pino→Railway (D-531) +
  `scripts/logs-errors.mjs`. Workflow `alertas-metricos.yml` roda `*/15`.

**Lacunas (honestas):**
- **Sem alerta para falha de backup** (depende de §4).
- **Admin probing / step-up** (`ADMIN_ACCESS_DENIED_REPEAT`, `ADMIN_RATE_LIMIT_EXCEEDED`,
  `ADMIN_STEPUP_FAIL_REPEAT`) são **logados**, mas **não** viram alerta com threshold.

---

## 6. Jornada mínima de beta — **specs fortes; auditoria navegada formal = T224**

- **Rotas (38 grupos em `[locale]`):** `catalog`, `media`, `movie`, `game`, `discover`, `discoveries`,
  `top`, `compare`, `listas`, `biblioteca`, `watchlist`, `historico`, `dashboard`, `profile`,
  `settings`, `login`/`register`/`verificar-email`, `pricing`/`checkout`/`billing`, `privacy`/`terms`/
  `methodology`/`sources`/`faq`/`about`/`welcome`, `assistant`, `admin`, `user`, `feedback`.
- **E2E:** **34 specs** — incl. `jornada-critica`, `auth`, `biblioteca`, `catalog-*`,
  `dashboard-gating`, `i18n-leak`, `home-truthfulness`, `a11y`, `localizacao`,
  `layout-plans-library`. No CI, o required roda `auth` + `navigation`; `jornada-critica` e
  `layout-plans-library` rodam no job mais completo (dispatch/E2E_FULL).
- **Feature flags:** `discovery-feed-v1`, `lgpd-consent-v1`, `migrar-v1`, `purgar-v1`, `usar-v2`.
- **Honestidade de UX:** copy de estados indisponíveis existe nos 3 locales
  (`synopsisUnavailable`, `castUnavailable`, `streamingUnavailable`, `streamingUnavailableGame`,
  `scoreUnavailable`, `scoreComingSoon`).
- **Pendência:** não há **auditoria funcional navegada** consolidada pré-GO → **T224** (read-only/E2E
  seguro), com gatilho: *gap crítico ⇒ feature-flag/desligar, nunca convidar*.

---

## 7. Tooling bloqueado (não forçar)

| Item | Estado | Causa-raiz medida |
|---|---|---|
| `vitest ^4.1.11` | **BLOQUEADA** | des-hoisting de `@vitest/coverage-v8` → job required `Test & Coverage` quebra (`Cannot find package`). `dedupe` não corrige → **T221** (root-cause read-only) |
| `fastify ^5.12.5` | **BLOQUEADA** | instância duplicada → augmentação de `@fastify/cookie` cai → `tsc` da API quebra → **T222** (root-cause read-only) |
| `tailwindcss` 3→4 · `vitest` 4→5 | **ADIADO** | majors exigem código/config/validação visual → **T223** (design, mediante autorização) |

---

## 8. Reconciliação documental — **drift confirmado (parcial)**

`PLANO_MESTRE.md` (cabeçalho "Atualização 2026-08-10, T180–T278") está **defasado** frente ao ciclo
T198–T209:
- **Fase 8** afirma `API 931/931 (125 arquivos)` e `web ~309` — o real hoje é **API 1422/1422 (168
  arquivos)** e **web 615/615 (89 arquivos)**.
- **Fase 9** afirma "domínio e UptimeRobot pendentes" — o **monitor de uptime sintético está ATIVO**
  (D-556/T095) e o domínio (mediarate.app) está no ar.
- As frentes T205/T206/T209/T210/T211 **não** estão refletidas no plano (só em PENDENCIAS/reports).

**Ação:** o snapshot canônico é **este relatório + `GO_READINESS_CHECKLIST.md`**; o `PLANO_MESTRE.md`
precisa de uma atualização de estado (**não** feita aqui além do necessário — é doc de plano, não de
segurança; proponho tarefa docs-only própria).

---

## 9. Classificação por frente

| Frente | Classificação | Nota |
|---|---|---|
| CI / Security / Railway / smoke / Ruleset | **PRONTA** | verdes no SHA atual |
| Hardening admin (T201–T206 + T205 F1) | **PRONTA** | em produção |
| Incidente INC-2026-10-11 | **RISCO_ACEITO** | `CLOSED_RISK_ACCEPTED_NO_PURGE` (T210) |
| CodeQL #151 | **RISCO_ACEITO** (documentado) | `OPEN_MITIGATED_DOCUMENTED` (T211) |
| Trivy (117) | **MONITORADA** | estrutural (D-534); sem high de runtime |
| `npm audit` (24, allowlist) | **MONITORADA** | `audit:ci` OK |
| Deploy Production | **PENDENTE_OPERADOR** | `waiting` |
| **Backups Postgres + alerta de backup + restore de ensaio** | **PENDENTE_OPERADOR (P1)** | §4 |
| Observabilidade (5xx/auth/uptime) | **PRONTA** | §5 |
| Observabilidade — backup falho / probing alert-ificado | **PENDENTE_OPERADOR** | §5 |
| Jornada de beta (auditoria navegada) | **PENDENTE_OPERADOR** | T224 |
| Tooling vitest/fastify | **BLOQUEADA** | T221/T222 |
| Majors Tailwind/Vitest | **ADIADO** | T223 |
| Purge de histórico | **NAO_APLICAVEL_APOS_ROTACAO** | recomendação técnica |
| Gov-02 (2º revisor) | **ADIADO** | opcional |
| PLANO_MESTRE | **DRIFT** | §8 |
| GO para convites | **SUSPENSO** | declaração formal do Operador |

---

## 10. Template de decisão do Operador (pós-T220)

```text
DECISAO_OPERADOR_PRE_GO_2026-10-13

1. BACKUPS_PG        = AUTORIZAR_CONFIGURACAO_MINIMA | ACEITAR_RISCO_FORMAL | ADIAR_GO
2. PURGE_HISTORICO   = NAO_APLICAVEL_APOS_ROTACAO | AUTORIZAR_PLANO_SEPARADO | ADIAR
3. DEPLOY_PRODUCTION = MANTER_WAITING | APROVAR_MANUAL_APOS_CHECKLIST
4. TRIVY_POS_T209    = ACEITAR_RISCO_ESTRUTURAL | EXIGIR_NOVA_PR | EXIGIR_BASE_IMAGE_TASK
5. VITEST_HOISTING   = AUTORIZAR_T221_READ_ONLY | AUTORIZAR_T221_IMPL | ADIAR
6. FASTIFY_COOKIE    = AUTORIZAR_T222_READ_ONLY | AUTORIZAR_T222_IMPL | ADIAR
7. MAJOR_UPGRADES    = ADIAR | AUTORIZAR_T223_DESIGN
8. BETA_SCOPE        = DEFINIR_MINIMO_VIABIL | EXIGIR_T224_AUDIT | ADIAR_GO
9. OBSERVABILITY     = AUTORIZAR_MINIMA | ACEITAR_RISCO_FORMAL | ADIAR_GO
10. GO_CONVITES      = SUSPENDER | CONDICIONADO_AOS_ITENS_ACIMA | LIBERAR_FORMALMENTE
```

**Recomendação técnica (não vinculante):**
`1=AUTORIZAR_CONFIGURACAO_MINIMA` (ou risco formal com limites) · `2=NAO_APLICAVEL_APOS_ROTACAO` ·
`3=MANTER_WAITING` · `4=ACEITAR_RISCO_ESTRUTURAL` (sem high de runtime) · `5/6=AUTORIZAR_*_READ_ONLY` ·
`7=ADIAR` · `8=EXIGIR_T224_AUDIT` · `9=AUTORIZAR_MINIMA` (ou risco formal) ·
`10=CONDICIONADO_AOS_ITENS_ACIMA`.

---

## 11. Referências

`docs/06-devops-deployment/GO_READINESS_CHECKLIST.md` · `BACKUP_DR.md` ·
`docs/07-operations-marketing/MONITORING.md` · `docs/05-security-compliance/INCIDENT_RESPONSE.md` ·
`docs/08-security/{ADMIN_SECURITY,SECURITY_INCIDENTS,SECURITY_CODEQL_RUNTIME}.md` ·
`PENDENCIAS_OPERADOR.md` (T181/decisão Postgres) · `PLANO_MESTRE.md` · reports T198–T209 em
`docs/08-security/reports/`.
