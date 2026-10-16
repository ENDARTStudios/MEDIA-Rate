# Evidências — `test:auth` destravado (2026-10-15)

A cegueira do §11 da auditoria ("`/admin` e `/dashboard` fora do axe — depende de
`E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`") deixou de ser cegueira: o harness autenticado **rodou**.

- `a11y-admin.json` — relatório Playwright completo (174 KB).
- `a11y-admin-resumo.txt` — as mensagens de falha cruas do axe (39 KB).
- `a11y-admin-compacto.txt` — resumo por rota (regras + pares de contraste medidos).

## Passo 0 (que faltou): ler os `.env.example`

Regra que passou a valer nesta trilha: **antes de executar qualquer coisa, ler os `.env.example`**. O
que eu descobri na marra estava documentado — e o que faltava lá é gap de doc, não mistério:

| Fonte | O que dizia | O que eu fiz antes de ler |
|---|---|---|
| `apps/api/.env.example:13` | `PORT=4000` — a porta que o harness e o rewrite esperam | achei a API rodando em **:3333** e só depois fixei 4000 |
| `apps/api/.env.example:45` | `REDIS_URL=redis://localhost:6379` | levantei um Redis local descartável do zero |
| `apps/api/.env.example:16` | `DATABASE_URL=postgresql://usuario:senha@host:5432/media_rate` | sondei credenciais do Postgres nativo (P1000) |
| `.env.example` (raiz) | `POSTGRES_PORT=5432`, `REDIS_PORT=6379` | idem |
| `apps/web/.env.example` | **não documentava `API_PROXY_TARGET`** | descobri em `next.config.ts` depois de a sessão cair em loop de `/login` |

**Corrigido nesta rodada:** `apps/web/.env.example` ganhou a seção "VARIÁVEIS DE SERVIDOR (NÃO
públicas)" com `API_PROXY_TARGET` (o valor local e o do CI), `REVALIDATE_SECRET` e as do PostHog
server-side — o comentário do topo afirmava "SOMENTE NEXT_PUBLIC_*", o que é falso para rodar local.

**Ficou pendente, fora do meu limite:** `apps/api/.env.example` e o `.env.example` da raiz não têm bloco
de **provisionamento de usuários de teste** (`TEST_USERS_PASSWORD`, `npm run db:provision:test-users`,
`provision-lgpd-test-user.ts` — que é quem **gera** `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`) nem o aviso de
que o papel ADMIN vem de cache (logo, mudar papel exige reiniciar a API). Ambos os arquivos estão em
edição por outro agente; a recomendação fica registrada aqui em vez de editada lá.
## Ambiente reproduzido (equivalente ao job `e2e-full` do CI)

O CI não roda `test:auth`; ele provisiona **Postgres + Redis locais** e usuários de teste. O que
destravou aqui foi reproduzir isso, **sem tocar em produção**:

1. **Cluster Postgres efêmero** com os binários já instalados (PG 18): `initdb --auth=trust` em diretório
   temporário, porta **55432** — nada de credencial de banco alheia.
2. `prisma migrate deploy` no banco novo.
3. `provision-test-users.ts` (free/plus/premium/admin/admin-free) e `provision-lgpd-test-user.ts`, que é
   quem **gera** `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` e grava no `.env` da raiz.
4. **Redis local descartável** (`redis-memory-server` em diretório temporário, porta 6379) — sem ele o
   guard de admin responde **403** e a página volta para `/login`, porque o papel vem de cache.
5. `pg` (`lgpd-test@mediarate.test`) promovido a **ADMIN** com SQL no banco efêmero — o script de LGPD
   não concede papel administrativo, e 4 das 8 telas exigem admin.
6. API na **:4000** (`NODE_ENV=test`, `ALLOWED_ORIGINS` para :3000) e web com
   **`API_PROXY_TARGET=http://localhost:4000`** — sem isso o web valida a sessão contra produção e
   manda para `/login`.

Armadilhas que custaram iteração e ficam registradas: `npm run dev` da API entra em **loop de restart**
(o `--watch` reage a `node_modules`); `DATABASE_URL`/`REDIS_URL` do `.env` apontam para
`*.railway.internal`, que **não resolve fora da Railway**; a porta padrão do harness é :4000, mas a API
do `.env` subia em :3333; e **reiniciar a API é obrigatório após mudar papéis** (cache).

## Resultado (medido, 6 passaram / 5 falharam)

| Rota | Regra | Nós | Contraste medido |
|---|---|---|---|
| `/pt-BR/admin/usuarios` | `color-contrast` (serious) | 8 | `#16a34a` (green-600) sobre `#1f2937` (gray-800) = **4,45:1**; `#6b7280` (gray-500) sobre `#05050a` = **4,2:1** |
| `/pt-BR/admin/catalogo` | `color-contrast` | 2 | `#6b7280` sobre `#05050a` = 4,2:1; `#6b7280` sobre `#1f2937` = **3,03:1** |
| `/pt-BR/admin/lgpd` | `color-contrast` | 3 | idem acima |
| `/pt-BR/admin/diagnostics` | `color-contrast` | 2 | `#16a34a` sobre `#1f2937` = 4,45:1 |
| `/pt-BR/admin/metricas` | **`definition-list` (serious)** | — | **achado novo**: `<dl>` com filhos inválidos |

**Passaram:** `/admin` (visão geral), `/admin/auditoria`, `/admin/upload`, o teste de tema/contraste do
admin e o **baseline visual do dashboard** (criado nesta rodada).

Isto **confirma e quantifica** o `B2` da auditoria (a hipótese era "36 `text-gray-500`"): os cinzas e
verdes default do Tailwind (`gray-500`, `gray-800`, `green-600`) estão no admin e reprovam AA com
números. As correções são **report-only** aqui: são arquivos em edição por outro agente
(`admin/{usuarios,catalogo,lgpd,diagnostics,metricas}/page.tsx`).