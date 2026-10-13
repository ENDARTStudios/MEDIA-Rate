# Verificação de materialização do backup (T236) — read-only, com polling limitado

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T236 · **Base:** `c95080ed` (`origin/main`)
**Classificação:** **`EM_PROGRESSO`** · **Resultado:** **`DONE_WITH_ESCALATION`** (monitor) ·
**GO: SUSPENSO.**

> Sanitização: nenhum `id`, `externalId`, `creatorId`, `projectId`, `serviceId`, URL, token,
> connection string, `DATABASE_URL` ou PII. Apenas `name`, `createdAt`, `expiresAt`, `usedMB`,
> `referencedMB`, `volumeInstanceSizeMB` e a presença/ausência de `scheduleId`.
> **Nenhuma mutação**: nada criado/restaurado/deletado/lockado; schedule e PITR intocados.

---

## 1. Contexto

A T234 registrou que o backup permanente `pre-go-2026-10-13` (`expiresAt: None`) tinha
`usedMB` **em progresso** (0 → 2 MB de `referencedMB` 630), enquanto os backups anteriores tinham
`usedMB ≈ referencedMB`. A pergunta da T236: **isso materializa ou está travado?** — e **existe
sinal de conclusão** no CLI?

---

## 2. Descoberta de sinais (read-only)

| Verificação | Resultado |
|---|---|
| `railway --version` / `whoami` | **v5.47.1** · sessão **autenticada** (identidade omitida) |
| `postgres pitr backup status` | ❌ **`unrecognized subcommand 'status'`** — não existe |
| Campos expostos por `backup list --json` | `name`, `createdAt`, `expiresAt`, `usedMB`, `referencedMB`, `volumeInstanceSizeMB`, `scheduleId` (+ `id`/`externalId`/`creatorId`, **não impressos**) |
| Campo de **status/state/phase/completion** | ❌ **NÃO EXISTE** |

⇒ **O CLI não oferece sinal terminal de conclusão.** O único proxy observável é `usedMB`
(e a presença de `scheduleId` para distinguir backup agendado de manual).

---

## 3. Backups agendados recentes

`backup list` mostra **3 backups, 0 com `scheduleId` não-nulo** → **o schedule (DAILY/WEEKLY/MONTHLY,
criado às 02:52) ainda NÃO produziu nenhum backup**. Só existem os manuais.

| Nome | `createdAt` | `expiresAt` | `usedMB` | `referencedMB` |
|---|---|---|---|---|
| `Pre-Security-Patch Backup` | 2026-08-23 | 2026-09-22 (expirado) | 65 | 128 |
| `Online resize to 5000MB` | 2026-10-07 | **2026-10-28** | 413 | 483 |
| `pre-go-2026-10-13` | 2026-10-13 | **`None`** (nunca) | **ver §4** | 630 |

---

## 4. Série de `usedMB` do `pre-go-2026-10-13` (polling limitado: 5 leituras, ~4 min)

| # | Hora (UTC) | `usedMB` | `referencedMB` |
|---|---|---|---|
| — | ~03:06 (T234) | 0 | 630 |
| — | ~03:2x (T234) | 2 | 630 |
| baseline | 03:28:34 | 4 | 630 |
| L1 | 03:32:52 | 4 | 630 |
| L2 | 03:36:53 | **86** | 630 |
| L3 | 03:40:56 | 87 | 630 |
| L4 | 03:44:57 | **93** | 630 |
| L5 | 03:48:59 | 94 | 630 |
| extra | 03:50:54 | **95** | 630 |

**Leitura:** série **monotônica crescente** (0 → 2 → 4 → 4 → **86** → 87 → 93 → 94 → **95**), com um
salto em bloco (4 → 86) e crescimento contínuo depois. **Não há estagnação** e **não** há status de
falha. Ao fim: **95 / 630 ≈ 15 %**.

**Limite do método (honesto):** como **não existe campo de status**, não é possível distinguir, por CLI,
"materializando o payload" de "contabilizando blocos novos/delta". O critério de confirmação por
tamanho (**≥ 90 % de `referencedMB`, estável em 2 leituras**) **não** foi atingido (15 %).

---

## 5. Classificação (critérios do packet)

| Critério | Situação |
|---|---|
| `CONFIRMADA` | ❌ — sem status terminal **e** `usedMB` (15 %) muito abaixo de 90 % |
| **`EM_PROGRESSO`** | ✅ **`usedMB` aumenta entre leituras, sem status de falha, abaixo do limiar** |
| `FALHA` | ❌ — sem status de falha; **não** há estagnação (a série cresce) |
| `INDETERMINADA` | parcialmente aplicável **como ressalva** (§4) — não como classificação |

**Classificação final: `EM_PROGRESSO`.**

---

## 6. Impacto

1. **`expiresAt: None` continua NÃO sendo prova de backup válido** — a materialização está **em curso**,
   não concluída. A qualificação da T232 permanece correta: *"mitigado no metadado; não verificado no
   payload"*.
2. **A T227 NÃO é liberada como pronta** (o packet condiciona a liberação a `CONFIRMADA`). Sem sinal de
   conclusão no CLI, um alerta baseado só em `usedMB > 0` seria **fraco** (o backup já passou de 0 e
   ainda não está completo) — exatamente o risco que o Thinker apontou.
3. **Mitigação temporária que EXISTE:** o backup `Online resize to 5000MB` (413/483 MB, **materializado**)
   permanece válido até **2026-10-28** — há um ponto de recuperação **comprovadamente materializado**
   para as próximas ~2 semanas, mesmo que o `pre-go` não conclua.
4. **T228 (restore drill) é o único teste definitivo** — é ele que prova restaurabilidade ponta a ponta
   e não depende de nenhum campo do CLI.
5. **Sem backup do schedule ainda:** a automação foi configurada mas **ainda não produziu** o primeiro
   artefato; vale monitorar a primeira execução (o monitor `Monitor-Railway-backup-materialization-…`
   cobre isso).

### Thresholds sugeridos para a T227 (revisados)
| Sinal | Threshold |
|---|---|
| Existe **status terminal** no CLI? | **Não** → usar proxy de tamanho + idade |
| Backup mais recente **materializado** (`usedMB ≥ 90 %` de `referencedMB`) | > **36 h** → alerta |
| `usedMB` **estagnado** numa série (ex.: 3 leituras sem delta) | alerta (possível travamento) |
| Backup `never` com `usedMB` **muito baixo** por > 2 h | alerta (registro sem payload) |
| Nenhum backup com `scheduleId` após N dias do schedule | alerta (automação não produzindo) |
| Retenção efetiva < 7 d · schedule vazio | alerta |

---

## 7. Próximos passos

**Monitor** da materialização do `pre-go` (e da 1ª execução do schedule) → **T227** (alerta, quando
houver critério estável) → **T228** (restore drill — **teste definitivo**) → **T229** (fail-closed) ·
**T235** (PITR) · **T233** (R2) · **Deploy Production** · **GO_CONVITES**.

## 8. Confirmações

- **Read-only**: nenhum backup criado/restaurado/deletado/lockado; schedule e PITR **intocados**;
  nenhum billing/segredo/var/rede/domínio/deploy/código alterado.
- Polling **limitado** (5 leituras ≈ 20 min), sem carga indevida.
- **Nenhum** ID/`externalId`/`creatorId`/URL/segredo/PII impresso; **nenhum** alerta interagido.
- Diff restrito a **docs**; contaminação `123ce28e` ausente.
- **GO para convites: permanece SUSPENSO.**

---

## 9. Referências

`docs/08-security/reports/railway-backup-retention-hardening-2026-10-13.md` (T234) ·
`railway-pro-backup-activation-2026-10-13.md` (T232) · `railway-cli-backup-evidence-2026-10-13.md` (T230) ·
`docs/06-devops-deployment/BACKUP_DR.md` · CLI `railway` v5.47.1 (`postgres pitr backup list --json`).
