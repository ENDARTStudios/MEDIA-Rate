# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

- `scripts/backup-db.sh` — dump diário do PostgreSQL, **retenção 30 dias**.
- Migração manual (quando habilitada pelo Operador, P013): `migrate-production.yml`
  faz backup **antes** de aplicar migration.

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
| **Vazamento de dados** | `docs/INCIDENT_RESPONSE.md` (linha do tempo LGPD/ANPD) + rotação de segredos + comunicação ao titular | regulatório |
| **Banco fora (Railway)** | Railway managed Postgres — status page; app degrada (health 5xx) até recuperação; sem hot standby próprio (honesto: RTO do provedor) | provedor |

## Limites honestos (RPO/RTO atuais)

- **RPO até 24h** (dump diário) — para Beta Fechada aceito; revisitar antes de
  Beta pública (sugestão: PITR/wal ou frequência maior).
- **Sem ambiente standby** — RTO de código = tempo de redeploy; de dado = restore.

## Checklist pré-Beta (pendente)

- [ ] Operador valida um **restore de ensaio** (dump → staging → app sobe) e
      registra a evidência no worklog.
- [ ] P012 (staging) melhora o ensaio de DR (ambiente alvo pronto).
- [ ] P013 (caminho de migration manual) define onde o `resolve --rolled-back` roda.
