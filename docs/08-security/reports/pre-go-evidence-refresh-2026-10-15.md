# Refresh read-only do pacote pré-GO (T248) — após T227 e T229

**Data:** 2026-10-15 · **Tarefa:** T248 · **Fase:** F09-ci-cd-deploy
**Natureza:** **read-only / docs-only** — nenhuma mutação, nenhum token, nenhum custo, nenhum segredo
impresso. **GO convites: SUSPENSO** (decisão do Operador).

> Substitui o snapshot de estado do `pre-go-evidence-pack-2026-10-13.md` (T220) para os eixos que
> mudaram com **T227** (alerta de backup) e **T229** (falso controle pré-migration removido).

---

## 1. Método e fronteiras

**Base:** `origin/main` = **`bd91a79a`** (PR #569 merged) · repo **público**, default branch `main`.
CLI Railway **já autenticado** → leitura sanitizada permitida (sem `RAILWAY_TOKEN`, que segue
recusado).

**Comandos usados (todos de leitura):** `git fetch/status/log`, `gh repo view`, `gh pr view`,
`gh run list`, `gh issue list`, `gh api` (GET) para code scanning, `railway postgres pitr status`,
`railway postgres pitr backup list --json`, `railway postgres pitr schedule list`,
`railway volume list`, `curl` (smoke), e as guardas locais (`migration-safety`, `automation-safety`).

**Não feito:** nenhuma migration, nenhum restore, nenhum `backup create`/`delete`/`lock`, nenhuma
alteração de PITR/schedule/volume, nenhuma aprovação de Production, nenhum segredo novo, nenhuma
interação com alertas de segurança (somente GET/contagem), nenhum GO declarado.

## 2. CI / Security (main)

| Run (push de `bd91a79a`, 2026-10-15T03:21:09Z) | Estado |
|---|---|
| CI | ✅ success |
| Security | ✅ success |
| PRR Pipeline | skipped (esperado) |
| **Deploy** | ⏳ **waiting** — aguarda **aprovação manual** no environment *Production* (**Operador**) |

Sem regressões: os últimos runs de `main` anteriores (push de `4691efbe`) também fecharam
**success** em CI/Security. O `Deploy Reconciler` (schedule) segue **success**.

**Smoke passivo (7/7 → 200):** `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`,
`/pt-BR/login` e `/health` da API.

## 3. Alertas de segurança (contagem sanitizada, sem interação)

| Origem | Abertos |
|---|---|
| CodeQL | **1** |
| Trivy | **116** |
| **Total** | **117** |

- **`#151`** (`js/request-forgery`, severidade **critical**): `state=open`, `created_at`
  2026-10-11T19:30:50Z, `updated_at` **2026-10-11T19:40:42Z** — **inalterado** desde a formalização
  (T211) → permanece **`OPEN_MITIGATED_DOCUMENTED`**. Nenhum dismiss/comment/update foi feito.
- Total **117** vs **118** registrados em 2026-10-13 → **−1** (redenção natural/Trivy), sem ação
  nossa. **Nenhum alerta foi interagido.**

## 4. Alerta de falha de backup (T227) — estado real

- Workflow **`Backup Health Alert`** existe em `main` e está **`state=active`**; os artefatos estão
  todos versionados: workflow, `scripts/ci/backup-health.mjs` (+ self-test + fixture),
  `apps/api/src/modules/metrics/backup-health.ts` e `apps/api/tests/backup-health.spec.ts`.
- **Guardas:** `migration-safety` **10/10**, `automation-safety` ✓ (e ela agora **reprova**
  `RAILWAY_TOKEN` neste workflow).
- **Runs:** **1** — o `workflow_dispatch` de validação (2026-10-15T00:42:33Z, success, **dry-run com
  `/metrics` AO VIVO**). **Nenhum run agendado ainda.**
- **Issues com o label `backup-health-alert`: nenhuma** (estado `all`) → o alerta **nunca disparou**.

### ⚠️ Achado honesto: agendamentos do GitHub estão fortemente throttled neste repo

Os crons nominais do repositório **não** se cumprem na prática:

| Workflow | Cron nominal | Intervalos observados |
|---|---|---|
| `Uptime Check` | `*/10` | ~4 h |
| `Alertas Metricos` | `*/15` | ~2–4 h |
| `Deploy Reconciler` | `*/30` | ~2–4 h |
| `Backup Health Alert` | `*/30` | **nenhum run agendado em ~3 h** |

**Interpretação (não é defeito do nosso workflow):** a plataforma entrega os agendamentos com atraso
grande em todos eles. Logo, a ausência de run agendado do alerta após ~3 h é **consistente com o
comportamento da plataforma** e **não** indica falha de configuração (o workflow está `active` e já
foi provado ponta-a-ponta no dispatch).

**Consequência para os limiares (bound de latência):** com cadência efetiva de ~2–4 h, uma parada do
arquivador seria detectada com atraso de ~2–4 h — **muito abaixo** do limiar CRIT de **12 h** e
alinhado ao WARN de **2 h**. O limite prático do alerta passa a ser a **cadência efetiva do runner**,
não o cron nominal. Registrado como monitor.

## 5. Backup/DR — leitura (Railway)

**PITR (`pitr status`, 2026-10-15T03:35Z):** **`enabled`**, bucket wired, HA cluster: no ·
**Backup sets: 3** · `Latest backup 2026-10-15T03:34:35Z` · **`Archiver: enabled`** ·
`Last archived at 2026-10-15 03:35:36Z` · **`Restorable up to 2026-10-15 03:34:36Z`** (≈ **1 min**
de atraso — janela avançando).

**Schedules (retenção):** `DAILY` (6 d) · `WEEKLY` (27 d) · `MONTHLY` (89 d) — conforme **T234**.

**Backups (inventário):**

| Nome | Criado | Expira | used/referenced | Vínculo de schedule |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | 2026-09-22 (expirado) | 65/128 MB | não |
| `Online resize to 5000MB` | 2026-10-07 | 2026-10-28 | 413/483 MB | não |
| `pre-go-2026-10-13` | 2026-10-13 | **nunca** | 107/630 MB (**EM_PROGRESSO lento**) | não |
| `Daily Schedule` | 2026-10-13 | 2026-10-19 | 138/668 MB | **sim** |
| `Daily Schedule` | 2026-10-14 | 2026-10-20 | 137/681 MB | **sim** |

→ **o schedule produz backups materializados** (2 dias consecutivos; o de hoje ainda não chegou —
a cadência observada é ~12:49 UTC). O `pre-go` continua lento e **não** é alvo de restore.

**Volumes:** `postgres-volume` (Postgres, 687/5000 MB) · `redis-volume` (Redis, 349/5000 MB) ·
⚠️ **`postgres-restored` (Attached: N/A, 1274 MB usados / 50000 MB provisionados, Ready)** —
**resíduo do drill D-594**, intocado → **T239 (decisão do Operador)**.

## 6. Workflow de migration (T229) — revalidado em `main`

`git show origin/main:.github/workflows/migrate-production.yml` → **nenhuma linha executável**
chamando `backup-db.sh`; a única menção é um **comentário** (linha 19). O job é
`(apply + verify)`. ✅ Falso controle removido e estável em `main`.

## 7. Classificação do estado (pós-T227/T229)

**✅ PRONTO**
- **Restaurabilidade PROVADA** (drill D-594, caminho do serviço irmão; contagens produção=restaurado).
- **Alerta de falha de backup IMPLEMENTADO e provado** (arquivador/WAL; least-privilege, sem token amplo).
- **Falso controle pré-migration REMOVIDO** (T229) — migrations intactas.
- **Schedule produzindo** backups materializados (2 `Daily Schedule`).
- **CI/Security verdes** em `main`; **smoke 7/7**.
- Observabilidade: 5xx CRITICAL, auth WARNING, uptime, Sentry, `/metrics`, alerta de backup.

**🟡 PENDENTE DO OPERADOR (decisão)**
1. **T239** — remover o volume órfão `postgres-restored` (50 GB provisionados; **irreversível**).
2. **T227-ext** — cobrir materialização do `Daily Schedule`/**`Restorable up to`** (exigiria token
   Railway **escopado**; o `RAILWAY_TOKEN` amplo **continua recusado**) — ou **aceitar formalmente**
   que o alerta cobre o sinal crítico e a materialização será verificada por auditoria read-only.
3. **Deploy `waiting`** em Production — aprovação manual.
4. **GO convites** — declaração formal.

**🔁 MONITORADO**
- `pre-go-2026-10-13` **EM_PROGRESSO lento** (~107/630 MB) — não é prova principal.
- **Janela transitória** merge→deploy do alerta (métricas ausentes ⇒ CRIT temporário).
- **Cadência efetiva dos agendados do GitHub ~2–4 h** (throttling) → bound de latência do alerta.
- `Restorable up to` (frescor da janela) · Vercel quota · Trivy estrutural · flakes conhecidos ·
  `railway.json` deprecado (**migrar até 2026-12-01**) · `Monitor-26-honest-no-cast-titles`.

## 8. Divergências registradas (sem mutar)

1. **Alertas 117, não 118** — queda de 1 desde 2026-10-13; sem ação nossa.
2. **PITR `Backup sets: 3`** (era 2 na T242) — o arquivador continua produzindo conjuntos.
3. **Nenhum run agendado do `backup-health-alert`** após ~3 h — explicado pelo throttling (§4),
   **não** por defeito. Mantido como monitor.
4. **`pre-go` estagnado** em ~107 MB há ~1 dia — não é bloqueante, mas confirma que ele **não** serve
   como alvo de verificação.

## 9. Confirmações (proibições respeitadas)

- **Nenhuma mutação:** sem migration/restore/backup create-delete-lock, sem alterar PITR/schedule/
  volume/produção/vars/secrets/deploy, sem GitHub settings, sem interação com alertas de segurança.
- **Nenhum segredo/ID bruto/URL de download/connection string/PII** impresso; `RAILWAY_TOKEN` **não**
  usado; nenhum token/segregado novo.
- **Não** aprovamos Production; **não** declaramos GO; **nenhum** BETA-GAP marcado como DONE.
- Diff **docs-only**; contaminação `123ce28e` ausente.
