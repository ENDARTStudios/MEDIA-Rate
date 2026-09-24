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

### T065 — estabilização (PARCIAL) e como iterar localmente

Estado: o job `e2e-full-jornada` evoluiu **12/48 → 39/48 → 42/48**. As falhas
remanescentes são **intermitentes de navegação/fixture do spec** (não produto).
A iteração no CI é lenta (~5–8 min/ciclo) e o endpoint de logs do run **não
retornou dados** neste ambiente, inviabilizando diagnóstico fino aqui.

**Como iterar RÁPIDO (recomendado para o próximo passo):** rodar o harness
localmente com Docker/Postgres (logs imediatos):

```bash
# requer Docker (Postgres) — em apps/api: docker compose up -d postgres
node scripts/evidence-local.mjs --spec=jornada-critica --repeat=3
```

**Classificação das falhas conhecidas (últimas execuções):**
- `detalhe de mídia` — navegação (corrigido para `goto(href)` do 1º link do catálogo); resta validar no CI.
- `apiLogin` intermitente (linha ~94/biblioteca) — classificar entre `ENV_MISMATCH` (senha/provisionamento) e `LOCKOUT` (tentativas acumuladas) rodando local com logs.
- `dashboard` no mobile — corrigido (assert por viewport).

Nenhuma alteração de produto/schema/migration/segredo/infra.

### T066 — observabilidade do job E2E (PARCIAL; causa diagnosticada)

**Instrumentação (entregue):** o job `e2e-full-jornada` agora sobe o **web com log próprio** (`/tmp/web.log`), sanitiza `api.log`/`web.log` (`scripts/ci/sanitize-logs.mjs`: e-mails/IPs/Bearer/cookies/tokens/DATABASE_URL redigidos) e publica artifacts seguros (`e2e-full-logs`, `playwright-report-full`, retenção curta); `trace`/`video` **desligados** no Playwright (evita cookies/tokens em artifacts).

**Diagnóstico (run `36005341274`, job `107652006730`, artifacts `e2e-full-logs`):**
- Fails: `detalhe de mídia` (chromium ×3, mobile ×3) e `biblioteca: deep link ?status=` (mobile repeat1).
- Causa dominante: **`GET /api/v1/auth/me` → HTTP 500** (`GlobalExceptionFilter: Non-Error thrown: [object Object]`, **11×**), afetando páginas autenticadas (e o catálogo, que consulta a sessão) → sem `/media/` links → o teste de detalhe falha em cascata.
- **Classificação: `ENV_MISMATCH` (harness efêmero)** — em **produção** `GET /auth/me` retorna **200** (verificado no T063). Não é bug de produto confirmado; provável sessão/Redis do ambiente efêmero.

**Próximo passo (follow-up):** rodar `node scripts/evidence-local.mjs --spec=jornada-critica --repeat=3` com Docker/Postgres **local** (logs imediatos) para confirmar a causa do 500 em `/auth/me` no harness e ajustar test-infra. **Nenhuma mudança de produto.**

### T067 — causa do 500 em `/auth/me` (evidência por artifacts)

Com `test-results/**` sanitizado nos artifacts, as causas ficaram objetivas:
- **`detalhe de mídia` (6×):** `expect(img).toBeGreaterThan(0)` → **0** — a mídia da **fixture não tem poster**; a app usa **fallback sem `<img>`**. **Corrigido** (test-only): assere título/`main` e **não** exige `<img>`.
- **`biblioteca` (mobile, repeat1):** `getByTestId('biblioteca-tabs')` não encontrado — a página **redireciona para /login** quando **`GET /api/v1/auth/me` retorna 500** (`Non-Error thrown: [object Object]`, intermitente). Em **produção** `/auth/me`=200 (T063) → **classificação `ENV_MISMATCH` (harness)**, a confirmar com logs locais.

**Resultado:** o job caiu para **2 falhas** (biblioteca mobile repeat1). **Falta fechar o 500 de `/auth/me` no harness** (sessão/Redis) — follow-up com `evidence-local --repeat=3` local.

### T068 — preflight + bloqueio objetivo (contexto mobile)

**Entregue (test-infra):** preflight no job (**espera API `/health`, espera **web `:3000`**, login via curl com **cookie jar**, exige **`/auth/me`=200`**); **hosts normalizados** (`API_PROXY_TARGET=http://localhost:4000`, sem misturar `127.0.0.1`); `autenticar()` in-spec (assert `/auth/me`=200 pós-`apiLogin`); artefatos **já sanitizados** (test-results incluídos).

**Resultado (run `36013387570`, job `107679624631`):**
- **`✓ Preflight (api + web + login + /auth/me)`** — API/web/login/`/auth/me` **saudáveis** no harness.
- Ainda **7/48 falhas**, **todas em `mobile-chrome`** (incl. `repeat1`), com a mensagem: **`sessão inválida após apiLogin (/auth/me)`** — ou seja, **`page.request` no projeto mobile** não "vê" a sessão que o próprio `apiLogin` acabou de criar, **embora o preflight por curl passe**.

**Classificação: `TOOL_MISSING`/`ENV_MISMATCH` — harness (contexto mobile Playwright)**, **não** bug de produto (produção `/auth/me`=200; curl no mesmo harness = 200). **Próximo passo:** investigar o cookie jar do `page.request` sob `devices["Pixel 5"]` (`isMobile:true`) — candidatos: usar viewport+UA mobile **sem** `isMobile`, ou `storageState` explícito; ou reproduzir local com Docker (logs imediatos). **Sem alterar produto.**

### T069 — `isMobile:false` (cookie OK) + BLOCKED no 500 de `/auth/me` com UA mobile

**Correção aplicada (test-only):** o projeto `mobile-chrome` mantém **viewport/UA/deviceScaleFactor** Pixel 5 mas **sem `isMobile:true`** (mobile emulation) — a emulação impedia o `page.request` de enviar o cookie de sessão do `apiLogin`. Efeito: **7→3 falhas**; falhas de **`repeat1` zeradas**. Limitação documentada: sem emulação de touch nativa.

**Remanescente (run `36015218685`, job `107685949004`): 3/48**, **todas no projeto de UA mobile**, com **`GET /api/v1/auth/me` → status 500** (asserção in-spec `autenticar`: `status=500`). A API registra `GlobalExceptionFilter: Non-Error thrown` (sem stack). Em **produção** `/auth/me`=200; o **preflight por `curl`** (sem UA de browser) passa no mesmo harness.

**Classificação: possível bug de produto / policy de sessão dependente do User-Agent mobile** (o servidor responde **500** apenas com UA mobile) → **BLOCKED**, sem alterar produto (regra explícita da tarefa). **PROPOSTA:** tarefa separada (produto) para investigar o 500 de `/auth/me` com UA mobile; evidência: `api.log` (`Non-Error thrown` ×11), asserção `status=500`, concentração exclusiva no projeto mobile.
