# Verificação PRO de backup/DR (Vercel + Railway) — evidência sanitizada

**Data:** 2026-10-13 · **Base:** branch `chore/t234-railway-backup-retention-hardening` · **Escopo:**
verificação read-only do estado PRO nas duas plataformas, executada durante a T211/D-592.
**Nenhum** restore, delete, PITR, R2, alteração de billing/segredos/vars/rede/domínio/schema/dados
ou deploy de produção. **Nada de token, cookie, connection string, URL de download, ID de
backup/volume/sessão ou PII** — apenas nomes, datas, tamanhos e durações.

## 1. Item pendente do T234 — RESOLVIDO

| Backup | Criado | `referencedMB` | `usedMB` | Expira |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | 128 | 65 | 2026-09-22 (expirado) |
| `Online resize to 5000MB` | 2026-10-07 | 483 | 413 | 2026-10-28 |
| **`pre-go-2026-10-13`** | 2026-10-13T02:53Z | **630** | **3** | **`never`** |

O relatório da T234 registrava `usedMB` 0 → 2 "em progresso". Agora está **3 MB e sem expiração**:
a materialização concluiu. `referencedMB` 630 é coerente com o disco real do Postgres medido por
`railway metrics` (**646 MB** de 4,88 GB, 13%). A leitura correta é **deduplicação**: `usedMB` é o
bloco novo atribuível a este backup; `referencedMB` é o volume de dados que ele referencia.

## 2. Bloqueio real do PRO no Railway: PITR não está utilizável

`railway postgres pitr status --service Postgres` → **`Status: disabled`**, **`Bucket wired: no`**,
`HA cluster: no`.

- `railway postgres pitr enable` **não aceita credenciais de bucket** (flags: `--no-deploy`,
  `--service`, `--environment`, `--project`, `--json`) → o bucket precisa estar ligado **antes**,
  pela plataforma.
- O serviço **Postgres** não possui nenhuma variável de bucket/S3 (28 variáveis; nenhuma casa com
  `R2|S3|BUCKET|AWS|BACKUP|PITR`).
- As credenciais `R2_*` existentes estão no projeto **web** da Vercel (ambiente Preview), não no
  serviço de banco — sinal de preparação incompleta, não de bucket ligado.

Consequência: **recuperação contínua / PITR — o recurso de DR mais forte do plano — segue
indisponível**, e o `GO` da trilha continua corretamente suspenso por esse motivo.

## 3. Raio de impacto do restore não é documentado pelo CLI (não exercido)

| Comando | Texto do CLI | Leitura |
|---|---|---|
| `postgres pitr restore` | "Restore to a point in time **into a new service**" | não destrutivo e explícito |
| `postgres pitr backup restore <ID>` | "Restore from a backup" (aceita `--service`, `-y`) | **não diz** se cria serviço novo ou sobrescreve o existente |

Enquanto isso não for validado, **não é possível afirmar que o backup de 3 MB é restaurável** —
e a validação **não** deve ser feita em produção. Caminho seguro: projeto Railway de descarte,
restore do backup lá, verificação de integridade (contagens/tabelas) e descarte do serviço.

## 4. Higiene de ambiente (Vercel, projeto web)

Segredos presentes que o web **não usa** (grep em `apps/web`: 10 de 11 sem nenhuma referência):
`PGHOST`, `PGDATA`, `PGUSER`, `PGPASSWORD`, `POSTGRES_DB`, `DATABASE_PUBLIC_URL`,
`REDIS_PUBLIC_URL`, `REDISUSER`, `ADMIN_TOKEN`, `COOKIE_SECRET` (só `ANALYTICS_WRITE_KEY` é usado).
São cifrados, mas configuram superfície desnecessária. **Não removidos** nesta verificação.

## 5. Próximos passos propostos (nenhum executado)

1. Ligar bucket de objeto (R2/S3) ao serviço Postgres → `pitr enable` → `pitr status` confirmar
   `enabled` + `Bucket wired: yes`.
2. Validar restaurabilidade **fora de produção** (projeto de descarte) com o backup permanente.
3. Só então reavaliar o `GO` da trilha de backup/DR.
4. Higiene: remover do projeto web as variáveis não usadas (após confirmar não uso dinâmico).
---

## 6. Ações executadas (autorizadas pelo operador em 2026-10-13)

### 6.1 PITR habilitado no Postgres de produção ✅

`railway postgres pitr enable --service Postgres` → _"Enabled and deployed PITR for Postgres in
environment production"_.

| Verificação | Resultado |
|---|---|
| `pitr status` | **`enabled: true`**, **`bucketWired: true`**, `isHaCluster: false` |
| Bucket criado pelo fluxo | **`Postgres-PITR`** (nenhum bucket manual foi criado) |
| Variáveis de arquivamento no serviço | **`WAL_ARCHIVE_BUCKET`, `WAL_ARCHIVE_ENDPOINT`, `WAL_ARCHIVE_KEY`, `WAL_ARCHIVE_PATH`, `WAL_ARCHIVE_REGION`, `WAL_ARCHIVE_SECRET`** |
| Schedules da T234 | **intactos** — DAILY 518400 s (6 d), WEEKLY 2332800 s (27 d), MONTHLY 7689600 s (89 d) |
| API após o redeploy do banco | `/health` **200** (`uptime` seguiu crescendo: o serviço de API não reiniciou) |
| Leitura real de banco | `https://mediarate.app/pt-BR/catalog` **200, 214,6 KB** |
| Histórico do CLI | todas as operações `ok` |

**Semântica (doc oficial):** o PITR arquiva WAL continuamente via pgBackRest (full semanal +
diferencial diário, ~4 semanas de janela) para o bucket. **A janela não é retroativa** — começa a
contar do primeiro base backup após o enable (automático, disparado pelo watcher do container).
**Custo:** sem taxa própria de PITR; paga-se armazenamento do bucket + egress de upload dos
segmentos comprimidos (banco ocioso ≈ quase zero).

### 6.2 Higiene de ambiente no projeto web (Vercel) ✅

Removidas **11 variáveis** sem nenhuma referência no código do web (grepeado em `src`, `test`,
`scripts`, `e2e`, case-insensitive) e sem nenhuma lib de banco/Redis no `apps/web`:
`PGHOST`, `PGDATABASE`, `PGDATA`, `PGUSER`, `PGPASSWORD`, `POSTGRES_DB`, `DATABASE_PUBLIC_URL`,
`REDIS_PUBLIC_URL`, `REDISUSER`, `ADMIN_TOKEN`, `COOKIE_SECRET` — em `production` e `preview`
(onde existiam).

Auditoria final pela API da Vercel (`/v10/projects/…/env`, 116 entradas): **nenhuma** das removidas
permanece; seguem presentes `REVALIDATE_SECRET`, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_ANALYTICS_WRITE_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`,
`SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

**Achado colateral (funcional, não corrigido):** `POSTHOG_PERSONAL_API_KEY` e `POSTHOG_PROJECT_ID`
não existem em `production` → `plataformaParaRequest()` cai no `false` do `buscarFlag()` sem
consultar a flag, e **o hook `x-mr-platform` é constante** (`vercel`) — o rollout do dual-deploy
(D-507) está inerte por credencial ausente, não por avaliação da flag. Coerente com o default OFF,
mas convém registrar como decisão explícita.

## 7. Pendência honesta que permanece

1. **Validar restaurabilidade fora de produção** (projeto Railway de descarte): `pitr backup
   restore <ID>` **não documenta** no CLI se cria serviço novo ou sobrescreve o existente — não
   deve ser exercido contra produção.
2. Confirmar, na aba Backups, a chegada do **primeiro base backup** (a janela de restauração só
   passa a existir a partir dele; o enable não é retroativo).
3. Reavaliar o `GO` da trilha só depois de (1) e (2).

---

## 8. Drill de restauração executado e APROVADO (2026-10-13) ✅

**Método (o caminho seguro):** `railway postgres pitr restore --at 2026-10-13T03:33:42Z
--new-service-name pitr-drill-20261013` — cria um **serviço irmão** e, por contrato do Railway,
**nunca toca no serviço de origem**.

> ⚠️ **Correção material de premissa:** `railway postgres pitr backup restore <ID>` é **restore
> IN PLACE — sobrescreve os dados do banco selecionado** (documentado em
> [docs.railway.com/cli/postgres](https://docs.railway.com/cli/postgres): _"An in-place backup
> restore overwrites the selected database's data"_). O `--help` do comando **não** informa isso.
> Ou seja: o backup de volume **não** é um caminho de validação — é uma operação destrutiva que
> exige janela e decisão. A validação de DR deve usar sempre o **PITR restore** (irmão).

**Antes do drill — saúde do arquivador** (`pitr status`, seção "Live coverage"): `Backup sets: 1`,
`Latest backup: 2026-10-13T03:33:41Z`, `WAL coverage: …A5 .. …BC`, `Archiver: enabled`,
`Last archived at: 2026-10-13 03:55:48Z`, **`Restorable up to: 2026-10-13 03:33:42Z`**.

**Comparação dos dois lados (contagens exatas, `count(*)`, não estimativas de `pg_stat`):**

| Métrica | Produção | Restaurado |
|---|---|---|
| Tamanho do banco | 190 MB | **190 MB** |
| Tabelas em `public` | 40 | **40** |
| `midia` | 17.268 | **17.268** |
| `episodio` | 131.743 | **131.743** |
| `media_score` | 16.667 | **16.667** |
| `temporada` | 6.346 | **6.346** |
| `usuario` | 198 | **198** |

> Nota de método: as estimativas de `pg_stat_user_tables.n_live_tup` **divergem** num banco
> recém-restaurado (ex.: `temporada` 6.348 vs 6.346). A validação usou `count(*)` exato.

**Limpeza e estado final:** serviço de drill removido com `railway service delete --service
pitr-drill-20261013 -y` (**escopado por nome** — `railway delete` apaga o *projeto* e foi
deliberadamente evitado). Projeto de volta a `Redis`, `Postgres`, `MEDIA Rate`. Produção após o
drill: banco `tabelas=40 midia=17268 usuarios=198`, `PITR enabled/bucketWired: true`,
API `/health` **200**, web **200**.

**Conclusão:** a trilha de backup/DR deixa de ter o bloqueio "PITR indisponível / restaurabilidade
não provada". O que sobra é procedimento, não capacidade: (a) escrever no runbook que a recuperação
usa **PITR restore (irmão)** e que o backup de volume é **in-place**; (b) confirmar periodicamente a
cobertura (`Restorable up to`) — a janela começa no primeiro base backup pós-enable, não é
retroativa.
