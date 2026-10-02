# Triagem da Revisão Externa — MEDIA Rate (2026-08-14)

> T323 (D-313 retomada). Triagem dos ~60 achados da revisão externa (2026-08-14)
> contra a branch `main` + commits não-pushados. Cada achado HIGH foi verificado
> por caminho+linha+trecho na árvore atual. Classificação: CONFIRMADO /
> NÃO-APLICÁVEL / PARCIAL.

## Sprint de votos (OpenCritic/AniList/Kitsu)

- **Verificado:** os 3 adapters existem e **agora retornam `votos`** (T324, commit
  `56f3884`). A revisão externa rodou ANTES do sprint; o achado "adapters não
  reportam votos" era verdadeiro na época e foi **resolvido pelo sprint** — não é
  redundante, é aditivo e já entrou. Nenhuma ação.

## Achados HIGH — triados um a um

| Achado | Sev | Classificação | Evidência | Ação |
|---|---|---|---|---|
| CSRF guard implementado mas nunca registrado (só `/auth/logout` inline) | HIGH | **CONFIRMADO** | `common/guards/csrf.guard.ts` (0 `@UseGuards`/`APP_GUARD`); `auth.controller.ts:214-260` única checagem | T325 — registrar `CsrfGuard` global p/ métodos mutantes |
| Idempotência de checkout morta + abuso de trial PLUS | HIGH | **CONFIRMADO** | `common/interceptors/idempotency.interceptor.ts:43` nunca registrado (`main.ts:281` só Metrics); `stripe-payment.gateway.ts:63-70` `trial_period_days:7` sem controle de já-usado | T326 — registrar interceptor + coluna `trial_used_at` |
| CSP web com `script-src 'unsafe-inline'` | HIGH | **CONFIRMADO** | `next.config.ts:81` `"script-src 'self' 'unsafe-inline' …"` (contradiz o comentário `:11` que promete nonce/strict-dynamic) | T327 — CSP com nonce no App Router, remover `unsafe-inline` de script-src |
| RLS de catálogo sem `FORCE` + role ADMIN hardcoded na app | HIGH | **CONFIRMADO** | `20260811_z_rls/migration.sql:40,58,67,75` ENABLE sem FORCE; `recommendations.service.ts:58,141` `role:"ADMIN"` | T328 — `FORCE ROW LEVEL SECURITY` + role de aplicação sem BYPASSRLS + remover role hardcoded |
| Mailer mock: verificação/reset nunca chegam em produção | HIGH | **CONFIRMADO** | `common/mock-mail.service.ts:25-38` no-op em prod; 0 imports de SMTP/Resend/SES; `auth.service.ts:267-287` bloqueia login com `EMAIL_NOT_VERIFIED` | T341 — mailer transacional real (P0 funcional) |
| `DiagPanel` dispara 2 chamadas API em toda página | HIGH | **CONFIRMADO** | `DiagPanel.tsx:80-108` useEffect roda `testMe()/testWatchlist()` antes do `if(!enabled)`; montado em `[locale]/layout.tsx:88` | T329 — gatear o useEffect em `enabled` |
| `getBySlug` varre a tabela `midia` inteira + slugify em JS por request | HIGH | **CONFIRMADO** | `media.controller.ts:355-367` `findMany` sem where + `slugify()` por linha | T330 — persistir coluna `slug` indexada + cache |
| `headers()` no root layout anula ISR/estático de todas as rotas | HIGH | **CONFIRMADO** | `app/layout.tsx:37` `await headers()` (render dinâmico global) | T331 — mover `headers()` p/ escopo menor ou remover |
| Backup não-durável (placeholder falso + CI efêmero) | HIGH | **CONFIRMADO** | `scripts/backup-db.sh:59-65` grava placeholder com exit 0; `deploy.yml:92` roda no runner efêmero; sem cron real | T332 — cron no host + volume persistente + `pg_restore --list` |
| `sessao.refresh_token_hash_anterior` sem índice (seq scan por refresh) | HIGH | **CONFIRMADO** | `schema.prisma:146` (única coluna de hash sem index); `session-rotation.service.ts:96` | T333 — índice dedicado |
| `evento_pagamento.payload_raw` PII Stripe em plaintext | HIGH | **CONFIRMADO** | `schema.prisma:256`; `payment.service.ts:99` grava `event.data` completo | T335 — purga/redação do payload |
| Sitemap sem nenhuma URL de mídia | HIGH | **CONFIRMADO** | `sitemap.ts:5-19` só 9 rotas estáticas (×3 locales) | T336 — entradas dinâmicas do catálogo |
| `AggregateRating.ratingValue` 10× errado | HIGH | **CONFIRMADO** | `detail-metadata.ts:48,63-64` `score10=round(s/10)` → `(score10/10).toFixed(1)` com `bestRating:"10"` (85 → "0.9") | T337 — `ratingValue:(s/10).toFixed(1)` |
| Rotas legadas `/movie/[id]`/`/game/[id]` indexáveis + client-only | HIGH | **CONFIRMADO** | `MediaDetailPage.tsx:1,46-54` `"use client"` sem `initialData`; `detail-metadata.ts:46,81` self-canonical | T338 — redirect 301 p/ `/media/[slug]` |
| Páginas sem `alternates` herdam canonical da HOME; `user/[id]` canonical 404 | HIGH | **CONFIRMADO** | `[locale]/layout.tsx:39-42` canonical da home; `user/[id]/page.tsx:14,19` canonicaliza p/ `/user` (inexistente) | T339/T340 — `alternates` por página |

## Achados MED/P2 — amostragem representativa

Verificados 3-5 por categoria; padrão consistente com o relatório:

- **MED security** (perfil stats sem gate de plano `perfil.controller.ts:17-91`; `success_url`/`cancel_url` open redirect `payment.dto.ts:8-9`; `listas` sem Zod `listas.controller.ts:31,49`; `x-admin-token` fora das listas de redação) → **CONFIRMADO** (backlog de higiene).
- **MED perf** (endpoints públicos sem cache; `/auth/me` no-store; ~140 KB mock no bundle; 3 libs de animação na landing) → **CONFIRMADO** (backlog).
- **MED DB** (`USING(true)` ignora tenant; cascades `Fatura`/`ListaColaborativa`; LGPD exclusão agendada nunca executada) → **CONFIRMADO** (backlog).
- **MED SEO** (sem `og:image` default; JSON-LD via `other` vira `<meta>`; FAQ pricing PT-only) → **CONFIRMADO** (backlog).
- **P2 cleanup** (BullMQ/ioredis sem consumidor; `apps/backend/` órfão; motor de score espelho drift; `MockPaymentGateway` fallback silencioso) → **CONFIRMADO** (backlog).

Nenhum achado da revisão externa foi **NÃO-APLICÁVEL** — o relatório foi feito contra a árvore atual e não apontou fantasma de outra versão.

## Lista de tarefas a emitir (T325+)

| ID | Título | Prioridade |
|---|---|---|
| T325 | Registrar `CsrfGuard` global (métodos mutantes autenticados) | P0 |
| T326 | Registrar `IdempotencyInterceptor` + controle `trial_used_at` | P0 |
| T341 | Mailer transacional real (verificação/reset em produção) | P0 (funcional) |
| T327 | CSP sem `unsafe-inline` no script-src (nonce App Router) | P1 |
| T328 | RLS `FORCE` no catálogo + role de aplicação sem BYPASSRLS | P1 |
| T329 | Gatear `DiagPanel` useEffect em `enabled` | P1 |
| T330 | Coluna `slug` indexada + cache em `getBySlug` | P1 |
| T331 | Remover/limitar `headers()` do root layout (restaurar ISR) | P1 |
| T332 | Backup durável real (cron + volume persistente + validação) | P0 (dados) |
| T333 | Índice em `sessao.refresh_token_hash_anterior` | P1 |
| T335 | Redação/purga do `payload_raw` Stripe | P1 |
| T336 | Sitemap dinâmico com URLs de mídia | P1 |
| T337 | Corrigir `AggregateRating.ratingValue` | P1 |
| T338 | Redirect `/movie/` `/game/` → `/media/[slug]` | P1 |
| T339/T340 | `alternates` por página + canonical correto em `user/[id]` | P2 |
