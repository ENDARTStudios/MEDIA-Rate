# Auditoria da superfície admin `/pt-BR/admin/lgpd` (T201) — read-only/docs-only

**Data:** 2026-10-12 · **Fase:** F08-tests-security · **Tarefa:** T201-admin-authz-surface-audit
**Classificação:** **`ADMIN_UI_LEAK_SERVER_BOUNDARY_MISSING`** (+ `ADMIN_RATE_LIMIT_WEAK`) —
**sem** `ADMIN_API_AUTHZ_MISSING` e **sem** `ADMIN_DESTRUCTIVE_ENDPOINT_EXPOSED`: a API admin
está blindada (`@Roles("ADMIN")` em todos os endpoints + CSRF + audit); o que falha é o
**frontend**, que renderiza o shell admin e o controle destrutivo para qualquer autenticado.
Nada foi alterado; nenhum clique/purge; nenhuma credencial admin usada.

## 1. Relato do Operador (sintoma)

Usuário **autenticado sem papel ADMIN** navega para `/pt-BR/admin/lgpd` e a página renderiza:
shell admin, abas de navegação, seção "Purga de dados", botão **"Executar purga agora"** e
estrutura de tabelas/contadores — com a mensagem *"Você não tem permissão para acessar este
recurso."* no lugar dos dados.

## 2. Mapa da superfície (evidência de código, sanitizada)

### Frontend — onde a falha vive

| Camada | Arquivo | Comportamento observado |
|---|---|---|
| Middleware (edge) | `apps/web/src/middleware.ts` | `/admin` está em `privateRoutePrefixes`: exige apenas **presença** do cookie `sess` (anônimo → login). **Não valida papel** — qualquer autenticado passa |
| Layout admin | `apps/web/src/app/[locale]/admin/layout.tsx` | **`"use client"` sem nenhuma validação** — renderiza a nav com as 6 abas (Diagnostics, Usuários, Catálogo, Métricas, Auditoria, LGPD) + `children` **incondicionalmente**. O comentário no arquivo diz "Rotas @Roles(\"ADMIN\") no backend" — delega 100% à API |
| Página LGPD | `apps/web/src/app/[locale]/admin/lgpd/page.tsx` | **`"use client"` que renderiza TODO o painel incondicionalmente** (título, seção de purga com o botão vermelho `admin-lgpd-purgar`, tabela de agendados, contadores de consentimento). Só depois monta o `GET /api/v1/admin/lgpd`; se a API nega, seta a mensagem de erro **e continua exibindo todo o resto** (contadores a 0, tabela vazia) |

O mesmo padrão estrutural (layout incondicional + páginas client) se aplica às demais páginas
`/admin/*` — a correção no layout resolve o conjunto.

**O que NÃO vaza para não-admin:** nenhum dado real. Como o `GET /admin/lgpd` é negado, `data`
fica `null` → contadores exibem 0 e a tabela fica vazia (sem e-mails de agendados, sem
contagens reais). O que vaza é **estrutura e semântica**: existência da área, nomes das abas,
endpoints (`/api/v1/admin/lgpd`, `/api/v1/admin/lgpd/purge` visíveis no bundle), e o
**controle destrutivo no DOM** — superfície de probing/confusão, violação de deny-by-default.

### Backend — blindado (verificado ponto a ponto)

| Cam camada | Evidência |
|---|---|
| Guards globais | `app.module.ts`: `APP_GUARD` na ordem **AuthGuard → CsrfGuard → RolesGuard → PlanGuard** |
| Autorização por endpoint | `AdminController` (`api/v1/admin`): **todos** os handlers têm `@Roles("ADMIN")` — incl. `GET lgpd`, `POST lgpd/purge`, `usuarios` (listar/ban/desbanir/atividade), `DELETE interações/watchlist`, `auditoria`, `stats`, backfills |
| RolesGuard | carrega os papéis **do banco por request** (`usuarioPapel.findMany`) e lança 403 *"Você não tem permissão para acessar este recurso."* — exatamente a mensagem do print, provando que **a API negou** |
| CSRF | `CsrfGuard` **global**: todo método que muda estado (incl. o purge `POST`) exige double-submit (`cookie csrf_token` + header `x-csrf-token`) — um botão "clicado" por sessão não-admin falha em Auth/Roles antes, e um cross-site falha no CSRF |
| Audit | purge grava trilha (**`lgpd-purge.service`**: *"o audit prova que aconteceu; sobrevive ao delete"* → `LGPD_USUARIO_PURGADO`); ações admin do service gravam `ADMIN_USUARIO_BANIDO`, `ADMIN_PLANO_ALTERADO`, `ADMIN_MODERACAO_*`, etc. |

## 3. Classificação

| Categoria | Estado |
|---|---|
| `ADMIN_UI_LEAK_SERVER_BOUNDARY_MISSING` | ✅ **CONFIRMADO** — layout/páginas admin client-side sem validação server-side antes de renderizar |
| `ADMIN_API_AUTHZ_MISSING` | ❌ NÃO ocorre — API deny-by-default correta |
| `ADMIN_DESTRUCTIVE_ENDPOINT_EXPOSED` | ❌ NÃO ocorre no servidor (o botão está no DOM, mas a ação falha em Auth→CSRF→Roles) |
| `ADMIN_CSRF_MISSING` | ❌ NÃO ocorre (CsrfGuard global) |
| `ADMIN_AUDIT_MISSING` | ❌ NÃO ocorre (purge e ações admin auditadas) |
| `ADMIN_RATE_LIMIT_WEAK` | ✅ **CONFIRMADO** — sem Throttler na app (nem global nem específico admin); login tem lockout próprio e há 429 na borda, mas rotas admin não têm rate limit dedicado |
| `ADMIN_PII_OR_SECRET_DISCLOSURE` | ❌ NÃO ocorre (contadores 0/tabela vazia para não-admin; nenhum segredo) |

**Severidade: moderado-alto** — não há escalada de privilégio nem disclosure de dados, mas
viola deny-by-default ("se não é admin, não vê nada"), expõe mapa de endpoints e controle
destrutivo no DOM, e facilita probing/confusão. É **achado de segurança** (não só UX).

## 4. Impacto no GO

**GO permanece SUSPENSO** — agora também por este achado: não se libera convites com superfície
admin renderizável por usuário comum. A correção é a **T202 (hardening)**, com escopo
cirúrgico:

1. **`admin/layout.tsx` → server component**: validar sessão + papel `ADMIN` (mesma fonte do
   RolesGuard) **antes** de renderizar qualquer coisa; não-admin → redirect 403 genérico;
   anônimo → login (middleware já cobre). As 6 páginas deixam de renderizar shell para
   não-admin de uma vez.
2. **Páginas admin**: tratar 403 da API como estado "negado" com early-return (nunca renderizar
   controles destrutivos antes da primeira confirmação de dados).
3. **Rate limit admin** (`@Throttle` estrito nas rotas `/api/v1/admin/*` ou throttler global)
   + opcional step-up (re-confirmar senha) para ações destrutivas.
4. Política permanente: `docs/08-security/ADMIN_SECURITY.md` (novo, neste PR).

## 5. Confirmações

**Nada foi alterado** (nenhum código, nenhum clique, nenhum purge, nenhuma credencial admin,
nenhuma mutação em produção, nenhuma config). Nenhum segredo/PII impresso. GO não declarado.
Contaminação `123ce28e` ausente; PR docs-only com gates verdes e smoke passivo 7/7 (STATUS).
