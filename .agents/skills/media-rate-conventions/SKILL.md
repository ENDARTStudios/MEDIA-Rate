---
name: media-rate-conventions
description: >
  Convenções obrigatórias do projeto MEDIA Rate (END ART Studios) para qualquer
  trabalho de código ou docs: fluxo PR→merge sem push direto, formato de commit,
  i18n em 3 línguas com paridade, política de escala de notas, rotas canônicas de
  smoke, GRAFT-FIRST, protocolo Thinker/Doer e políticas de segredo/LGPD.
  Use SEMPRE antes de editar código, abrir PR, escrever testes ou fazer deploy
  neste repositório.
---

# Convenções MEDIA Rate (uso pelo agente)

Regras consolidadas de `AGENTS.md`, `docs/03-development-process/RULES.md`,
`docs/03-development-process/TESTING.md` e decisões D-xxx. Em conflito, vence o
arquivo canônico no repo — esta skill é um atalho, não a fonte.

## Fluxo de mudança (D-457/T459 — não negociável)

1. NUNCA push direto em `main` (ruleset `protect-main` bloqueia; exceção só em
   incidente registrado em `DECISOES.md`).
2. Branch dedicada a partir de `origin/main` (`feat/`, `fix/`, `docs/`, `chore/`
   + id de tarefa, ex.: `fix/t147-score-display-normalization`).
3. PR com corpo descrevendo tipo/escopo ("docs-only", "frontend-only"...),
   evidência e riscos. Merge só com checks required verdes + REVIEW APPROVED
   (o GitHub bloqueia self-approve pela conta autora — registrar o review como
   comentário quando o Operador delegar).
4. Nunca incluir o commit local `123ce28e` (contaminação — verificar
   `git merge-base --is-ancestor 123ce28e HEAD`; exit 1 = limpo).
5. Proibidos: `reset --hard`, `checkout --`, `clean -fdx`, stash destrutivo,
   rebase, squash, force push.

## Commits

- Convencionais e em pt-BR SEM acentos: `fix(UG-09): normalizar exibicao...`,
  `docs(security): diagnosticar divida...`.
- Corpo com id de tarefa (Txxx), o que/motive/evidência, e o que NÃO foi tocado.

## i18n (D-210)

- `apps/web/src/messages/{pt-BR,en-US,es-ES}.json` — SEMPRE as 3 línguas com
  paridade de chaves; validar JSON após editar; guard de encoding/BOM no CI.

## Política de notas (BETA-GAP-09 + T147)

- Escala nativa: **somente GAME 0-100**; mangá/filme/série/livro/quadrinho 0-10.
- Proibido arredondar na exibição: usar o pipeline de
  `apps/web/src/lib/score-utils.ts` (`escalaPorTipo`/`exibirScore`/
  `formatarScoreLocale`); trunca 1 casa (7,95 → 7,9). Aria com escala real
  ("7,9 de 10" — nunca "de 100" para mangá). Separador decimal por locale.

## Smoke e rotas canônicas

- Smoke pós-merge: `/health` (Railway), `/pt-BR`, `/en-US`, `/es-ES`,
  `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` → 200.
- A rota do catálogo é **`/catalog`** (nunca `/catalogo` — 404 não é defeito).
- curl puro leva 429; usar User-Agent de browser nas checagens.

## Navegação e implementação

- **GRAFT-FIRST** (AGENTS.md): `graft ask/grep/callers` antes de ler/editar
  fonte; `graft find_all` para blast radius antes de refactor.
- TDD quando viável: spec vermelho antes da implementação (padrão
  `apps/web/test/*.spec.tsx`, rodar de `apps/web`; API de `apps/api`).
- Mocks Prisma fiéis aos tipos do driver (D-447): `bigint` → `BigInt`,
  `bytea` → `Buffer`; endpoint novo exige teste com `JSON.stringify`.

## Protocolo Thinker/Doer

- Tarefas têm id (Txxx); STATUS em JSON canônico no `.claude/exchange_log.jsonl`
  (gitignored) com evidências; REVIEW APPROVED autoriza merge.
- Pendências de decisão do Operador vão para `PENDENCIAS_OPERADOR.md`.
- Nenhum BETA-GAP marcado DONE sem REVIEW; GO de convites permanece SUSPENSO.

## Segurança/LGPD

- Segredos (`sk_`, `whsec_`, tokens, senhas): nunca em chat/log/commit/evidência.
- Skills/ferramentas de segurança (security-audit, strix): somente staging ou
  local, dados sintéticos — nunca produção com dados de beta.
- Sem scraping não autorizado; fontes de metadados devem ser legítimas
  (ver `docs/03-development-process/AGENT_TOOLING.md` § fontes).
- `.claude/` é gitignored: relatórios de evidência entram com `git add -f`.
