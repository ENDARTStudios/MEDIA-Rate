# Configuração mínima segura de backup (T226) — preparação + escalonamento manual

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T226 · **Base:** `05ba1cc3` (`origin/main`)
**Estratégia decidida pelo Operador:** **B (backup gerenciado da plataforma) + complemento A (script)**.
**Resultado:** `DONE_WITH_ESCALATION` — **parte versionável preparada e verificada**; **destino durável e
backup gerenciado bloqueados em ação manual do Operador** (checklist §5). **GO: SUSPENSO.**

> **ATUALIZAÇÃO (T229, 2026-10-15):** este relatório recomendava tratar o pré-migration como
> **fail-closed** na T229 ("somente depois de A+B+alerta+drill"). Essa recomendação foi **SUPERADA**:
> tornar fail-closed um caminho que **nunca funcionou** bloquearia migrations sem garantir backup.
> A T229 **removeu** o passo decorativo e documentou a rede real (PITR + arquivador/alerta + schedule
> + restore provado). Ver `premigration-backup-reconciliation-2026-10-15.md`. As demais conclusões
> deste relatório seguem válidas.

> **ATUALIZAÇÃO (T232, 2026-10-13):** o bloqueio do §5 foi **resolvido** com o **Railway PRO** —
> **schedule DAILY ativo** + **backup permanente `pre-go-2026-10-13` (`never`)**. Ver
> `railway-pro-backup-activation-2026-10-13.md`. O **complemento A** (script com `BACKUP_UPLOADER`)
> segue pronto como camada portátil (possível R2 em T233), **não** obrigatório para o backup primário.

> Sanitização: nenhum `DATABASE_URL`, senha, token, connection string, host real ou PII é impresso.
> Nenhum backup real foi executado contra produção; nenhum restore; nenhum segredo/infra tocado.

---

## 1. Descoberta (fatos que definem o caminho)

| Verificação | Resultado |
|---|---|
| `railway.json` no repo | existe, mas **sem** `cronSchedule` e **sem** configuração de backup (só `startCommand`) |
| **Railway CLI** | ⚠️ **CORRIGIDO na T230** (ver `railway-cli-backup-evidence-2026-10-13.md`): o CLI **expõe** backup/schedule/PITR sob **`railway postgres pitr`** (`backup list/create`, `schedule list/set`) — a afirmação original desta T226 ("não expõe comando de backup") era **inferência de um `grep` no help de topo** e estava **imprecisa**. A execução é **bloqueada por plano** (*"only available for Pro workspaces"*) |
| Workflow de backup agendado | **não existe** (e **não deve** ser criado como solução principal: o hostname interno não é alcançável de runner externo — **D-527**) |
| Script existente | bom (`pg_dump -F c`, valida com `pg_restore --list`, falha em voz alta) — **mas** escrevia só em destino local |

**Conclusão:** a metade "opção B" depende do **plano/plataforma** — e a **T230 provou por CLI** que a
capacidade existe mas é **Pro-gated** ⇒ **decisão de custo do Operador**. A metade "opção A" (script) é
**versionável** e foi **preparada** nesta tarefa.

---

## 2. O que foi implementado (versionável, seguro)

**`scripts/backup-db.sh`** — endurecido, **sem** mudar o contrato existente (continua aceitando
`DATABASE_URL` como argumento posicional, usado por `migrate-production.yml`):

- **`BACKUP_UPLOADER`** (novo, opcional): caminho de um **executável** chamado com o dump como `$1`,
  para enviar a um **destino durável externo** (ex.: wrapper de `aws s3 cp`). **Sem `eval`/string de
  shell** (o operador fornece o executável — superfície mínima). Se o upload **falhar**, o script
  **aborta com exit 1** (um backup que não chegou ao destino durável não é backup).
- **`BACKUP_STATUS_FILE`** (novo, opcional): grava **status SANITIZADO**
  (`{"ts","ok","bytes","retidos","uploaded","retencaoDias"}`) — **sem conexão, sem credencial, sem PII**.
  É a base do alerta de falha (T227); a **ausência** de `ts` recente é, por si só, o sinal de falha.
- **Aviso explícito** quando **não** há `BACKUP_UPLOADER`: informa que o dump fica só no `BACKUP_DIR` e
  que, se ele não for volume durável, **o backup é perdido em redeploy/restart**.
- **Preservado:** validação `pg_restore --list`, falha em voz alta sem `pg_dump` (nunca fabrica),
  retenção 30 d, `--no-owner --no-acl`, **nenhum log de `DATABASE_URL`**.

### Verificação (5 testes herméticos — stubs em temp, **sem banco real, sem produção**)

| # | Cenário | Esperado | Resultado |
|---|---|---|---|
| T1 | Caminho felizes com `BACKUP_UPLOADER` | exit 0; status `ok:true,uploaded:true`; uploader chamado; **segredo ausente** do log/status | ✅ |
| T2 | Uploader **falha** | exit 1 + mensagem "upload FALHOU" | ✅ |
| T3 | `BACKUP_UPLOADER` inexistente/não-executável | exit 1 | ✅ |
| T4 | **Sem `pg_dump`** | exit 1 + "pg_dump não encontrado" (comportamento preservado) | ✅ |
| T5 | **Sem** uploader | exit 0 + aviso "PERDIDO em redeploy" | ✅ |

- `bash -n scripts/backup-db.sh` → **OK** (shellcheck não disponível na máquina — registrado).
- **Vazamento de segredo:** busca por sentinela no dump de teste, no `status.json` e nos logs →
  **0 ocorrências**.

---

## 3. Estado operacional real (após esta tarefa)

| Item | Estado |
|---|---|
| Script preparado para destino durável + status | ✅ **PRONTO** (neste PR) |
| **Destino durável configurado** | ❌ **NÃO** — nenhum `BACKUP_UPLOADER`/volume durável definido |
| **Backup agendado em produção** | ❌ **NÃO** — depende do painel (Railway) |
| **Backup gerenciado da plataforma** | ❌ **NÃO** — dashboard-only (CLI não expõe) |
| **Alerta de falha de backup** | ❌ **NÃO** — é a **T227** (o status file já o viabiliza) |
| **Restore de ensaio validado** | ❌ **NÃO** — é a **T228** |
| Backup pré-migration **fail-open** | ⚠️ **AINDA fail-open** — corrigir só na **T229**, após backup confiável |

> **Honestidade:** a **operação** de backup **continua não confiável** nesta fase. O que mudou é que o
> *mecanismo* está pronto e verificável — falta o **destino durável** e o **agendamento**, ambos no
> painel da plataforma (§5).

---

## 4. Riscos residuais

- Enquanto não houver destino durável + agendamento, **o dado existe apenas no volume do Postgres**
  (T181) — perda total em falha do volume.
- O **fail-open** do pré-migration permanece (decisão consciente: torná-lo fail-closed **antes** de
  haver backup confiável **bloquearia deploys**).
- **Limitação honesta:** os testes T1–T5 validam o **script** com stubs; **não** comprovam backup real
  contra o banco (seria produção escrita, proibida aqui).

---

## 5. Checklist manual do Operador (sanitizada — sem valores)

> Nada abaixo foi executado pelo agente. Envolve painel/plataforma/custo ⇒ **decisão do Operador**.

**A. Habilitar o backup gerenciado (opção B) e o alerta de uso do volume**
> **Atualizado pela T230:** o caminho é pelo **CLI** (`railway postgres pitr schedule set --daily` /
> `backup create`), **não** "dashboard-only" — porém ambos são **bloqueados por plano**
> (*"only available for Pro workspaces"*). Ver `railway-cli-backup-evidence-2026-10-13.md`.
1. Decidir o **plano Pro** (libera `backup create`, `schedule set --daily` e PITR) — **decisão de custo
   do Operador** — ou registrar **aceite formal de risco**. **Urgente:** o único backup válido
   **expira em 2026-10-28**.
2. Habilitar o **alerta de uso do volume** (aba Alerts) — independente do Pro.
3. Registrar em `PENDENCIAS_OPERADOR.md`/worklog: retenção escolhida + data + responsável (**sem**
   copiar valores de credencial ou string de conexão).

**B. Definir o destino durável do complemento portátil (opção A)**
4. Escolher o destino (volume durável montado **ou** bucket privado externo).
5. Se bucket: criar credencial **least privilege** (write restrito ao prefixo de backup) e fornecer um
   **executável `BACKUP_UPLOADER`** no ambiente do agendador (o wrapper fica fora do repo).
6. Agendar a execução **dentro do ambiente da plataforma** (com acesso à rede interna do banco),
   **não** em runner externo (**D-527**).
7. Definir `BACKUP_DIR` (durável), `RETENTION_DAYS` e `BACKUP_STATUS_FILE`.

**C. Autorizar as próximas etapas**
8. Autorizar **T227** (alerta de falha lendo o `status` — padrão GitHub Issues).
9. Autorizar **T228** (restore drill em ambiente seguro, RTO medido).
10. Autorizar **T229** (fail-closed no pré-migration) **somente depois** de A+B+alerta+drill.

**Critérios de não-aceite (não fechar a frente assim):** backup só em disco efêmero · destino público ·
log de PII/segredo · restore nunca testado · fail-closed antes de backup confiável · mover `DATABASE_URL`
para CI externo.

---

## 6. Confirmações

- **Nenhum** backup real/restore executado; **nenhum** acesso a produção, banco, painel ou provedor.
- **Nenhum** segredo/infra/Railway/Vercel/GitHub setting criado ou alterado; **nenhum** alerta interagido.
- Alteração de código restrita a **`scripts/backup-db.sh`** (+ docs); contrato preservado.
- Diff auditado; contaminação `123ce28e` ausente.
- **GO para convites: permanece SUSPENSO.** Nenhum BETA-GAP marcado como DONE.

---

## 7. Referências

`scripts/backup-db.sh` · `docs/06-devops-deployment/BACKUP_DR.md` ·
`docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md` (T225) ·
`.github/workflows/migrate-production.yml` (D-527) · `railway.json` · `PENDENCIAS_OPERADOR.md` (T181).
