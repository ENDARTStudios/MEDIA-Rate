# BETA-GAP-02 — Reatividade da dashboard (diagnóstico com evidência)

**Data:** 2026-09-28 · **Branch:** `feat/t118-beta-gap-02-dashboard-reactivity` (de `50a1a0bb`)
**Regra cumprida:** evidência de código antes de qualquer correção (sem chute).

## Causa raiz — `QUERY_INCLUDES_REMOVED` (confirmada por código)

`apps/api/src/modules/dashboard/dashboard.service.ts:33-34`:
```ts
const interacoes = await tx.usuarioMidiaInteracao.findMany({
  where: { usuario_id: usuarioId },   // <-- NAO filtra deleted_at
  select: { status: true, atualizado_em: true, midia: { select: { tipo, score, generos } } },
});
```
`apps/api/src/modules/interacoes/interacoes.service.ts:420` → as consultas de ATIVOS filtram `deleted_at: null`,
logo **a remoção de interação é SOFT DELETE** (seta `deleted_at`).

**Consequência:** a dashboard lê **ao vivo** do banco (não há cache/agregado no módulo `dashboard`), mas **não exclui
as linhas removidas** → `total`, `concluidos`, `tipos`, `generos`, `evolucao`, `streak` e `histograma` continuam
contando itens removidos. É exatamente o “estado fantasma” relatado.

**Hipóteses descartadas com evidência:** cache in-memory (o módulo não usa `cache.*`), agregado materializado
(não existe; `findMany` ao vivo), ISR/revalidate (a API está correta; o problema é a query), cache key/escopo
(irrelevante aqui) — **não** há vazamento cruzado entre usuários neste ponto (o `where` é por `usuario_id`).

## Correção mínima (1 linha, sem schema, sem contrato)
```diff
-        where: { usuario_id: usuarioId },
+        where: { usuario_id: usuarioId, deleted_at: null },
```
Escopo: `apps/api/src/modules/dashboard/dashboard.service.ts` apenas. Sem migration, sem alteração de DTO.

## TDD (a escrever ANTES do fix)
`apps/api/test/dashboard-reactivity.e2e-spec.ts`:
1. usuário de teste (fixture local) → dashboard inicial (baseline);
2. criar N interações (`QUERO_CONSUMIR`/`CONCLUIDO`);
3. dashboard reflete (total/concluidos > 0);
4. **remover todas** (soft delete pelo endpoint existente);
5. dashboard → **total/concluidos zerados** e itens removidos fora de `tipos`/`generos`/`evolucao`/`streak`/`histograma`;
6. `Free` mantém o gating atual (radar/evolução vazios) — **não** alterar entitlement.

## E2E (a estender)
`apps/web/e2e/dashboard-reactivity.spec.ts`: login fixture → adicionar mídia → dashboard mostra → remover →
recarregar → dashboard atualiza. Esperas determinísticas (`expect.poll`/`waitForResponse`); sem `sleep`.

## Estado
- Fix **não aplicado** neste ciclo (orçamento da sessão esgotado) — nenhuma mudança de produto foi commitada.
- Próximo ciclo: red test → fix de 1 linha → hygiene/tsc → PR → gates → merge → smoke → **BETA-GAP-02 = DONE**.

---

## CORRECAO DO DIAGNOSTICO (2026-09-28, mesmo dia — evidencia tsc)

**Erro meu:** inferi `deleted_at` em `UsuarioMidiaInteracao` por analogia com **`Midia`** (onde `deleted_at` existe e e usado por admin/curadoria/diagnostics/discover). O `tsc` provou o contrario:

```
dashboard.service.ts(34,41): error TS2353: 'deleted_at' does not exist in type 'UsuarioMidiaInteracaoWhereInput'
```

**Fato (schema real):** `UsuarioMidiaInteracao` **nao possui** coluna de soft delete. Campos: `status` (StatusConsumo), `reacao`, `motivo_abandono`, `progresso_detalhe`, `iniciado_em`, `concluido_em`, `atualizado_em`, `origem_relacao_id`, legados (`tipo`, `rating`, `comentario`), `created_at`.

**Consequencia:** a hipotese `QUERY_INCLUDES_REMOVED` **nao se aplica** a interacoes. O fix `deleted_at: null` foi **revertido** (commit de revert); o teste baseado nele foi removido (nao comprovava nada real).

**Hipoteses corretas a investigar (com TDD, sem chute):**
1. **`total` conta TODOS os status** (`total: interacoes.length`), incluindo aqueles que a UI trata como "removido" (ex.: `ABANDONADO`) -> remover pela UI nao reduz `total`/metricas;
2. **Remocao e HARD delete** -> a API refletiria na hora; logo o "nao muda" viria do **frontend/ISR** (`revalidate = 3600` + `revalidatePath("/", "layout")`), nao do backend;
3. **Metricas derivadas** (`evolucao`, `streak`) usam `atualizado_em` de interacoes em status nao-ativos (o codigo ja restringe `evolucao` a CONCLUIDO/CONSUMINDO, mas `total`/`streak` nao).

**Proximo passo (sem chute):** primeiro **reproduzir** o fluxo real de "remover" (qual endpoint/acao a UI usa? `DELETE /interacoes/:id`? `status=ABANDONADO`?) e so entao escolher o fix — com o `where`/metrica corretos e evidenciados pelo tsc + teste.