# Varredura de exposição de segredos — outros vazamentos (T183)

**Data de execução:** 2026-10-10 · **Fase:** F08-tests-security · **Tarefa:** T183-secret-exposure-sweep-other-leaks
**Incidente de referência:** INC-2026-10-11 / D-577 (nomenclatura do pacote Thinker; execução em 2026-10-10 no fuso do executor)
**Classificação final: `NO_NEW_EXPOSURE_IN_HEAD — ADDITIONAL_HISTORICAL_ARTIFACTS_FOUND`**
**Severidade: ALTA (mantida)** — mitigação parcial (4 chaves externas rotacionadas); incidente **NÃO encerrado**.

> **Sanitização:** nenhum valor de credencial, token, cookie, chave ou dado pessoal foi
> impresso, colado ou registrado. As verificações usaram apenas listagem de nomes (`-l`),
> contagens (`-c`), hashes e booleanos; o conteúdo de arquivos suspeitos nunca foi exibido
> (a saída foi sempre filtrada por contagem/nome, inclusive em pipes).

## 1. Sumário executivo

1. **HEAD rastreado: limpo.** Zero padrões de alta confiança (Stripe/AWS/Slack/GitHub/Google,
   bloco PEM de chave privada, JWT) em toda a árvore — inclusive na varredura estendida a
   tokens GitHub (`gh` + prefixos) e JWT.
2. **Histórico alcançável da `main`: limpo nos padrões de alta confiança.** Busca pickaxe
   (diff de todos os commits) = 0 ocorrências fora do incidente já conhecido.
3. **Incidente conhecido — caracterização ampliada** (blob de 177 linhas do
   `.claude/exchange_log.jsonl`, commit `1e7801f3`):
   - 1 fragmento no formato de chave Stripe live (prefixo + **2–3 caracteres** — aparenta
     máscara/truncamento);
   - 1 valor com formato de token de **CSRF** (≥20 caracteres — efêmero por natureza);
   - menções **apenas nominais** (sem valores longos junto): `ADMIN_TOKEN` (5 linhas),
     `X-Admin-Token` (3), `DATABASE_URL` (2), `SENTRY` (1), `TMDB` (2);
   - `senha` (6 menções) e `password` (2, compatíveis com o nome da variável de
     provisionamento) — **sem padrão de valor** (sem `senha:`, `senha=`, `"senha"`);
   - 3 sequências longas (60+) compatíveis com caminhos/URLs (contêm `/`; 1 URL `https:`;
     nenhum hash hex de 64 ou bloco aleatório);
   - e-mails **somente** de domínio de teste (`@mediarate.test`).
4. **Achados adicionais do histórico (fora do escopo do T182)** — todos já removidos do HEAD
   à época, mas presentes no histórico público:
   - 2 snapshots de página do Playwright MCP (`facc5d70`, removidos em `31775bdf`) — sondados:
     sem credenciais/PII (apenas rótulos de UI);
   - strays do T089 (`d6989882` → removidos em `64ca3e52`) — sondados: sem segredos;
   - literal de senha-fixture no relatório `beta-auth-smoke-main-2026-09-26`
     (`c929d71d` → sanitizado no mesmo dia em `d6989882`) — refere-se à senha padrão dos
     usuários de teste, cujo *fallback* é **público no próprio código**
     (`apps/api/prisma/provision-test-users.ts:33`; valor não reproduzido aqui).
     Risco **condicional** — ver §7.
5. **CI:** 10/10 runs recentes da `main` sem correspondência em logs de falha; 0 artefatos
   nos runs recentes; 0 PRs abertas.
6. **Secret scanning / push protection: ainda DESABILITADOS** (confirmado hoje via API) —
   decisão pendente do Operador.
7. **PII:** nenhuma evidência de dado pessoal real — apenas domínios de teste
   (`@mediarate.test`, `@example.com`, `@test.com`, `@exemplo.com`).

## 2. Mitigação parcial confirmada (Operador)

| Credencial | Status |
|---|---|
| TMDB | **ROTACIONADA** |
| IGDB | **ROTACIONADA** |
| Twitch | **ROTACIONADA** |
| Comic Vine | **ROTACIONADA** |
| Stripe (chave live / webhook secret) | **PENDENTE — há evidência de fragmento no blob exposto (§4.3)** |
| `ADMIN_TOKEN`, `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, demais | PENDENTE — **sem evidência de valor** no blob; verificação recomendada |

## 3. Metodologia (read-only)

| Verificação | Forma usada |
|---|---|
| Estado | `git fetch/status/rev-parse`, `git merge-base --is-ancestor` (contaminação) |
| HEAD | `git grep -lI/-c -E <padrões>` (tokens, atribuições, connection strings) |
| Histórico | `git log -G <padrões>` (pickaxe), `--diff-filter=A --full-history`, `--numstat` |
| Blobs específicos | `git show <rev>:<path>` em pipe com `grep -cE` (somente contagens) |
| Hosts de URL | `git grep -hoP '…@\K<host>'` (imprime **apenas o sufixo após `@`** — nunca usuário/senha) |
| Repo/Segurança | `gh repo view`, `gh api .../secret-scanning/alerts`, `security_and_analysis` |
| CI | `gh run view <id> --log-failed \| grep -qi` → `MATCH/NO_MATCH` (10 runs) |
| Site | `curl` smoke passivo (7 endpoints) |

Proibições respeitadas: sem `cat`/`head` de arquivo suspeito, sem `git show -p`, sem patch de
PR, sem `git add -f`, sem reescrita de histórico, sem ação em provedores/infra/segredos.

## 4. Resultados por escopo

### 4.1 HEAD (árvore rastreada)

- Padrões de token/chave/JWT (incl. `gh` + prefixos e JWT): **0 arquivos**.
- Atribuições com valor longo (env `VAR=` e JSON `"VAR":`): **0**.
- Connection strings `postgres://user:pass@`: **13 ocorrências em 10 arquivos — 13/13 em
  `localhost`/`127.0.0.1`** (CI, scripts de evidência e runbooks; ex.: `localhost:5432/5434`,
  `host:5432`, `HOST:PORT`, `127.0.0.1:<porta>`).
- `.env.example` (×3): placeholders, sem valores.
- Sem `storageState` ou fixtures de sessão reais (o único fixture de auth é
  `scripts/ci/fixtures/smoke-auth/responses.json` — sintético, §5).
- Fixture deliberado: `apps/api/test/sentry-redact.spec.ts` contém padrão para testar o
  redator do Sentry — **falso-positivo por design** (o Docs Gate só o veria se o arquivo
  fosse alterado em um PR).

### 4.2 Histórico alcançável da `main`

- Pickaxe de tokens/chaves/JWT: **0 commits**.
- Connection strings: **16 commits** — hosts extraídos (somente sufixo após `@`):
  `localhost`, `host`, `HOST:PORT`, `127.0.0.1` e exemplos documentais
  (`meu-host.prod`, `db.mediarate.app`, `containers-us-west.railway.app`,
  `postgres.railway.internal`, `10.0.0.5`) citados em docs/CI da guarda anti-produção (T061);
  sem padrões de token na árvore/histórico.
- Atribuições longas: **2 commits** — `9f719441` (Initial; `.env.example` com
  `SESSION_SECRET`/`COLUMN_ENCRYPTION_KEY` de 40–59 chars **contendo palavra-placeholder** —
  comprovadamente placeholder) e `5051e293` (T204, que as removeu; o HEAD não as possui).
- `.claude/exchange_log.jsonl`: exatamente **2 commits** (`1e7801f3` adiciona 177 linhas;
  `5679cda4` remove) — incidente conhecido, alcançável da `main`.
- Arquivos com aparência sensível adicionados: apenas `9f719441` (inclui o `.env` de dev
  local (`localhost`) já documentado no PENDENCIAS item [1]).

### 4.3 Blob conhecido — sondas (histórico vs atual)

| Sonda | Histórico `1e7801f3` (177 linhas) | Atual local (181 linhas) |
|---|---|---|
| Prefixo tipo chave Stripe live + 2–3 chars | **1** | 1 |
| Prefixo tipo chave Stripe live + 4+ chars | 0 | 0 |
| Valor tipo token CSRF (≥20 chars) | **1** | 1 |
| `ADMIN_TOKEN` + valor 16+ chars | 0 | 0 |
| `X-Admin-Token` + valor 16+ chars | 0 | 0 |
| `DATABASE_URL` + valor 16+ chars | 0 | 0 |
| `TMDB` + valor 16+ chars | 0 | 0 |
| `SENTRY` + valor 16+ chars | 0 | 0 |
| `senha`/`password` + valor com separador | 0 | 0 |
| Sequências 60+ (contêm `/`) | 3 | 3 |
| Hash hex 64 / bloco desses caracteres 64+ | 0 / 1 (compatível com caminho/URL) | 0 / 1 |
| E-mails — domínio de teste | 2 (`@mediarate.test`) | 2 |
| `rk_live` / `whsec` (case-insensitive) | 0 / 0 | 0 / 0 |

### 4.4 PRs abertas

Nenhuma (`gh pr list --state open` vazio) — nada a varrer.

### 4.5 Secret scanning alerts

API responde **404 — "Secret scanning is disabled on this repository"**; `security_and_analysis`:
`secret_scanning`, `secret_scanning_push_protection`, `secret_scanning_non_provider_patterns`,
`secret_scanning_validity_checks` e `dependabot_security_updates` — **todos `disabled`**.
Evidência INSUFICIENTE sobre alertas históricos (não é ausência de exposição). Ação: habilitar
(decisão do Operador).

### 4.6 Logs de CI e artefatos

10 runs recentes da `main`: `NO_MATCH` (10/10) para os padrões de alta confiança em logs de
falha; 0 artefatos nos 3 runs mais recentes.

## 5. Achados adicionais do histórico (classificados)

- **Snapshots Playwright MCP** — `.playwright-mcp/page-*.yml` (2 arquivos, 430/762 linhas):
  adicionados em `facc5d70` (2026-08-06, era de push direto), removidos em `31775bdf`
  (2026-10-03, higiene). Sondas: `sess=`, cookies, e-mails, tokens e sequências longas = 0;
  apenas 2 ocorrências de rótulo de UI (`senha`/`password`) por arquivo.
  Categoria: `FALSE_POSITIVE_OR_REFERENCE`. Risco residual: nenhum material.
- **Strays do T089** — adicionados em `d6989882`, removidos no mesmo dia em `64ca3e52`
  (2026-09-25): `.od-skills/*`, `apps/web/.wrangler/state/**/metadata.sqlite*` (binário — 0
  correspondências de padrões), `apps/web/scripts/_*.mjs`, `docs/lighthouse-reports/*.json`
  (URLs/hashes de assets), protótipos HTML/sketch e `rw-promote.js`. E-mails encontrados:
  somente `@mediarate.test`, `@example.com`, `@test.com` e `@exemplo.com`.
  Categoria: `FALSE_POSITIVE_OR_REFERENCE` (material de ferramenta/protótipo, sem segredos).
- **Literal de senha-fixture no relatório T088** — `c929d71d` (adiciona 32 linhas) →
  `d6989882` (substitui 1 linha: literal → referência). O literal refere-se à **senha padrão
  dos usuários de teste**, cujo *fallback* já é público por design no código
  (`provision-test-users.ts:33`). Categoria: `SESSION_OR_AUTH_MATERIAL` (credencial de teste).
  Risco **condicional**: se as contas `*@mediarate.test` (inclui administradores) foram
  provisionadas em PRODUÇÃO sem a variável de senha, a senha padrão pública as protege —
  verificar e rotacionar (§7).
- **`.env.example` inicial** (`9f719441`): `SESSION_SECRET`/`COLUMN_ENCRYPTION_KEY` com valores
  de 40–59 chars contendo palavra-placeholder (change/troque/openssl/dev/…) — comprovadamente
  placeholders; o HEAD atual não contém nem isso. `FALSE_POSITIVE_OR_REFERENCE`.
- **Fixture `scripts/ci/fixtures/smoke-auth/responses.json`** (rastreado): valor de sessão
  sintético curto (4–19 chars), 0 padrões, consumido por self-test/smoke efêmero — benigno.
- **`.kilo/*` (15 arquivos rastreados legados)**: agentes/schemas/hooks/scripts de harness —
  0 padrões; informativo (higiene futura opcional, fora do escopo).
- **Locais ignorados (nunca versionados)** — `git log --all` vazio para todos:
  `.claude/exchange_log.jsonl` (local), `.claude/gh-token`, `.claude/catalogo-prod.json`,
  `.claude/runner-seed-prod.mjs`, `.env`, `.env.local` (raiz + apps), `.kilo/exchange_log.jsonl`
  (1 linha, sem padrões), `.playwright-mcp/`, `tests/security/fixtures/`.

## 6. Classificação por categoria

| Categoria | Itens |
|---|---|
| `EXTERNAL_PROVIDER_KEYS` | TMDB/IGDB/Twitch/Comic Vine — **rotacionadas**; fragmento Stripe live — **verificar/rotacionar** |
| `INTERNAL_APP_SECRETS` | `ADMIN_TOKEN`/`SESSION_SECRET`/`DATABASE_URL`/`SENTRY`: **nomes sem valores**; senha padrão de contas de teste pública no código (risco condicional em produção) |
| `SESSION_OR_AUTH_MATERIAL` | 1 valor de CSRF efêmero (blob conhecido); literal de senha de teste sanitizado (T089); fixtures sintéticos |
| `PII_OR_USER_DATA` | Nenhum dado pessoal real — somente domínios de teste |
| `FALSE_POSITIVE_OR_REFERENCE` | Snapshots Playwright (benignos), strays T089 (sem segredos), placeholders do `.env.example`, fixture sentry-redact, connection strings localhost |
| `KNOWN_INCIDENT_SCOPE` | `.claude/exchange_log.jsonl` em `1e7801f3`/`5679cda4` (177 linhas) |

## 7. Riscos residuais

1. O histórico público retém o blob conhecido — **a rotação é a mitigação efetiva**; o purge
   segue como decisão do Operador.
2. Fragmento no formato de chave Stripe live no blob → verificar/rotacionar a chave live e o
   webhook secret da Stripe.
3. Senha padrão das contas de teste é pública no código → risco **se** houver contas de
   produção provisionadas sem a variável de senha (inclui contas admin) — verificar e rotacionar.
4. Secret scanning/push protection desabilitados — novos vazamentos sem alerta.
5. CSRF expirado — sem ação; registro apenas.
6. Caches, forks e indexadores de terceiros podem reter o conteúdo.

## 8. Decisões pendentes do Operador

1. Verificar/rotacionar **Stripe (chave live + webhook secret)**.
2. Confirmar/rotacionar a senha das contas `*@mediarate.test` **em produção** (se provisionadas
   com o fallback público) — relaciona-se à higiene `admin***@mediarate.test` pendente.
3. Habilitar **secret scanning + push protection**.
4. **Purge de histórico / visibilidade do repositório** (inalteradas).
5. **Backups/alertas do Postgres** (Decisão 1 do pacote anterior — inalterada).

## 9. Confirmação de sanitização

Nenhum valor de segredo, token, cookie, chave ou PII foi impresso neste relatório, nos logs de
comandos ou no STATUS. As verificações usaram apenas nomes de arquivos/commits, contagens,
hashes e booleanos; o conteúdo de arquivos suspeitos nunca foi exibido ou copiado.

**Nota de mecânica:** este relatório foi adicionado ao índice via `git update-index`
(plumbing), respeitando a proibição de `git add -f` com `.claude/` ignorado pelo `.gitignore`.
O `.claude/exchange_log.jsonl` local permanece ignorado e **não** é versionado.
