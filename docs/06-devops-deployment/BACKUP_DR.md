# BACKUP_DR — Backup e recuperação de desastres

## Backup (9.7)

- `scripts/backup-db.sh` — dump do PostgreSQL em formato custom (`pg_dump -F c`), **retenção 30 dias**,
  com **validação do dump** (`pg_restore --list`) e **falha em voz alta** se `pg_dump` estiver ausente
  (nunca fabrica um backup falso).
- **Retenção final (2026-10-13 / T234):** schedule **acumulado** —
  **DAILY 6 d** (frescor) + **WEEKLY 27 d** + **MONTHLY 89 d** → **janela máxima de 89 dias**
  (`railway postgres pitr schedule set --daily --weekly --monthly`). O CLI **não** expõe flag de
  retenção por schedule, então 6/27/89 d são os defaults da plataforma para cada cadência.
- **⚠️ RISCO ABERTO (T234):** o backup permanente `pre-go-2026-10-13` tem `expiresAt: None`
  (**nunca expira**), mas seu **`usedMB` ainda está em progresso** (observado **0 → 2 MB**),
  enquanto os backups anteriores têm `usedMB ≈ referencedMB`. **A restaurabilidade NÃO está
  verificada** — o teste definitivo é o **restore drill (T228)**, que deve usar um backup
  **materializado** e **não** confiar no rótulo `never`. A **T227** deve incluir `usedMB > 0` como
  critério de sucesso. Relatório:
  `docs/08-security/reports/railway-backup-retention-hardening-2026-10-13.md`.
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
