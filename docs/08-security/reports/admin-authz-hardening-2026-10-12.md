# Hardening do boundary admin (T202) — deny-by-default server-side

**Data:** 2026-10-12 · **Fase:** F08-tests-security · **Tarefa:** T202-admin-authz-hardening
**Resolve:** achado **`ADMIN_UI_LEAK_SERVER_BOUNDARY_MISSING`** da T201. Nenhuma API de
autorização foi alterada (backend intocado); nenhum segredo/PII exposto; GO permanece
SUSPENSO até REVIEW.

## 1. Arquitetura corrigida (antes → depois)

| Camada | Antes (T201) | Depois (T202) |
|---|---|---|
| Middleware (edge) | `/admin` exige apenas cookie `sess` | **inalterado** (mantém sessão; o gate correto é o render) |
| **Layout admin** | `"use client"` **sem validação** — nav + children sempre | **Server Component gate**: `getServerAdminGate()` valida sessão + papel `ADMIN` **antes** de qualquer UI; anônimo/sessão inválida → `redirect` login (i18n-aware); não-admin → `<AdminAcessoNegado/>` **sem shell/nav/abas/tabelas/botões**; ADMIN → `AdminShell` + página |
| Shell visual | embutido no layout | `AdminShell.tsx` (client) — **só monta após o gate**; UX do ADMIN inalterada |
| Página LGPD | renderizava painel inteiro (botão de purga, tabelas, contadores) antes da resposta | **early-return**: negação (403/“sem permissão”) substitui **todo** o painel por `AdminAcessoNegado` — nem botão, nem tabela, nem contadores |
| Fonte de verdade | — | **RolesGuard da API** (inalterado): probe `GET /api/v1/admin/backfills/status` (`@Roles("ADMIN")`, síncrono e barato) com o cookie `sess` — 200 = ADMIN; 403 = autenticado sem ADMIN; 401/outros/erro/timeout = **fail-closed** |

## 2. Arquivos

| Arquivo | Papel |
|---|---|
| `apps/web/src/lib/admin-auth-server.ts` (novo) | `getServerAdminGate()` — probe server-side (padrão do `auth-server.ts` existente; 2s timeout; fail-closed; sem leitura de banco no edge) |
| `apps/web/src/components/admin/AdminShell.tsx` (novo) | shell/nav client (conteúdo anterior do layout) |
| `apps/web/src/components/admin/AdminAcessoNegado.tsx` (novo) | mensagem genérica i18n (`admin.acessoNegado`), sem revelar recursos |
| `apps/web/src/app/[locale]/admin/layout.tsx` | gate server-side (async server component) |
| `apps/web/src/app/[locale]/admin/lgpd/page.tsx` | early-return seguro na negação (estado `negado` via `ApiError.status===403` ou mensagem) |
| `messages/{pt-BR,en-US,es-ES}.json` | `admin.acessoNegado` (“Acesso não autorizado.” / “Access unauthorized.” / “Acceso no autorizado.”) — paridade |
| specs | `admin-auth-server.spec.ts` (novo, 7 casos), `admin-layout-auth.spec.tsx` (novo, 3 casos), `admin-layout.spec.tsx` (adaptado ao gate), `admin-lgpd.spec.tsx` (+2 casos: 403→negado sem controles; erro genérico mantém painel) |

## 3. TDD (vermelho → verde; sem rede real)

- **RED:** módulo do gate inexistente + página sem early-return (3 falhas) — antes das
  correções de forma dos testes (async component resolve; testid; `redirect({href,locale})`).
- **GREEN:** **17/17** nos 4 specs focados; suíte web completa **575/575** (85 arquivos);
  `tsc` web **0**; `eslint` 0; `prettier` limpo (TS/TSX; os `messages/*.json` mantêm o
  formato do main — o guard de i18n do CI (D-210) é a verificação deles).
- **Limitação registrada:** E2E navegado (anônimo/não-admin/ADMIN em browser) exige
  API+DB (`E2E_FULL=1`) — não rodado localmente; **CI é a autoridade** (E2E Full no PR).

## 4. Não feito (deliberado)

- **Rate limit admin / step-up / MFA** → **T203** (packet próprio; sem meia-solução).
- **API de autorização** (`AdminController`, guards, `/auth/me`) — intocada: o gate reusa o
  `@Roles("ADMIN")` existente; o `/auth/me` não expõe papel e **não precisou** mudar.
- Middleware — mantido (sessão apenas), conforme desenho do ADMIN_SECURITY.

## 5. Confirmações

Dif restrito a frontend web + testes + i18n (nenhum arquivo de API/backend/guards/deps/workflow).
Nenhum segredo/PII impresso; nenhum purge executado; nenhuma credencial admin usada.
Contaminação `123ce28e` ausente; PR com required verdes e smoke passivo 7/7 (STATUS).
