# PR — feat(f10): image optimization quota mitigation (T029–T040)

> Corpo rastreável do pacote Fase 10. Título do PR:
> `feat(f10): image optimization quota mitigation — robots, tokens, sharp, ladders, audit gate (T029-T040)`

## Problema

Image Transformations em ~99% da cota Hobby (4.969/5.000/mês, ~165/dia, picos
700–790). Co-causas auditadas (D-439): crawlers de IA varrendo páginas/imagens
(Cleveland + Washington ≈ 67% do consumo vs São Paulo 17,4%) + otimização 100%
runtime sem tokens (16 larguras default × formatos por poster).

## Mudança por tarefa (commits nesta branch)

| Tarefa | Commit | Entrega |
|---|---|---|
| T029 auditoria | `8795090` | D-439 + Fase 10 no plano (H3 refutada, H4 corrigida) |
| T030 robots/previews | `98a47dc` | robots por bot (grupos A/B) + noindex em preview; teste 4/4 |
| T034 handoffs | `2d3b0a3` | schema STATUS oneOf (D-442) + validator alinhado; integrity 7/7 |
| T032 tokens | `2f04bcf` | deviceSizes/imageSizes/formats/qualities + `isUnoptimizedSource`; card 11→8 larguras |
| T031 upload sharp | `676fda8` | ladder WebP 320/640/960 (sharp 0.35.4) + backfill + srcset local; upload 89,56% |
| T036 remoto | `c08dacf` | `remoteLadder` (TMDB/IGDB/OL/Google Books) + `<img>` estático + bypass total (9 componentes) |
| T037 deps | `3329572` | HIGHs sem major zerados; deepmerge-ts residual (P009, D-457) |
| T038 testes | `1939284` | relógio congelado + mock count; api 841/841 + web 347/347 |
| T039 audit gate | `f94c065` | `scripts/audit-ci.mjs` + allowlist GHSA-ggr8-5vv4-36mx (P009/D-462) |
| T040 gate testado | `2b32b51` | regra pura + spec 8 casos; api 849/849 |
| T041 PR aberto | `2b82820` | PR #74 open/mergeable (docs/diagnostico-ci-pr74.md) |
| T042 CI-repair | `9212351` | lint --fix herdado (0 erros) + generate (test+RLS+build) + CodeQL v4 + ZAP real (`media-rate-git-f10...`) |
| T043 ZAP policy | `PENDENTE` (D-472): `requires_tdd: false`; `espec` emitida pelo Thinker no ciclo (§10.2, PROPOSTA_DOER aprovada, D-470); `P011` (`URL` real corrigida `D-472`/`T042`); `P012` (`permissions`); `P013` (`GHAS`/exceção `D-472`); `docs/diagnostico-ci-pr74.md` (`WARN-NEW: 15`, `FAIL-NEW: 0`, `PASS: 55`, `fail_action: true` `FAIL`; `creation` `Resource` `P012` `restritivo`). Não vetante (`D-468`). |
| T044 diagnóstico | `c7eeeb5` | docs/diagnostico-ci-pr74.md (`6` `jobs` `verdes`; `2` `repo-level`; `E2E` `não-vetante`) |
| T045 E2E a11y | `CANDIDATO` (`PENDENTE`) | `D-483` (`revisão` `trimestral`); `E2E` `color-contrast` `serious` `pre-existente` `não` `regressão` `F10` (`correlação` `com` `diff` `inexistente`) |
| T046 gh CLI | `5e612e6` | `gh-safe` `operativo` (`ps1` `exit` `0` `keyring`; `.sh` `POSIX` `doc` `sem` `exec` `local`); `P010` (`harness` `injetado` `GITHUB_TOKEN` `Process`; `correção`: `origem`) |

Commits `docs(...)` intercalados: acks com D-440/D-441, D-443..D-465.

## Decisões

D-439..D-465 em `DECISOES.md` (auditoria, robots A/B, oneOf, tokens, sharp
local, ladders remotas, `<img>` > unoptimized, clamp, sweep vivos, ordering,
hero no original, deps PARCIAL, sweep rule, IGDB real, audit gate, exceção
governada). Exceção de CI: `config.auditAllowlist` (P009/D-462, revisão
trimestral 2026-12 no runbook T033).

## Verificação pós-merge (pacote [8], Operador)

1. `curl -s $PREVIEW/robots.txt` — grupos A/B; `curl -sI` — `X-Robots-Tag: noindex` em preview, ausente em produção.
2. HTML do catálogo: srcset ⊆ tokens; poster remoto sem `/_vercel|_next/image`.
3. Dashboard 7 dias (meta <20/dia; thresholds 1.250/2.500 semanais).

## Ordem de merge (D-468)

1º este PR → 2º rebase #3 (docs) → 3º rebase #4 (alinhar LazyImage a
image-policy.ts; se exigir código vira T042) → 4º #2 segue draft em review.
Nenhum PR mergeia com checks vermelhos.
