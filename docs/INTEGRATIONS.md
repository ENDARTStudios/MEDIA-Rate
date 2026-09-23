# INTEGRATIONS — Integrações externas

Regra geral: credenciais só em env/secrets (ver `docs/BOAS_PRATICAS_SECRETS.md`);
falha de integração **nunca** derruba o caminho core se puder degradar.

| Integração | Uso | Env | Modo de falha |
|---|---|---|---|
| **Stripe** | checkout, assinaturas, trials, webhooks (HMAC + `Idempotency-Key` + `stripe_event_id` UNIQUE) | `STRIPE_*` | webhook inválido → 400 e evento descartado com log (sem replay duplo) |
| **Resend** | e-mails transacionais (verificação de e-mail — obrigatória no login — e reset de senha) | `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_PROVIDER` | e-mail falha → registro criado, verificação pendente (usuário reenvia) |
| **Google OAuth** | login social (`google/callback`, `credential` verificada server-side; e-mail marcado verificado) | `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | falha de verificação → 401 |
| **PostHog** | analytics + feature flags (ver [ANALYTICS](ANALYTICS.md)) | `NEXT_PUBLIC_ANALYTICS_WRITE_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | SDK inerte sem consentimento/env — nunca quebra UI |
| **Sentry** | erros + tracing (release=sha, sourcemaps — D-503/D-505) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN/ORG/PROJECT` (CI) | no-op sem DSN |
| **Cloudflare R2** | assets (`storage.port.ts`; magic bytes; chave content-addressed `media/{tipo}/{id}/{sha256}.{ext}`; `UnconfiguredStorage` fail-closed 503 em produção sem env) | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` | produção sem env → 503 `STORAGE_UNAVAILABLE` (nunca InMemory em prod) |
| **Catálogos** (IGDB, OMDB, ComicVine, Google Books, MAL, OpenCritic) | coleta/seeds; unicidade `(fonte, fonte_id)` | `IGDB_*`, `OMDB_API_KEY`, `COMICVINE_API_KEY`, `GOOGLE_BOOKS_API_KEY`, `MAL_*`, `OPENCRITIC_API_KEY` | falha de fonte → mídia não criada (seed idempotente re-tenta) |
| **Redis** (opcional) | cache 30-60s | `REDIS_URL` | sem Redis → CacheService degrada (miss eterno) |
| **Loki** (opcional) | stream de logs batched | `LOKI_URL` | falha de envio silenciosa |
| **UptimeRobot** | uptime externo 5min (ação do Operador — 9.5.4) | — (conta externa) | — |

## Adicionar integração nova (checklist)

1. Contrato/segredos em env example + `docs/BOAS_PRATICAS_SECRETS.md` se novo tipo.
2. Port/adapter (padrão `StorageAdapter`) quando houver provedor trocável.
3. Fail-open/failed-closed DECIDIDO e documentado (ex.: R2 fail-closed, analytics
   fail-open) — registrar em DECISOES se for regra.
4. Teste com mock do provedor + caso de falha (o CI não aceita "só em produção").
5. Linha na tabela acima + [ANALYTICS](ANALYTICS.md)/[ARCHITECTURE](ARCHITECTURE.md)
   se estrutural.
