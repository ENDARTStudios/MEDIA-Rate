# SPRINT.md — MEDIA Rate

> Sprint único gerado a partir da análise do repositório em 2026-08-14.
> Escopo: **mínimo viável**, sem implementar fora do que está listado aqui.

---

## 1. Contexto e justificativa da escolha

O produto já tem as Fases 0–9 concluídas e a F11 (T285–T296) implementada.
O MEDIA Score™ v3 (estimador Bayesiano `MEDIA = (v/(v+m))·S + (m/(v+m))·C`) é o
diferencial do produto e já consome `votos` (v) de ponta a ponta:

- `NotaColetada.votos` (interface de adaptador) → `avaliacao_fonte.votos` (DB)
  → `votosTotal` → pull Bayesiano + `Confidence Score`.

**Gap:** a contagem de votos só é reportada por parte dos adaptadores. Nos
domínios ativos, faltam votos em **games (OpenCritic — fonte primária de crítica,
peso 0.3)** e **anime/mangá (AniList peso 0.3 e Kitsu peso 0.2)**. Sem votos
(`v = 0`), o motor usa `S` direto — sem o pull Bayesiano e sem o componente
Volume (30%) do Confidence Score. O gap degrada a precisão exatamente onde o
produto quer ser confiável.

**Escolha (maior impacto × menor complexidade):** completar `votos` nos 3
adaptadores ativos que já buscam o rating mas descartam a contagem. Mudança
**aditiva** — nenhuma migration, nenhum contrato de API, nenhuma dependência
nova. O campo `votos` já existe em interface, engine e schema.

## 2. Objetivo

Fazer com que os adaptadores ativos de games e anime/mangá reportem a contagem
de avaliações (`votos`) que já vem na resposta da fonte, completando o pull
Bayesiano do MEDIA Score v3 em todos os domínios ativos.

## 3. Tarefas

### T1 — OpenCritic: reportar `numReviews` como `votos`
- `OpenCriticDetalhe` ganha `numReviews?: number`.
- O retorno de `coletar()` passa a incluir `votos: detalhe.numReviews`
  (omitido/`undefined` quando ausente ou `<= 0`).
- Fonte: campo `numReviews` do endpoint de detalhe (`/game/{id}`, RapidAPI).

### T2 — AniList: reportar `popularity` como `votos`
- A query GraphQL passa a pedir `popularity` (`Media { averageScore siteUrl popularity }`).
- `AniListMedia` ganha `popularity?: number`.
- O retorno inclui `votos: dados.data?.Media?.popularity` (omitido quando ausente).
- `popularity` = nº de usuários com a obra na lista (proxy de volume, documentado).

### T3 — Kitsu: reportar `ratingCount` como `votos`
- `KitsuMedia` ganha `ratingCount?: number | null`.
- O retorno inclui `votos` normalizado (omitido quando `null`/`<= 0`).

## 4. Critérios de conclusão (binários)

- [x] `OpenCriticAdapter` retorna `votos` quando `numReviews` presente e `undefined` quando ausente.
- [x] `AniListAdapter` retorna `votos` quando `popularity` presente e `undefined` quando ausente.
- [x] `KitsuAdapter` retorna `votos` quando `ratingCount` presente e `undefined` quando `null`/`<= 0`.
- [x] Sem mudança de comportamento quando a fonte não informa contagem (rating continua sendo coletado).
- [x] Testes unitários novos/estendidos cobrindo os 3 adaptadores (mock de HTTP).
- [x] `vitest run` verde nos specs de adaptadores; `tsc --noEmit` e `lint` sem novos erros.

## 5. Arquivos afetados

| Arquivo | Tipo de mudança |
|---|---|
| `apps/api/src/modules/media-score/adapters/opencritic.adapter.ts` | aditivo (campo + retorno) |
| `apps/api/src/modules/media-score/adapters/anilist.adapter.ts` | aditivo (query + campo + retorno) |
| `apps/api/src/modules/media-score/adapters/kitsu.adapter.ts` | aditivo (campo + retorno) |
| `apps/api/test/adapters-novos.spec.ts` | teste (OpenCritic `votos`) |
| `apps/api/test/novas-midias-adapters.spec.ts` | teste (AniList + Kitsu `votos`) |

**Dependências afetadas:** nenhuma nova. Reusa `http.utils.ts` (`fetchJson`/`postJson`),
a interface `FonteAdapter`/`NotaColetada` e o `source-registry.ts` — todos já existentes.

## 6. Testes necessários

1. **OpenCritic** (em `adapters-novos.spec.ts`): mock do detalhe com `numReviews` →
   `notas[0].votos === numReviews`; e sem `numReviews` → `votos` `undefined`.
2. **AniList** (em `novas-midias-adapters.spec.ts`): mock do GraphQL com `popularity` →
   `notas[0].votos === popularity`; e sem `popularity` → `votos` `undefined`.
3. **Kitsu** (em `novas-midias-adapters.spec.ts`): mock com `ratingCount` →
   `notas[0].votos === ratingCount`; e `ratingCount: null` → `votos` `undefined`.

## 7. Fora de escopo (não fazer agora)

- Adicionar votos aos adaptadores *gated* (`MEDIA_PREPARACAO_ENABLED`): goodreads,
  letterboxd, metacritic, rottentomatoes, skoob, librarything, amazon, etc.
- Alterar fórmula/pesos do motor, `source-registry`, schema ou migrations.
- Novos endpoints, jobs ou UI.
