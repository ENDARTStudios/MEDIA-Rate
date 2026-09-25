# T082 — Triagem de segurança, redteam e premortem (Beta)

**Data:** 2026-09-25 · **Autor:** Doer · **Base:** `origin/main` @ `42842e2`
**Método:** análise **documental e read-only** (código, guards, docs, PRs, runs, smoke passivo).
**Go/No-Go:** **NO-GO condicional** — nenhum achado CRITICAL/HIGH **aberto**; promoção a Beta depende de **fechar P012** (staging/environment) e das pendências P013–P017.

> Sem PII/segredos. Jev/TypeSafe **não** foi invocado nesta tarefa (restrição); o resultado
> sanitizado do T081 (`escopo_ok=0.98`, `risco_runtime=0.09`, `higiene_ok=0.89`,
> `recomendacao=merge_seguro`) é citado apenas como **corroboração auxiliar**.

---

## 1. Executive summary

O produto tem postura de segurança **madura para um Beta fechado**: auth por token opaco com rotação de
refresh, lockout progressivo, CSRF double-submit, RBAC por guard, rate limit por rota + global, AuditLog
append-only com cadeia SHA-256, DTO allowlist no contrato público, redação/mascaramento de PII em logs,
RLS testado, upload com magic-bytes e fail-closed, webhooks Stripe com assinatura e alertas/uptime no CI.
Os incidentes recentes (login 500 por `ip_origem` CIDR; 429 mascarado como 500) foram **corrigidos** e
têm **guardas de regressão**. Não foram encontrados achados críticos/altos abertos por análise documental.

## 2. Superfície de ataque (inventário)

- **Público:** `/health`, `/metrics` (X-Admin-Token), catálogo/busca/descubra (GET), auth
  (register/login/refresh/verify/forgot/reset/google-callback), webhooks (`/webhooks/*`, assinatura),
  páginas web (`/pt-BR|en-US|es-ES/...`).
- **Autenticado:** interações (DTO allowlist), watchlist, biblioteca, dashboard, consentimento, export LGPD.
- **Admin:** métricas/alertas, diagnóstico, upload de assets, curadoria (guard + roles).
- **Rate limit:** login 6/min · upload 10/min · discover 30/min · watchlist 30/min · refresh 10/min · global 100/min.
- **Trust boundaries:** navegador → edge (Vercel) → API (Fastify/Nest) → Postgres/Redis; Stripe (webhook);
  GitHub Actions (CI/CD); Railway (runtime/deploy); logs/artefatos; Operador (governança).

## 3. STRIDE (resumo por fronteira)

| Fronteira | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| Navegador→API | CSRF double-submit; samesite cookie | DTOs validados (zod) | AuditLog | DTO allowlist; PII mascarada | rate limit/lockout | RBAC `@Roles` |
| API→Postgres | creds server-side | Prisma parametrizado | AuditLog hash-chain | RLS aplicado | pool/timeout | menor privilégio |
| API→Redis | — | — | — | sem PII | fallback local (degradado) | — |
| Stripe→API | assinatura do webhook | verificação de assinatura | evento idempotente | sem cartão (Stripe-hosted) | rate limit | — |
| CI/CD→produção | OIDC/tokens nativos | PR + ruleset required | run/PR/commit | artefatos sanitizados | `docs-gate`/jobs | env `Production` (P012) |
| Operador | 2FA/segredo do Operador | — | DECISOES/worklog | segredos só em `.env` | — | bypass só em incidente (D-496) |

## 4. Redteam documental (12 cenários)

| # | Cenário | Estado | Evidência/mitigação |
|---|---|---|---|
| 1 | Credential stuffing | **Mitigado** | login 6/min + lockout progressivo (1m→24h) + alertas auth |
| 2 | Bypass de sessão (cookie roubado) | **Mitigado parcial** | token opaco + rotação de refresh + detecção de reuse (revoga família) |
| 3 | CSRF em mutações | **Mitigado** | double-submit `csrf_token` (cookie+header), 403 |
| 4 | IDOR em `interacoes`/`watchlist` | **Mitigado** | escopo por `usuario_id` no service + DTO allowlist |
| 5 | Vazamento em DTO/Swagger | **Mitigado** | DTO allowlist (T036/T038) + guarda Swagger/DTO (T080) |
| 6 | PII em logs | **Mitigado** | `pii-mask` (T049/T053) + redact; AuditLog sanitizado (T055) |
| 7 | Abuso de rate limit (DoS lento) | **Risco residual baixo** | limites por rota/IP/user; global 100/min |
| 8 | Envenenamento de webhook Stripe | **Mitigado** | verificação de assinatura `whsec_` |
| 9 | Manipulação de cursor/paginação | **Mitigado parcial** | cursor opaco; validar limites em testes (follow-up de fuzz) |
| 10 | PII no export LGPD | **Mitigado (por desenho)** | export é do titular autenticado; exclusão com carência |
| 11 | Falha de shutdown/deploy | **Mitigado** | graceful shutdown (T044) + health/uptime |
| 12 | Abuso de alertas/issues | **Mitigado** | dry-run default + dedup + permissões mínimas (T078) |

## 5. Premortem (falha em 72h) — causas prováveis

1. **Regressão de auth/audit** (como o incidente de login 500) → detecção: alertas 5xx/auth + smoke de login;
   mitigação existente: guardas de regressão + E2E 48/48; **gap**: smoke pós-merge deve incluir login (lição D-549).
2. **Migrations em produção** sem staging (P012/P013) → detecção: `Migration Safety` required; **gap**: sem ambiente intermediário.
3. **Custo/limite de plataforma** (Vercel rate-limit, Railway) → detecção: uptime/alerts; **gap**: monitor externo (P015).
4. **PII/segredo em artefato de CI** → mitigação: sanitização + trace/video off; **gap**: revisão contínua.
5. **Config live de alertas incorreta** → mitigação: dry-run default; **gap**: ativação depende do Operador (P014).

## 6. Classificação dos achados

| Achado | Classificação | Ação |
|---|---|---|
| Login 500 (CIDR em `inet`) | **Confirmado — RESOLVIDO** (D-549) | regressão coberta; smoke de login pós-merge |
| 429 mascarado como 500 | **Confirmado — RESOLVIDO** (D-552) | guarda de status 400–599 |
| Sem staging (P012) | **Bloqueador do Operador** | decisão de ambiente/gate |
| Migration manual (P013) | **Pendência do Operador** | runbook console Railway |
| Alertas live/uptime externo (P014/P015) | **Pendência do Operador** | runbook pronto (T078) |
| Cifragem de coluna (P017) | **Bloqueado** (determinismo/migration/segredo) | decisão do Operador |
| PRs legadas #140/#139/#133/#4/#3/#2 | **Stale/unknown — não mergeáveis** | inventário read-only; candidatas a fechar (Operador) |
| PR #266 (`fix/hero-conversao-a11y`) | **Ativo (outro fluxo)** | não tocar; segue o próprio ciclo |
| Fuzz de cursor/paginação | **Follow-up Doer (baixo)** | teste de limites |

## 7. Pendências do Operador vs. executáveis (Doer)

- **Operador:** P010 (gh token), **P012** (staging/environment — **pré-requisito de go**), P013, P014, P015, P016, P017.
- **Doer (executável):** fuzz de cursor/paginação; ampliar smoke pós-merge (login); revisar minimização de `AuditLog.dados_depois`; ampliar E2E (auth crítico).

## 8. Próximos 5 passos

1. **T083 — Smoke pós-merge autenticado (login + `/auth/me`) padronizado.** Risco: baixo.
2. **T084 — Fuzz de limites de paginação/cursor** (`limit`, cursor inválido) com testes. Risco: baixo.
3. **T085 — Minimização de `AuditLog.dados_depois`** (não gravar `email`/`userAgent` quando dispensável). Risco: médio (produto).
4. **T086 — Revisão de headers de segurança/CSP** (relatório + ajustes mínimos). Risco: baixo/médio.
5. **T087 — Inventário/limpeza das PRs legadas** (docs/classification + recomendação; close = Operador). Risco: baixo.

## 9. Go/No-Go

**NO-GO condicional.** Sem achados CRITICAL/HIGH abertos. **Go** quando: **P012** decidido (staging/gate),
smoke pós-merge com login padronizado, e ciência das pendências P013–P017. **Beta não declarada pronta.**

---

*Nenhuma alteração de produto/schema/migration/segredo/infra/environment. Sem PII/segredos. Sem ataque ativo.*
