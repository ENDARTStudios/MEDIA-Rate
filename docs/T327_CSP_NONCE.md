# T327 — CSP sem `unsafe-inline` (nonce) — validação no preview

> Branch `feature/T327-csp-nonce`. **NÃO mergear em main** até validar no
> preview da Vercel (padrão T290). Se a validação falhar, manter `unsafe-inline`
> (fallback) e documentar o motivo.

## O que mudou

| Arquivo | Mudança |
|---|---|
| `apps/web/src/middleware.ts` | Gera nonce por requisição; seta `x-nonce` (request) + `Content-Security-Policy` (response) com `script-src 'nonce-…' 'strict-dynamic'` |
| `apps/web/next.config.ts` | Removeu a CSP estática (o header agora é dinâmico no middleware) |

`style-src` mantém `unsafe-inline` (Tailwind inline) — o achado T327 é sobre
**script-src**, não style-src.

## ⚠️ Trade-off vs T331 (IMPORTANTE)

Nonce **por requisição** torna cada HTML único → **desabilita ISR/estático**
(o benefício do T331). É o custo de uma CSP forte. Se ISR for mais importante
que a CSP forte, **não** mergear esta branch (manter `unsafe-inline`).

## Passos de validação (Operador, no preview Vercel)

1. `git push origin feature/T327-csp-nonce` → o workflow T353 cria o PR.
2. Abrir o **preview URL** da Vercel (do PR).
3. **DevTools → Network → resposta HTML**: conferir header `Content-Security-Policy`
   com `script-src 'self' 'nonce-…' 'strict-dynamic'` (sem `unsafe-inline`).
4. Conferir que os `<script>` inline do Next têm o atributo `nonce="…"` igual ao
   do header (View Source).
5. **Testar funcionalidades** que carregam script:
   - Navegação + hidratação das páginas (sem erro "Refused to execute inline script").
   - PostHog: capturar `$pageview` no Live events.
   - Sentry: gerar um erro e ver o evento no dashboard.
   - Console sem erros de CSP bloqueada.
6. **Se OK** → mergear no PR.
7. **Se falhar** (scripts bloqueados) → documentar o sintoma aqui e manter
   `unsafe-inline` (reverter a branch).

## Reversão

`git revert <commit>` na branch, ou simplesmente não mergear o PR.
