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

---

### [8] Confirmar/ativar Deployment Protection nos previews (Vercel) — F10/T030

Por quê: previews `*.vercel.app` têm cache próprio de imagens; bot varrendo preview re-paga o warm-up inteiro (H4 do D-439). Não verificável em código (`apps/web/vercel.json` = só framework).
Onde: Vercel → projeto web → Settings → Deployment Protection → exigir autenticação em Preview Deployments.
Como saber que deu certo: abrir a URL de um preview em sessão anônima exige login Vercel.
Depois de feito: responda "feito o item Nº 8"

Verificação T030 pós-deploy (mesmo gate, T034 — branch está 17 commits à frente do remoto; curl local testaria código obsoleto):
1. `curl -s $PREVIEW_URL/robots.txt` — conferir grupos GPTBot/CCBot/ClaudeBot/... (`Disallow: /`) e PerplexityBot/... (`Disallow: /_next/image`, `/_vercel/image`).
2. `curl -sI $PREVIEW_URL` — esperar `X-Robots-Tag: noindex`; em produção o header deve estar ausente.
3. Colar as saídas no chat para o REVIEW final de T030.

---

### [10] P010 — GITHUB_TOKEN inválido sombreando login válido (D-471/D-481)

Por quê: o harness injeta `GITHUB_TOKEN` (40 chars, inválido) **só no escopo
Process** de cada shell; por precedência (`GH_TOKEN` > `GITHUB_TOKEN` >
keyring) ele invalida o `gh`, embora o login do keyring (`ENDARTStudios`)
esteja válido. Não é bloqueante (workaround: `Remove-Item Env:GITHUB_TOKEN`
por comando), mas todo uso do `gh` repete a falha.
Onde: origem da injeção — config do harness/provedor de segredos (User e
Machine estão limpos; nada a remover localmente).
Como saber que deu certo: `gh auth status` verde **sem** workaround.
Depois de feito: responda "feito o item Nº 10"

**Origem exata (T046, diagnosticado 2026-09-07):** `.vscode/` do repo limpo
(sem TOKEN); processo-pai do shell = `OpenCode` (o próprio harness injeta a
variável por shell); `User`/`Machine` sem `GITHUB_TOKEN`/`GH_TOKEN`; perfil
PowerShell irrelevante (injeção é por processo, não por perfil). Passo
cirúrgico: remover a entrada `GITHUB_TOKEN` da config de ambiente do harness
(ou rotacionar por valor válido) — o login do keyring (`ENDARTStudios`,
scopes `repo, workflow`) assume sozinho. Workaround até lá: `scripts/gh-safe.*`
(ver MANUAL, seção T046).

---

### [11] P011 — Tornar `Migration Safety (B1)` required check na ruleset de main (T031/D-532)

Por quê: o job `Migration Safety (B1)` existe no CI mas, sem ser required, o merge de PR
com migration não é travado por ele — o guard existe, não impede.
Onde: GitHub → repo → Settings → Rules → Rulesets → `protect-main` → Status checks
requeridos → adicionar `Migration Safety (B1)`.
Como saber que deu certo: PR de teste alterando `apps/api/prisma/schema.prisma` sem label
`migration-review` fica impossível de mergear (check vermelho bloqueante).
Depois de feito: responda "feito o item Nº 11".

> ✅ **FEITO (T034, 2026-09-22) — required check HABILITADO.** Aplicado o caminho
> seguro: `update-branch` (merge de `main` no head) nas PRs mantidas **#140, #139,
> #133** fez o check `Migration Safety (B1)` **reportar** (pass); **#172** já o tinha.
> As PRs **#4/#3/#2** são `CONFLICTING`/`DIRTY` (conflito com `main`) — **não são
> mergeáveis de qualquer forma**, portanto não são bloqueadas pela mudança. A ruleset
> `protect-main` agora exige `Migration Safety (B1)` (ao lado de Lint & Audit, Test &
> Coverage, Build, RLS, Docs Gate). Ver D-535.

### [12] P012 — Decidir staging/environment antes de produção (T031/B1, #148 item 9)

Por quê: hoje `main` = produção automática; não há ambiente intermediário. O deploy
Railway é nativo no push de `main` — nenhum gate GitHub atual o impede.
Onde: opções e passos exatos em `docs/b1-prod-guards.md` §2 (Opção A: GitHub Environment
protection — custo 0, gate+sinal pós-merge; Opção B: branch `staging` com Railway
environment separado — custo mensal, trava de verdade). Nada foi configurado.
Como saber que deu certo: deploy de produção só ocorre após aprovação/merge no caminho
escolhido; smoke de produção roda no ambiente novo antes dos usuários.
Depois de feito: responda "feito o item Nº 12" indicando a opção escolhida.

> 🟡 **PREPARADO (T034, 2026-09-22) — Opção A em PR (SEM merge).** O environment
> `Production` já existe com **required reviewer** (Operador). O PR `chore/t034-b1-final`
> adiciona `environment: Production` aos jobs `validate`/`health-check` do `deploy.yml`.
> **Limitação honesta:** o deploy NATIVO (Vercel/Railway) é disparado pelo push e **não**
> é bloqueado pelo environment — o gate adiciona **sinal + janela de aprovação** ao
> workflow do GitHub, não trava o deploy nativo. Reversível (remover a linha). Decisão de
> mergear é do Operador.

### [13] P013 — Decidir caminho para migration manual em produção (T031/B1, #148 item 8)

Por quê: `migrate-production.yml` (manual) depende de secret `DATABASE_URL` com hostname
interno do Railway — inalcançável de runners GitHub.
Onde: três caminhos com passos em `docs/b1-prod-guards.md` §3 (proxy TCP público com
allowlist; self-hosted runner na rede; console Railway como padrão de incidente —
recomendação T031). Nada foi provisionado.
Como saber que deu certo: uma migration aplicada manualmente com sucesso, com backup
prévio (`scripts/backup-db.sh`) e log colado no PR correspondente.
Depois de feito: responda "feito o item Nº 13" indicando o caminho escolhido.

> 🟡 **RECOMENDADO (T034, 2026-09-22) — console Railway (menor privilégio).** Runbook
> detalhado (matriz comparativa) em `docs/runbooks/migration-manual.md`. Alternativas
> (**proxy TCP público** e **self-hosted runner**) exigem expor o Postgres ou criar
> superfície nova → **escalar ao Operador antes de implementar**. Nada foi provisionado
> (sem segredo, sem migração, sem custo).

### [14] P014 — Ativar alertas métricos LIVE (T040/T041, D-538)

Por quê: o workflow `alertas-metricos.yml` roda em **dry-run por padrão** (nunca
abre issue falsa). Para detectar 5xx/falhas de auth de verdade precisa da fonte live.

Onde: GitHub → repo → Settings:
1. **Variables** → New variable → `METRICS_URL` = URL do `/metrics` da API de
   produção (ex.: `https://media-rate-production.up.railway.app/metrics`).
2. **Secrets** → New secret → `ADMIN_TOKEN` = token que autoriza a leitura do
   `/metrics` (header `X-Admin-Token`). **Idealmente um valor read-only dedicado
   ao metrics**; se reutilizar o `ADMIN_TOKEN` do serviço API, note que ele também
   autoriza rotas admin de convite — trate como sensível.

Passos extras (opcional): Actions → "Alertas Metricos" → Run workflow com
`dry_run=false` para o 1º teste real. Sem `METRICS_URL`+`ADMIN_TOKEN`, o
workflow segue em dry-run (sem issues).

Como saber que deu certo: uma execução (agendada ou manual com `dry_run=false`)
coleta `/metrics` (`live=true`), imprime o JSON de decisão e, se cruzar o limiar,
abre/atualiza a issue `alerta-metrico` (fechando-a quando normaliza).

Depois de feito: responda "feito o item Nº 14".

### [15] P015 — UptimeRobot externo (complementar ao uptime sintético do CI) — T042/D-539

Por quê: o workflow `uptime-check.yml` é um monitor **sintético no CI** (runners do
GitHub). Ele pega indisponibilidade das rotas públicas, mas **não** é distribuído
(multi-região) nem independente do GitHub Actions.

Onde: conta gratuita UptimeRobot → monitores HTTP(s):
- API: `https://media-rate-production.up.railway.app/health`
- Web: `https://mediarate.app/pt-BR`

Passos: `docs/OBSERVABILITY.md` §UptimeRobot (interval 5 min; alerta após 2 falhas).

Como saber que deu certo: o monitor aparece "Up" no UptimeRobot e alerta por e-mail em queda.

Depois de feito: responda "feito o item Nº 15".
