# MEDIA Rate

**Descubra o que assistir, ler e jogar — com um score único.** Monorepo do produto MEDIA Rate (END ART Studios): catálogo de filmes, séries, games, livros, HQs e mangás com o MEDIA Score™ consolidado de fontes públicas.

> ⚠️ **Repositório operado por agentes de código (par Thinker/Doer).** Antes de qualquer mudança, leia [`AGENTS.md`](AGENTS.md) — fluxo PR→merge sem push direto, convenções de commit/i18n/notas e o mandato GRAFT-FIRST. Status de decisões: [`DECISOES.md`](DECISOES.md). Fila de pendências humanas: [`PENDENCIAS_OPERADOR.md`](PENDENCIAS_OPERADOR.md).

## Estrutura

```
apps/
  web/     Frontend Next.js 16 (App Router, Turbopack, next-intl v4, RSC) → Vercel
  api/     Backend NestJS + Prisma/PostgreSQL (+ Dockerfile)                → Railway
docs/      Documentação em 8 pilares (dev, api, segurança/compliance, devops…)
scripts/   Scripts de CI/CD, validação e diagnóstico
k6-scripts/ Testes de carga
test/      DAST (ZAP baseline) e utilitários de teste de infra
```

Princípios do monorepo: a **raiz é só configuração global** (lint, tsconfig base, compose de infra de dev, workspaces npm); **separação rígida de contexto** entre `apps/web` e `apps/api` (nenhum segredo de backend vai para o frontend); documentação descentralizada — cada app tem seu `README.md` e os guias conceituais vivem em [`docs/`](docs/README.md).

## Pré-requisitos

- **Node.js ≥ 20** + npm (workspaces; **não usar pnpm/yarn** — o lockfile é `package-lock.json`)
- **Docker Compose** (infra local: Postgres, Redis, MinIO, Loki, Grafana)
- Contas/chaves de terceiros conforme `.env.example` de cada app (Stripe, TMDB, PostHog etc. — só para features correspondentes)

## Início rápido

```bash
# 1. Instalar dependências (workspaces hoisted na raiz)
npm ci

# 2. Infra local (banco, cache, storage, observabilidade)
docker compose up -d postgres redis

# 3. Variáveis de ambiente (por app — princípio do menor privilégio)
cp apps/api/.env.example apps/api/.env          # preencha as chaves
cp apps/web/.env.example apps/web/.env.local    # apenas NEXT_PUBLIC_*
bash scripts/validate-env.sh                    # confere as obrigatórias

# 4. Banco de dados (Prisma)
npm run db:generate -w apps/api
npm run db:migrate -w apps/api                  # aplica as migrations

# 5. Rodar (dois terminais)
npm run dev -w apps/api                         # API (Fastify/NestJS)
npm run dev -w apps/web                         # Web (Next.js, :3000)
```

Guia completo de variáveis e produção (Railway): [`apps/api/README.md`](apps/api/README.md).

## Comandos principais

| O que | Comando (da raiz) |
|---|---|
| Lint (monorepo inteiro) | `npm run lint` / `npm run lint:fix` |
| Formatação (Prettier) | `npm run format` / `npm run format:check` |
| Typecheck | `npm run typecheck` |
| Testes — frontend (Vitest) | `npm run test -w apps/web` |
| Testes — backend (Vitest) | `npm run test -w apps/api` |
| E2E (Playwright, em `apps/web`) | `npx playwright test` |
| Gate de dependências | `npm run audit:ci` |
| Gate de segredos | `npm run security:gate` |
| Migrations/seeds (Prisma) | `npm run db:* -w apps/api` (`db:migrate`, `db:seed`, `db:status`…) |

Smoke pós-deploy e detalhes de teste: [`docs/03-development-process/TESTING.md`](docs/03-development-process/TESTING.md).

## Deploys (automáticos no `main`)

| App | Onde | Como |
|---|---|---|
| `apps/web` | **Vercel** | push em `main` deploya (sem Dockerfile) |
| `apps/api` | **Railway** | push em `main` builda via `apps/api/Dockerfile` e aplica `prisma migrate deploy` no boot |
| Workers de mídia | **Cloudflare** | S0/R2 (`apps/web/workers`) |

Merges em `main` exigem CI verde + PR (ruleset `protect-main`; push direto proibido — ver [`docs/06-devops-deployment/`](docs/06-devops-deployment/)).

## Segurança

Vulnerabilidades e divulgação responsável: [`SECURITY.md`](SECURITY.md). LGPD e inventário de dados: [`docs/05-security-compliance/`](docs/05-security-compliance/).

## Licença

Proprietária — © END ART Studios. Veja [`LICENSE`](LICENSE) e [`NOTICE`](NOTICE).
