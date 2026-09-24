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
| **Allowlist curada** (formulários de auth, navegação estática) | local (`next dev`) | ✅ roda |
| Todo o restante do corpus (fluxos, a11y, conteúdo, série t103–t161) | local + API + DB | ⏸ `E2E_FULL=1` |

O job de CI roda **apenas a allowlist** (`e2e/auth.spec.ts` +
`e2e/navigation.spec.ts` em `ci.yml`) — o corpus completo nunca foi estável
sem backend. Com `E2E_FULL=1` (ambiente full-stack) a suíte inteira fica
habilitada.

## Triagem do corpus (T462/D-493)

O corpus legado (~60 specs) foi triado — todo arquivo de teste tem dono e
execução conhecida:

- **28 artefatos históricos da série t103–t243 deletados** (diag/debug/
  verify/compare escritos para alvo de deploy; superseded pelos testes
  atuais: `media-details`, `i18n-leak`, `watchlist.spec`, allowlist);
- **5 verificações manuais movidas para `apps/web/scripts/verify-prod/`**
  (fora do testDir — não rodam no CI; uso documentado no README lá):
  `search-topo`, `screenshot-paleta`, `t246-ctrlk`, `teste-fechado`,
  `trial-checkout`;
- **25 specs reais permanecem em `e2e/`** (allowlist + gateados
  `E2E_FULL=1` + testes de feature da suíte completa local).

Specs gateados com `E2E_FULL=1` (pulados no CI com justificativa):
`a11y` (inteiro — sem API o DOM auditado é o de estados vazios/erro, com
violações falsas; comprovado no T461), `auth.e2e`, `auth.spec` (testes de
fluxo), `flow`, `dashboard-gating`, `home-ilha`, `crosscheck-auditoria`,
`i18n-leak`, `landing-hero` (showcase vive da API), `media-details`,
`navigation.spec` (teste de planos), `search`, `status-menu-funcional`.

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

## Jornada crítica (T060/D-547)

Spec: `apps/web/e2e/jornada-critica.spec.ts` — cobre descoberta pública
(home/catálogo/detalhe), salvaguarda (watchlist Kanban + reload), biblioteca
autenticada (deep link `?status=`/`?tipo=`, query inválida, vazio/grid, sem 500)
e dashboard (sidebar, i18n, sem erro). Helper de isolamento:
`apps/web/e2e/helpers/state-reset.ts`.

Requer **API+DB** (`E2E_FULL=1`, T461) — gated como o restante do corpus. Roda nos
projetos `chromium` e `mobile-chrome` (16 testes).

```bash
# de apps/web, com API (localhost:4000) + web (localhost:3000) + DB local migrado
NODE_OPTIONS=--dns-result-order=ipv4first E2E_FULL=1 E2E_TEST_PASSWORD=... \
  PLAYWRIGHT_BASE_URL=http://localhost:3000/pt-BR \
  npx playwright test e2e/jornada-critica.spec.ts --project=chromium
```

> **Limitação desta execução (T060):** o runner **não** tinha Docker/DB local
> acessível nem servidores locais (3000/4000) e o `.env` só aponta para o banco de
> **produção** (proibido) → a execução local 3× **não foi possível aqui**. O spec
> foi validado por `eslint`, `tsc --noEmit` e `playwright test --list` (16 testes);
> a execução fica pendente em ambiente com Postgres/Redis locais.

### T061 — job efêmero no CI (D-548)

O job **`e2e-full-jornada`** (`.github/workflows/ci.yml`) sobe Postgres 16 + Redis 7
efêmeros, aplica `prisma migrate deploy`, provisiona usuários/fixture, sobe API
(:4000) e web (:3000) e roda a suíte **3× (workers=1, retries=0)** — gateado a
mudanças de infra E2E/evidence/CI e `continue-on-error` (não bloqueia merge).
Guarda anti-produção: `scripts/ci/evidence-guard.mjs` (+ self-test
`node scripts/ci/evidence-guard.self-test.mjs`, **19/19**) — recusa host não-local
e marcadores de produção/provider.

**1ª execução (run `35936827266`, job `107435635460`):** a infra subiu e **12/48**
passaram (cenários públicos home/catálogo). **36 falharam**: `apiLogin falhou: 500`
e detalhe sem dados ("Baldur's Gate 3" ausente no seed) → **pendente de correção de
test-infra** (env/seed), **sem** tocar produto.

> **T062 — incidente + hotfix:** `POST /auth/login` retornava **500** porque `mascararIpInet` (T055) devolvia **CIDR**, rejeitado pelo `@db.Inet` do Prisma. Corrigido para **IP plano** (`127.0.0.0`, `2001:db8::`) no commit `5051ffd` (PR #220). Job E2E FULL: **39/48** (de 12/48) — restam 9 falhas de seletor do spec (follow-up).

> **T064 — atualização com `main` + robustez do spec:** branch do PR #220 mesclada com `main` (merge commit; conflitos de `DECISOES`/`worklog` resolvidos **mantendo a versão de `main`** para D-549 e preservando o histórico do worklog). Specs corrigidos **sem tocar produto**: detalhe de mídia agora **navega pelo `href` do catálogo** (independe de slug/seed/clique); dashboard asserido **por viewport** (sidebar pode estar oculta no mobile). Resultado no job `e2e-full-jornada`: **12/48 → 39/48 → 42/48**. Restam falhas **intermitentes de navegação do spec** (não são bugs de produto) — follow-up de robustez (candidato: `test.fixme` explícito só se produto confirmar comportamento; ou extração do `href` com espera de rede).
