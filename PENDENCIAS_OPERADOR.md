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

### [10] P010 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. GITHUB_TOKEN inválido sombreando login válido (D-471/D-481)

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

### [12] P012 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. Decidir staging/environment antes de produção (T031/B1, #148 item 9)

Por quê: hoje `main` = produção automática; não há ambiente intermediário. O deploy
Railway é nativo no push de `main` — nenhum gate GitHub atual o impede.
Onde: opções e passos exatos em `docs/06-devops-deployment/b1-prod-guards.md` §2 (Opção A: GitHub Environment
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

> 📌 **EVIDÊNCIA (T045, 2026-09-22):** após o merge do PR #195 (merge commit `8f5afc2`),
> o run `deploy.yml` de `main` ficou **`waiting`** no environment `Production`
> (aguardando aprovação do Operador) — evidência **P012=A** de que o gate está ativo.
> O deploy **nativo** (Railway) ocorreu mesmo assim (o `uptime` do `/health` resetou) e
> o smoke pós-merge **7/7 → 200** confirmou saúde. O item **continua aberto** (o waiting
> já passou de 30 min em merges anteriores); decisão é do Operador.

### [13] P013 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. Decidir caminho para migration manual em produção (T031/B1, #148 item 8)

Por quê: `migrate-production.yml` (manual) depende de secret `DATABASE_URL` com hostname
interno do Railway — inalcançável de runners GitHub.
Onde: três caminhos com passos em `docs/06-devops-deployment/b1-prod-guards.md` §3 (proxy TCP público com
allowlist; self-hosted runner na rede; console Railway como padrão de incidente —
recomendação T031). Nada foi provisionado.
Como saber que deu certo: uma migration aplicada manualmente com sucesso, com backup
prévio (`scripts/backup-db.sh`) e log colado no PR correspondente.
Depois de feito: responda "feito o item Nº 13" indicando o caminho escolhido.

> 🟡 **RECOMENDADO (T034, 2026-09-22) — console Railway (menor privilégio).** Runbook
> detalhado (matriz comparativa) em `docs/06-devops-deployment/runbooks/migration-manual.md`. Alternativas
> (**proxy TCP público** e **self-hosted runner**) exigem expor o Postgres ou criar
> superfície nova → **escalar ao Operador antes de implementar**. Nada foi provisionado
> (sem segredo, sem migração, sem custo).

### [14] P014 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. Ativar alertas métricos LIVE (T040/T041, D-538)

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

### [15] P015 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. UptimeRobot externo (complementar ao uptime sintético do CI) — T042/D-539

Por quê: o workflow `uptime-check.yml` é um monitor **sintético no CI** (runners do
GitHub). Ele pega indisponibilidade das rotas públicas, mas **não** é distribuído
(multi-região) nem independente do GitHub Actions.

Onde: conta gratuita UptimeRobot → monitores HTTP(s):
- API: `https://media-rate-production.up.railway.app/health`
- Web: `https://mediarate.app/pt-BR`

Passos: `docs/OBSERVABILITY.md` §UptimeRobot (interval 5 min; alerta após 2 falhas).

Como saber que deu certo: o monitor aparece "Up" no UptimeRobot e alerta por e-mail em queda.

Depois de feito: responda "feito o item Nº 15".

### [16] P016 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. Decidir reativar o auto-PR de `feature/**` (create-pr-from-branch) — T046/T047/D-541

Por quê: o workflow `create-pr-from-branch.yml` estava **inerte** desde a criação
(YAML inválido → nunca executou). Foi corrigido (T046), mas por padrão ficou
**manual** (`workflow_dispatch`) para **não habilitar automação não solicitada**.
Reconectar o disparo automático em `feature/**` é uma decisão do Operador.

Onde: `.github/workflows/create-pr-from-branch.yml` — trocar `on: workflow_dispatch`
por `on: push: branches: ["feature/**"]` (o corpo/job já estão válidos e idempotentes).
Requisitos antes de reativar: (a) confirmar que PRs automáticas são desejadas;
(b) validar a idempotência (`gh pr list --head` evita duplicata); (c) testar em uma
branch `feature/teste` e conferir que a PR nasce correta.

Como saber que deu certo: um push em `feature/*` cria **uma** PR (sem duplicar) e
o workflow aparece verde.

Depois de feito: responda "feito o item Nº 16".

> 📌 **Estado atual (T047, 2026-09-22):** corrigido e **manual** — não roda em
> `main`/`chore/*`/`docs/*` nem em `feature/**` até esta decisão. Reversível.

### [17] P017 —

> ♻️ **CONVERTIDA (REPLAN 2026-09-26):** decisão técnica executável pelo par Thinker/Doer — ver `BACKLOG_TECNICO_THINKER_DOER.md`. Histórico abaixo preservado. Decidir o caminho de cifragem de colunas (LGPD) — T048/D-542

Por quê: a análise de viabilidade (T048) concluiu que cifrar agora **não** é seguro
sem: (a) cifragem **determinística** para o e-mail (senão quebra login);
(b) **migration + backfill** dos dados em plaintext; (c) secret
`COLUMN_ENCRYPTION_KEY` presente no runtime (o serviço **lança** sem ela). Nada foi
alterado (sem schema, sem migration, sem segredo).

Onde: `docs/05-security-compliance/LGPD_DADOS.md` (inventário + decisão) e
`apps/api/src/common/column-encryption.service.ts`.

Como decidir: (A) manter o status quo e apenas **minimizar PII em logs**
(follow-up de baixo risco já identificado: `auth.service.ts:261`); ou (B) aprovar o
plano completo (secret + migration/backfill + cifragem determinística/índice de
busca) como tarefa própria com janela de manutenção.

Depois de feito: responda "feito o item Nº 17" indicando A ou B.

> 📌 **Runbook de ativação (T078, 2026-09-25):** fluxo validado em **dry-run** (0 issues criadas).
> Para ativar (P014): criar `vars.METRICS_URL` (URL do `/metrics`) + `secrets.ADMIN_TOKEN` **read-only
> dedicado**; rodar `workflow_dispatch dry_run=false` e conferir a issue; **rollback** = remover as
> vars/secrets. Uptime externo (P015) = UptimeRobot (guia em `docs/OBSERVABILITY.md`).

## T130 (2026-09-28) — Decisoes pendentes do programa BETA-GAP

Descoberta read-only (.claude/reports/beta-gap-remaining-spec-2026-09-29.md): 12/18 DONE + 1 PARTIAL. Os gaps restantes exigem devolutiva:

- BETA-GAP-04: sem definicao/aceite no repo -> fornecer objetivo + criterio de aceite.
- BETA-GAP-08: sem definicao; indicio de notas de criticos por provider -> indicar provider licenciado (sem improvisar integracao).
- BETA-GAP-16 / BETA-GAP-17 / BETA-GAP-18: sem definicao/aceite no repo -> fornecer objetivo + criterio de aceite.
- BETA-GAP-06 (PARTIAL): decidir fonte legitima de elenco/creditos e avaliacoes em prosa (provider licenciado OU dataset curado documentado OU adiar). Proibido scraping/traducao automatica/LLM inventando conteudo.
- Hosting (T124): decidir A (Vercel Pro) / B (migrar web) / C (aceitar Hobby temporariamente). **[T136/2026-09-30] Rate limit de build Hobby revalidado como liberado (deploys recentes ● Ready; smoke 7/7; Vercel pass em PR; Railway success). Isso NAO elimina o risco de uso comercial/politica no Hobby.** Permanece a decisao A/B/C/D.

Nenhum segredo/PII registrado.

## T133 (2026-09-28) — Decisao pendente: politica de falha do audit de auth

Descoberta: a Fase 3.7 (audit logging de auth) JA esta coberta (eventos + testes + PII minimizada por D-545). Porem AuditLogService.log() propaga erro de DB e auth.service faz await ...log(...) sem catch -> politica FAIL-CLOSED (falha de auditoria pode derrubar login/logout/reset).

Decidir: (A) manter fail-closed (garante trilha de auditoria; risco de indisponibilidade de auth se o DB de audit falhar) ou (B) fail-open nao bloqueante (auth segue; erro sanitizado logado) — exige ADR. Nenhuma mudanca aplicada nesta tarefa. Sem segredo/PII.

## T134 (2026-09-28) — Prontidao do PLANO_MESTRE: pendencias do Operador

Auditoria read-only: NAO ha item de PRODUTO/CODIGO implementavel com seguranca sem decisao externa. Frentes de codigo restantes dependem de:

1. Definicao/aceite: BETA-GAP-04/16/17/18 (BLOCKED_AMBIGUOUS_SPEC) e PLANO 2.7 (data_sources/entity_revisions).
2. Provider/licenca: BETA-GAP-08 (BLOCKED_EXTERNAL_PROVIDER).
3. Fonte de dados: BETA-GAP-06 (PARTIAL).
4. Hosting A/B/C (T124).
5. ADR politica de falha do audit de auth (T133) - fail-closed vs fail-open.
6. UptimeRobot (P015) + METRICS_URL/ADMIN_TOKEN (D-538) p/ alertas metricos e uptime live.
7. Staging/migration path (P012/P013).
8. Deps HIGH P009; PR #74 (T041); P017 (cifragem de coluna, deferido).

Unico trabalho seguro/determinista restante e docs-only: reconciliar notas obsoletas do PLANO_MESTRE (2.6 D-546; 6.14 feature flags; 9.4 dominio+ruleset; cabecalho Fase 10) -> T135 docs-only proposto. Sem segredo/PII.

## T135 (2026-09-29) - Reconciliacao docs-only das notas obsoletas do PLANO_MESTRE

Notas reconciliadas com evidencia reconfirmada ao vivo (nenhum codigo/schema/auth/billing/segredo/infra alterado; nenhum BETA-GAP fechado):
- 2.6 COVERED (D-546 aplicado; created_at explicito em audit-log.service.ts:36-58).
- 6.14 COVERED (feature-flags.controller/module/service + feature-flags.spec.ts, 7 casos).
- 9.4 COVERED (mediarate.app 200 nos 3 locales; ruleset protect-main active/branch).
- Cabecalho Fase 10: status T029-T036 concluidas (fase mantida EM ANDAMENTO).

As 8 pendencias do Operador abaixo permanecem abertas e sao o caminho para destravar as frentes de produto/codigo. Evid: .claude/reports/plano-mestre-stale-notes-2026-09-29.md.

## T136 (2026-09-30) - Revalidacao da janela de build da Vercel (Hobby)

Read-only/operacional: janela de rate limit Hobby revalidada como **liberada** (evidencia posterior ao status residual de bed93fb5): PR #356 Vercel=pass; `vercel ls`/`--environment=production` com deploys recentes ● Ready; smoke 7/7=200; Railway production=success; runs main (Deploy Reconciler/Health Check/Alertas/Uptime)=success. Classificacao: `VERCEL_WINDOW_RELEASED_OK`.

**Nao resolve:** decisao estrategica A/B/C de hosting (A Vercel Pro / B migrar / C aceitar Hobby temp. com prazo+risco formal). Rate limit transiente != risco de uso comercial/politica no Hobby. Nenhum BETA-GAP alterado; GO convites SUSPENSO. Relatorio: `.claude/reports/vercel-window-revalidation-2026-09-30.md`; doc: `docs/06-devops-deployment/WEB_HOSTING.md` sec. 9. Sem segredo/PII.

## T137 (2026-09-30) - Diagnostico read-only da divida de seguranca (P009/P017/PR #74)

Read-only/docs-only. Achado: a divida JA esta diagnosticada/decidida com governanca e testes.

- **P009** (deps HIGH): 3 HIGH = **1 cadeia dev-only** (deepmerge-ts GHSA-ggr8-5vv4-36mx -> @prisma/config -> prisma). Runtime @prisma/client nao carrega o pacote. **Aceito (D-462)** com allowlist cirurgica em package.json + gate `npm run audit:ci` **verde**. Fix = downgrade breaking (prisma@6.12.0). Revisao prevista 2026-12. **Decisao do Operador:** manter aceitacao? (recomendado A=manter).
- **P017** (cifragem de colunas): ColumnEncryptionService (AES-256-GCM) existe mas **nao wired** (0 usos). **Adiada pos-Beta (D-557)** com plano (docs/05-security-compliance/lgpd-column-encryption-plan.md), compensacoes (PII mask D-543, AuditLog sanitizado D-545, argon2id, TLS, LGPD export/delete, DTO allowlist) e **guarda anti-regressao** (apps/api/test/schema-sensitive-columns.spec.ts). **Decisao do Operador:** manter deferimento? (recomendado A=manter).
- **PR #74/T041**: **MERGED** (2026-09-07) -> T041 resolvido. Notas do PLANO_MESTRE (T041 :280; T044 :283) ficaram **OBSOLETAS** -> candidato a **T138 docs-only** (reconciliar). **Decisao do Operador:** autorizar T138?
- **PR #300** `chore/update-deps` (so package-lock.json, OPEN/BLOCKED): **decisao de governanca do Operador** (reviver/fechar/substituir/adiar).

Nenhuma dependencia/codigo/schema/segredo/infra alterado. Nenhum BETA-GAP alterado; GO convites SUSPENSO. Relatorio: `.claude/reports/security-debt-diagnosis-2026-09-30.md`. Sem segredo/PII.

## T138 (2026-09-30) - Reconciliacao docs-only de notas obsoletas de divida de seguranca

Reconfirmacao live e edicao docs-only no PLANO_MESTRE (FASE 10):
- T041 -> [x] (PR #74 MERGED 2026-09-07).
- T042 -> [x] (CI-repair; D-470/D-472; audit-ci verde).
- T044 -> [x] (diagnostico CI vermelho; causa-raiz D-490; PR #74 merged).
- T037 anotado com D-462 (P009 aceito dev-only; revisao 2026-12); 2.10 anotado com D-557 (cifragem adiada pos-Beta). Ambos permanecem [~].

### PR #300 - DECISAO PENDENTE DO OPERADOR (nenhuma acao automatica tomada)
`chore/update-deps` (somente `package-lock.json`), estado **OPEN**. Opcoes: **reviver** (PR proprio com CI) / **fechar** / **substituir** / **adiar**. Nao foi fechado, revivido, comentado ou mergeado.

P009 permanece sob D-462; P017 permanece sob D-557 (sem nova acao tecnica). Nenhum codigo/schema/deps/segredo/infra alterado; nenhum BETA-GAP alterado; GO convites SUSPENSO. Relatorio: `.claude/reports/security-debt-stale-notes-2026-09-30.md`. Sem segredo/PII.

## T139 (2026-09-30) - Mapa de gaps do usuario: novas pendencias (Onda 0) e candidatos T140-T145

Devolutiva do usuario (22 gaps: 18 originais + 4 novos requisitos) registrada em
`.claude/reports/user-gap-registry-2026-09-30.md` com IDs estaveis UG-01..UG-22.
Resumo: 2 DONE plenos (UG-02 dashboard, UG-14 biblioteca); 5 fechados no
contrato/mecanismo com lacuna de dados/concessao (UG-03/07/09/10/15); 8 PARTIAL;
7 NOT_FIXED/BLOCKED. Registry BETA-GAP do repo permanece intocado.

### Novas pendencias do Operador

1. **T140 - Validar login Google real (navegador, evidencia sanitizada).** O endurecimento
   tecnico (BETA-GAP-01: `email_verified`, botao oculto sem client ID) ja esta merged; falta
   validar o sintoma real. Abrir `https://mediarate.app/pt-BR/login`, clicar no botao Google e
   registrar APENAS codigo de erro sanitizado (popup blocked, `invalid_origin`,
   `redirect_uri_mismatch`); conferir origins autorizadas no Google Cloud (`mediarate.app`,
   `www.mediarate.app`). Critério: login funciona OU botao oculto com fallback e-mail/senha.
2. **T141 - Conceder papel ADMIN ao Operador.** Via CLI interna `db:set-role` (runbook
   BETA-GAP-03); validar `/admin` (200 para admin, 403 para comum); registrar a concessao sem
   expor e-mail em log publico. O sistema nao pode autopromover cadastro publico a admin.

### Reafirmadas (ja registradas; destravam gaps do mapa - nenhuma duplicata)

- Provider/fonte de dados para metadados/criticos/continuidade (T130; BETA-GAP-06/08) -
  destrava UG-05/06/08/11/20/21/22.
- Hosting A/B/C/D (T136) - decisao estrategica continua aberta.
- ADR politica de falha do audit de auth (T133) - fail-closed vs fail-open.
- PR #300 `chore/update-deps` (T138) - reviver/fechar/substituir/adiar.

### Candidatos executaveis pelo par Thinker/Doer (sem decisao externa)

T142 alinhar botoes de Planos (UG-13) — **RESOLVIDO 2026-10-01** (medição Playwright: CTAs y=859 idênticos em 1280px; .claude/reports/ug13-pricing-cta-evidence-2026-10-01.md) · T143 auditoria de arredondamento de notas (UG-09) ·
T144 generos reais na dashboard, remover limite de 6 (UG-16). Nada foi executado nesta
tarefa (docs-only). Sem segredo/PII; GO convites SUSPENSO.

## T146 (2026-09-30) - Auditoria runtime dos gaps: 2 pendencias novas (B1, T140 checklist)

Auditoria tecnica+visual em producao (read-only; relatorio `.claude/reports/user-gap-runtime-audit-2026-09-30.md`). Confirmon UG-02/UG-16/UG-13 no codigo/producao; encontrados 5 novos defeitos (B1-B5), sendo 2 exigem decisao/credencial do Operador:

1. **B1 [ALTA] - Deletar item de teste do catalogo de producao.** O card "R2 Upload Test - pode delet*..." (2026, sem poster) esta publico em mediarate.app/pt-BR/catalog (residuo do upload test T454; conta nas stats). Exige papel ADMIN (ver T141) ou acesso DB. NAO deletado automaticamente.
2. **T140 atualizado - validacao do login Google em navegador REAL.** Teste em webview automatizado reproduziu o sintoma (clique sem reacao visivel), mas Google suprime One Tap em webview - inconclusivo por natureza. Checklist ao Operador: reproduzir em Chrome/Edge real em mediarate.app/pt-BR/login; capturar console (erros "origin"/"client_id"); conferir Authorized JavaScript origins no Google Cloud (mediarate.app + www). Config server-side esta OK (client ID no build; GIS carrega; callback responde 401 a credencial vazia).

B2 (escala manga 0-100 em MediaCard/detail - regressao BETA-GAP-09), B3 (ScoreDial arredonda 7,9->8 na escala 0-10), B4 (MediaScoreBadge sem normalize) e B5 (separador decimal inconsistente) sao executaveis pelo par Thinker/Doer como codigo - candidatas T147+. Sem segredo/PII; nenhum BETA-GAP alterado; GO convites SUSPENSO.

## T149 (2026-09-30) - Tooling de agentes: ativacao do OpenCodeReview e ondas futuras

Adocao de tooling de agentes implementada (docs/03-development-process/AGENT_TOOLING.md). Decisoes que exigem o Operador:

1. **Ativar OpenCodeReview?** Workflow `.github/workflows/open-code-review.yml` instalado, NAO-bloqueante (continue-on-error; nunca trava merge) e DORMENTE: cadastrar secrets `OCR_LLM_URL`, `OCR_LLM_AUTH_TOKEN`, `OCR_LLM_MODEL`, `OCR_LLM_USE_ANTHROPIC` (endpoint/chat-completions de LLM) para o review de IA comentar nas PRs. Sem as secrets, o job sai com skip (zero custo). Ao cadastrar, responder "feito" nesta secao.
2. **Onda 2 (pilotos de produto IA)** - requer feature de assistente no roadmap: TypeSafe/Jev (chave ja em .env local; piloto com feature flag), ollama, langflow, open-design.
3. **Onda 3 (orcamento/autorizacao)** - open-seo (conta DataForSEO), screaming-frog-mcp (licenca Screaming Frog), strix (pentest agêntico: SOMENTE staging com dados sinteticos e autorizacao formal em DECISOES.md).

Nada das ondas altera o produto em producao; GO convites permanece SUSPENSO. Sem segredo/PII.

## T150 (2026-09-30) - Screaming Frog instalado (tier free) + baseline SEO: achados p/ decisao

- **Screaming Frog**: instalado em `D:\Program Files (x86)\Screaming Frog SEO Spider`, porem **tier FREE — GUI apenas**. Testado ao vivo: `--headless` (crawl) e `--mcp-streamable-http-server` FATALam sem `licence.txt`. O crawl completo/agendamento via MCP exigem **comprar a licenca** (decisao de orcamento; com licenca, usar o MCP NATIVO do SF v24+ — o wrapper comunitario fica desnecessario). Enquanto isso: baseline SEO gratuito ja executado via script proprio (apenas paginas do proprio site).
- **Achados do baseline (decisao de SEO/ produto, p/ Thinker):**
  1. **Contradicao noindex x sitemap**: tipos preview (manga/HQ/livro) sao `noindex, follow` (deliberado, T272/isPreviewTipo), MAS essas URLs estao no sitemap.xml (1.827 URLs, centenas de /media/). Decidir: (a) remover noindexadas do sitemap; (b) indexar previews que ja tem score/fontes reais (ex.: Gantz 6,7 de 2 fontes); (c) manter status quo.
  2. **B1 no sitemap**: `/pt-BR/media/r2-upload-test-pode-deletar` e a 1a URL de midia do sitemap — o item de teste esta sendo OFERTADO ao Google (reforca a limpeza via ADMIN/T141).
  3. **Descriptions curtas**: /pt-BR/catalog (45 chars; login/register 18/38, menores).

Relatorio completo: `.claude/reports/seo-audit/seo-baseline-2026-09-29.md` (nao versionado; metodo re-executavel). Nada alterado em producao; GO convites SUSPENSO.

## T151 (2026-09-30) - Auditoria jurídica externa: verificada; decisões de correção (gate legal)

Auditoria jurídica externa (15 achados, J-001..J-015) foi VERIFICADA contra o código e contra produção (a auditoria externa não conseguiu acessar mediarate.app). Relatório: `.claude/reports/legal-audit-external-verification-2026-09-29.md`. J-001 e J-002 (P0) CONFIRMADOS; J-003/J-005 CONFIRMADOS (J-005 ampliado: 4 cookies reais fora do inventário); J-013/J-014 CONFIRMADOS; J-015 FECHADO com produção (zero cookies Sentry — inventário impreciso nos dois sentidos; zero ph_* sem consentimento = postura correta).

### Decisões do Operador (texto legal = gate legal; agente não edita Termos/Política/LICENSE)

1. **J-001 (P0)** - Política (s7b, 3 línguas) promete "column encryption" que D-557 adiou pós-Beta. DECIDIR: (A) autorizar correção do texto (remover a promessa até D-557 reverter) [recomendado] ou (B) antecipar cifragem.
2. **J-002 (P0)** - Política promete eliminação +30 dias; worker NÃO existe (lgpd.service.ts:154 "implementar em tarefa futura"). DECIDIR: (A) implementar o worker (tarefa de código proponível: job diário + DELETE em cascata conforme MATRIZ-PROPAGACAO + testes) [recomendado — mantém a promessa] ou (B) alterar o texto.
3. **J-003** - Termos §3.5 citam Apple; D-335 adiou Apple (custo do Developer Program). DECIDIR: remover Apple do texto + tratar chave i18n continueWithApple.
4. **J-005/J-015** - Inventário de cookies: adicionar mr_consent, x-mr-uid, mediarate_watchlist, NEXT_LOCALE; corrigir/remover item "cookie Sentry" (não observado em produção).
5. **J-013/J-014** - LICENSE: remover "confidential" (repo público); reversionar a Política quando correções materiais entrarem.
6. **J-004/J-006..J-012** - lacunas documentais/governança (endereço, art. 18, portabilidade, retenção, transferências, encarregado, menores, licenças de fontes): triagem jurídica pelo Operador.

Nada alterado em produção nesta tarefa (verificação read-only + registro). GO convites SUSPENSO.

## T152 (2026-09-30) - 2a auditoria jurídica: J-016..J-020 verificados + proposta de revisão CONSOLIDADA

Segunda auditoria externa (commit 631c5072) confirmou T151 sem correções (correto: texto legal aguarda gate) e trouxe 4 achados novos — TODOS VERIFICADOS no código: J-016 CONFIRMADO (Resend trata e-mail de verificação/reset; NÃO consta na Política; as 4 ocorrências "resend" em pt-BR.json são chaves de UI verifyResend* = falso positivo descartado); J-017 CONFIRMADO (PostHog identify(user.id,{plan}) - PostHogProvider.tsx:61; Política diz "anonimizado" - correto é PSEUDONIMIZADO; mitigação real: e-mail/nome não enviados); J-018 CONFIRMADO (Sentry identifica via user.id com sendDefaultPii:false + redaction - sentry.ts:67-68,144; claim "anonimizados" excessivo); J-020 CONFIRMADO (schema só tem termos_aceitos_em - sem versão). J-019 = B1 (já registrado).

### DECISÃO RECOMENDADA: revisão jurídica CONSOLIDADA (1 autorização de gate, 1 PR)

Os ajustes de texto se acumulam nos mesmos documentos (Termos/Política/LICENSE). Proposta: Operador autoriza UM ciclo de revisão jurídica e o agente executa num único PR cobrindo: J-001 (remover claim encryption) + J-003 (remover Apple) + J-005 (inventário de cookies real) + J-016 (incluir Resend) + J-017/J-018 ("anônimo"->"pseudonimizado") + J-006/J-007 (art.18 + portabilidade) + J-004 (endereço) + J-010 (encarregado) + J-013 (LICENSE) + J-014 (reversionar Política). Em paralelo, DUAS tarefas de CÓDIGO independem do gate: (1) J-002-A worker de eliminação +30d (recomendada); (2) J-020 campo terms_version_accepted (schema+migration, pede label migration-review).

Relatório atualizado (adendo T152): `.claude/reports/legal-audit-external-verification-2026-09-29.md`. Read-only; GO convites SUSPENSO.

> **ATUALIZAÇÃO 2026-09-30 (T154-T156):** J-020 entregue (PR #374 — `termos_versao_aceita` + migration + backfill, label migration-review); J-002-A entregue (PR #377 — `LgpdPurgeService`, cron diário 03h UTC + gatilho admin, cascade conforme MATRIZ com contexto RLS do usuário purgado); incidente D-457 registrado como **D-560** (PR #373). Próximo passo do marco: **revisão jurídica CONSOLIDADA** (1 gate → 1 PR com J-001/003/004/005/006/007/010/013/014/016/017/018) → auditoria de conformidade → reavaliar GO.

> **ATUALIZAÇÃO 2026-09-30 (T158):** revisão jurídica CONSOLIDADA entregue (PR #381 merged, produção validada) — fechados os achados textuais **J-001, J-003, J-005, J-006, J-007, J-010, J-013, J-014, J-016, J-017, J-018** nas 3 línguas + LICENSE. **J-004 (endereço físico completo) continua PENDENTE de input do Operador** — forneça o endereço empresarial para inclusão em Termos/rodapé (o agente não inventa). J-002-A/J-020 já entregues (PRs #377/#374). Próximo passo: **nova auditoria de conformidade → reavaliar GO**. J-019/B1 (item de teste) segue dependente de ADMIN/T141.

---

### [18] Gov-01 — Reforço de Branch Protection (pós-incidente PR #388 / D-561)

**Status:** RESOLVIDA (2026-10-02) — implementada e validada empiricamente.

**Implementação (ruleset `protect-main`, id 20801818, via API — ciclo T160.3):**

- [x] Block force pushes (`non_fast_forward`) — preservado.
- [x] Required status checks — preservado.
- [x] **Require a pull request before merging** — regra `pull_request` adicionada (`required_approving_review_count: 0`, sem deadlock; Gov-02 pode elevar para 1 em decisão separada).
- [x] **Bypass `always` do usuário admin** — removido (`bypass_actors` vazio).

**Validação empírica (sandbox descartável):** ruleset temporário equivalente mirando branch de teste; push real do admin com commit vazio foi **rejeitado** (`GH013: Changes must be made through a pull request`), SHA remoto inalterado; sandbox (branch + ruleset) removida sem restos. `main` nunca recebeu push direto nesta operação. Causa raiz do D-561 endereçada. Verificação: `git push origin main` sem PR é rejeitado pelo GitHub.

**Motivo:** dois pushes diretos em `main` durante o ciclo do PR #388 passaram exatamente pelo bypass admin + ausência da regra de PR. O job RLS mitigou por sorte secundária, não por barreira.

**Como saber que deu certo:** `git push origin main` local (sem PR) passa a ser rejeitado pelo GitHub mesmo para o admin.

**Depois de feito:** responda "feito o item Nº 18".

---

### [19] P019 — Triagem da PR #300 (deps obsoleta) — T160/2026-10-03

**Status:** RESOLVIDA (2026-10-02, ciclo T159.2) — PR #300 fechada como obsoleta (`CLOSED` em 2026-10-02T20:50:43Z, sem merge, comentário sanitizado, branch preservada). Diagnóstico confirmado: lockfile-only sobre base antiga, sem CVEs novos, audit da main verde; o workflow `dependency-update.yml` agendado regenera PR limpa quando houver updates relevantes.

**Diagnóstico:** PR #300 CONFLICTING/DIRTY em package-lock.json, criada 2026-09-27 por automação (github-actions), anterior a D-559 (fastify/next security upgrades). Não traz CVEs não tratados; audit:ci da main está OK.

**Recomendação técnica:** FECHAR_OBSOLETA (ou substituir por nova PR de deps limpa a partir do main atual).

**Ação:** `gh pr close 300 --comment "Close as obsolete. Current main already has green audit after #363. This PR conflicts on package-lock.json and predates subsequent dependency/security repairs. If specific CVE fixes are still needed, open a fresh dependency PR from current main with npm audit evidence."`

**Como saber que deu certo:** PR #300 fechada; dependabot/automação abrirá nova PR se houver updates relevantes.

**Depois de feito:** responda "feito o item Nº 19".

---

## PACOTE DE GO — consolidação 2026-10-03 (T161)

As 4 ações que destravam a Beta Fechada estão consolidadas no snapshot `.claude/reports/beta-readiness-2026-10-03.md` (seção Pacote de GO). Referência rápida:

| # | Ação | Onde | Verificação |
|---|---|---|---|
| 1 | **Gov-01** — ruleset protect-main: require PR + restringir bypass admin | GitHub UI (Settings → Rulesets) | `git push origin main` rejeitado |
| 2 | **P019** — fechar #300 como obsoleta | `gh pr close 300 --comment "..." `(comando no relatório pr-300-triage) | PR CLOSED |
| 3 | **B1** — deleção do item de teste via sessão ADMIN | Painel /admin ou API admin | R2 Upload Test ausente na home/catálogo |
| 4 | **UG-01** — validar Google Login em navegador real | /login → botão Google | Dashboard carrega pós-auth |

**GO técnico: VERDE.** Após as 4: Beta Fechada (convites controlados) liberável — decisão formal do Operador.

> **RE-SINCRONIZAÇÃO 2026-10-05 (pós-T161): 3 das 4 ações resolvidas — resta B1.**
> - **[1] Gov-01 ✅ RESOLVIDO** — ruleset `protect-main` ativo: pull_request obrigatório + 6 checks required + `non_fast_forward` + **bypass null** (verificado via `gh api rulesets/20801818`).
> - **[2] P019 ✅ RESOLVIDO** — PR #300 CLOSED (2026-10-02).
> - **[4] UG-01 ✅ RESOLVIDO** — causa raiz corrigida (#418: GSI não renderizava no cold-load; #420: tema dark); chooser abre em produção (verificado em navegador) e a app está em uso logado.
> - **[3] B1 ✅ RESOLVIDO (2026-10-05)** — Operador elevado a ADMIN (D-563), executou o soft delete do item no painel `/admin/diagnostics` (#432; rota T215, audit `MEDIA_DELETED`). Referências da conta Teste limpas (watchlist 0, interações 0). **Pacote de GO 4/4 — GO de convites liberável por declaração formal.**
> - Interlúdio: 8 PRs de correções reportadas pelo Operador mergeados e verificados em produção em 2026-10-03/05 (#411, #418, #420, #422, #424, #425, #426, #427, #429): login Google, watchlist com 6 tipos, perfil (indicadores/gêneros/atividade), dashboard honesta, biblioteca (cards + remoção self-service).
> - **GO para convites: SUSPENSO — liberável por declaração formal do Operador (Pacote 4/4).**

## Gate audit:ci VERMELHO em main — 10 bloqueantes sem fix limpo (registro T200; antes commitado como "T161", ID colidiu com o PACOTE DE GO do fluxo paralelo)

`npm run audit:ci` VERMELHO em `main` (drift de advisories em lote — modo T148/T153, agora múltiplo). Como o Lint & Audit (required) executa audit:ci, **PRs de código estão congeladas** até resolução (docs-only passa: jobs pesados pulam). Mapa `npm audit --json` (fixAvailable):

**Fix trivial (runtime):** `@fastify/busboy` 3.2.0 → 3.2.2 (`npm update @fastify/busboy`).

**Sem fix limpo — migração/decisão:**
1. **Cadeia tailwind 3.4.19** (braces `*`, chokidar 2-3.6, fast-glob, micromatch): fix = **tailwindcss@4.3.3** — migração major v3→v4 (tarefa própria).
2. **eslint-config-next/@next/eslint-plugin-next 16.2.10**: advisory afeta >=14.3.0 (inclui linha 16.x); "fix" = downgrade 14.2.35 (inviável). Aguardar patch ou allowlist.
3. **shadcn 4.14.1 / ts-morph / @ts-morph/common**: "fix" = shadcn@1.0.0 (downgrade de linha). Aguardar patch ou allowlist.
4. **prisma/deepmerge-ts/@prisma/config (6.19.x)**: novos GHSAs, família P009/D-462 — estender allowlist ou planejar ajuste.
5. **fastify <=5.12.4**: sob **D-559b** (Nest 12 na agenda; revisão 2026-11).

**Opções (Operador):** (A) estender a allowlist do `scripts/audit-ci.mjs` no padrão D-559b (justificativa + revisão datada) destravando PRs de código já; e/ou (B) autorizar as migrações (tailwind 4; avaliar prisma) como tarefas. Nota: fluxo paralelo ativo no mesmo gate (D-559b, PACOTE DE GO) — coordenar. Fix busboy re-aplicável no lote final. Sem segredo/PII; GO convites SUSPENSO.

> **CONGELAMENTO NA PRÁTICA (2026-10-03):** a PR de higiene #408 (remover artefato commitado `.playwright-mcp/`) ficou VERMELHA no Lint & Audit por causa deste gate — primeira vítima real do congelamento. Ela permanece aberta e mergeia no desbloqueio (A ou B).

---

## Pacote de decisão — Postgres (usage alerts/backups) e rotação de chaves (2026-10-10, T181)

**Contexto:** o ciclo F06-metadata-drain fechou o enriquecimento do catálogo (17.217
títulos; 131.743 episódios; 10.991 com país). Duas frentes operacionais dependem
exclusivamente de decisão do Operador — envolvem produção, custo, credencial e secret
manager, e **não** foram executadas pelo agente (nem devem ser, sem decisão).

### Decisão 1 — Postgres: usage alerts + backups automáticos

Motivação: em 2026-10-07 o volume do Postgres encheu (500MB → 97%) durante um backfill em
lote; o banco entrou em crash loop e a API ficou 500 por ~25 min (D-574). O volume foi
expandido para 5GB e o incidente foi documentado. Hoje **não há alerta de uso** nem
**backup automático** — o dado existe apenas no volume.

Opções (escolher uma):
- **(A) Habilitar agora**: usage alert (aba Alerts do volume) + backups automáticos
  (aba Backups do serviço Postgres). Custo: conforme política da Railway para o tamanho.
- **(B) Adiar com risco aceito**: mantém 5GB sem alerta/backup; risco = perda total do
  catálogo em falha do volume, sem aviso prévio de crescimento.
- **(C) Política específica**: definir limite/agenda próprios (ex.: alerta em 70% e backup
  diário com retenção X) e informar para configuração.

### Decisão 2 — Rotação das 5 chaves/integrações

Motivação: durante o recon da Onda C, a listagem de variáveis do Railway exibiu os
**valores** das 5 chaves em chat (erro de parse do agente, registrado, sem uso indevido).
Recomendação: rotacionar por higiene.

Categorias (sem valores): integração de catálogo de filmes/séries (TMDB), integração de
games (IGDB + credencial Twitch associada), integração de quadrinhos (Comic Vine), e a
quinta integração configurada no projeto. Nenhum valor, token, cookie ou nome completo de
variável é registrado aqui.

Opções (escolher uma):
- **(A) Executar agora** via secret manager/CLI, com janela combinada (o agente pode
  conduzir a troca no Railway e revalidar a coleta);
- **(B) Agendar** para data definida;
- **(C) Adiar com risco aceito** (as chaves seguem válidas; a exposição ficou restrita ao
  histórico da sessão).

### Template de resposta do Operador

```
Decisão 1 (Postgres): A | B | C   [se C: limite __%, backup __, retenção __]
Decisão 2 (Chaves):   A | B | C   [se B: data __]
Observações:
```

**Lembrete:** `GO` para convites permanece SUSPENSO; nenhum BETA-GAP é marcado como DONE
por este registro.
