# ONBOARDING — Comece aqui (setup em ~15 minutos)

Objetivo: clone → banco local → API + web rodando → 1 teste verde.

## 0. Pré-requisitos

- Node 20 (CI usa `NODE_VERSION: "20"`; dev local tem rodado 20/24) + npm 10+
- Docker (Postgres local) · Git · Windows ok (quirks em [DEVELOPMENT](DEVELOPMENT.md))

## 1. Clonar e instalar

```bash
git clone https://github.com/ENDARTStudios/MEDIA-Rate.git "MEDIA Rate"
cd "MEDIA Rate"
npm ci                     # workspaces raiz + apps (npm, NUNCA pnpm)
```

## 2. Ambiente (.env)

Copie os exemplos e preencha o necessário para dev local (sem segredos de produção!):

```bash
cp apps/api/.env.example apps/api/.env     # DATABASE_URL aponta p/ localhost:5434
cp apps/web/.env.example  apps/web/.env.local
```

Segredos reais ficam no secret manager/Railway — **nunca** em commit
([RULES](RULES.md) 12, `docs/BOAS_PRATICAS_SECRETS.md`).

## 3. Banco + seeds

```bash
docker run -d --name mediarate-pg -e POSTGRES_USER=mediarate \
  -e POSTGRES_PASSWORD=mediarate_dev -e POSTGRES_DB=mediarate -p 5434:5432 postgres:16
cd apps/api
npx prisma migrate deploy
npm run db:provision:test-users   # usuários free/plus/premium/admin
```

## 4. Subir API e web

```bash
# terminal 1 (API :4000)
cd apps/api && npm run start:dev
# terminal 2 (web :3000) — com API local, exporte o proxy SSR:
API_PROXY_TARGET=http://localhost:4000 npm run dev   # em apps/web
```

Health check: `curl http://localhost:4000/health` → `{"status":"ok",...}`.

## 5. Testes (prove o ambiente)

```bash
cd apps/api && NODE_ENV=test npx vitest run          # suíte API (centenas de testes)
cd ../web     && NODE_ENV=test npx vitest run        # suíte web
# E2E completo local (API+DB+fixture, recusa DATABASE_URL fora de localhost):
node ../../scripts/evidence-local.mjs
```

## 6. Ler na ordem (30 min)

1. [RULES](RULES.md) — as 20 regras invioláveis
2. [ARCHITECTURE](ARCHITECTURE.md) — como as peças se conectam
3. [ITERATION](ITERATION.md) — o ciclo de trabalho (branch → PR → merge → smoke)
4. [TESTING](TESTING.md) + [CODE_REVIEW](CODE_REVIEW.md) — o que o CI e o review exigem

## 7. Primeira tarefa sugerida

Rode `npm run lint` na raiz e em `apps/*`, corrige o que aparecer, abre PR docs/chore
— exercita o ciclo completo ([ITERATION](ITERATION.md)) sem risco.
