# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

- `scripts/backup-db.sh` — dump do PostgreSQL em formato custom (`pg_dump -F c`), **retenção 30 dias**,
  com **validação do dump** (`pg_restore --list`) e **falha em voz alta** se `pg_dump` estiver ausente
  (nunca fabrica um backup falso).
- **Estado operacional (honesto, 2026-10-13 / T226):** o script é de **boa qualidade** e agora está
  **preparado** para destino durável (`BACKUP_UPLOADER`) e para emitir **status sanitizado**
  (`BACKUP_STATUS_FILE`). **Mas a operação ainda NÃO é confiável:** não há backup agendado em produção,
  o **destino durável não está configurado** (sem uploader/volume), **não há alerta de falha** (T227) e
  **não há restore validado** (T228). Enquanto isso, **o dado existe apenas no volume do Postgres**
  (T181). Relatório: `docs/08-security/reports/backup-automation-minimum-2026-10-13.md`.
- **Variáveis do script:** `BACKUP_DIR` (destino; precisa ser **durável**), `RETENTION_DAYS` (default 30),
  `BACKUP_UPLOADER` (executável chamado com o dump como `$1` para envio a destino externo; falha ⇒ o
  script **aborta**), `BACKUP_STATUS_FILE` (JSON sanitizado `ts/ok/bytes/retidos/uploaded`).
- **Agendamento:** deve rodar **dentro do ambiente da plataforma** (acesso à rede interna do banco).
  **NÃO** usar runner externo/CI — o hostname interno não é alcançável de fora (**D-527**).
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
