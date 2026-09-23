# DEVELOPMENT — Dia a dia de desenvolvimento

## Command map

```bash
# raiz
npm run lint / lint:fix / format / typecheck / audit:ci / security:gate

# apps/api
npm run start:dev                      # API :4000 (hot)
NODE_ENV=test npx vitest run           # suíte API
NODE_ENV=test npx vitest run test/x.spec.ts   # um spec
npx prisma migrate dev                 # nova migration (ver contrato B1 abaixo!)

# apps/web
API_PROXY_TARGET=http://localhost:4000 npm run dev   # :3000
npm run build / build:cf               # build Vercel / OpenNext-CF (informativo)
npm run test / test:e2e / test:a11y    # vitest / playwright / axe
```

## Fluxo de branch (ver [ITERATION](ITERATION.md))

Branch **curta** (`fix/xxx`, `feat/tNNN-xxx`) → commits atômicos
`type(TNNN): msg` → PR para `main` → CI. **Nunca** renomear head de PR aberto
(fecha o PR). **Nunca** force push/reset em `main`.

## Contrato para migrations (B1 — required check)

PR que altera `apps/api/prisma/migrations/**` ou `schema.prisma` PRECISA de:
label `migration-review` + seção `## Rollback` com plano + linha `Migration:`
(detalhes e template: `docs/b1-prod-guards.md`). Sem isso o check
`Migration Safety (B1)` bloqueia o merge.

## i18n (regra dura)

3 línguas com paridade: `apps/web/src/messages/{pt-BR,en-US,es-ES}.json`.
Chave nova = entra nas 3; validar JSON; guard do CI reprova chave ausente.
Label dinâmico via helper (`nicheLabelKey`, `colunaNeutraLabelKey`) — nunca
concatenar `t("a" + b)`.

## Quirks conhecidos (Windows/Git Bash — economia de horas)

| Sintoma | Causa/contorno |
|---|---|
| EADDRINUSE :3000/:4000 | processo zumbi: `netstat -ano | grep :4000` + `taskkill //PID <pid> //F` |
| SSR usa dados de produção no dev | falta `API_PROXY_TARGET=http://localhost:4000` |
| E2E login falha (cookie some) | host ≠ host: usar o MESMO host (localhost×127.0.0.1) na página e na API; `NODE_OPTIONS=--dns-result-order=ipv4first` |
| Script python corrompe .md/.json | CRLF→LF em arquivo inteiro — editar com node (replace de substring) |
| Heredoc trunca no Git Bash | escrever arquivo com Write/node, não heredoc longo |
| subshell não exporta vars | exportar no MESMO comando do processo |
| `/tmp` invisível p/ python | usar pasta do repo ou `node -e` |
| SW estranho serve chunk velho no dev | `LimpezaServiceWorker` cuida em prod; no dev: unregister + `caches.delete` |
| login de teste 403 repetido | lockout brute-force — aguardar janela ou usar apiLogin (context.request) |
| DELETE fetch → 400 "Body cannot be empty" | seu client mandou `content-type: application/json` sem body — omitir o header |
| `$?` mentiroso após pipe | capturar em variável antes do pipe terminar |

## Onde mexer (mapa rápido)

- Regras de domínio compartilhadas → `apps/api/src/common/` (ex.: `estados-consumo.ts`)
- Guards/pipes → `apps/api/src/common/guards|pipes/`
- Cores/tokens web → `apps/web/src/lib/` (CATEGORY_TOKENS)
- Workflows → `.github/workflows/` (CI em `ci.yml`, ver `docs/CI.md`)
