# Evidência do Railway CLI sobre backups (T230) — read-only, evidência sanitizada

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T230 · **Base:** `e3aac159` (`origin/main`)
**Natureza:** descoberta + **listagem read-only** via CLI. **Nenhum** restore, **nenhum** delete,
**nenhuma** alteração de dados/schema/segredos/vars/billing/deploy. **GO: SUSPENSO.**

> Sanitização: nenhum token, cookie, connection string, `DATABASE_URL`, URL assinada, e-mail, IP ou
> **ID de backup** é registrado (IDs omitidos/truncados). Apenas nomes, datas, tamanhos e estados.

---

## 1. Correção de premissa (aceita e verificada)

A afirmação da T226 — *"o CLI do Railway não expõe comando de backup"* — foi **uma inferência a partir
de um `grep` no help de topo**. **Estava imprecisa.** A verificação real (`railway --help` completo +
`railway postgres --help`) mostra que o CLI **expõe** as capacidades de backup, sob
**`railway postgres pitr`**:

| Comando (v5.47.1) | O que faz |
|---|---|
| `postgres pitr status` | estado do PITR |
| `postgres pitr backup list` | **listar backups** |
| `postgres pitr backup create --name <N>` | **criar backup on-demand** |
| `postgres pitr backup delete` / `lock` / `restore` | deletar / remover expiração / restaurar |
| `postgres pitr schedule list` | **listar o schedule** |
| `postgres pitr schedule set --daily\|--weekly\|--monthly\|--none` | **definir o schedule** |

**Não existe** um comando `railway backup` de topo; a porta de entrada é `postgres pitr`.

---

## 2. Estado autoritativo (CLI, read-only)

Serviço: **`Postgres`** · ambiente: **`production`** · CLI **v5.47.1** · sessão **autenticada**
(identidade omitida).

### 2.1 PITR — `postgres pitr status`

| Campo | Valor |
|---|---|
| Status | **`disabled`** |
| HA cluster | `no` |
| Bucket wired | `no` |

### 2.2 Schedule — `postgres pitr schedule list`

```
No backup schedule configured for Postgres.
```

### 2.3 Backups existentes — `postgres pitr backup list`

| Nome | Criado | Tamanho | Schedule | Expira |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | **65 MB** | `manual` | **2026-09-22** (já expirado) |
| `Online resize to 5000MB` | 2026-10-07 | **413 MB** | `manual` | **2026-10-28** |

*(IDs omitidos deliberadamente.)*

### 2.4 Tentativa de criar backup on-demand — `postgres pitr backup create --name t230-cli-manual-2026-10-13`

```
Failed to create a backup
Caused by:
    Manual backups and backup schedules are only available for Pro workspaces
```

→ **Bloqueio de plano confirmado pelo CLI** (não apenas pela UI): `BUDGET_OVERFLOW` / **Pro-gated**.
Nenhum custo foi gerado e nenhuma ação destrutiva ocorreu (a tentativa **falhou**, sem efeito).

---

## 3. Leitura de risco (o achado que importa)

1. **Os dois backups são `manual`** — não há **nenhuma** automação (schedule vazio, PITR desligado).
2. **A janela de retenção se fecha em ~15 dias:** o backup mais recente **expira em 2026-10-28** e o
   anterior **já expirou em 2026-09-22**. Depois disso, **sem ação do Operador, o banco fica sem
   nenhum backup retido** — exatamente o cenário "se o banco cair, não recuperamos".
3. **O caminho de automação existe, mas é pago:** `pitr schedule set --daily` resolveria a lacuna de
   agendamento; `pitr backup create` permitiria snapshots sob demanda. Ambos exigem **Pro**.
4. **PITR (`--daily` contínuo) está desligado** e sem bucket — a recuperação point-in-time também é
   capacidade Pro.

**Consequência para o GO:** a frente deixa de ser ambígua. Não é "falta script" nem "falta CI":
é uma **decisão de custo** (plano Pro) **ou** um **aceite formal de risco**, e — em qualquer cenário —
alguém precisa **manter backups manuais antes de 2026-10-28**.

---

## 4. Classificação (para o GO readiness)

**`BACKUP_CLI_BLOQUEADO_CUSTO`**

- O CLI **evidencia** as capacidades (listar/criar/schedule/PITR) — **não** é limitação de ferramenta.
- A execução de **backup manual** e **schedule automático** é **bloqueada por plano** (Pro).
- Estado operacional atual: **2 backups manuais**, um já expirado, o atual expira **2026-10-28**;
  **PITR `disabled`**; **sem schedule**.

---

## 5. Próximos passos (não iniciados)

| Tarefa | Depende de |
|---|---|
| **Decisão de custo** — `OperatorDecision-Railway-Pro-upgrade-se-necessario` (Pro libera `backup create` + `schedule set --daily` + PITR) | Operador |
| **T227** alerta de falha de backup | evidência de backup + decisão de plano |
| **T228** restore drill em ambiente seguro | backup existente/novo + alerta |
| **T229** fail-closed no pré-migration | backup confiável ativo |
| **Ação imediata sugerida (barata):** manter o backup manual corrente **antes de 2026-10-28** (via UI, hoje permitida para visualizar/restaurar; a criação também é Pro na UI) **ou** autorizar o Pro | Operador |

> Se o Operador **não** quiser o Pro agora, a alternativa honesta é **aceite formal de risco** com
> limites explícitos (janela curta, monitoramento manual, sem promessa de recuperação total) — e
> registrar que a partir de **2026-10-28** não haverá backup retido.

---

## 6. Limitações desta evidência

- A leitura é do **CLI**; os **nomes/datas** batem com a UI do Operador, mas os **tamanhos divergem**
  (UI: 128 MB / 483 MB; CLI: 65 MB / 413 MB) — o CLI é tratado como autoritativo; a divergência fica
  registrada.
- **Não** executo restore/drill (T228) nem leio o conteúdo do banco.
- **Não** configurei schedule (Pro-gated) nem fiz upgrade.
- `railway.json` (Config-as-Code) está **depreciado** (migrar para `.railway/railway.ts` até
  2026-12-01) — **assunto separado**, não tocado aqui.

---

## 7. Confirmações

- **Nenhum** restore, delete de backup, alteração de dados/schema/segredos/vars/billing/deploy.
- **Nenhum** upgrade de plano; nenhum custo gerado (a criação **falhou** por plano, sem efeito).
- **Nenhum** segredo/PII/URL assinada/ID de backup impresso; apenas nomes, datas, tamanhos e estados.
- **Nenhum** alerta (CodeQL/Trivy/secret scanning) interagido.
- **GO para convites: permanece SUSPENSO.**

---

## 8. Referências

`docs/08-security/reports/backup-automation-minimum-2026-10-13.md` (T226 — premissa corrigida) ·
`docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md` (T225) ·
`docs/06-devops-deployment/BACKUP_DR.md` · `scripts/backup-db.sh` · CLI `railway` v5.47.1
(`postgres pitr *`).
