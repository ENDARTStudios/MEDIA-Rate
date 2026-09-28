# BETA-GAP-06 / T122 — Metadados de mídia (relatório de cobertura + decisão)

**Data:** 2026-09-28 · **Branch:** `feat/t122-beta-gap-06-media-metadata` (de `origin/main` `e68ab8e7`)
**Regra:** não inventar conteúdo; ausência = empty state honesto.

## 1. Descoberta (com evidência)

| Área | Evidência |
|---|---|
| Modelo | `apps/api/prisma/schema.prisma:323` `Midia` — `sinopse`/`sinopse_en`/`sinopse_es`, `titulo_original`/`_en`/`_es`, `ano_lancamento`, `duracao_minutos`, `classificacao_indicativa`, `origem_editorial`, `pais_origem`, `imagem_url`, relações `generos`/`streamings`/`avaliacoes`/`temporadas`/`franquias`/`premios`/`classificacoes_regiao`. **Sem** coluna de elenco/cast/autor/diretor/editora/ISBN. |
| Endpoint público | `GET /api/v1/midias/:id` (`media.controller.ts:547`) e `GET /api/v1/midias/slug/:slug` (usado pela ficha). |
| Score/fontes | `MediaScore` (crítica/público/consenso/votos) + `AvaliacaoFonte` (fonte+url). |
| UI de detalhe | `apps/web/src/components/MediaDetailClient.tsx` — abas Sinopse/Elenco/Avaliações/Metadados; `MediaScoreModule`; `AgeRatingBadge`/`GenreChipRow`/`AwardsShowcase`/`FranchiseCarousel`/`OriginBadge`/`SeriatedScoreTree`. |
| Adapter web | `apps/web/src/lib/api.ts:263` `mediaFromApi` — mapeia sinopse/gêneros/ano/score/streamings/franquias/prêmios; **`cast: []`, `crew: []`, `reviews: []`**. |
| Empty states | `EmptySection` (`MediaDetailClient.tsx:636`) + i18n `catalog.synopsisUnavailable`/`castUnavailable`/`noReviews`. |
| Seeds/coleta | `apps/api/prisma/seed-fase-c*.ts` (sinopse/título via TMDB/Google Books/Jikan); adapters em `media-score/adapters/` (TMDB, OMDb, IGDB, OpenCritic, OpenLibrary, ComicVine, Jikan...). Providers já configurados (nomes de env em `docs/04-api-integrations/INTEGRATIONS.md`). |

## 2. Cobertura por tipo (o que a ficha exibe HOJE de dado real)

| tipo | sinopse | ano | gêneros | classif. | duração/páginas | créditos | avaliações (prosa) | score/fontes | streamings | temporadas |
|---|---|---|---|---|---|---|---|---|---|---|
| FILME | ✅ | ✅ | ✅ | ✅ | ✅ (`duracao_minutos`) | ❌ | ❌ | ✅ | ✅ | — |
| SERIE | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| GAME | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | — (plataformas) | — |
| LIVRO | ✅ | ✅ | ✅ | ✅ (sugerida) | ❌ (páginas) | ❌ (autor) | ❌ | ✅ | — | — |
| COMIC | ✅ | ✅ | ✅ | ✅ (sugerida) | ❌ | ❌ (editora) | ❌ | ✅ | — | — |
| MANGA | ✅ | ✅ | ✅ | ✅ (sugerida) | ❌ (volumes/caps) | ❌ (autor) | ❌ | ✅ | — | — |

Legenda: ✅ disponível/real · ❌ sem fonte legítima populada no escopo atual.

## 3. Achado corrigido — crédito fabricado no fallback demo (MISLEADING)

`apps/web/src/lib/api.ts` `game()` (dataset de demonstração usado só quando a API
está indisponível) injetava créditos genéricos **fabricados**:
`cast: [{ name: "Desenvolvedor", role: "Desenvolvimento" }]` e
`crew: [{ name: "Disponível em breve", role: "Desenvolvedora" }]`. → Substituídos
por `[]` (a UI renderiza empty state honesto).

## 4. Decisão de status

**`PARTIAL_UI_CONTRACT_READY`** — contrato/UI honestos e testados; sinopse/ano/
gêneros/score/fontes/streamings/temporadas são reais; **elenco/créditos e
avaliações em prosa não têm fonte legítima populada** (exigiria provider/schema
em tarefa própria — não improvisar). Follow-ups: popular créditos via adapter
(se licenciado) e/ou dataset curado documentado.

## 5. Testes

- `apps/web/test/media-metadata.spec.ts` — guarda estática: sem placeholders
  genéricos de crédito; adapters mantêm `cast/crew/reviews` vazios.
- `apps/web/test/detail-t188.spec.tsx` — ficha sem sinopse/elenco/avaliações
  exibe `synopsisUnavailable`/`castUnavailable`/`noReviews`, sem crédito fabricado.
- **Vermelho evidenciado:** `HEAD` de `lib/api.ts` contém `name: "Desenvolvedor"`
  (guard falharia); verde após a correção (5/5). tsc web 0; eslint/prettier 0.

## 6. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
