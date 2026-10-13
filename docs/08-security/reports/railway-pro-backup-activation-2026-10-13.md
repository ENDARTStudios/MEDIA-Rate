# Ativação de backup via Railway PRO (T232) — evidência sanitizada

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T232 · **Base:** `23e4115c` (`origin/main`)
**Resultado:** **`DONE_WITH_ESCALATION`** — **schedule diário ativo** e **backup on-demand criado**;
**escalonamento** por **retenção default de 6 dias** (abaixo do limiar de 7 d do packet). **GO: SUSPENSO.**

> Sanitização: nenhum **ID** de backup/projeto/serviço, workflow, URL de download, token, cookie,
> connection string, `DATABASE_URL` ou PII. Apenas **nomes, datas, tamanhos, estados** e a retenção.
> **Nenhum** restore, **nenhum** delete, **nenhum** PITR habilitado, **nenhuma** alteração de
> billing/segredos/vars/rede/domínio/deploy/schema/dados.

---

## 1. Entrada do Operador (informação, não evidência)

O Operador declarou: **"Railway PRO ativado. Vercel PRO ativado."** — tratado como **autorização/estado**,
**verificado por CLI** antes de qualquer conclusão (§3).

---

## 2. Verificação de pré-condições (sanitizada)

| Verificação | Resultado |
|---|---|
| CLI | `railway` **v5.47.1** |
| Sessão | **autenticada** (identidade omitida) |
| Serviço do banco | **`Postgres`** · ambiente **`production`** |
| Sintaxe | descoberta via `help` (nenhuma flag inventada) |

---

## 3. Estado ANTES → DEPOIS

### 3.1 PITR — `postgres pitr status`

| Campo | Antes | Depois |
|---|---|---|
| Status | `disabled` | **`disabled`** (inalterado — **não** habilitado, por escopo) |
| HA cluster | `no` | `no` |
| Bucket wired | `no` | `no` |

### 3.2 Schedule — `postgres pitr schedule list` / `set --daily`

**Antes:** `No backup schedule configured for Postgres.`

**Ação:** `railway postgres pitr schedule set --daily --service Postgres` → exit 0,
`"Updated the backup schedule for Postgres: daily."`

**Depois:**

| KIND | NAME | CRIADO | RETENÇÃO |
|---|---|---|---|
| **DAILY** | `Daily` | 2026-10-13T02:52:50Z | **518400 s = 6 dias** ⚠️ |

### 3.3 Backups — `postgres pitr backup list`

| Nome | Criado | Tamanho | Schedule | Expira |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | 65 MB | `manual` | 2026-09-22 (expirado) |
| `Online resize to 5000MB` | 2026-10-07 | 413 MB | `manual` | **2026-10-28** |
| **`pre-go-2026-10-13`** | **2026-10-13** | em conclusão | `manual` | **`never`** ✅ |

**Ação:** `railway postgres pitr backup create --name pre-go-2026-10-13 --service Postgres` → exit 0,
`"Started an on-demand backup for Postgres."` (assíncrono; a entrada aparece em `backup list`).

**PRO confirmado por CLI:** os comandos que antes falhavam com
*"only available for **Pro workspaces**"* agora **executam com sucesso**.

---

## 4. Impacto no risco (o que mudou de verdade)

1. **Penhasco de 2026-10-28 ELIMINADO:** o backup `pre-go-2026-10-13` tem expiração **`never`** — passa a
   existir um backup **permanente**. Mesmo que o backup de 2026-10-07 expire, **não** ficamos sem retenção.
2. **Automação ativa:** schedule **DAILY** configurado → não depende mais de ação manual recorrente.
3. **⚠️ Retenção curta:** o default da plataforma é **6 dias** (518400 s). Isso cobre falhas recentes, mas
   **não** cobre corrupção de descoberta tardia (> 6 dias). O packet prevê escalonamento para retenção
   `< 7 d` → **registrado** (§6). `schedule set` **não expõe flag de retenção**; a retenção é do provedor.
4. **PITR continua `disabled`** — recuperação point-in-time é decisão separada (**T235**), com possível
   custo/armazenamento contínuo.

---

## 5. Classificação (GO readiness)

**`BACKUP_AUTOMATICO_ATIVO_SE_CONFIRMADO`** — *com escalonamento de retenção (6 d < 7 d)*.

- Automação: **ATIVA** (DAILY) · Backup permanente: **SIM** (`pre-go`, `never`) ·
  Alerta de falha: **PENDENTE (T227)** · Restore drill: **PENDENTE (T228)** ·
  Fail-open pré-migration: **PENDENTE (T229)** · PITR: **desligado (T235, opcional)**.

---

## 6. Escalonamento (decisões do Operador)

| Item | Por quê |
|---|---|
| **Retenção de 6 dias** | Abaixo do limiar de 7 d. Opções: **adicionar `--weekly`/`--monthly`** ao schedule (a CLI aceita combinação: `set --daily --weekly --monthly`) para estender a janela, **ou** habilitar **PITR** (T235), **ou** manter 6 d e registrar o limite. **Não executei** — o packet autorizou `--daily` e mandou **escalar** o caso `< 7 d`. |
| **T233 — R2 como destino durável secundário** | Camada portátil independente do provedor (read-only primeiro). |
| **T235 — habilitar PITR** | Continuous backup: pode ter custo/armazenamento/comportamento próprio. |

---

## 7. Próximos passos (não iniciados)

**T227** alerta de falha de backup (lê o `BACKUP_STATUS_FILE` do script; padrão GitHub Issues) →
**T228** restore drill em ambiente seguro (RTO medido) → **T229** fail-closed no pré-migration →
**Deploy Production** (aprovação humana) → **GO_CONVITES** (declaração formal).

*Nota:* o `scripts/backup-db.sh` (T226) permanece como **complemento portátil** — o destino durável dele
(`BACKUP_UPLOADER`) pode vir a ser o R2 (T233), mas **não** é necessário para o backup primário, que
agora é gerenciado pela plataforma.

---

## 8. Confirmações

- **Nenhum** restore, delete, lock, PITR, R2 ou alteração de billing/segredos/vars/rede/domínio/deploy.
- **Nenhum** segredo/PII/ID completo/URL de download impresso.
- **Nenhum** alerta (CodeQL/Trivy/secret scanning) interagido; **nenhum** workflow de backup criado
  (o caminho correto é o gerenciado da plataforma).
- **Vercel PRO:** *apenas observado* — nenhum setting alterado; se o rate limit de build não se repetir
  em PRs futuros, o **Monitor** fecha.
- Diff restrito a **docs**; contaminação `123ce28e` ausente.
- **GO para convites: permanece SUSPENSO.** Nenhum BETA-GAP marcado como DONE.

---

## 9. Referências

`docs/08-security/reports/railway-cli-backup-evidence-2026-10-13.md` (T230 — estado pré-PRO) ·
`docs/08-security/reports/backup-automation-minimum-2026-10-13.md` (T226) ·
`docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md` (T225) ·
`docs/06-devops-deployment/BACKUP_DR.md` · CLI `railway` v5.47.1 (`postgres pitr *`).
