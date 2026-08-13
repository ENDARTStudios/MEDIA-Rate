# Runbook de Produção — MEDIA Rate

Procedimentos operacionais validados para o ambiente de produção.

## Origens (web ≠ API)

Existem **duas** origens em produção e não é a mesma coisa:

- **API** (Railway): `https://media-rate-production.up.railway.app` — só JSON
  (`/health`, `/api/v1/*`). Não serve páginas (ex.: `/pt-BR/register` → 404 JSON).
- **Web** (Vercel): `https://media-rate-end-art-studios.vercel.app` — Next.js com
  as páginas (`/register`, `/dashboard`, Ctrl+K). Em produção o front usa URL
  **relativa** para `/api/*` (rewrite same-origin → Railway, http.ts `getBaseUrl`).

Ao rodar spot-checks de UI use a origem **web** (Vercel). A origem Railway só
serve a API.

> Regra D-275: scripts executáveis em produção vivem em pastas copiadas pela
> imagem (`prisma/`) ou são compilados para `dist/`. Nunca alterar o Dockerfile
> só para hospedar um script novo.

## Conteúdo

1. [Spot-checks autenticados](#spot-checks-autenticados)

---

## Spot-checks autenticados

Validação end-to-end dos fluxos autenticados em produção: gating do dashboard
por plano, Ctrl+K logado, isolamento RLS A≠B e stats de admin.

### Arquivo

- Spec: `apps/web/e2e/authenticated-spotchecks.spec.ts`
- Screenshots: `apps/web/e2e/screenshots/t305-*.png`

### Fluxos cobertos

| # | Fluxo | Asserção |
|---|-------|----------|
| a | Free → `/dashboard` | prompt de upgrade ("Dashboard é Plus/Premium") e **sem** `svg[aria-label="Radar"]` |
| b | Plus → `/dashboard` | radar `svg[aria-label="Radar"]` visível e **sem** `svg[aria-label="Temporal"]` |
| c | Premium → `/dashboard` | radar + `svg[aria-label="Temporal"]` visíveis |
| d | Ctrl+K logado | digita "duna" na paleta → ≥1 resultado (`[role="dialog"] button`) |
| e | RLS A≠B | B tenta `PATCH /api/v1/watchlist/:id` de A → 404/403/401 |
| f | Admin | `GET /api/v1/admin/stats` → contagem agregada não-zero |

### Pré-condição: contas de plano verificadas

Os fluxos (a/b/c/f) dependem de usuários de teste **verificados** (o login de
quem não verificou retorna `403 EMAIL_NOT_VERIFIED`, auth.service.ts) e com o
**plano correto**. As credenciais são lidas de env — nunca hardcode:

- `TEST_USER_FREE_EMAIL` / `TEST_USER_FREE_PASSWORD`
- `TEST_USER_PLUS_EMAIL` / `TEST_USER_PLUS_PASSWORD`
- `TEST_USER_PREMIUM_EMAIL` / `TEST_USER_PREMIUM_PASSWORD`
- `TEST_USER_ADMIN_EMAIL` / `TEST_USER_ADMIN_PASSWORD`

Quando uma credencial está ausente, o teste correspondente é **skipado** (o spec
continua rodando os demais). Os fluxos (d) e (e) reusam as contas provisionadas
(free/plus) — **não** usam registro via UI (que loopa em produção, ver abaixo).

> ⚠️ **NUNCA** usar `npm run db:seed` em produção para criar os usuários: o seed
> principal **apaga todas as tabelas** (midia, temporada, episodio, watchlist,
> usuario…). O provisionamento de contas de teste em produção deve ser um
> upsert pontual e idempotente, com consentimento explícito do Operador.

### Provisionar contas (upsert não-destrutivo)

```bash
# apps/api — via tunel (railway connect postgres --tunnel-only) apontando
# DATABASE_URL para 127.0.0.1:PORT/railway. NUNCA via db:seed (destrutivo).
TEST_USERS_PASSWORD="Senha@123" npm run db:provision:test-users
```

Cria/atualiza `free@/plus@/premium@/admin@mediarate.test` (verificados, plano
correto; admin com papel ADMIN) e adiciona interações de consumo para Plus/Premium
— o radar só renderiza com dados de `usuario_midia_interacao` (DashboardClient) e
o sparkline temporal exige `CONCLUIDO`/`CONSUMINDO`.

### Como rodar localmente

```bash
# apps/web — Origem WEB (Vercel). A origem Railway é só API.
# Use --workers=1: o submit do form de login é estável sem paralelismo.
PLAYWRIGHT_BASE_URL="https://media-rate-end-art-studios.vercel.app/pt-BR" \
TEST_USER_FREE_EMAIL="..." TEST_USER_FREE_PASSWORD="..." \
TEST_USER_PLUS_EMAIL="..." TEST_USER_PLUS_PASSWORD="..." \
TEST_USER_PREMIUM_EMAIL="..." TEST_USER_PREMIUM_PASSWORD="..." \
TEST_USER_ADMIN_EMAIL="..." TEST_USER_ADMIN_PASSWORD="..." \
npx playwright test e2e/authenticated-spotchecks.spec.ts --project=chromium --workers=1
```

### Observação: registro → /dashboard em produção (T303)

Ao registrar um usuário novo via UI na origem web, o fluxo pós-registro cai em
`ERR_TOO_MANY_REDIRECTS`: `/dashboard` exige o cookie de sessão `sess`
(middleware.ts) e, sem ele, redireciona para `/login` — que redireciona de volta —
formando o loop. Investigação pertence a **T303** (CI diagnóstico / HEAD vermelho).
Até lá, fluxos autenticados dependem de contas provisionadas com sessão válida
(login direto), não de registro via UI.

### Verificação

- `/health` → 200.
- Output do Playwright: `passed`/`failed` por teste.
- Screenshots em `apps/web/e2e/screenshots/` (um por fluxo a–f).
