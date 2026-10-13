# Hardening de retenção de backup (T234) — evidência sanitizada + correção de escopo

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T234 · **Base:** `958aa4e3` (`origin/main`)
**Resultado:** **`DONE`** na **retenção** (opção 2 aplicada: janela máxima **89 d**) · **`DONE_WITH_ESCALATION`**
em um ponto: a **materialização do backup permanente ainda está em progresso** (`usedMB` 0 → 2 MB) — ver §4.
**GO: SUSPENSO.**

> Sanitização: nenhum token, cookie, connection string, `DATABASE_URL`, URL de download, **ID** de
> backup/volume/sessão, `externalId`, `creatorId` ou PII. Apenas nomes, datas, tamanhos e durações.
> **Nenhum** restore, **nenhum** delete, **nenhum** PITR, **nenhum** R2, **nenhuma** alteração de
> billing/segredos/vars/rede/domínio/deploy/schema/dados.

---

## 1. Contexto

A T232 ativou o backup (schedule **DAILY** + backup permanente) mas a **retenção default é 6 dias**,
abaixo do limiar de 7 d — escalado. A T234 normaliza a **janela de recuperação**.

## 2. Descoberta de sintaxe (por `help`, nada inventado)

| Comando | Achado |
|---|---|
| `postgres pitr schedule set --help` | **Sem flag de retenção** — apenas `--daily` / `--weekly` / `--monthly` / `--none` (**"any combination"**) |
| `postgres pitr backup lock --help` | `lock <ID>` — remove a expiração de um backup (mantém indefinidamente) |

⇒ a **opção 1** do packet (retenção ≥30 d por flag) **não existe no CLI**.

## 3. Mitigação aplicada — **opção 2** (schedules adicionais, sem remover o diário)

**Antes**

| KIND | CRIADO | RETENÇÃO |
|---|---|---|
| DAILY | 2026-10-13T02:52:50Z | 518400 s = **6 d** |

**Ação:** `railway postgres pitr schedule set --daily --weekly --monthly --service Postgres`
→ exit 0, `"Updated the backup schedule for Postgres: daily, weekly, monthly."`

**Depois**

| KIND | CRIADO | RETENÇÃO | Dias |
|---|---|---|---|
| **DAILY** | 2026-10-13T02:52:50Z | 518400 s | **6 d** (frescor preservado ✅) |
| **WEEKLY** | 2026-10-13T03:05:14Z | 2332800 s | **27 d** |
| **MONTHLY** | 2026-10-13T03:05:14Z | 7689600 s | **89 d** |

✅ **Daily preservado** (não houve troca que reduzisse o frescor — a CLI **acumula**).
✅ **Janela máxima: 89 dias** — **≥30 d** (objetivo "ideal" do packet atingido, por cadência mensal).
**PITR:** segue **`disabled`** (fora de escopo; T235).

## 4. ⚠️ Achado material que **corrige** a T232: backup permanente com `usedMB: 0`

`postgres pitr backup list --json` (campos seguros, IDs omitidos):

| Nome | Criado | `referencedMB` | **`usedMB`** | `expiresAt` |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | 128 | 65 | 2026-09-22 (expirado) |
| `Online resize to 5000MB` | 2026-10-07 | 483 | 413 | 2026-10-28 |
| **`pre-go-2026-10-13`** | **2026-10-13** | 630 | **0 → 2** (em progresso) ⚠️ | **`None` (never)** |

- O **registro** do backup existe, é **permanente** (`expiresAt: None`) e o `create` retornou `ok`
  (`postgres history`). ✅
- **`usedMB` está EM PROGRESSO:** observado **0 → 2 MB** em ~30 min (primeira leitura 0, depois 2),
  enquanto os dois backups anteriores têm `usedMB ≈ referencedMB` (65/128 e 413/483).
  Ou seja: **o job não está travado** — está **materializando lentamente** (ou contabilizando apenas
  blocos novos/`used` de um snapshot de volume). **A conclusão ainda NÃO pode ser "restaurável".**
- **Consequência honesta:** a afirmação da T232 — *"o penhasco de 2026-10-28 foi eliminado"* — vale
  para o **registro** (existe backup que nunca expira), **mas a restaurabilidade ainda não está
  provada**. Um backup permanente que ainda **não** tem payload completo é uma **garantia não
  verificada** — exatamente o tipo de falsa segurança que o próprio `scripts/backup-db.sh` alerta
  para evitar ("um backup que finge sucesso é pior que nenhum").
- **Ação recomendada:** **T227 (alerta)** com prioridade **alta** e **`usedMB > 0`** como critério de
  sucesso (e alerta se estagnar); **T228 (restore drill)** é o teste **definitivo** — deve usar um
  backup **materializado**, **não** confiar no rótulo `never`.

## 5. Classificação (GO readiness)

**`BACKUP_RETENCAO_MAXIMA_SUPORTADA_GE7D`** — janela **89 d (monthly) / 27 d (weekly)** + **6 d (daily)**.

Ressalva anexada: **restaurabilidade do backup permanente não evidenciada** (`usedMB: 0`) → tratada como
**item de risco aberto** para T227/T228 (não bloqueia a T234, mas **não** pode passar em silêncio).

## 6. Thresholds recomendados para a T227 (alerta de falha)

| Sinal | Threshold sugerido |
|---|---|
| Último backup **daily** com sucesso | > **24–36 h** sem novo → alerta |
| Último **weekly** | > **8 d** → alerta |
| Último **monthly** | > **32 d** → alerta |
| **Qualquer** backup `never` com `usedMB = 0` | **alerta** (registro sem payload = falsa garantia) |
| Retenção efetiva | < **7 d** → alerta (regressão de policy) |
| `schedule list` vazio | alerta (perda de automação) |

## 7. Próximos passos

**T227** (alerta — agora com prioridade alta, incluindo `usedMB>0`) → **T228** (restore drill **usando
backup materializado**) → **T229** (fail-closed) → **T235** (PITR, decisão do Operador) →
**T233** (R2, opcional) → **Deploy Production** → **GO_CONVITES**.

## 8. Confirmações

- **Nenhum** restore, delete, lock, PITR, R2, billing, segredo, var, rede, domínio, deploy ou código.
- **Nenhum** ID/`externalId`/`creatorId`/URL/segredo/PII impresso; **nenhum** alerta interagido.
- Diff restrito a **docs**; contaminação `123ce28e` ausente.
- **GO para convites: permanece SUSPENSO.** Nenhum BETA-GAP marcado como DONE.

---

## 9. Referências

`docs/08-security/reports/railway-pro-backup-activation-2026-10-13.md` (T232) ·
`docs/08-security/reports/railway-cli-backup-evidence-2026-10-13.md` (T230) ·
`docs/06-devops-deployment/BACKUP_DR.md` · CLI `railway` (`postgres pitr schedule|backup`).
