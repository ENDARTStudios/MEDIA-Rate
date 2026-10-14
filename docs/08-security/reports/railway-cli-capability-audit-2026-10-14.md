# Auditoria de capacidade do Railway CLI (T242) — read-only, contexto PRO

**Data:** 2026-10-14 · **Tarefa:** T242 · **Modo:** 100% read-only (nenhuma mutação)
**Classificação:** `CAMINHO_SEGURO_DE_VERIFICACAO_EXISTE` · `DRILL_JA_PROVADO_D594` ·
`RESIDUO_ORFAO_VOLUME_POSTGRES_RESTORED` · `DRIFT_T228_vs_D594`
**GO convites:** **SUSPENSO** (decisão do Operador)

> Escopo: responder, com o Railway **PRO** confirmado pelo Operador, se existe caminho de
> CLI **sem produção, sem custo não autorizado e sem export de PII** para (a) verificar
> materialização/status de backup e (b) preparar o restore drill. Nenhuma operação mutante
> foi executada; nenhum ID/URL/segredo/PII foi impresso.

---

## 1. Contexto e método

O Operador confirmou **Railway PRO**. Isso supera tecnicamente o bloqueio anterior de plano
(*"Manual backups and backup schedules are only available for Pro workspaces"*), **sem**
autorizar por si só custo, produção, PII ou restore drill.

Descoberta feita com comandos **read-only**: árvore de `railway --help` / `railway postgres --help`
/ `railway postgres pitr --help` (e subcomandos), `pitr status`, `pitr backup list --json`,
`pitr schedule list`, `postgres history --json` (trilha **local**), `usage --json`, `volume list`,
`service list`, `sandbox list`, `status --json`.

Nada foi restaurado, criado, alterado, deletado ou bloqueado: **zero mutação**. R2 não usado;
PITR/schedule intocados; nenhum alerta (CodeQL/Trivy/secret scanning) interagido.

---

## 2. Inventário de capacidade do CLI

| Comando | Tipo | Custo/risco |
|---|---|---|
| `postgres pitr status` | **read-only** | zero — cobertura viva (archiver, `Restorable up to`, WAL, backup sets) |
| `postgres pitr backup list --json` | **read-only** | zero — inventário (`usedMB`/`referencedMB`/`expiresAt`/`scheduleId`) |
| `postgres pitr schedule list` | **read-only** | zero |
| `postgres history --json` | **read-only** (local, sem rede) | zero — trilha de auditoria das operações feitas nesta máquina |
| `usage --json`, `volume list`, `service list`, `sandbox list`, `status --json` | **read-only** | zero |
| `pitr enable` / `disable` | mutação de config | risco de comportamento/custo |
| `pitr schedule set` | mutação de config | — |
| `pitr backup create` / `delete` / `lock` | mutação de dados de backup | — |
| `pitr restore --at` | **cria serviço novo** | **billable** |
| `pitr backup restore <ID>` | **in-place** (sobrescreve o alvo) | **destrutivo** |
| `volume delete` / `service delete` | mutação de recurso | — |

**Ausente (não existe flag nem comando):**
- **dry-run / preview / verify** de backup ou restore;
- **download/export** de backup — **não há `pitr backup download`**.

→ A **Opção B** (dump portátil → Postgres local/efêmero) **não é implementável pelo CLI**:
não há como extrair o dump do Railway sem `pg_dump` contra a produção (leitura de produção +
**PII**). Isso confirma a restrição da **T241**.

Há `railway sandbox` (ambientes efêmeros, **experimental**), mas **não** é alvo de restore de
Postgres — `pitr restore` só entrega "**into a new service**".

---

## 3. Achado 1 — o restore drill **já foi executado e APROVADO** (D-594)

A trilha local (`railway postgres history`) registra, **a partir desta máquina**:

```
2026-10-13T03:57:36Z  postgres pitr restore --at 2026-10-13T03:33:42Z
                      --new-service-name pitr-drill-20261013 -y   → success: true
```

Corroborado por duas fontes versionadas no repositório:
- `worklog.md` — *"T211 (continuação 12) — drill de restauração APROVADO: PITR restaurável de ponta a ponta (D-594)"*.
- `DECISOES.md` — **D-594**: comparação exata produção × restaurado:

| Métrica | Produção | Restaurado |
|---|---|---|
| Tamanho do banco | 190 MB | **190 MB** |
| Tabelas em `public` | 40 | **40** |
| `midia` | 17.268 | **17.268** |
| `episodio` | 131.743 | **131.743** |
| `media_score` | 16.667 | **16.667** |
| `temporada` | 6.346 | **6.346** |
| `usuario` | 198 | **198** |

O serviço irmão foi removido depois com `railway service delete --service pitr-drill-20261013 -y`
(**escopado por nome** — `railway delete` apagaria o projeto inteiro e foi evitado). Caminho
**não destrutivo**: a origem não foi tocada.

**Confirmado agora, read-only:** **nenhum** serviço `pitr-drill*` existe (só `production`;
serviços = `Redis`, `Postgres`, `MEDIA Rate`).

→ **Restaurabilidade está provada.** Implicação direta: **T240 (drill temporário) tende a ser
desnecessária** — a capacidade já foi exercida com sucesso no caminho seguro. Decisão do Operador.

---

## 4. Achado 2 — resíduo órfão com custo: volume `postgres-restored`

`railway volume list` (projeto MEDIA Rate / `production`):

| Volume | Anexado a | Uso | Status |
|---|---|---|---|
| `postgres-volume` | `Postgres` | ~0,69 GB / 4,9 GB | Ready |
| **`postgres-restored`** | **N/A** | **~1,27 GB / 50 GB provisionados** | **Ready** |
| `redis-volume` | `Redis` | ~0,35 GB / 4,9 GB | Ready |

O `service delete` removeu o **serviço** de drill, mas **não** o **volume** dele. Fica um volume
**desanexado** (`Attached to: N/A`) com **50 GB provisionados** — **storage billable**.

→ **A T239 deixou de ser hipotética**: há limpeza real pendente.
→ **Não removido nesta tarefa** (deletar recurso é proibido sem autorização). Requer decisão do
Operador (`railway volume delete` — operação irreversível, precisa de confirmação explícita).

---

## 5. Achado 3 — drift documental (T228 × D-594)

O relatório `railway-restore-drill-2026-10-13.md` (T228, merge `d5ac2b7e`) conclui
**"restaurabilidade NÃO provada"** e "nada foi executado", enquanto o **D-594** (mesmo dia,
T211 cont. 12) registra o drill **executado e aprovado**.

Reconciliação honesta: a afirmação da T228 é verdadeira **no escopo** — *o agente da T228* não
executou nada. Mas a **conclusão de estado** ("não provada") foi **superada** pelo D-594, que é
anterior em horas. Correção aplicada neste ciclo (nota no topo do relatório T228 +
`GO_READINESS_CHECKLIST.md` + `BACKUP_DR.md`).

---

## 6. Achado 4 — não existe caminho de restore sem custo/produção/PII

- `pitr restore --at` → **sempre cria SERVIÇO NOVO**; flags: `--at`, `--new-service-name`,
  `--source-repo-path`, `-y`. **Sem** dry-run e **sem** alvo existente.
- `pitr backup restore <ID>` → **in-place** (sobrescreve os dados do banco alvo); o `--help`
  **não** avisa (documentado em docs oficiais do Railway).
- **Sem** `download/export` de backup → qualquer drill **local** exige ler a produção (**PII**).

→ Mantém **T240** sujeita a autorização de custo e **T241** bloqueada (PII) — ainda que, na
prática, o drill já tenha sido feito (Achado 1).

---

## 7. Achado 5 — dados de custo (subsidiam a decisão)

`railway usage --json` (período corrente, workspace):

| Item | US$ (período corrente) |
|---|---|
| **Backup** | **≈ 0,014** |
| Volume | ≈ 0,092 |
| Memory | ≈ 1,959 |
| CPU | ≈ 0,058 |
| Egress | ≈ 0,033 |
| **Bill corrente** | **≈ 2,16** (estimado ≈ 9,06) |

→ PITR/backup tem custo **desprezível** hoje → subsídia **`ACEITO_CUSTO_PITR = SIM`**. O item de
custo mais relevante a eliminar é o **volume órfão de 50 GB provisionados** (Achado 2).

---

## 8. Achado 6 — depreciação de Config as Code

O CLI avisa: `railway.json` / `railway.toml` estão **deprecados**; migrar para
`.railway/railway.ts` via `railway config migrate` — *"Existing files keep working until
**2026-12-01**"*. Sem ação nesta tarefa → **monitor** (prazo 2026-12-01).

---

## 9. Estado read-only observado (2026-10-14)

- **PITR:** `enabled`, **bucket wired: yes**, HA cluster: no.
- **Cobertura viva:** `Archiver: enabled`, **Backup sets: 2**, `Latest backup 2026-10-14T03:34:03Z`,
  WAL contínuo, **`Restorable up to 2026-10-14 22:46:48Z`**.
- **Schedule:** DAILY + WEEKLY + MONTHLY ativos. **2 backups agendados materializados**
  (`Daily Schedule` de 2026-10-13 e 2026-10-14 — ~130 MB usados de ~670 MB, expirando a cada ~6-7 d)
  → **a automação produz backups**; o achado "o schedule ainda não produziu backup" (T236) está
  **superado**.
- `pre-go-2026-10-13`: ainda `EM_PROGRESSO` **lento** (~107 / 630 MB), `expiresAt: None`.
- **Mitigação vigente:** `Online resize to 5000MB` **materializado** (413/483 MB) até **2026-10-28**.

**Recipe read-only de verificação (para o runbook / monitor):**

```bash
railway postgres pitr status --service Postgres   # cobertura viva + "Restorable up to"
railway postgres pitr backup list --service Postgres --json
railway postgres pitr schedule list --service Postgres
```
(zero custo, zero mutação, sem PII — só metadados de backup.)

---

## 10. Conclusão

1. **Verificação de materialização/status tem caminho seguro** (read-only, zero custo):
   `pitr status` "Live coverage" + `backup list` + `history`. **Usado nesta tarefa.**
2. **Execução de drill não tem caminho sem custo/produção/PII** —, mas **o drill já foi feito e
   provado** (D-594, caminho não destrutivo do serviço irmão).
3. **Há resíduo billable** (volume `postgres-restored`, 50 GB provisionados) → **T239 concreto**.
4. **GO continua SUSPENSO** — a decisão de destravar convites é do Operador.

---

## 11. Recomendações objetivas ao Operador

1. **Autorizar a limpeza** do volume órfão `postgres-restored` (**T239**) — é o único item de
   custo material em aberto e é irreversível (exige confirmação explícita).
2. **Encerrar ou reescopar a T240**: o drill já foi provado em D-594; um "re-drill periódico"
   faria mais sentido que um drill de estreia.
3. **T241 (Opção B)** segue **sem caminho de CLI** (exige export de PII) → manter bloqueada ou
   descartar.
4. **T227/T229**: com a restaurabilidade provada, existe base para o critério de "backup
   restaurável"; resta decidir se o sinal de sucesso usa `pitr status`/cobertura + idade (o CLI
   não expõe campo de conclusão de backup).
5. **Runbook (D-594):** registrar que a recuperação usa **PITR restore (serviço irmão)** e que o
   **backup de volume é in-place**; acompanhar periodicamente `Restorable up to` (§9).
6. **Config as Code:** migrar `railway.json` → `.railway/railway.ts` antes de **2026-12-01**.

---

## 12. Não-mutações e sanitização (declaração)

- **Nenhum** restore executado; **nenhum** serviço/volume/ambiente criado, alterado ou deletado;
  **nenhum** backup criado/deletado/lockado; **nenhum** schedule/PITR alterado; **nenhum** deploy
  ou aprovação; R2 não usado.
- **Nenhum** ID bruto, `externalId`, `creatorId`, URL, connection string, segredo ou PII impresso
  (nomes de recursos — `Postgres`, `MEDIA Rate`, `Redis`, `postgres-restored`, bucket `Postgres-PITR`
  — são identificadores não sensíveis).
- **Nenhum** alerta de code scanning/secret scanning interagido.
- Diff **docs-only**; contaminação `123ce28e` ausente.
