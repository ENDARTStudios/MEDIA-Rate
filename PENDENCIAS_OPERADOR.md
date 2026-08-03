# PENDENCIAS_OPERADOR.md

Fila de ações manuais que só o Operador pode executar (cliques em painel de terceiro, 2FA físico, decisão de nome/domínio, cartão, etc.). O Doer só adiciona itens aqui quando não há automação possível.

---

### [1] ~~Rotacionar segredos expostos no "Initial commit"~~ — INVESTIGADO: nada real foi exposto

Resultado da investigação (2026-08-03):
- O único arquivo `.env` na história é `apps/backend/.env` (blob `46b7aac`) do commit inicial
  `9f71944` (o hash `87481e7` citado não existe no histórico atual), contendo APENAS
  `DATABASE_URL=postgresql://mediarate:mediarate@localhost:5432/mediarate` — URL local de dev
  (host `localhost`), sem segredos de provedor e sem credencial de produção.
- Nenhuma chave de provedor (Stripe/PostHog/TMDB/OMDB/Twitch/Google Books/etc.) foi commitada
  em nenhum commit; todas foram adicionadas depois via variáveis de ambiente (Vercel/Railway).
- Árvore atual: zero credenciais reais (scan por `sk_live_`, `whsec_`, `phc_`, `AKIA`, `ghp_`,
  `xoxb-`, `BEGIN PRIVATE` = nenhuma ocorrência; o único hit é o literal documental `whsec_...`
  neste arquivo).
- Ação necessária: NENHUMA rotação. Resíduo: a URL de dev local permanece no histórico do git
  (inofensiva — aponta para `localhost`). Purge de história com `git filter-repo` é OPCIONAL e
  fica a critério do Operador (custo: reescrita de história + force-push).

---

### [2] Configurar Vercel (frontend)

Por quê: o frontend Next.js precisa ser deployado no Vercel para ficar acessível ao público.
Onde: https://vercel.com
Passo a passo:
1. Crie conta em https://vercel.com (plano Hobby — gratuito).
2. Importe o repositório do GitHub.
3. Configure o diretório root como `apps/web`.
4. Adicione as variáveis de ambiente (Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` = `https://api.media-rate.example.com` (URL do backend)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = sua chave pública do Stripe
   - `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` = sua chave do PostHog
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://app.posthog.com`
5. Copie o `VERCEL_PROJECT_ID` e `VERCEL_ORG_ID` (Settings → General).
6. Gere um `VERCEL_TOKEN` em https://vercel.com/account/tokens.
7. Adicione `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` como Secrets no GitHub (Settings → Secrets and Variables → Actions).
Como saber que deu certo: acesse a URL do Vercel (ex: media-rate.vercel.app) e veja a landing page.
Depois de feito: responda "feito o item Nº 2"

---

### [3] Configurar Railway (backend + PostgreSQL)

Por quê: o backend NestJS precisa de um servidor para rodar + PostgreSQL para os dados.
Onde: https://railway.app
Passo a passo:
1. Crie conta em https://railway.app (plano Starter — $5 crédito/mês grátis).
2. Crie um novo projeto e adicione:
   - **PostgreSQL** (Add → Database → PostgreSQL)
   - **GitHub repo** (Add → GitHub repo → selecione o repositório)
3. Configure o serviço da API:
   - Root directory: `apps/api`
   - Build command: `npm ci && npx prisma generate`
   - Start command: `node dist/main.js` (após `tsc -p tsconfig.json`)
4. Adicione as variáveis de ambiente (Variables):
   - `DATABASE_URL` = (copie do PostgreSQL do Railway)
   - `STRIPE_SECRET_KEY` = sua chave secreta do Stripe
   - `STRIPE_WEBHOOK_SECRET` = configure webhook em https://dashboard.stripe.com/webhooks
   - `STRIPE_PRICE_PLUS_ID` = price_... do produto Plus (crie em https://dashboard.stripe.com/products)
   - `STRIPE_PRICE_PREMIUM_ID` = price_... do produto Premium
   - `SESSION_SECRET` = gere com `openssl rand -base64 64`
   - `COLUMN_ENCRYPTION_KEY` = gere com `openssl rand -base64 32`
   - `ANALYTICS_WRITE_KEY` = sua chave do PostHog
   - `ALLOWED_ORIGINS` = `https://media-rate.example.com,https://media-rate.vercel.app`
   - `NODE_ENV` = `production`
   - `PORT` = `4000`
5. Copie o `RAILWAY_SERVICE_ID` (Settings → General).
6. Gere um `RAILWAY_TOKEN` em https://railway.app/account/tokens.
7. Adicione `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`, `DATABASE_URL` como Secrets no GitHub.
Como saber que deu certo: acesse `https://api.media-rate.example.com/health` e veja `{"status":"ok"}`.
Depois de feito: responda "feito o item Nº 3"

---

### [4] Configurar domínio próprio (opcional mas recomendado)

Por quê: usar `media-rate.example.com` em vez de `media-rate.vercel.app`.
Onde: painel do registrador de domínio (ex: Namecheap, GoDaddy) + Vercel + Railway.
Passo a passo:
1. Compre o domínio `mediarate.app` (ou similar) em um registrador.
2. No Vercel: Settings → Domains → adicione `media-rate.example.com`.
3. No Railway: Settings → Networking → adicione `api.media-rate.example.com`.
4. Configure DNS no registrador:
   - `A` record apontando para Vercel (veja instruções no painel do Vercel)
   - `CNAME` para `api` apontando para Railway
5. Atualize `ALLOWED_ORIGINS` no Railway para incluir o domínio próprio.
Como saber que deu certo: acesse `https://media-rate.example.com` e veja a landing page.
Depois de feito: responda "feito o item Nº 4"

---

### [5] Obter chave do TMDB e popular catálogo

Por quê: o catálogo de mídias precisa ser populado com filmes e séries reais.
Onde: https://www.themoviedb.org/settings/api
Passo a passo:
1. Crie conta em https://www.themoviedb.org
2. Vá em Settings → API → Request API Key (escolha "Developer")
3. Copie a `API Key`
4. Adicione `TMDB_API_KEY` nas variáveis de ambiente do Railway.
5. Rode o seed: `cd apps/api && npm run db:seed:tmdb`
Como saber que deu certo: acesse `/api/v1/midias` e veja 400 mídias (200 filmes + 200 séries).
Depois de feito: responda "feito o item Nº 5"

---

### [6] Configurar webhook do Stripe

Por quê: o Stripe precisa avisar o backend quando um pagamento é confirmado.
Onde: https://dashboard.stripe.com/webhooks
Passo a passo:
1. Acesse https://dashboard.stripe.com/webhooks
2. Clique "Add endpoint"
3. URL: `https://api.media-rate.example.com/api/v1/webhooks/stripe`
4. Eventos: `checkout.session.completed`, `customer.subscription.deleted`
5. Copie o "Signing secret" (whsec_...)
6. Adicione `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente do Railway.
Como saber que deu certo: faça um pagamento de teste e veja o log no Railway confirmando o webhook.
Depois de feito: responda "feito o item Nº 6"

---

### [7] Configurar PostHog (analytics)

Por quê: para medir ativação, retenção e conversão (Discovery Q7).
Onde: https://app.posthog.com
Passo a passo:
1. Crie conta em https://posthog.com (Cloud free tier — 1M events/mês grátis).
2. Copie o "Project API key" em Project Settings.
3. Adicione `ANALYTICS_WRITE_KEY` nas variáveis do Railway e Vercel.
Como saber que deu certo: faça login no site e veja o evento `user_session_start` no PostHog.
Depois de feito: responda "feito o item Nº 7"
