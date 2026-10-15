# Remoção do volume órfão `postgres-restored` (T239) — aceita e **agendada**

**Data:** 2026-10-15 · **Tarefa:** T239 · **Fase:** F09-ci-cd-deploy
**Classificação:** **`DONE_WITH_ESCALATION`** — `VOLUME_DELETE_ACEITO_COM_EXCLUSAO_AGENDADA_PARA_2026-10-17`
**GO convites:** **SUSPENSO** (decisão do Operador)

> Autorização: `DECISAO_THINKER_OPERADOR_DELEGADO_POS_T248A_2026-10-15` — T239 **AUTORIZADA_COM_HARD_STOPS**.
> Regra dura aplicada: *"Se o delete succeed mas o volume ainda aparecer listado, tratar como
> falha/inconsistência e **não declarar DONE**."* → **escalado**, não declarado DONE.

---

## 1. Prechecks read-only (todos aprovados antes de qualquer mutação)

Executados com `railway volume list --json` (fonte **autoritativa** de anexação) e `railway status --json`:

| Precheck | Resultado |
|---|---|
| Existe **exatamente um** volume chamado `postgres-restored` | ✅ 1 |
| Está **desanexado** (`serviceName: null` / `Attached to: N/A`) | ✅ |
| **Nenhum serviço atual** monta esse volume | ✅ |
| **Não é** o volume do Postgres principal (esse é `postgres-volume`) | ✅ distinto |
| Tamanho/status compatíveis com a evidência anterior | ✅ **1274,25 MB usados / 50000 MB provisionados**, `Ready`, `deletedAt: null`, `isPendingDeletion: false` |
| Nenhuma divergência | ✅ **prosseguiu** |

**Nota de método (honestidade):** a checagem cruzada pelo `railway status --json` (`volumeInstances`)
**não é confiável** — ela reportou "nenhum volume" até para o serviço `Postgres`, que comprovadamente
monta `postgres-volume`. A fonte autoritativa é o campo **`serviceName`** do `railway volume list`
(é o que a plataforma usa para vincular `RAILWAY_VOLUME_MOUNT_PATH` a um serviço): para o órfão, `null`.

**Comando documentado** (descoberto via `railway volume delete --help`, sem inventar flags):

```
railway volume delete -v postgres-restored -y
```

(`-v/--volume` = ID/nome; `-y/--yes` = pula o diálogo. O `--help` também expõe `--2fa-code` para
modo não-interativo — **não foi necessário**: não houve pedido de 2FA.)

## 2. Execução

```
> Select a volume postgres-restored
Volume "postgres-restored" deleted
```

Sem erro, sem prompt de 2FA, sem contorno (nada de `--force`, API direta ou GraphQL write). O volume
foi alvo **pelo nome exato** — nenhum ID foi manipulado ou impresso.

## 3. ⚠️ Resultado real: exclusão **AGENDADA**, não imediata

A pós-listagem mostra que o volume **ainda consta** — com estado de exclusão pendente:

| Campo (JSON) | Antes | **Depois** |
|---|---|---|
| `name` | `postgres-restored` | `postgres-restored` |
| `serviceName` | `null` | `null` |
| `isPendingDeletion` | `false` | **`true`** |
| `deletedAt` | `null` | **`2026-10-17T13:26:50.492+00:00`** |
| `status` | `Ready` | `Ready` |

E na visão humana: **`Deletes on: Oct 17 2026 10:26 AM -03:00`**.

**Leitura:** o Railway aplica **carência (~48 h)** — a deleção foi **aceita e agendada** para
**2026-10-17 13:26 UTC**, quando o volume será efetivamente reclamado. Portanto:
**a limpeza está em curso, mas o recurso ainda ocupa os 50 GB provisionados até lá.** Esta é a razão
da classificação `DONE_WITH_ESCALATION` (o critério de DONE exigia **ausência** na pós-listagem).

## 4. Pós-checagem — nada da rede real de recuperação foi tocado

| Verificação | Resultado |
|---|---|
| Serviços do ambiente `production` | ✅ **`MEDIA Rate`, `Postgres`, `Redis`** (inalterados; o serviço de drill segue inexistente) |
| `postgres-volume` (volume principal) | ✅ intacto — 694 MB / 5000 MB, `Attached to: Postgres`, `isPendingDeletion: false` |
| `redis-volume` | ✅ intacto — 351 MB / 5000 MB, `Attached to: Redis` |
| **PITR** | ✅ **`enabled`**, bucket wired, **`Archiver: enabled`**, `Backup sets: 3`, `Restorable up to 2026-10-15 13:25:41Z` (≈1 min de atraso) |
| **Backups** | ✅ inventário íntegro (5 → **6** entradas: o **3º `Daily Schedule`** apareceu hoje ~12:49Z — é o schedule **funcionando**, não efeito do delete) |
| **Schedules** | ✅ `DAILY` (6 d) · `WEEKLY` (27 d) · `MONTHLY` (89 d) |
| Issues `backup-health-alert` | ✅ **nenhuma** |
| Runs do alerta | ✅ inalterados (dispatch + 2 agendados, todos `success`) |

**Nada além do volume autorizado foi alterado.** Sem tocar Postgres principal, Redis, MEDIA Rate,
backups, PITR, schedule, secrets, vars, networking, deploy, schema ou dados.

## 5. Registro da decisão T227-ext

Conforme `DECISAO_THINKER_OPERADOR_DELEGADO_POS_T248A_2026-10-15`:
**`T227_EXT = NAO_ACEITAR_RISCO_FORMAL`** — o alerta least-privilege cobre o sinal crítico para PITR
(arquivador de WAL); a cobertura de materialização do `Daily Schedule` / `Restorable up to` fica como
**risco residual formalmente aceito**, com monitores read-only e evidência periódica. **Nenhum token
Railway foi criado ou usado** (o `RAILWAY_TOKEN` amplo segue proibido). Registrado em
`GO_READINESS_CHECKLIST.md` e `BACKUP_DR.md`.

## 6. Confirmações (proibições respeitadas)

- **Única mutação:** a deleção do volume **exatamente nomeado** `postgres-restored`.
- **Nenhuma** outra deleção (serviço/backup/snapshot/volume); **nenhuma** alteração de PITR, schedule,
  backup, restore, lock, secrets, vars, billing, deploy, schema ou dados; **nenhuma** migration real.
- **Nenhum** `RAILWAY_TOKEN`; **nenhum** segredo novo; **nenhum** ID bruto/URL/token/connection
  string/PII impresso (saídas sanitizadas; o volume foi alvo **por nome**).
- **Não** aprovamos Production; **não** declaramos GO; **nenhum** BETA-GAP marcado como DONE.
- Diff do repositório: **docs-only**; contaminação `123ce28e` ausente.

## 7. Follow-up necessário (por que não é DONE)

1. **`2026-10-17T13:26Z`** — reconfirmar **read-only** que o volume **desapareceu** da listagem
   (novo ciclo docs-only curto). Só então a limpeza pode ser considerada concluída.
2. Se **não** desaparecer até lá, escalar como `VOLUME_DELETE_NAO_EFETIVADO` com evidência.
3. Monitores em aberto: latência efetiva do alerta (~4–6 h), throttling dos agendados, `Restorable
   up to`, `pre-go` lento, `railway.json` deprecado (→ **2026-12-01**).
