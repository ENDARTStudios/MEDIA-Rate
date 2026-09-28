# BETA-GAP-07 / T123 — Sequências e conteúdo relacionado (relatório)

**Data:** 2026-09-28 · **Branch:** `feat/t123-beta-gap-07-related-sequences` (de `origin/main` `964c4082`)
**Regra:** só relação explícita; nada inventado; ausência = seção omitida.

## 1. Descoberta (com evidência)

| Área | Evidência |
|---|---|
| Grafo explícito | `RelacaoObra` (`apps/api/prisma/schema.prisma:530`) com `TipoRelacao` (`:672`): `ADAPTACAO_DE/SEQUENCIA_DE/PREQUELA_DE/SPINOFF_DE/MESMO_UNIVERSO/MESMA_HISTORIA_REAL`; `nota_editorial` opcional. |
| Coleções | `Franquia`/`MidiaFranquia` (`:806`/`:816`) com `ordem_lancamento`/`ordem_cronologica`. |
| Endpoint público (read-only) | `GET /api/v1/midias/:id/relacoes` — bidirecional, sem N+1 (`relacoes.controller.ts:13`, `relacoes.service.ts:22`). |
| Web — consumo | `RelatedWorksBlock`/`RelatedCard` (`components/discovery/`), **já embutido** na ficha em `MediaDetailClient.tsx:309-311` (acima da dobra, após o score); `BecauseYouConsumed`, `WatchlistCrossPrompt`, `CarouselInteractions`. |
| Web — franquias | Seção "Sequências e conteúdo relacionado" (Metadados) usa `FranchiseCarousel` com `media.franquias`. |
| i18n | `discovery.relatedWorksTitle`, `discovery.{adaptedFrom,sequelOf,prequelOf,spinoffOf,sameUniverse,sameRealStory}` ×3 locales. |

**Definição canônica de BETA-GAP-07:** não há texto além do registry (ID `PENDENTE`); o packet acima é a especificação autorizada. A infraestrutura já existe; a correção é de fidelidade de link.

## 2. Achado corrigido (link errado/quebrado → MISLEADING/BROKEN_LINK)

`RelatedCard` montava `href={"/media/" + m.slug}` com `m.slug = slugify(titulo)`
(`api-relations.ts:71`), **não** o slug canônico do banco. O slug canônico tem
desambiguação `-{tipo}` (`slugUnico`) — ex.: `o-senhor-dos-aneis-a-sociedade-do-anel-livro`
vs `.` (filme). Logo, o card podia apontar para **404 ou para a mídia errada**
(a mesma classe de defeito que motivou `LEGACY_SLUG_REDIRECTS` em `media/[slug]/page.tsx:94`).

**Correção:**
- API `GET /midias/:id/relacoes` passa a retornar o `slug` canônico das duas pontas
  (`relacoes.service.ts` — `select { slug: true }` em `origem`/`destino`).
- Web `relacaoFromApi` usa `r.midia.slug?.trim() || slugify(titulo)` (retrocompatível).

## 3. Semântica (sequências ≠ semelhantes)

- **Sequências/relacionados explícitos:** grafo `RelacaoObra`, rotulado por tipo
  (`Sequência de`, `Prequela de`, `Baseado na obra original`, `Spin-off`, `Mesmo universo`).
- **Coleções:** `FranchiseCarousel` (ordem de lançamento/cronológica).
- **Sem relação:** `RelatedWorksBlock` retorna `null` (seção omitida) — não há
  heurística de "semelhantes" inventada; franquia vazia → `Não informado`.

## 4. Testes

- `apps/api/test/relacoes.spec.ts` (6): o select pede `slug` em origem/destino e o
  propaga (`midia.slug === "duna-livro"`).
- `apps/web/test/discovery.spec.tsx` (8): `relacaoFromApi` **prefere** o slug do
  servidor; fallback `slugify` preservado.
- **Vermelho evidenciado:** `HEAD` do service tinha 2 `slug: true` (só gêneros; sem
  slug de mídia) → testes falhariam; verde após fix. tsc api/web 0; eslint/prettier 0.

## 5. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
