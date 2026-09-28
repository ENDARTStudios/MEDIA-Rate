# BETA-GAP-15 / T129 — Localização de títulos de mídia (descoberta + decisão)

**Data:** 2026-09-28 · **Branch:** `feat/t129-beta-gap-15-title-localization` (de `origin/main` `695c4ba4`)
**Regra:** só dados reais persistidos; sem inventar tradução; sem schema/backend destrutivo.

## 1. Definição canônica

- O registry **não** traz texto de BETA-GAP-15 (só o ID). O packet autoriza a
  interpretação "títulos localizados/idioma-aware" (triagem do Doer).
- **Política canônica REAL existe** e é documentada em código (T400/**D-369**):
  `apps/web/src/lib/i18n-content.ts:105` `titleForLocale` e
  `apps/web/src/lib/api.ts:236` `buildTitleLocalized`:
  - `pt → titulo`
  - `en → titulo_en → titulo_original (se ≠ PT) → titulo`
  - `es → titulo_es → titulo_en → titulo`
- Campos persistidos (`schema.prisma:334-348`): `titulo`, `titulo_original`,
  `titulo_en`, `titulo_es`. **Sem schema novo/migração.**

## 2. Estado real (descoberta read-only)

| Superfície | Título localizado? | Evidência |
|---|---|---|
| Catálogo (list `/api/v1/midias`) | ✅ | `mediaFromList` usa `buildTitleLocalized` (`api.ts:1008`). |
| Detalhe (`/api/v1/midias/slug/:slug`) | ✅ | `mediaFromApi` (`api.ts:283`). |
| Descoberta (`/api/v1/discover`) / Ctrl+K | ✅ | `mediaFromDiscoverItem` (`api.ts:1133`). |
| **Busca do catálogo (`/api/v1/search`)** | ❌ **gap** | `mediaFromSearchItem` (`api.ts:981`) **não** setava `titleLocalized`; e `discover.service.search()` não retornava `titulo_en/es/original`. → resultados de busca exibiam **PT fixo** em en-US/es-ES. |

## 3. Correção (read-only, aditiva, sem schema)

1. **Backend** `discover.service.search()`: passa a incluir `titulo_original`,
   `titulo_en`, `titulo_es` no item (já disponíveis no `discover()`; **aditivo/
   retrocompatível** — sem novo endpoint, sem DTO guard quebrado).
2. **Web** `ApiSearchItem` ganha `titulo_original/en/es` **opcionais**; e
   `mediaFromSearchItem` monta `titleLocalized` via `buildTitleLocalized`
   (mesma política do catálogo/detalhe).

Slugs/links **inalterados** (slug canônico segue vindo da API). Sem tradução
inventada: apenas os campos persistidos + fallback determinístico.

## 4. Testes

- `apps/api/test/discover-service.spec.ts` (**29/29**, +2 T129): `/search` expõe
  `titulo_en`/`titulo_es`; ausente → `null` (sem inventar). **Vermelho:** o item
  do `/search` não tinha os campos.
- `apps/web/test/catalog-filters-api.spec.ts` (3/3, +1 T129): resultado de busca
  carrega `titleLocalized` (en/es) com `pt` canônico.
- `apps/web/e2e/title-localization.spec.ts` (novo, contract mock do `/search`):
  em `pt-BR`/`en-US`/`es-ES` o card exibe o título do locale ativo; em en/es o
  título PT **não** aparece; mobile 390x844 sem overflow. `title_localization_mode=contract_mock`.
- Suíte web **444/444**; API discover **47/47**; `tsc` api/web 0; eslint/prettier 0.

## 5. Lacunas honestas

- `GET /api/v1/midias/:id` (por **id**, admin-ish) segue com shape estreito — não
  usado pelo caminho de localização do web (o web usa `slug/:slug`). Fora do escopo.
- Se um título não tiver `titulo_en/es`, o fallback é `titulo` (PT) — comportamento
  determinístico e honesto (não é "tradução"; é o dado real disponível).

## 6. PR / merge / smoke (preenchido após merge)

- Commit: `(a preencher)` · PR: `(a preencher)` · merge: `(a preencher)`
- Required: `(a preencher)` · `123ce28e`: `(a preencher)` · Smoke 7/7: `(a preencher)`
