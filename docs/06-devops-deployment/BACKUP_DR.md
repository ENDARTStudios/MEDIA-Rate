# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

> **⚠️ Atualização (T242, 2026-10-14 — auditoria read-only do Railway CLI, contexto PRO).** Três
> correções de estado sobre o que segue abaixo:
> 1. **Restaurabilidade: ✅ PROVADA** — o restore drill **já foi executado e aprovado** em
>    **D-594** (T211 cont. 12, 2026-10-13) pelo caminho **não destrutivo** (`pitr restore` →
>    **serviço irmão**, origem intocada; contagens produção=restaurado). A T228 ("não provada")
>    foi **superada** — ver §5 do relatório T242. `docs/08-security/reports/railway-cli-capability-audit-2026-10-14.md`.
> 2. **O schedule PRODUZ backups** — há **2 backups agendados materializados** (`Daily Schedule`
>    de 2026-10-13 e 2026-10-14, ~130/670 MB). O achado "o schedule ainda não produziu backup"
>    (T236) está **superado**.
> 3. **PITR está `enabled`** com **`Archiver: enabled`** e **`Restorable up to`** avançando
>    (não mais `disabled` como em trechos antigos abaixo).
> 4. **Resíduo billable a limpar (T239):** o volume **`postgres-restored`** (do drill D-594) ficou
>    **desanexado** (`Attached to: N/A`) com **50 GB provisionados** — o `service delete` removeu o
>    serviço mas não o volume. Remoção exige autorização do Operador.
> 5. **Sem caminho de export/dump pelo CLI** (não há `pitr backup download`) → a "Opção B" (dump →
>    Postgres local) **não é implementável pelo CLI** sem ler a produção (PII).

> **✅ Atualização (T227, 2026-10-15 — alerta de falha de backup IMPLEMENTADO).** Dimensões separadas:
> - **Restaurabilidade:** ✅ **PROVADA** (D-594/T242) — nada a provar de novo.
> - **Verificação read-only:** ✅ `pitr status` (Archiver, `Restorable up to`, backup sets) +
>   `pitr backup list --json` + `postgres history`; **dentro do app**, `pg_stat_archiver`.
> - **Alerta automatizado:** ✅ **IMPLEMENTADO (T227)** — ver § "Alerta de falha de backup" abaixo.
> - **Volume órfão:** ⚠️ `postgres-restored` (desanexado, 50 GB) — pendente da **T239** (decisão do Operador).
> - **`pre-go-2026-10-13`:** ⏳ `EM_PROGRESSO` lento (~107/630 MB) — **não** crítico para a
>   restaurabilidade global. Relatório: `docs/08-security/reports/backup-failure-alert-2026-10-15.md`.

- `scripts/backup-db.sh` — dump do PostgreSQL em formato custom (`pg_dump -F c`), **retenção 30 dias**,
  com **validação do dump** (`pg_restore --list`) e **falha em voz alta** se `pg_dump` estiver ausente
  (nunca fabrica um backup falso).
- **Retenção final (2026-10-13 / T234):** schedule **acumulado** —
  **DAILY 6 d** (frescor) + **WEEKLY 27 d** + **MONTHLY 89 d** → **janela máxima de 89 dias**
  (`railway postgres pitr schedule set --daily --weekly --monthly`). O CLI **não** expõe flag de
  retenção por schedule, então 6/27/89 d são os defaults da plataforma para cada cadência.
- **⚠️ Estado separado por dimensão (T236, 2026-10-13 — verificação read-only com polling limitado):**
  1. **Retenção (política):** ✅ DAILY 6 d + WEEKLY 27 d + MONTHLY 89 d.
  2. **Backup permanente (registro):** ✅ `pre-go-2026-10-13` com `expiresAt: None`.
  3. **Materialização:** ⏳ **`EM_PROGRESSO`** — `usedMB` subiu **0 → 95 MB** de `referencedMB` 630
     (~15 %) numa série **monotônica** (0→2→4→4→86→87→93→94→95) em ~45 min. **NÃO concluída.**
  4. **Restaurabilidade:** ❌ **NÃO verificada** — e o **restore drill (T228)** foi **BLOQUEADO**:
     `pitr backup restore` **não isolável** (in-place em produção) e `pitr restore --at` **cria serviço
     novo** (billable) → exige **autorização de custo**. Plano em
     `docs/08-security/reports/railway-restore-drill-2026-10-13.md`.
     ⚠️ **PITR agora `enabled` (bucket wired)** — mudança observada em 2026-10-13, **não** executada pelo agente.
  5. **Alerta:** ⏳ pendente (**T227**) — **não** liberado como pronto: o **CLI não expõe campo de
     status/completion** (só `usedMB` como proxy), então um critério baseado em `usedMB > 0` seria fraco.
  **Mitigação temporária:** o backup `Online resize to 5000MB` (413/483 MB, **materializado**) vale até
  **2026-10-28** — há ponto de recuperação materializado nas próximas ~2 semanas.
  **O schedule ainda NÃO produziu backup** (0 com `scheduleId` não-nulo). Relatório:
  `docs/08-security/reports/railway-backup-materialization-verification-2026-10-13.md`.
- **Estado operacional (honesto, 2026-10-13 / T232 — pós Railway PRO, evidência por CLI):**
  ✅ **Schedule DAILY ATIVO** (criado 2026-10-13) · ✅ **backup permanente `pre-go-2026-10-13`**
  (`expiresAt: None`) — **com a ressalva de materialização acima**.
  `pitr status` → **`disabled`** (decisão separada, T235) · `backup list` → 3 backups.
  **Pendente:** **alerta de falha** (T227) e **restore drill validado** (T228); pré-migration segue
  **fail-open** (T229). Relatório: `docs/08-security/reports/railway-pro-backup-activation-2026-10-13.md`.
- **⚠️ Decisão pendente — retenção:** ✅ **resolvida na T234** (DAILY 6 d + WEEKLY 27 d +
  **MONTHLY 89 d**). O que resta decidir é se a **cadência mensal de 89 d** é suficiente ou se vale
  **PITR** (T235) para recuperação contínua.
- **Estado anterior (2026-10-13 / T230, pré-PRO):** PITR `disabled`, **sem schedule**, 2 backups
  **manuais** (um já expirado; o outro expirava em 2026-10-28) e `backup create` **bloqueado**
  (*"only available for Pro workspaces"*). Relatório:
  `docs/08-security/reports/railway-cli-backup-evidence-2026-10-13.md`.
- **Variáveis do script:** `BACKUP_DIR` (destino; precisa ser **durável**), `RETENTION_DAYS` (default 30),
  `BACKUP_UPLOADER` (executável chamado com o dump como `$1` para envio a destino externo; falha ⇒ o
  script **aborta**), `BACKUP_STATUS_FILE` (JSON sanitizado `ts/ok/bytes/retidos/uploaded`).
- **Agendamento:** ✅ **ATIVO via CLI** (`railway postgres pitr schedule set --daily`, retenção 6 d
  default). ⚠️ **Não** habilitar **PITR** sem decisão explícita (T235). O complemento portátil
  (`scripts/backup-db.sh` → `BACKUP_UPLOADER`) pode rodar a partir de um agendador **dentro do ambiente
  da plataforma**; **NÃO** usar runner externo/CI — o hostname interno não é alcançável de fora (**D-527**).
- **✅ Resolvido:** o prazo de **2026-10-28** deixou de ser um penhasco — o backup `pre-go-2026-10-13`
  **não expira** (`never`). Continua valendo **revisar a retenção** (6 d) por decisão do Operador.
- **Backup pré-migration — ❌ NÃO é garantia (removido na T229).** O passo `Backup antes da
  migration` do `migrate-production.yml` era **fail-open** (`|| echo "…continuando"`) **e inoperante**
  (o secret `DATABASE_URL` do CI aponta para o **hostname interno** do Railway, **D-527**, inacessível
  dos runners) — e o próprio `scripts/backup-db.sh` documenta que **não** deve rodar em CI. Não
  protegia nada e criava **falsa garantia**. Foi **removido** em **2026-10-15 (T229)**; um backup
  pré-migration de fato pertence ao **caminho manual** (console do serviço, dentro da rede) —
  `docs/06-devops-deployment/runbooks/migration-manual.md`. Relatório:
  `docs/08-security/reports/premigration-backup-reconciliation-2026-10-15.md`.
- **✅ A rede de segurança REAL do banco (separação explícita):**
  1. **PITR `enabled`** + **arquivador de WAL** → é o que sustenta a janela de recuperação;
  2. **alerta de falha** (`backup-health-alert`, T227) monitora o arquivador (fail-closed);
  3. **backups agendados** materializados (DAILY/WEEKLY/MONTHLY) + backup permanente `pre-go-2026-10-13`;
  4. **restore PROVADO** — drill executado e aprovado (D-594);
  5. **dump portátil** (`scripts/backup-db.sh` + `BACKUP_UPLOADER`) — **complemento manual/opcional**,
     nunca um controle automático de segurança nem um passo de CI.
- **Design de prontidão operacional (docs-only, nada implementado):**
  `docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md` — opções A–E, política de
  destino/segredos/PII, alerta de falha (padrão GitHub Issues), procedimento de restore de ensaio,
  RPO/RTO e **template de decisão do Operador**.

## Restauração

**Recuperação gerenciada (PITR — caminho válido de DR, D-594/T242):**

```bash
# 1. ver a cobertura e o alvo restaurável (read-only, zero custo):
railway postgres pitr status --service Postgres   # "Restorable up to" = alvo do --at
# 2. restaurar num SERVIÇO IRMÃO (nunca in-place em produção):
railway postgres pitr restore --at <RFC3339|offset> --new-service-name drill-<data>
# 3. validar no irmão: /health + count(*) exato das tabelas críticas (midia/episodio/temporada/...)
# 4. remover o serviço irmão E O VOLUME dele (o service delete NÃO remove o volume — T239):
railway service delete --service drill-<data> -y     # escopado por nome; NUNCA `railway delete`
railway volume list                                   # conferir se sobrou volume desanexado
```

> ⚠️ `railway postgres pitr backup restore <ID>` é **in-place** (sobrescreve o banco alvo) — **não**
> é caminho de validação. DR valida-se por **PITR restore (serviço irmão)**.

**Restauração portátil (dump, se houver destino durável):**

```bash
# 1. obter o dump mais recente (OU o de antes do incidente)
ls -lt <diretório-de-backup> | head
# 2. restaurar num Postgres alvo (nunca direto em produção sem janela combinada):
pg_restore -h <host> -U <user> -d <db> --clean --if-exists <dump>
# 3. validar: /health 200 + contagens de tabelas críticas + verificarIntegridade()
#    do audit_log (cadeia SHA-256 íntegra = não houve tampering)
```

> Nota (T242): **não** existe `pitr backup download` no CLI — este caminho só é viável a partir de
> um dump obtido fora do Railway (ex.: `backup-db.sh` + `BACKUP_UPLOADER`), nunca por export do CLI.

## Alerta de falha de backup (T227)

**Como funciona (least-privilege, sem credencial Railway):**

```text
app (Railway) ── SELECT read-only em pg_stat_archiver ──> /metrics (backup_health_*)
                                                             │  X-Admin-Token
GitHub Actions (backup-health-alert.yml, */30) ── GET /metrics ──┘
        └─ dedup por label `backup-health-alert` (cria/atualiza/fecha issue)
```

- **Sinal:** `pg_stat_archiver` (arquivamento contínuo de WAL). Se o arquivador para, a janela do
  PITR **deixa de avançar** — é a falha que importa e a única observável sem credencial ampla.
- **Credenciais:** `secrets.ADMIN_TOKEN` (**já existente**, criado para `/metrics`) + `vars.METRICS_URL`
  (**já existente**) + `secrets.GITHUB_TOKEN`. **Nenhum segredo novo.** O token amplo `RAILWAY_TOKEN`
  **não** é usado (a guarda `automation-safety` agora reprova se ele aparecer neste workflow).
- **Fail-closed:** falha de coleta ⇒ snapshot vazio ⇒ classificado como indisponível (**nunca**
  "saudável" fabricado); fixture ⇒ **dry-run forçado** (nunca abre issue falso).
- **Limiares:** CRIT se probe indisponível, `archive_mode != on`, sem arquivamento, atraso ≥ **12 h**,
  falha < **1 h** ou falha mais nova que o último sucesso, ou métricas ausentes; WARN se atraso ≥ **2 h**
  ou falha antiga já recuperada. (`usedMB > 0` **não** é critério.)
- **Recuperação:** a issue fecha sozinha quando a saúde normaliza.

**Verificação read-only equivalente (manual, para o Operador):**

```bash
railway postgres pitr status --service Postgres     # Archiver + Restorable up to + backup sets
curl -s "$METRICS_URL" -H "X-Admin-Token: $ADMIN_TOKEN" | grep '^backup_health'
```

**Fora de escopo (decisão explícita):** materialização do `Daily Schedule` e `Restorable up to`
exigiriam a **API/CLI do Railway** (token amplo) → pendente de decisão em `PENDENCIAS_OPERADOR.md`.

## Cenários e resposta

| Cenário | Resposta | RTO esperado |
|---|---|---|
| **Deploy ruim** (código) | `git revert -m 1` do merge → merge do revert → reimplanta | minutos (deploy nativo) |
| **Migration ruim** | revert do merge + `prisma migrate resolve --rolled-back` (plano obrigatório na seção `## Rollback` do PR — B1) + backup se dado foi perdido | minutos-horas (depende do plano) |
| **Dado corrompido/apagado** | restore do dump diário em DB de staging → extração cirúrgica → reingresso; audit chain comprova o quê mudou | horas |
| **Vazamento de dados** | `docs/05-security-compliance/INCIDENT_RESPONSE.md` (linha do tempo LGPD/ANPD) + rotação de segredos + comunicação ao titular | regulatório |
| **Banco fora (Railway)** | Railway managed Postgres — status page; app degrada (health 5xx) até recuperação; sem hot standby próprio (honesto: RTO do provedor) | provedor |

## Limites honestos (RPO/RTO atuais)

- **RPO até 24h** (dump diário) — para Beta Fechada aceito; revisitar antes de
  Beta pública (sugestão: PITR/wal ou frequência maior).
- **Sem ambiente standby** — RTO de código = tempo de redeploy; de dado = restore.

## Checklist pré-Beta (pendente)

- [x] ~~Backup gerenciado habilitado~~ → **T232 (2026-10-13):** schedule **DAILY ativo** + backup
      permanente `pre-go-2026-10-13` (**`never`**).
- [x] ~~**Restore drill validado**~~ → **D-594 (2026-10-13, T211 cont. 12):** drill executado por
      **PITR restore (serviço irmão)**, contagens produção=restaurado, serviço irmão removido.
      Confirmado read-only na **T242**. Resta **limpar o volume órfão** (T239) e manter o runbook.
- [ ] **Decisão de retenção** (Operador): 6 d default vs `--weekly`/`--monthly` vs PITR (T235).
- [x] ~~**T227** — alerta de falha de backup~~ → **T227 (2026-10-15):** `backup-health-alert.yml`
      (`*/30`) + `pg_stat_archiver` via `/metrics` + dedup por issue. **Least-privilege** (sem token
      Railway). Limiares CRIT/WARN + fail-closed. Relatório:
      `docs/08-security/reports/backup-failure-alert-2026-10-15.md`.
- [ ] **T239** — remover o volume órfão `postgres-restored` (50 GB provisionados) — **autorização do Operador**.
- [x] ~~**T229** — corrigir o **fail-open** do pré-migration~~ → **T229 (2026-10-15):** o passo
      decorativo **foi removido** (***não*** torneado fail-closed, o que bloquearia migrations por um
      caminho que nunca funcionou). Rede real documentada acima. Relatório:
      `docs/08-security/reports/premigration-backup-reconciliation-2026-10-15.md`.
- [ ] **T241** (Opção B) — **sem caminho de CLI** (exige export de PII) → manter bloqueada/descartar.
- [ ] **T233** (opcional) — R2 como destino durável secundário portátil (read-only primeiro).
- [ ] **T235** (opcional) — decisão sobre habilitar **PITR** (já `enabled`; confirmar intenção/custo).
- [ ] **Config as Code** → migrar `railway.json` → `.railway/railway.ts` antes de **2026-12-01** (T242).
- [ ] P012 (staging) melhora o ensaio de DR · P013 corrige o secret `DATABASE_URL` do CI (D-527).
