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
- **Backup pré-migration** (`migrate-production.yml`, P013): chama o script antes da migration, porém é
  **fail-open** (`|| echo "…continuando"`) — se o dump falha, a migration **prossegue**. Além disso, o
  secret `DATABASE_URL` do CI aponta para o **hostname interno** do Railway (**D-527**), inacessível
  dos runners → esse backup **não funciona hoje**.
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
- [ ] **T227** — alerta de falha de backup (lê o `BACKUP_STATUS_FILE`; padrão GitHub Issues).
      Base existe: critério por `pitr status`/cobertura + idade (o CLI não expõe campo de conclusão).
- [ ] **T239** — remover o volume órfão `postgres-restored` (50 GB provisionados) — **autorização do Operador**.
- [ ] **T229** — corrigir o **fail-open** do pré-migration (agora **pode** avançar: há backup confiável).
- [ ] **T241** (Opção B) — **sem caminho de CLI** (exige export de PII) → manter bloqueada/descartar.
- [ ] **T233** (opcional) — R2 como destino durável secundário portátil (read-only primeiro).
- [ ] **T235** (opcional) — decisão sobre habilitar **PITR** (já `enabled`; confirmar intenção/custo).
- [ ] **Config as Code** → migrar `railway.json` → `.railway/railway.ts` antes de **2026-12-01** (T242).
- [ ] P012 (staging) melhora o ensaio de DR · P013 corrige o secret `DATABASE_URL` do CI (D-527).
