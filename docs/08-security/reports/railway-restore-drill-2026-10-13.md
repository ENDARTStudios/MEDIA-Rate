# Restore drill condicional (T228) — discovery read-only + **BLOCKED** (sem execução)

> **⚠️ NOTA DE CORREÇÃO (2026-10-14, T242).** A conclusão de estado deste relatório
> ("**restaurabilidade não provada**") foi **SUPERADA** pelo **D-594** (T211 cont. 12, **mesmo dia**),
> que registra o drill **executado e aprovado** pelo caminho **não destrutivo** (`pitr restore` →
> serviço irmão, origem intocada; contagens produção = restaurado) — corroborado pela trilha local
> `railway postgres history` (`pitr restore … --new-service-name pitr-drill-20261013 -y`, `success`).
> O que **permanece válido** da T228: `pitr backup restore <ID>` é **in-place** (não é caminho de
> validação) e `pitr restore --at` **cria serviço novo** (billable). O que **não** permanece: a
> afirmação de que a restaurabilidade não estava provada.
> **Resíduo identificado na T242:** o `service delete` do drill **não** removeu o volume
> **`postgres-restored`** (50 GB provisionados, desanexado) → **T239**.
> Ver `docs/08-security/reports/railway-cli-capability-audit-2026-10-14.md`.

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T228 · **Base:** `8efd3453` (`origin/main`)
**Resultado:** **`BLOCKED`** — nenhum caminho de restore **isolado e sem custo novo** foi encontrado.
**Classificação:** **`RESTORE_DRILL_BLOQUEADO_INSEGURO`** (+ `BLOQUEADO_CUSTO` no caminho isolado).
**GO: SUSPENSO.** **Nada foi restaurado.**

> Sanitização: nenhum `id`, `externalId`, `creatorId`, `projectId`, `serviceId`, URL, token, connection
> string, `DATABASE_URL` ou PII. Apenas nomes, datas, tamanhos e estados.
> **Nenhuma mutação**: nada restaurado/criado/deletado/lockado; schedule intocado; R2 não usado.

---

## 1. Discovery read-only (o que decide a tarefa)

| Comando | Achado decisivo |
|---|---|
| `postgres pitr restore --help` | **"Restore to a point in time *into a new service*"** — exige `--at`, tem `--new-service-name` (default `<source>-restored-YYYYMMDD-HHMM`) ⇒ **cria um SERVIÇO NOVO** |
| `postgres pitr backup restore --help` | `backup restore <ID>` — **NÃO expõe** `--new-service-name` nem qualquer opção de **alvo/isolamento** ⇒ o alvo é o **próprio serviço** (**in-place**) |
| `postgres --help` | a superfície de Postgres é só `pitr` · `ha` · `pgbouncer` · `history` — **não há** outro caminho de restore |
| `postgres pitr status` | ⚠️ **`Status: enabled`** · **`Bucket wired: yes`** · HA `no` |

### 1.1 ⚠️ Mudança de estado observada (NÃO executada por mim)
Nas T232/T234/T236 o PITR estava **`disabled`**. Agora está **`enabled` com bucket wired**. Eu **não**
executei `pitr enable` em nenhum momento (o packet proibia) — executamos apenas leitura desde então.
**Provável causa:** ação do Operador no painel (ou consequência do provisionamento do PRO/bucket).
**Isso tem implicação de custo/comportamento** (PITR é *continuous backup*) e é **registrado sem
afirmar autoria**.

---

## 2. Por que **não** executei o drill

| Caminho | Situação | Regra do packet | Veredito |
|---|---|---|---|
| `pitr backup restore <ID>` | **sem** opção de alvo/novo serviço → **in-place** no serviço de produção | *"Proibido restaurar sobre o serviço Postgres de produção … Proibido executar restore in-place … se não deixar claro o alvo, BLOCKED `UNSAFE_RESTORE_TARGET`"* | 🚫 **BLOQUEADO_INSEGURO** |
| `pitr restore --at …` | **cria novo serviço** ⇒ **recurso billable** | *"Proibido criar novo serviço … recurso com custo potencial sem confirmação explícita do Operador"* | 🚫 **BLOQUEADO_CUSTO** |

**Não improvisei**: não usei `--yes` para pular confirmação, não apontei restore para o serviço de
produção e não criei recurso algum. **Nada foi executado.**

---

## 3. Plano sanitizado para o Operador (se quiser o drill)

> Nada abaixo foi executado. O drill **prova restaurabilidade** — é o único teste definitivo.

**Opção A — drill isolado (recomendada, exige autorização de custo)**
1. Operador autoriza a criação de **um serviço temporário** de Postgres (a partir de backup/PITR).
2. Comando pretendido (sanitizado): `railway postgres pitr restore --at <ts> --new-service-name
   drill-t228-<data> --service Postgres` (**NÃO executado**).
3. **Recurso:** 1 serviço Postgres **temporário** · **duração estimada:** o mínimo para validar
   (minutos–1 h) · **critério de cleanup:** remover o serviço temporário ao fim (T239).
4. **Validação (somente agregada):** conexão **read-only** ao alvo → existência das tabelas críticas →
   `count(*)` (sem colunas pessoais) → cadeia SHA-256 do `audit_log` íntegra → registrar **RTO medido**.
5. **Risco:** custo do serviço temporário; dados pessoais presentes no alvo (exige acesso restrito e
   descarte imediato). **Sem** exposição de connection string/PII em log/relatório.
6. **Cleanup:** **T239** (tarefa própria).

**Opção B — offline/local (sem custo, mais lento)**
- Usar o **complemento portátil** (`scripts/backup-db.sh` + `BACKUP_UPLOADER`, T226) para levar um dump
  a um Postgres **local/efêmero** e validar ali. Exige um **dump materializado** e um alvo local — fora
  do escopo desta tarefa (sem credencial de produção no CI, D-527).

**Não recomendado:** `pitr backup restore` direto (in-place) — sobrescreveria produção.

---

## 4. Estado no momento do drill

| Item | Estado |
|---|---|
| `pre-go-2026-10-13` | **`EM_PROGRESSO`** — `usedMB` **102** de `referencedMB` 630 (~16 %), ainda crescendo |
| Backups agendados | **0** com `scheduleId` não-nulo (schedule configurado, **ainda sem produção**) |
| Mitigação vigente | `Online resize to 5000MB` (413/483 MB, **materializado**) válido até **2026-10-28** |
| PITR | **`enabled`** (bucket wired) — **mudança observada**, não executada por mim |
| Restaurabilidade | ❌ **continua NÃO provada** |

---

## 5. Impacto

- **T227 (alerta)** continua **não liberada** como pronta — o critério de sucesso segue frágil (sem sinal
  de conclusão no CLI) e o drill não foi executado.
- **T229 (fail-closed)** também **não** deve avançar: tornar o pré-migration fail-closed exige backup
  **comprovadamente restaurável**.
- **O GO permanece bloqueado por evidência**, não por opinião: não há hoje prova de que qualquer backup
  restaura, e o caminho isolado para provar exige **decisão de custo**.
- **Novo item para o Operador:** confirmar se o **PITR habilitado** foi intencional e se o custo é aceito
  (o packet alertava que PITR é *continuous backup* com possível custo/armazenamento).

---

## 6. Confirmações

- **Nenhum** restore executado; **nenhum** serviço/volume/ambiente criado; **nenhum** delete/lock;
  schedule **intocado**; R2 **não** usado; billing/segredos/vars/rede/domínio/deploy/código **intocados**.
- **Nenhum** ID/`externalId`/`creatorId`/URL/segredo/PII impresso; **nenhum** alerta interagido.
- Diff restrito a **docs**; contaminação `123ce28e` ausente.
- **GO para convites: permanece SUSPENSO.**

---

## 7. Referências

`docs/08-security/reports/railway-backup-materialization-verification-2026-10-13.md` (T236) ·
`railway-backup-retention-hardening-2026-10-13.md` (T234) · `railway-pro-backup-activation-2026-10-13.md` (T232) ·
`railway-cli-backup-evidence-2026-10-13.md` (T230) · `docs/06-devops-deployment/BACKUP_DR.md` ·
CLI `railway` v5.47.1 (`postgres pitr restore`, `postgres pitr backup restore`).
