# STYLE_GUIDE — Convenções de código

Fonte executável: `docs/PADROES_DESENVOLVIMENTO.md` (aprofundamento) + ESLint/Prettier
do repo. Aqui: o que o review cobra na prática.

## TypeScript / módulos

- **ESM com sufixo `.js` nos imports relativos** (`from "./x.js"`) — o API usa
  NodeNext; esquecer quebra o runtime, não o build.
- Tipos do Prisma para mocks/DTOs (D-447: `BigInt` para `bigint`, `Buffer` para
  `bytea` — mock "quase certo" quebra serialização em produção).
- `import type` para tipos (quirk fastify/Node 24 no dev local).

## NestJS (API)

- Pipe no PARÂMETRO, não no método (`@Body(new ZodValidationPipe(schema))`) —
  `@UsePipes` no método valida o `@Param` string contra o schema do body e quebra
  (armadilha T308/T285 documentada no controller).
- Fonte única para regras de domínio (ex.: `common/estados-consumo.ts`) — nada de
  duplicar máquina de estados em serviço.
- `@Optional()` para dependências ausentes em testes (CacheService, AuditLog).
- Audit em mutações: fire-and-forget FORA da transação RLS (falha de audit não derruba
  a operação — padrão T027).

## React/Next (web)

- RSC por padrão; `"use client"` só onde precisa; dados por server functions/fetch
  com envelope tipado (`api-interacoes.ts` é o exemplo: pass-through tipado do Prisma).
- Nunca renderizar chave i18n crua: helper para resolver label dinâmico
  (`nicheLabelKey`, `colunaNeutraLabelKey`).
- Cores: só CATEGORY_TOKENS/tokens semânticos — hex avulso em componente = rejeição.

## Testes

- `NODE_ENV=test npx vitest run` (de `apps/api` ou `apps/web`).
- Mock in-memory não emula o Postgres (ex.: P2023) — para validar "nunca chega ao
  Prisma", espiar o service (padrão `param-uuid-404.spec.ts`).
- E2E cross-spec muta estado (watchlist-flow cria interações) — specs que assumem
  clean state precisam de reset ou ordem (armadilha #143).
- Todo endpoint novo: teste que faz `JSON.stringify` da resposta (pega 500 de
  serialização — D-447).

## Commits e PRs

- Conventional commits com ID de tarefa: `feat(T028): ...`, `fix(...)`, `docs(...)`.
- Branch curta (`fix/b1-guards`) — nome longo quebra URL do preview Vercel/ZAP (D-530).
- **Nunca renomear head de PR aberto** (fecha o PR — lição T027).
- Commit atômico por intenção; docs de comportamento mudam no MESMO PR do código.

## Armadilhas conhecidas (resumo operacional)

| Armadilha | Regra |
|---|---|
| `python` escrevendo .md/.json | troca CRLF→LF no arquivo inteiro — usar replace de substring (node) |
| `$?` após pipe | reflete o último comando — capturar em variável antes |
| DELETE fetch com `content-type: json` e body vazio | 400 do Fastify — omitir o header |
| eslint de `scripts/*.mjs` na raiz | sem globals node — `/* global console */` per-file |
| Portas zumbis no Windows | `netstat -ano` + `taskkill //PID` |
