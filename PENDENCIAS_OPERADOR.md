# PENDENCIAS_OPERADOR.md

Fila de ações manuais que só o Operador pode executar (cliques em painel de terceiro, 2FA físico, decisão de nome/domínio, cartão, etc.). O Doer só adiciona itens aqui quando não há automação possível.

---

## ⚡ ATUAL (2026-08-20, D-330/T357) — 3 ações pendentes

> Verificação do Doer em produção: `/health` → 200 ✅ · `/api/v1/midias` →
> 200 (504 títulos) · **porém sem campo `slug`** → os commits T328/T330 ainda
> **não estão no GitHub** (o `main` local está 6 commits à frente de `origin/main`).

### [A] Push + deploy (desbloqueia T328/T330)
```bash
git push origin main                 # 6 commits locais (T328/T330/T331/...)
# Railway auto-deploy roda `prisma migrate deploy` no boot (aplica as migrations)
```

### [B] Seed de slugs em produção (T330)
```bash
# via túnel (o hostname interno não resolve fora da Railway):
railway connect Postgres
npm run db:seed:slugs                # idempotente; colar a contagem no STATUS
```

### [C] Grafana (opcional, não-bloqueante)
- Conta Grafana Cloud criada + `OTEL_EXPORTER_OTLP_ENDPOINT`/`HEADERS` setados (D-330: "OK").
- Conferir traces em **Grafana → Explore → Traces** (validação visual, opcional).

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

### [5] ~~Obter chave do TMDB e popular catálogo~~ — FEITO (seed executado em produção)

Resultado (2026-08-03):
- `TMDB_API_KEY` já estava no Railway; seed executado via túnel `railway connect Postgres`
  (a URL interna não resolve fora da Railway): **196 filmes + 195 séries** inseridos
  (392 scores placeholder 50). Verificado via API pública.
- PENDENTE (recálculo): os scores das novas mídias estão neutros (50) até a coleta
  por mídia (POST /api/v1/midias/:id/coletar, admin) — não existe job cron diário
  no código (registrado no HANDOFF.md §5/§8).

Por quê: o catálogo de mídias precisa ser populado com filmes e séries reais.
Onde: https://www.themoviedb.org/settings/api
Passo a passo (aplicado):
1. Conta e API Key TMDB ✅ (já configurada no Railway)
2. `npm run db:seed:tmdb` contra o banco de produção ✅ (via túnel SSH do Railway)
3. Verificação: `/api/v1/midias` → 196 FILME + 195 SERIE ✅
Como saber que deu certo: acesse `/api/v1/midias` e veja 400 mídias (200 filmes + 200 séries).
Depois de feito: responda "feito o item Nº 5"

---

### [6] ~~Configurar webhook do Stripe~~ — FEITO (modo live completo)

Resultado (2026-08-03):
- Endpoint **live** criado no dashboard do Stripe: URL de produção
  `https://media-rate-production.up.railway.app/api/v1/webhooks/stripe` (status enabled,
  api_version 2026-06-24.dahlia).
- Eventos assinados (todos os 5 tratados pelo backend + extras ignorados):
  `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.trial_will_end`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
  `customer.created`, `customer.updated`.
- Variáveis do Stripe configuradas no Railway (produção):
  `STRIPE_SECRET_KEY` (rk_live restrita com Prices Write + Webhook Read/Write),
  `STRIPE_WEBHOOK_SECRET` (whsec_ da aba Live), `STRIPE_PRICE_PLUS_ID` e
  `STRIPE_PRICE_PREMIUM_ID` (prices live criados: Plus R$4,90 e Premium R$9,90/mês BRL).
- Observação: `STRIPE_SECRET_KEY` restrita não expõe a sk_ completa; para ampliar
  permissões, editar a chave em https://dashboard.stripe.com/apikeys.
- STATUS DA CONTA (2026-08-04, via API): **VERIFICADA E LIBERADA** —
  `charges_enabled=true`, `payouts_enabled=true`, `card_payments` ACTIVE,
  `boleto_payments` ACTIVE, `transfers` ACTIVE, `requirements.disabled_reason` vazio.
  Apple Pay e Google Pay disponíveis (auto no Checkout com card).
- DECISÃO (boleto): mínimo de **R$ 5,00 por transação** — o plano Plus (R$ 4,90)
  ficaria impagável via boleto. `STRIPE_PAYMENT_METHODS` permanece `card`
  (cards + wallets). Boleto só faria sentido para planos ≥ R$ 5,00.
- PENDENTE (Pix): continua **dashboard-only** (capability `pix` não existe via
  API — "Unknown capability"). Quando aparecer em Settings → Payment methods
  (aba Live), ativar e trocar `STRIPE_PAYMENT_METHODS=card,pix` (Checkout
  hospedado aceita 1 tipo explícito; métodos ativados adicionais aparecem
  automaticamente quando o param é omitido).
- STATUS DOS MÉTODOS (2026-08-04, via API):
  - Payment Method Configuration (default): card/boleto/pix display_preference = ON ✅
  - Capabilities: `card_payments` ACTIVE ✅, `boleto_payments` ACTIVE ✅,
    `transfers` ACTIVE ✅; capability `pix` NÃO é solicitável via API
    (ativação do Pix é pelo dashboard).
  - PIX GATEADO PELO STRIPE: 0 ocorrências de "pix" no objeto da conta (tipo standard)
    e sem opção no dashboard enquanto `charges_enabled=false`. O Pix só aparece em
    Settings → Payment methods APÓS a verificação concluir. Se não aparecer mesmo
    verificado, pedir a capability `pix` no suporte do Stripe.

Por quê: o Stripe precisa avisar o backend quando um pagamento é confirmado.
Onde: https://dashboard.stripe.com/webhooks
Passo a passo (aplicado):
1. Acesse https://dashboard.stripe.com/webhooks ✅
2. Clique "Add endpoint" ✅
3. URL: `https://media-rate-production.up.railway.app/api/v1/webhooks/stripe` ✅
4. Eventos (9, cobrindo os 5 do `PaymentService` + trial_will_end) ✅
5. Copie o "Signing secret" (whsec_...) — da aba **Live** ✅
6. `STRIPE_WEBHOOK_SECRET` + `STRIPE_SECRET_KEY` + price IDs no Railway ✅
Como saber que deu certo: faça um pagamento de teste e veja o log no Railway confirmando o webhook.
Depois de feito: responda "feito o item Nº 6"

---

### [7] ~~Configurar PostHog (analytics)~~ — FEITO (backend + frontend)

Resultado (2026-08-04):
- Projeto **MEDIA Rate** (id 527617, us.posthog.com); Project API key
  (`phc_CWNWNF...`) configurada:
  - Railway (produção): `ANALYTICS_WRITE_KEY` ✅ (eventos do backend:
    `user_session_start`, `user_registered`, `plan_checkout_*`, `media_score_viewed`)
  - Vercel (web): `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`
    ✅ (já existiam no painel; `PostHogProvider` com pageview por rota + identify
    de usuário logado; chave confirmada no bundle deployado)
- Validação: `phc_` presente no chunk JS do site; API do projeto responde com a
  mesma chave. Eventos `$pageview` aparecem no Live events a partir da primeira
  visita com o provider ativo.

Por quê: para medir ativação, retenção e conversão (Discovery Q7).
Onde: https://app.posthog.com
Passo a passo (aplicado):
1. Conta e projeto "MEDIA Rate" existentes (criado 2026-07-25) ✅
2. Project API key copiada via `posthog-cli` (project-get → api_token) ✅
3. `ANALYTICS_WRITE_KEY` no Railway ✅
4. `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` no Vercel ✅
Como saber que deu certo: faça login no site e veja o evento `user_session_start` no PostHog.
Depois de feito: responda "feito o item Nº 7"
