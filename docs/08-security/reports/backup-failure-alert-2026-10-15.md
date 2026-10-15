# Alerta de falha de backup (T227) — implementado via `/metrics` (least-privilege)

**Data:** 2026-10-15 · **Tarefa:** T227 · **Fase:** F09-ci-cd-deploy
**Classificação:** **`BACKUP_ALERT_IMPLEMENTADO`**
**GO convites:** **SUSPENSO** (decisão do Operador)

> Contexto: **T242 aprovada** — restaurabilidade provada (**D-594**); **T240 = NOT_REQUIRED**;
> **T241 = inviável pelo CLI** (sem export/dump). O gargalo técnico restante era a **ausência de
> alerta automatizado** de falha de backup.

---

## 1. A regra dura desta tarefa

O packet autoriza implementar **somente** com caminho **já provisionado e seguro**, e obriga a
**bloquear objetivamente** se exigir: novo segredo, **token Railway**, billing, acesso amplo,
`DATABASE_URL`, produção escrita ou exportação de PII.

## 2. Discovery read-only

**Padrão de alerta do repositório** (reusável): workflows agendados + `permissions: issues: write` +
script em `scripts/ci/*.mjs` **com self-test determinístico** + **dedup por label** (cria na 1ª falha,
atualiza em falha contínua, fecha na recuperação). Exemplos: `uptime-check.yml` (`*/10`),
`alertas-metricos.yml` (`*/15`), `health-check.yml`, `deploy-reconciler.yml`.

**Segredos/variáveis provisionados** (somente nomes verificados; nenhum valor lido):
`ADMIN_TOKEN`, `DATABASE_URL`, `REDIS_URL`, `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`,
`RAILWAY_SERVICE_ID`, `SENTRY_AUTH_TOKEN`, `VERCEL_*`; variáveis `METRICS_URL`, `SENTRY_ORG`,
`SENTRY_PROJECT`.

**Duas descobertas decisivas:**
1. **`RAILWAY_TOKEN` existe** (embora não usado por nenhum workflow) — o caminho "chamar
   `railway postgres pitr status` no CI" **não exigiria segredo novo**.
2. **O app lê `pg_stat_archiver`** — confirmado read-only em produção (role do app tem permissão).

## 3. Por que NÃO usei o Railway CLI (decisão consciente)

Um **token de conta Railway é credencial ampla**: com ele, o CLI cria/deleta **serviços e volumes**
e executa restore — exatamente o que o packet classifica como gatilho de bloqueio ("token Railway",
"acesso amplo"). Usá-lo num workflow agendado para **ler** um status seria **elevação de privilégio**
para uma leitura, além de: (i) eu não poder verificar o escopo do token (valores de segredo são
ilegíveis); (ii) um vazamento no CI daria poder destrutivo sobre a produção.

O **STRIDE** do packet é explícito: *"Automação não deve usar credencial ampla nem expor identidade.
Se faltar least-privilege, bloquear"* e *"Nenhuma permissão nova é concedida"*.

**Portanto o caminho escolhido é o interno do app** — least-privilege, sem credencial ampla:

| Camada | Credencial | Escopo |
|---|---|---|
| Coleta no banco | conexão que o app já tem | `SELECT` em `pg_stat_archiver` (view de sistema, **sem PII**) |
| Exposição | `secrets.ADMIN_TOKEN` (**já existente**, criado para `/metrics`) + `vars.METRICS_URL` (**já existente**) | somente `GET /metrics` |
| Alerta | `secrets.GITHUB_TOKEN` (efêmero do Actions) | `issues: write` |

Nenhum segredo novo. Nenhuma permissão nova. Nenhuma escrita.

## 4. Estado fresco do backup (read-only, no momento da execução)

`railway postgres pitr status --service Postgres` (2026-10-15, 00:29Z): **`enabled`**, bucket wired,
HA cluster: no · **Archiver: enabled** · `Last archived at 2026-10-15 00:29:13Z` ·
`Restorable up to 2026-10-15 00:13:35Z` · **Backup sets: 2** · Retenção DAILY/WEEKLY/MONTHLY ativa.

`pg_stat_archiver` **pela conexão do app** (probe validado, 00:22Z): `archive_mode=on`,
`archive_timeout=1min`, `wal_level=replica`, `in_recovery=false`, `archived_count=2662`,
`failed_count=0`, `last_archived_time` há **14 s**. → o sinal é **vivo e utilizável**.

## 5. O que foi implementado

**API (leitura read-only + serialização Prometheus):**
- `apps/api/src/modules/metrics/backup-health.ts` — módulo **puro**: `avaliarSaudeBackup` (nível
  `ok|warn|crit` + motivos) e `renderPrometheusSaudeBackup`.
- `apps/api/src/modules/metrics/backup-health.service.ts` — coleta **best-effort** de
  `current_setting('archive_mode')` e `pg_stat_archiver` via `$queryRaw` (tagged template, sem
  interpolação → sem sink de SQL). Erro de coleta ⇒ **fail-closed** (`probeOk=false`), nunca
  "saudável" fabricado; `/metrics` nunca quebra.
- `metrics.controller.ts` / `metrics.module.ts` — anexam `backup_health_*` ao texto de `/metrics`
  (o `MetricsService` **não** foi tocado — zero risco para specs existentes).

**Métricas expostas:** `backup_health_probe_ok`, `backup_health_ok`, `backup_health_level`,
`backup_health_reason{reason=...}`, `backup_archive_mode_on`, `backup_archiver_archived_total`,
`backup_archiver_failed_total`, `backup_archiver_last_archived_age_seconds`,
`backup_archiver_last_failed_age_seconds` (`-1` = nunca falhou).

**CI (leitor fino + dedup):**
- `scripts/ci/backup-health.mjs` — traduz as métricas em alerta e faz o dedup da issue
  (label `backup-health-alert`); a **decisão** fica no app (fonte única de verdade).
- `scripts/ci/backup-health.self-test.mjs` — determinístico, sem rede.
- `scripts/ci/backup-health.fixture.txt` — estado **saudável** para o fallback.
- `.github/workflows/backup-health-alert.yml` — `*/30`, `issues: write`, `vars.METRICS_URL` +
  `secrets.ADMIN_TOKEN`; **fixture ⇒ dry-run forçado** (nunca abre issue falso); coleta falha ⇒
  snapshot vazio ⇒ **fail-closed**; **proíbe `RAILWAY_TOKEN`** por design.
- `scripts/ci/automation-safety.self-test.mjs` — a guarda P016 agora também exige, para o novo
  workflow: fonte live condicionada a `METRICS_URL`+`ADMIN_TOKEN` **e ausência de `RAILWAY_TOKEN`**.

## 6. Thresholds (conservadores) e semântica

| Condição | Nível | Motivo |
|---|---|---|
| coleta falhou (probe) | **CRIT** | `probe_indisponivel` |
| `archive_mode != on` | **CRIT** | `archive_mode_off` |
| sem arquivamento registrado | **CRIT** | `sem_arquivamento_registrado` |
| último arquivamento ≥ **12 h** | **CRIT** | `arquivamento_atrasado_crit` |
| último arquivamento ≥ **2 h** | WARN | `arquivamento_atrasado_warn` |
| falha de arquivamento < **1 h** | **CRIT** | `falha_recente` |
| falha mais nova que o último sucesso | **CRIT** | `falha_apos_ultimo_sucesso` |
| falha antiga, já recuperada | WARN | `falhas_historicas` |
| métricas ausentes em `/metrics` | **CRIT** | `metricas_ausentes` (fail-closed) |

Com `archive_timeout=1min` o intervalo normal é de **segundos**; 2 h já é anômalo e 12 h é parada
clara. **`usedMB > 0` não é usado como critério** (a T242 mostrou que é fraco).

## 7. Limite honesto de escopo (o que este alerta NÃO cobre)

A materialização dos backups **agendados** e o campo **`Restorable up to`** são do **lado Railway**
(API/CLI) e exigiriam o **token amplo** — deliberadamente **fora**. O proxy interno é o
**arquivador de WAL**, que é a **condição de existência** da janela PITR: se o arquivador para, a
janela deixa de avançar e o drill deixa de ter alvo válido. É o modo de falha que importa e o único
observável sem credencial ampla. Registrado em `PENDENCIAS_OPERADOR.md` como item de decisão.

## 8. Verificação (tudo local e determinístico)

| Verificação | Resultado |
|---|---|
| `apps/api/test/backup-health.spec.ts` | **14/14 ok** (níveis, fail-closed, só-SELECT, sem PII) |
| `scripts/ci/backup-health.self-test.mjs` | **18/18 ok** |
| Suíte da API completa | **169 arquivos / 1436 testes** — verde |
| `tsc --noEmit` (API) | ok |
| `eslint` (arquivos alterados) | ok |
| `prettier --check` | ok |
| YAML do workflow | parse ok (schedule/dispatch, `permissions` corretos) |
| `automation-safety.self-test.mjs` | ok (política íntegra, T096) |
| Dry-run com fixture | `acao: none`, `dryRun: true` (não abre issue) |

## 9. Transiente conhecido

Na janela entre o merge e o deploy da API, `/metrics` ainda não expõe `backup_health_*` → o primeiro
`schedule` poderia classificar `metricas_ausentes` (CRIT) e abrir a issue, fechando na execução
seguinte. Janela de minutos contra cadência de 30 min; comportamento **fail-closed por design**.

## 10. Riscos residuais e confirmações

- **Nenhuma mutação:** sem restore; sem criar/alterar/deletar recurso (o volume órfão
  `postgres-restored` segue **intocado** — é T239, decisão do Operador); PITR/schedule/backup
  intocados; sem deploy; sem tocar produção.
- **Nenhum segredo/PII impresso**; nenhum ID bruto; nenhum alerta de code/secret scanning interagido.
- **Não** usei `RAILWAY_TOKEN`; nenhum segredo novo foi criado.
- **GO permanece suspenso**; o deploy `waiting` em Production **não** foi aprovado.
- Pendências que continuam: **T239** (volume órfão), **T229** (fail-closed pré-migration),
  **T245** (Config as Code), **T233** (R2), aprovação de Production, GO formal.
