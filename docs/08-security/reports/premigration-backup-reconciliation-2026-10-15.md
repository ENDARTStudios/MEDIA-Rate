# Reconciliação do backup pré-migration (T229) — remoção do falso controle

**Data:** 2026-10-15 · **Tarefa:** T229 · **Fase:** F09-ci-cd-deploy
**Classificação:** **`PRE_MIGRATION_BACKUP_DECORATIVO_REMOVIDO`**
**GO convites:** **SUSPENSO** (decisão do Operador)

> Contexto: **T227 aprovada** (alerta de falha de backup implementado e provado). O gargalo
> restante era a **falsa garantia** do passo de backup pré-migration do workflow de migration.

---

## 1. O problema (por que era falso controle)

`.github/workflows/migrate-production.yml` tinha o passo:

```bash
echo "[migrate] Iniciando backup antes da migration..."
bash ../../scripts/backup-db.sh "$DATABASE_URL" || echo "[migrate] Backup via script indisponível — continuando com migration."
```

Três defeitos somados:

1. **Fail-open** — `|| echo "…continuando com migration"`: se o dump falhasse, a migration
   **prosseguia**. O passo nunca impediu nada.
2. **Inoperante a partir do CI** — o secret `DATABASE_URL` do GitHub é o **hostname interno** do
   Railway (D-527), **inacessível** dos runners do GitHub. O dump sempre falhava e o `||` engolia.
3. **Contradiz o próprio script** — o cabeçalho de `scripts/backup-db.sh` diz textualmente:
   *"Em produção, rodar por um agendador NO AMBIENTE DA PLATAFORMA … **NÃO usar runner externo/CI**:
   o hostname interno do banco não é alcançável de fora (D-527)."*

Ou seja: **um controle que não protege, não roda e é desmentido pelo script que ele chama** — mas
que passa a impressão de haver backup antes de mexer no banco.

## 2. Mapa de dependências (o que quebraria se removesse)

| Referência | O que é | Depende do passo de CI? |
|---|---|---|
| `deploy.yml` | só um **comentário** citando que a migration saiu do push path | **não** |
| `scripts/ci/migration-safety.mjs` (gate B1) | exige **plano de rollback** no PR + label + declaração; não olha backup | **não** |
| `scripts/ci/migration-destructive-guard.mjs` | guarda de DDL destrutivo | **não** |
| `runbooks/migration-manual.md` | caminho **manual pelo console do Railway** (dentro da rede) | **não** — usa `backup-db.sh` no console, não no CI |
| `b1-prod-guards.md` §3 | compara caminhos; recomenda console | **não** |
| `BACKUP_DR.md` / `VERIFICACOES_OPERACIONAIS.md` | descrevem o passo (a doc é o que muda aqui) | **não** |

**Nenhum** workflow, script, guarda de CI ou automação consome o passo. Não havia dependência oculta.

## 3. Opções consideradas

| Opção | Veredito |
|---|---|
| **A — Remover o passo** e documentar a rede real | ✅ **ESCOLHIDA** (preferida pelo packet) |
| **B — Manter como "best-effort explícito"** | ❌ inferior: mantém ruído e a mesma inoperância; só reetiqueta |
| **C — Tornar fail-closed** | 🚫 **PROIBIDO pelo packet** — bloquearia migrations por um caminho que **nunca funcionou**, transformando decoração em bloqueador de deploy |

## 4. Decisão e diff

**Removido** o passo `Backup antes da migration (T9.4 / T026 — segurança)` do
`.github/workflows/migrate-production.yml`; o job passou de `(backup + apply + verify)` para
`(apply + verify)`.

**Adicionado** um bloco de comentário no topo do workflow registrando: (i) que o passo foi removido
e **por quê**; (ii) que a rede de segurança real é **PITR `enabled` + arquivador de WAL monitorado
pelo alerta (T227) + backups agendados materializados + restore provado (drill D-594)**; (iii) que
um backup pré-migration de fato pertence ao **caminho manual** (console do serviço, dentro da rede),
nunca ao CI.

Nenhuma outra etapa foi tocada: `checkout`, `setup-node`, `npm ci`, `prisma generate`,
`prisma migrate deploy` e `prisma migrate status` permanecem **idênticos**.

## 5. Impacto em migration / rollback

- **Nada de proteção real foi perdido:** o passo nunca protegeu (fail-open) nem executou (hostname
  interno). O dump portátil continua disponível como **ferramenta manual** (`scripts/backup-db.sh`
  + `BACKUP_UPLOADER`), usado pelo runbook no console.
- **Migrations automáticas não são afetadas:** o caminho normal é o entrypoint do container
  (`prisma migrate deploy` no boot do deploy) — este workflow é `workflow_dispatch` e **não** roda no
  push.
- **O workflow segue inoperante de fora** (D-527) — isso é um fato **anterior** e independente desta
  mudança; permanece documentado no topo do arquivo e no runbook.
- **Rollback:** o gate B1 continua exigindo plano de rollback no PR; a recuperação de dados usa a
  trilha real (PITR/arquivador + restore provado), não um dump pré-migration.

## 6. Verificação

| Verificação | Resultado |
|---|---|
| YAML do workflow | parse ok; passos = checkout, setup-node, npm ci, generate, **apply**, verify |
| `scripts/ci/migration-safety.mjs --self-test` | **10/10 ok** |
| `scripts/ci/migration-destructive-guard.mjs --self-test` | **6/6 ok** |
| `scripts/ci/automation-safety.self-test.mjs` | ✓ política íntegra (T096) |
| `backup-db.sh` executável restante no workflow | **nenhum** (só menção em comentário) |

## 7. Confirmações (proibições respeitadas)

- **Não** tornei o caminho fail-closed (proibido); **removi** o passo.
- **Não** usei `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID` ou `RAILWAY_SERVICE_ID`.
- **Nenhum** segredo novo, custo, recurso, volume, serviço ou permissão.
- **Nenhuma** mutação: PITR/schedule/backup/restore/delete/lock intocados; sem migration real
  executada; sem produção escrita; sem tocar o volume órfão `postgres-restored` (**T239**).
- **Nenhum** segredo/ID/URL/PII impresso; nenhum alerta de code/secret scanning interagido.
- **Não** declarei GO; deploy `waiting` em Production **não** aprovado.

## 8. Próximos passos (decisão do Operador)

- **T239** — remover o volume órfão `postgres-restored` (50 GB provisionados; irreversível).
- **T227-ext** — cobrir materialização do `Daily Schedule`/`Restorable up to` (exigiria token
  Railway **escopado**; o `RAILWAY_TOKEN` amplo continua **recusado**).
- **T245** — migrar Config as Code (`railway.json` → `.railway/railway.ts`) até **2026-12-01**.
- **T233** — R2 como destino durável portátil (read-only).
- Deploy Production (aprovar) · GO convites (declaração formal).
