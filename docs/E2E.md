# E2E (Playwright) — o que roda no CI, o que exige full-stack (T461/D-492)

## Estado (2026-09-14)

O job **E2E Playwright** do CI roda `next dev` **sem API e sem banco**. Com
isso, testes de fluxo (registro/login/watchlist) não são executáveis no CI —
e **nunca** podem apontar para produção:

1. O edge de produção devolve **429** a IPs de datacenter (bot-protection) —
   runners do GitHub Actions não carregam as páginas.
2. Mesmo sem o 429, fluxos de registro criariam **usuários reais no banco de
   produção** — proibido.

## Política

| Tipo de teste | Ambiente | No CI |
|---|---|---|
| Exibição de shell (formulários, navegação estática) | local (`next dev`/`next start`) | ✅ roda |
| Auditoria a11y (todas as páginas) | local + API (página real) | ⏸ `E2E_FULL=1` |
| Fluxos: registro, login, logout, CSRF, watchlist, gating por plano | local + API + DB | ⏸ `E2E_FULL=1` |

Specs gateados com `E2E_FULL=1` (pulados no CI com justificativa):
`a11y` (inteiro — sem API o DOM auditado é o de estados vazios/erro, com
violações falsas; comprovado no T461), `auth.e2e`, `auth.spec` (testes de
fluxo), `flow`, `dashboard-gating`, `home-ilha`, `crosscheck-auditoria`,
`i18n-leak`, `landing-hero` (showcase vive da API), `media-details`,
`navigation.spec` (teste de planos), `search`/`search-topo`,
`screenshot-paleta`, `status-menu-funcional`, `t103`/`t104`.

**Por que `next dev` e não `next build && next start` no job web-only:**
testado no T461 — o build de produção SEM API **assa os estados vazios das
páginas ISR no bundle** (revalidate 3600s, T447): 133 testes quebrados contra
17 no modo dev. O E2E representativo exige API+DB (E2E_FULL).

## Como rodar o conjunto completo localmente

```bash
# 1. Infra + API (docker compose ou Postgres/Redis locais)
docker compose up -d
cd apps/api && npx prisma migrate deploy && npm run start:dev   # :4000

# 2. Web (outro terminal)
cd apps/web && npm run dev                                       # :3000

# 3. Suíte completa
cd apps/web && E2E_FULL=1 npx playwright test --project=chromium
```

Sem `E2E_FULL=1`, os specs gateados são pulados e o restante roda contra o
`baseURL` de `playwright.config.ts` (`http://localhost:3000/pt-BR`).

## Caminho para E2E completo no CI (futuro)

1. Provisionar ambiente com **API + Postgres + seed** acessível ao job
   (serviço no próprio workflow ou staging) — pré-requisito de tudo;
2. **Só então** trocar o `webServer` para `next build && next start` — build
   com API disponível assa as páginas ISR com conteúdo real (build sem API
   assa estados vazios: 133 testes quebrados, medido no T461);
3. Definir `E2E_FULL=1` no job e re-habilitar os specs gateados;
4. Somente então tornar o job E2E **required** (hoje é não-bloqueante com
   `continue-on-error` — ver D-491/T461).

## Correções feitas no T461

- **`auth.passwordStrong`/`passwordWeak`/`passwordMedium`**: estavam no
  namespace `nav` em vez de `auth` nas 3 línguas — `AuthForm` usa
  `useTranslations("auth")`, gerando `MISSING_MESSAGE` (movidas para `auth`).
- **Specs apontavam para produção** (`media-rate-end-art-studios.vercel.app`,
  `media-rate-web.vercel.app`): `auth.e2e`, `a11y`, `flow`, `regression` —
  retargetados para URLs relativas (baseURL local).
- **Deploy workflow**: typecheck da API falhava por `@prisma/client` stub —
  `prisma generate` adicionado antes do typecheck (espelha o ci.yml, T042).
