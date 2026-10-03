# @media-rate/api

Backend NestJS (Fastify) + Prisma/PostgreSQL do MEDIA Rate — sessão opaca, RLS, LGPD, Stripe, MEDIA Score™. Deploy na **Railway** via [`Dockerfile`](./Dockerfile) (push em `main`; `prisma migrate deploy` roda no boot).

## Comandos (da raiz do monorepo)

```bash
npm run dev -w apps/api            # desenvolvimento
npm run build -w apps/api          # build (tsc)
npm run test -w apps/api           # Vitest (unit/e2e com supertest)
npm run db:migrate -w apps/api     # aplica migrations (prisma migrate deploy)
npm run db:migrate:dev -w apps/api # cria/aplica migrations em dev
npm run db:generate -w apps/api    # gera o client Prisma
npm run db:status -w apps/api      # status das migrations
```

Migrations novas exigem label `migration-review` na PR (guard fail-closed B1 — ver `docs/06-devops-deployment/b1-prod-guards.md`).

## Configuração de Ambiente (T204)

As variáveis de ambiente são separadas por app (Princípio do Menor Privilégio — nenhum segredo de backend vai para o frontend):

| Arquivo | Onde vai | Conteúdo |
|---|---|---|
| `apps/api/.env.example` | copie para `apps/api/.env` | **Backend**: banco, sessão, admin, Stripe, fontes de nota, Redis, jobs |
| `apps/web/.env.example` | copie para `apps/web/.env.local` | **Frontend**: apenas `NEXT_PUBLIC_*` (públicas) |
| `.env.example` (raiz) | — | **Tooling/monorepo** apenas; nenhum segredo de produto |

### Setup local

```bash
cp apps/api/.env.example apps/api/.env      # preencha as chaves
cp apps/web/.env.example apps/web/.env.local
bash scripts/validate-env.sh                 # confere as obrigatórias (só nomes, nunca valores)
```

Atenção: o backend carrega `apps/api/.env` (dotenv/config). Arquivos `.env.local` **não** são lidos pela API — chaves soltas em `.env.local` são inertes para o backend.

### Produção (Railway)

Rode `bash scripts/check-railway-vars.sh` para a lista exata de variáveis a adicionar no painel (obrigatórias, recomendadas, web e as que podem ser removidas). Depois valide com `bash scripts/validate-env.sh`.

### Variáveis NÃO lidas pelo código (podem ser removidas do Railway)

`JWT_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` (o IGDB autentica via Twitch), `SESSION_SECRET`, `RAWG_API_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_FREE_ID`, `TRAKT_CLIENT_SECRET`, `TRAKT_REDIRECT_URI`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `VERCEL_OIDC_TOKEN`.

O código lê **`COOKIE_SECRET`** para assinar a sessão (obrigatória em produção — sem ela o boot falha).
