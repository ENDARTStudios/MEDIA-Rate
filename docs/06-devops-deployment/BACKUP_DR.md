# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

- `scripts/backup-db.sh` — dump do PostgreSQL em formato custom (`pg_dump -F c`), **retenção 30 dias**,
  com **validação do dump** (`pg_restore --list`) e **falha em voz alta** se `pg_dump` estiver ausente
  (nunca fabrica um backup falso).
- **Estado operacional (honesto, 2026-10-13 / T230 — evidência por CLI):**
  `railway postgres pitr status` → **`disabled`** (HA `no`, bucket `no`);
  `postgres pitr schedule list` → **"No backup schedule configured"**;
  `postgres pitr backup list` → **2 backups, AMBOS `manual`**: `Pre-Security-Patch Backup`
  (2026-08-23, 65 MB, **expirado em 2026-09-22**) e `Online resize to 5000MB`
  (2026-10-07, 413 MB, **expira em 2026-10-28**).
  `postgres pitr backup create` → **falha**: *"Manual backups and backup schedules are only available
  for **Pro workspaces**"*.
  **Consequência:** sem ação, **a partir de 2026-10-28 o banco fica sem nenhum backup retido**.
  Relatório: `docs/08-security/reports/railway-cli-backup-evidence-2026-10-13.md`.
- **Variáveis do script:** `BACKUP_DIR` (destino; precisa ser **durável**), `RETENTION_DAYS` (default 30),
  `BACKUP_UPLOADER` (executável chamado com o dump como `$1` para envio a destino externo; falha ⇒ o
  script **aborta**), `BACKUP_STATUS_FILE` (JSON sanitizado `ts/ok/bytes/retidos/uploaded`).
- **Agendamento:** via **CLI** (`railway postgres pitr schedule set --daily`) — hoje **bloqueado por
  plano** (*Pro workspaces*). Alternativa sem custo: rodar o script (`BACKUP_UPLOADER`) a partir de um
  agendador **dentro do ambiente da plataforma** (acesso à rede interna do banco). **NÃO** usar runner
  externo/CI — o hostname interno não é alcançável de fora (**D-527**).
- **⚠️ Prazo:** o único backup válido **expira em 2026-10-28** — antes disso é preciso **decisão**
  (Pro) **ou** backup manual de reposição **ou** aceite formal de risco.
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

- [ ] **Operador** habilita no painel o **backup gerenciado** do Postgres + **alerta de uso do volume**
      (não automatizável pelo CLI — checklist em `reports/backup-automation-minimum-2026-10-13.md` §5).
- [ ] **Operador** define o **destino durável** do complemento portátil (`BACKUP_UPLOADER` + agendador
      **dentro da plataforma**; nunca runner externo — D-527).
- [ ] **T227** — alerta de falha de backup lendo o `BACKUP_STATUS_FILE` (padrão GitHub Issues).
- [ ] **T228** — restore de ensaio validado em ambiente seguro (+ **RTO medido**).
- [ ] **T229** — corrigir o **fail-open** do pré-migration (**somente após** backup confiável + alerta).
- [ ] P012 (staging) melhora o ensaio de DR (ambiente alvo pronto).
- [ ] P013 (caminho de migration manual) corrige o secret `DATABASE_URL` do CI (D-527) para um
      endereço alcançável.
