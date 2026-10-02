# T131 — Auditoria de watchlist / interações (cobertura)

**Data:** 2026-09-28 · **Branch:** `feat/t131-watchlist-crud-audit` (base `6661b9e1`)
**Escopo:** lacuna definida no `PLANO_MESTRE` — Fase 4, item **4.4 (watchlist)**. Não é um BETA-GAP novo.

## 1. Veredito

**A watchlist já está coberta de ponta a ponta** pelo modelo real — `WatchlistEntry`
(projeção/Kanban) + `UsuarioMidiaInteracao` (fonte de verdade, dual-write
T320/**D-375**). Não foi necessário alterar código. **Nenhum BETA-GAP** foi tocado.

## 2. Modelo real

| Entidade | Papel | Evidência |
|---|---|---|
| `UsuarioMidiaInteracao` | **Fonte de verdade** do status de consumo | `interacoes.service.upsert` sincroniza a projeção (`watchlist.service.add/move` faz o inverso, T320). |
| `WatchlistEntry` | Projeção do Kanban (`WANT/WATCHING/COMPLETED/DROPPED`) + `score_at_add`, `reacao`, `motivo_abandono`, `progresso_detalhe` | `watchlist.service.ts`; dual-write em `add`/`move`/`relink`. |
| `COLUNA_PARA_STATUS` / `podeTransicionar` | Coluna ↔ status sob a máquina de estados **D-528** (CONCLUIDO→ABANDONADO proibido) | `common/status-coluna.ts`, `common/estados-consumo.ts`; `watchlist.service.move:245`. |

## 3. Cobertura de CRUD/consulta + segurança

`apps/api/src/modules/watchlist/watchlist.controller.ts` (global `AuthGuard`):
- `GET /api/v1/watchlist?coluna=` (`:54`) — lista do usuário; `coluna` validada contra enum.
- `POST /api/v1/watchlist` (`:65`) — add; `addToWatchlistSchema` (só `midia_id`,`coluna`).
- `PATCH /api/v1/watchlist/:id/move` (`:73`) — move; `UuidParamPipe` + `moveWatchlistSchema`.
- `PATCH /api/v1/watchlist/:id` (`:89`) — reação/motivo/progresso; `registrarReacaoSchema`.
- `DELETE /api/v1/watchlist/:id` (`:104`) — `204`; `UuidParamPipe`.
- `PATCH /api/v1/watchlist/:id/relink` (`:116`) — re-link órfão; `relinkWatchlistSchema` (UUID).

**Autorização (owner-only, sem IDOR):** toda operação roda em
`comContextoRls({ usuarioId, role: "USER" })` e filtra `usuario_id: usuarioId`
(`watchlist.service.ts:151, 228, 296, 338, 419`) → entrada alheia → **404**
(não vaza existência).

**Anti-escalada:** DTOs Zod (`dto/watchlist.dto.ts`) aceitam apenas `midia_id`/`coluna`/
`reacao`/`motivo_abandono`/`progresso_detalhe`/`midia_id` — **não** `usuario_id`,
`role`, `papel`, `plano`, `entitlement`, `admin`, `deleted_at`. Zod descarta chaves
desconhecidas. `tenant_id` é removido da resposta (`semTenant`).

**Limite de plano (D-132):** FREE ≤ 50 itens → 403 com upsell (`:119`). **Auditoria:**
`AuditLogService` em add/move/remove (`:97,276,429`). **Métricas:** add/move/remove.

## 4. UI / cliente

Store `apps/web/src/stores/use-watchlist-store.ts` chama GET/POST/`PATCH :id/move`/
DELETE/`PATCH :id/relink` (`:58,98,120,132,144`); `components/watchlist/WatchlistKanban.tsx`
+ `watchlist-status-bridge.ts` + `watchlist-labels.ts`; e2e web `watchlist.spec`,
`watchlist-flow.spec`, `watchlist-sync.spec`, `watchlist-labels.spec`.

## 5. Testes (evidência)

- API: `watchlist-service`, `watchlist-controller`, `watchlist-move-d528`,
  `watchlist-relink`, `watchlist.e2e` → **50/50 verdes** (executado local).
- E2E web: 4 specs de watchlist; API e2e em CI (job `E2E Full`/`E2E Playwright`).

## 6. LGPD

`lgpd.service.ts` inclui **watchlist** e **interações** no export (linhas 38-50, 95, 140-141);
a exclusão é por **soft delete da conta** (`dados_para_exclusao_at`, +30d;
`lgpd.service.ts:10,150-211`). Sem lacuna material.

## 7. Lacunas residuais

- **Nenhuma lacuna funcional/material.** Já existe cobertura de CRUD, autorização,
  validação, auditoria, UI e testes.
- O `PLANO_MESTRE` (4.4) pode ser marcado como **coberto** — recomenda-se a marcação
  formal no **REVIEW** do Thinker (não alterei `PLANO_MESTRE.md` nesta tarefa).
- Follow-up cosmético (opcional): unificar o “cliente” de watchlist num arquivo
  `lib/api-watchlist.ts` (hoje a lógica vive no store) — refactor sem valor de produto.

## 8. Decisão

Cobertura completa → **DONE sem alteração de código**. PR **docs-only** com este
relatório + worklog (evidência de mapeamento), conforme o packet ("não abrir PR vazio").

## 9. PR / merge / smoke

- Commit: `411270d4` · PR: **#351** (docs-only) · base `6661b9e1` · merge commit **`7a347df3`**.
- Required (docs-only): Docs Gate + Migration Safety verdes; `Vercel` **pass**. `123ce28e` ausente.
- Smoke pós-merge 7/7 → **200**. **T131 = DONE** (cobertura completa; sem alteração de código). Nenhum BETA-GAP tocado; BETA-GAP-06 segue `PARTIAL_UI_CONTRACT_READY`. Marcação formal do `PLANO_MESTRE` 4.4 fica para o REVIEW do Thinker.

## 10. T132 — formalização no PLANO_MESTRE

- **Descoberta:** o item **4.4 do `PLANO_MESTRE.md` já estava `[x]`** — não havia item "pendente" a marcar. A lacuna formal era **evidência**: a linha 4.4 não citava a auditoria T131.
- **Ação (docs-only):** **enriqueci apenas o item 4.4** (linha 136) com a evidência aprovada da T131 (dual-write T320/D-375; D-528; owner-only `comContextoRls`; anti-escalada; LGPD; API 50/50) + `evid:` com relatório/PRs/smoke. **Nenhum outro item** da Fase 4 ou de outras fases foi alterado; a Fase 4 **não** foi declarada concluída.
- **Evidência:** PR docs-only; Docs Gate + Migration verdes; smoke passivo 7/7.
