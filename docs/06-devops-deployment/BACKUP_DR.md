# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

- `scripts/backup-db.sh` — dump do PostgreSQL em formato custom (`pg_dump -F c`), **retenção 30 dias**,
  com **validação do dump** (`pg_restore --list`) e **falha em voz alta** se `pg_dump` estiver ausente
  (nunca fabrica um backup falso).
- **Estado operacional (honesto, 2026-10-13 / T232 — pós Railway PRO, evidência por CLI):**
  ✅ **Schedule DAILY ATIVO** (`railway postgres pitr schedule set --daily`, criado 2026-10-13;
  **retenção default = 6 dias / 518400 s** — ⚠️ abaixo do ideal; ver decisão pendente abaixo).
  ✅ **Backup permanente criado** (`pre-go-2026-10-13`, **expira `never`**) — **elimina o penhasco de
  2026-10-28**: passa a existir um backup que **não expira**.
  Estado: `pitr status` → **`disabled`** (não habilitado; decisão separada, T235) · `backup list` →
  3 backups (dois antigos `manual` + o novo `never`).
  **Pendente:** **alerta de falha** (T227) e **restore drill validado** (T228); pré-migration segue
  **fail-open** (T229). Relatório: `docs/08-security/reports/railway-pro-backup-activation-2026-10-13.md`.
- **⚠️ Decisão pendente — retenção:** o default de **6 dias** cobre falhas recentes mas **não** corrupção
  de descoberta tardia. Opções (Operador): `schedule set --daily --weekly --monthly` (estende a janela),
  habilitar **PITR** (T235) ou manter 6 d com o limite registrado.
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
- **Backup pré-migration** (`migrate-production.yml`, P013): chama o script antes da migration, porém é
  **fail-open** (`|| echo "…continuando"`) — se o dump falha, a migration **prossegue**. Além disso, o
  secret `DATABASE_URL` do CI aponta para o **hostname interno** do Railway (**D-527**), inacessível
  dos runners → esse backup **não funciona hoje**.
- **Design de prontidão operacional (docs-only, nada implementado):**
  `docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md` — opções A–E, política de
  destino/segredos/PII, alerta de falha (padrão GitHub Issues), procedimento de restore de ensaio,
  RPO/RTO e **template de decisão do Operador**.

## Restauração

```bash
# 1. obter o dump mais recente (OU o de antes do incidente)
ls -lt <diretório-de-backup> | head
# 2. restaurar num Postgres alvo (nunca direto em produção sem janela combinada):
pg_restore -h <host> -U <user> -d <db> --clean --if-exists <dump>
# 3. validar: /health 200 + contagens de tabelas críticas + verificarIntegridade()
#    do audit_log (cadeia SHA-256 íntegra = não houve tampering)
```

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
- [ ] **Decisão de retenção** (Operador): 6 d default vs `--weekly`/`--monthly` vs PITR (T235).
- [ ] **T227** — alerta de falha de backup (lê o `BACKUP_STATUS_FILE`; padrão GitHub Issues).
- [ ] **T228** — restore de ensaio validado em ambiente seguro (+ **RTO medido**).
- [ ] **T229** — corrigir o **fail-open** do pré-migration (agora **pode** avançar: há backup confiável).
- [ ] **T233** (opcional) — R2 como destino durável secundário portátil (read-only primeiro).
- [ ] **T235** (opcional) — decisão sobre habilitar **PITR** (continuous backup; possível custo).
- [ ] P012 (staging) melhora o ensaio de DR · P013 corrige o secret `DATABASE_URL` do CI (D-527).
