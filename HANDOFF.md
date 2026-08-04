# HANDOFF — MEDIA Rate

> Documento de handoff do projeto (atualizado em 2026-08-03). Leia este arquivo primeiro,
> depois `worklog.md` (histórico por stage) e `DECISOES.md` (decisões numeradas D-xxx).

---

## 1. Visão geral

**MEDIA Rate** é um agregador cross-mídia com score unificado e metodologia aberta/auditável:
filmes, séries, games, livros, HQs e mangás na mesma escala (0–10; games 0–100), separando
crítica vs público e exibindo um índice de consenso. Diferencial: **MEDIA Score™ v3** — estimador
Bayesiano por mídia com prior do catálogo, confiança estatística (CS 0–100) e planos
Free/Plus/Premium (R$ 4,90 / R$ 9,90, D-132).

## 2. Stack e arquitetura

Monorepo npm workspaces (root `package.json`):

| Aplicação | Stack | Porta |
|---|---|---|
| `apps/api` | NestJS 11 + Fastify 5, Prisma 6 + PostgreSQL, ESM (`"type": "module"`), argon2id, zod | 4000 |
| `apps/web` | Next.js (App Router) + next-intl (pt-BR/en-US/es), Tailwind, Zustand | 3000 |

Serviços externos: **Stripe** (checkout/trial/webhooks), **PostHog** (analytics, `posthog-node`),
**Redis** (infraestrutura órfã — sem código usando), fontes de dados via adapters
(tmdb/omdb/trakt/igdb/steam/opencritic/goodreads/openlibrary/jikan/anilist/comicvine/letterboxd).

Deploys: `main` → **Railway** (API, `apps/api/Dockerfile` + `docker-entrypoint.sh` que roda
`prisma migrate deploy` antes de `node dist/main.js`) e **Vercel** (web).

## 3. Como rodar

```bash
# Instalar
npm install

# API (apps/api): precisa de .env com DATABASE_URL etc.
npm run dev -w apps/api          # ou: cd apps/api && npm run dev

# Web
npm run dev -w apps/web

# Testes / qualidade
npm test -w apps/api             # vitest
npm test -w apps/web
npm run typecheck -w apps/api    # tsc --noEmit
npm run lint                     # eslint . (root)

# Prisma (apps/api)
npm run db:migrate:dev           # prisma migrate dev
npm run db:generate
npm run db:seed:tmdb             # popula catálogo TMDB (200 filmes + 200 séries)
```

> ⚠️ O typecheck do ROOT (`npm run typecheck` → `tsconfig.base.json`) está QUEBRADO na
> baseline (centenas de erros pré-existentes, alias `@/` não resolvido). O gate real é
> `npm run typecheck -w apps/api` + `npx tsc --noEmit -p apps/web/tsconfig.json` +
> `next build`. Não "corrija" a baseline sem decisão.

## 4. Variáveis de ambiente

Template completo: `.env.example` (nunca commitar `.env*`; `.gitignore` cobre).

| Variável | Onde vive | Notas |
|---|---|---|
| `DATABASE_URL` | Railway (produção), `.env` (dev SQLite file:) | Postgres no Railway |
| `SESSION_SECRET` / `COOKIE_SECRET` / `JWT_SECRET` / `COLUMN_ENCRYPTION_KEY` | Railway | `openssl rand` |
| `ADMIN_TOKEN` | Railway | rota admin (`x-admin-token`): coleta, metrics |
| `TMDB_API_KEY` | Railway + `.env.local` | catálogo filmes/séries |
| `ANALYTICS_WRITE_KEY` | Railway + `.env.local` | PostHog project key (projeto "MEDIA Rate", id 527617) |
| `STRIPE_SECRET_KEY` | Railway | **rk_live restrita** (perfis: prices/checkout/customers/subscriptions/webhooks/account read) |
| `STRIPE_WEBHOOK_SECRET` | Railway + `.env.local` | whsec_ da aba **Live** (endpoint live em `.../api/v1/webhooks/stripe`) |
| `STRIPE_PRICE_PLUS_ID` / `STRIPE_PRICE_PREMIUM_ID` | Railway | prices **live** (Plus R$ 4,90 / Premium R$ 9,90 mensais BRL) |
| `STRIPE_PAYMENT_METHODS` | Railway | **`card`** (NÃO trocar antes da verificação — pix/boleto quebram sessão) |
| `ALLOWED_ORIGINS` | Railway | `https://media-rate-web.vercel.app,https://media-rate-end-art-studios.vercel.app` |
| Chaves de fontes | Railway | omdb, opencritic, comicvine, trakt, twitch, google books |

Segredos NUNCA em commits. `.env.local` (raiz) tem chaves de dev (gitignored).

## 5. Estado atual (2026-08-03)

**Feito e em produção:**
- **MEDIA Score v3 (MET-03)** — estimador Bayesiano por mídia (`MEDIA = (v/(v+m))·S + (m/(v+m))·C`),
  pesos/thresholds por tipo (D-133), índice de consenso realimentando o score, polarização
  (mangás) e consenso de editoras (HQs), curva de inflação (livros), Confidence Score 0–100
  (faixas ≥70/≥40/<40). Validado em produção (BG3: score 90, votos IGDB 1566, confiança 90).
- **Stripe configurado (live)**: produtos/prices criados, webhook live com 9 eventos
  (inclui `customer.subscription.trial_will_end`), trial 7d Plus, gateway com
  `STRIPE_PAYMENT_METHODS` via env, adaptive pricing desativado, Apple Pay domain
  associado, Apple Pay/Google Pay/Link habilitados no dashboard.
- **PostHog configurado**: `ANALYTICS_WRITE_KEY` no Railway; eventos reais
  (`user_session_start`, `user_registered`, `plan_checkout_*`, `media_score_viewed`, retenção D1/D7/D30).
- **Fluxo de pagamento validado em modo TESTE** (4242 → webhook → assinatura `trialing`
  → plano sincronizado). Revertido para live.

**BLOQUEADO — dependente do Stripe (verificação da conta):**
- `charges_enabled=false`, `requirements.disabled_reason=pending_verification` — conta em
  revisão manual do Stripe (1–5 dias úteis para contas BR). **Nenhum pagamento live funciona
  até lá** (sintoma: "Erro de processamento" sem nenhum registro na Stripe).
- Após verificar: ativar **Pix** no dashboard (Settings → Payment methods; hoje o Pix nem
  aparece — gateado) e trocar `STRIPE_PAYMENT_METHODS=card,pix,boleto` no Railway.
  Boleto: capability já solicitada (pending). Card/Link/wallets ativam sozinhos.

**Pendências de produto (D-132):** limites Free (recomendações 3/dia, histórico 10),
alertas Plus por gênero/franquia, Premium social (comparador de perfis, listas colaborativas,
export CSV/JSON), top 10 cross-mídia, alinhar preços do mock web (R$19,90/R$39,90 → R$4,90/R$9,90).

**Dívida técnica (Fase 3):** refresh token flow (`SessionRotationService` é stub),
`AuditLogService` não wired no `AuthService`, graceful shutdown, votos nas demais fontes
(steam/opencritic/goodreads — hoje só tmdb/igdb reportam `votos`).

**Catálogo:** produção com 1 GAME + 49 séries (zero filmes) — rodar `db:seed:tmdb`.

## 6. Acessos e CLIs (máquina do Operador)

| Serviço | Como acessar | Config |
|---|---|---|
| Railway | `railway` (npm global) — usa `~/.railway/config.json` (projeto/environment/service linkados) | `railway variables`, `railway status`, `railway logs [-b]` |
| Stripe | `stripe` (npm global, @stripe/cli) — login test salvo; chave teste completa em `~/.config/stripe/config.toml` (`test_mode_api_key`) | `stripe ...` (test), chave live via dashboard |
| PostHog | `posthog-cli` (npm global, @posthog/cli) — personal key via env `POSTHOG_CLI_API_KEY` | `posthog-cli api call project-get '{}'` |
| GitHub | `ENDARTStudios/MEDIA-Rate` — `main` protege deploys | commits convencionais: `feat(escopo):`, `fix(...):`, `docs(...):` |

IDs: projeto Railway `46372876-ced1-45c7-ad71-10f7998351a7` (env `91f35534-eecb-4a36-b5f7-5a9e90fe2bcd`,
serviço `f2456872-5e90-41a5-ae19-83c0c66a1fa9`) · conta Stripe `acct_1TwWJAL2aUoTXFOy` (END ART Studios)
· PostHog projeto id `527617`.

## 7. Rotas principais da API

- `GET /health` · `GET /api/v1/midias` (+ `?tipo=`, slug) · `GET /api/v1/midias/slug/:slug` (score v3 com `indiceConsenso`/`votosTotal`/`confianca` 0–100)
- `POST /api/v1/midias/:id/coletar` (admin `x-admin-token`) — coleta fontes + recalc v3
- `POST /api/v1/checkout` (auth, `Idempotency-Key`) → Stripe Checkout · `POST /api/v1/webhooks/stripe`
- `POST /api/v1/auth/register|login` · `GET /api/v1/auth/me` · `GET /api/v1/watchlist` · `GET /api/v1/premium/*` · `GET /api/v1/discover/*`
- `POST /api/v1/_debug/coletar` (debug, admin) · `POST /api/v1/_force-error`

## 8. Armadilhas conhecidas (leia antes de mexer)

1. **`STRIPE_PAYMENT_METHODS`**: manter `card` enquanto `charges_enabled=false` — `pix`/`boleto`
   fazem a criação de sessão falhar ("pix is invalid").
2. **`payment.module.ts`**: o gateway é selecionado por `STRIPE_SECRET_KEY` presente; se a chave
   sumir, volta o MockPaymentGateway silenciosamente.
3. **ESM no build da API**: nada de `require()` — erros `ReferenceError: require is not defined`
   em produção (já mordeu uma vez).
4. **`confianca` legada 0–1**: endpoints normalizam (`< 1 → ×100`); valores antigos caem em "low"
   até o job recalcular (não existe job cron diário no código — recalc é via rota admin).
5. **Web engine espelho**: `apps/web/src/lib/media-score-engine.ts` é espelho/teste da API —
   manter alinhado (consenso 0–10, quantização da API) ao alterar a fórmula.
6. **`tsconfig.base.json` (root typecheck) quebrado na baseline** — use os typechecks por app.
7. **Votos**: só tmdb/igdb reportam `votos`; demais fontes deixam `v=0` → score = S (sem pull Bayesiano).
8. **Webhook live vs teste**: segredos são por modo; a chave de servidor define o modo — não
   misturar (assinatura rejeitada).

## 9. Documentação de referência

- `worklog.md` — histórico por stage (deploy, correções, validações)
- `DECISOES.md` — decisões numeradas (D-132 monetização, D-133 MEDIA Score v3)
- `PENDENCIAS_OPERADOR.md` — ações manuais (itens 1, 6, 7 concluídos; 2–5 em aberto)
- `PLANO_MESTRE.md` — plano geral (parcialmente desatualizado em relação ao trabalho recente)
- `PROTOCOLO_MESTRE.md` — regras do Operador/Doer (segredos nunca no chat/commit)

## 10. Próximos passos (ordem sugerida)

1. **Aguardar verificação do Stripe** → ativar Pix no dashboard → `STRIPE_PAYMENT_METHODS=card,pix,boleto`
   → validar pagamento real (R$ 4,90).
2. **Catálogo**: `npm run db:seed:tmdb` em produção (200 filmes + 200 séries).
3. **Produto (D-132)**: limites Free restantes, alertas Plus, features Premium, preços do mock.
4. **Dívida técnica**: refresh token, audit logging, graceful shutdown, votos nas demais fontes.
5. **Validar PostHog** pós-deploy: login → `user_session_start` no Live events.
