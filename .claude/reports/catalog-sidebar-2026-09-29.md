# BETA-GAP-10 / T127 — Sidebar de filtros do catálogo (descoberta + decisão)

**Data:** 2026-09-28 · **Branch:** `feat/t127-beta-gap-10-catalog-sidebar` (de `origin/main` `9bbff10e`)
**Regra:** apenas dados/facetas reais; sem inventar filtro/contagem; sem backend novo.

## 1. Descoberta (read-only) — o recurso JÁ EXISTE

| Área | Evidência |
|---|---|
| Sidebar/filtros | `apps/web/src/components/CatalogFiltersClient.tsx` — busca (debounce), ordenação, avançado (ano, faixa de nota, gênero, "somente crítica"), contador e "Limpar". |
| Estado na URL | `useSearchParams`/`router.replace` (`type, sort, q, anoMin, anoMax, scoreMin, scoreMax, genero, com_critica`); SSR aplica todos (`catalog/page.tsx`). |
| Faceta real | Gênero via `GET /api/v1/midias/generos` (com `total_midias` real). |
| Mobile | `CatalogPageClient.MobileFilterBar` — drawer com o mesmo `CatalogFiltersClient`. |
| Backend (não alterado) | `GET /api/v1/midias` suporta `tipo/ano_min/ano_max/score_min/score_max/genero/com_critica/sort` (`media.controller.ts:106-204`). |

## 2. Achados corrigidos

1. **`activeCount` subcontava** (`CatalogFiltersClient`): não incluía `genero`
   nem `com_critica` → com só um gênero ativo, o contador `(N)` e o botão
   **"Limpar"** não apareciam. Agora inclui ambos.
2. **Busca textual ignorava filtros** (`getCatalog`, `api.ts`): com `q` ativo, o
   `/api/v1/search` casa título/sinopse mas **não** aplica gênero/ano/nota/crítica
   — a UI exibia controles que a request ignorava (estado divergente).
   - **Ano (anoMin/anoMax)** e **ordenação (título/ano)** passam a ser aplicados
     localmente a partir dos dados reais do resultado.
   - **Gênero/nota/crítica** permanecem indisponíveis nesse modo (sem dado no
     payload) → ficam **desabilitados com hint i18n** enquanto há busca ativa
     (não se promete filtro que não se aplica). Sem busca, ficam habilitados e
     100% server-side.

## 3. Decisão técnica

- **Web-only**, usando endpoints existentes; **sem** backend/schema/contrato novo.
- Nenhuma faceta/contagem inventada: gênero usa `total_midias` real; nada de
  contagem por filtro avançado.
- Não escondemos funcionalidade essencial: no mobile há drawer; no desktop, a
  sidebar; o hint explica a indisponibilidade em vez de falhar em silêncio.

## 4. Testes

- `apps/web/test/catalog-search.spec.tsx` (6): +3 — contador inclui
  gênero/crítica; busca ativa desabilita gênero/nota/crítica e mostra o hint;
  sem busca ficam habilitados.
- `apps/web/test/catalog-filters-api.spec.ts` (2, novo): `getCatalog` na busca
  aplica `anoMin/anoMax` e `sort=title` sobre os dados reais.
- `apps/web/e2e/catalog-sidebar.spec.ts` (novo): desktop (busca desabilita +
  hint; gênero na URL mostra "Limpar"), mobile (drawer + sem overflow 390x844)
  e 3 locales sem chave i18n crua.
- **Vermelho evidenciado:** contador sem gênero (não mostrava "Limpar");
  `getCatalog` sem o filtro de ano (retornava itens fora da faixa).
- Suíte web completa **439/439**; `tsc` web 0; eslint/prettier 0.

## 5. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
