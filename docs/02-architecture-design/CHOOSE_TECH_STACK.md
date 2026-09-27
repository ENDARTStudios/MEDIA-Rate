# CHOOSE_TECH_STACK — Stack e por quê

Registro das escolhas estruturais (as mudanças viram ADR em `DECISOES.md`).

## Escolhas

| Camada | Escolha | Por quê |
|---|---|---|
| Monorepo | **npm workspaces** (package-lock único) | deploy nativo Vercel/Railway entende npm; pnpm exigiria camada extra (regra do repo: **npm, nunca pnpm**) |
| Web | **Next.js 16 App Router + Turbopack + RSC** | SSR/ISR + SEO (frente [SEO](SEO.md)) e dados no servidor por padrão |
| i18n | **next-intl v4** por path (`/pt-BR`…) | 3 locales com paridade testada no CI; hreflang no sitemap |
| API | **NestJS 11 + Fastify 5** | módulos/guards/pipes maduros + performance do Fastify; pino JSON nativo |
| DB | **PostgreSQL + Prisma** | migrations versionadas, types end-to-end; **RLS owner-only** (`comContextoRls`) como defesa de locação |
| Auth | **tokens opacos SHA-256 em cookies httpOnly** (NÃO JWT) | blacklistability/revogação imediata (D-decision inicial); rotação de refresh com reuse detection |
| Hash de senha | **argon2id** (custo ≥12, 19MiB) | padrão OWASP |
| Cache | **Redis opcional** (`CacheService` degrada sem ele) | sem dependência dura de infra extra na Beta |
| Billing | **Stripe** checkout + webhooks HMAC | conformidade PCI fora de casa; idempotência nativa + UNIQUE por evento |
| E-mail | **Resend** | verificação/reset transacionais (verificação é obrigatória no login) |
| Analytics/flags | **PostHog** (só com consentimento `analytics`) | flags com local_evaluation server-side (sem PII no cliente) |
| Erros/tracing | **Sentry** (release=sha, sourcemaps) | correlação erro↔commit (D-503) |
| Assets | **Cloudflare R2** (chave content-addressed, magic bytes) | sem egress fee; CDN pública opcional |
| Deploy | **Vercel (web) + Railway (api+pg)** | main → produção automática nas duas pontas, independentes (D-527) |

## Deliberadamente NÃO escolhido (e quando revisitar)

- **Microserviços/filas obrigatórias**: monolito modular (29 módulos NestJS) até o
  custo operacional justificar — BullMQ existe como `QueueService` inerte.
- **GraphQL**: REST versionado `/api/v1` + Swagger cobre os clientes atuais.
- **JWT**: revogação é requisito do produto (sessões opacas).
- **Cloudflare como plataforma principal**: migração **gated** pela flag
  `cloudflare_migration` (rollout gradual D-507; build OpenNext informativo no CI).
- **Permissions granulares no RBAC**: postergado (PLANO 2.4) — roles+planos bastam
  para a Beta.

## Regra para mudar a stack

Qualquer adição/remoção estrutural = ADR (D-NNN) com custo, alternativa e plano de
migração — e, se tocar deploy, atualizar [ARCHITECTURE](ARCHITECTURE.md) e
[PRODUCTION_DEPLOY](PRODUCTION_DEPLOY.md) no mesmo PR.
