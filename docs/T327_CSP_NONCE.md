# T327 — CSP sem `unsafe-inline` (nonce) — validação no preview

> **DECISÃO FINAL (D-330, 2026-08-20):** Operador escolheu **opção B** —
> **NÃO mergear** esta branch. O web mantém `script-src 'unsafe-inline'` em
> troca de **ISR/estático** (SEO/performance). Exceção de segurança **aceita
> formalmente** pelo Operador (§8), com mitigações em camadas e gatilhos de
> reavaliação abaixo.
>
> Branch `feature/T327-csp-nonce` (commit `4f9257c`) permanece **pronta na
> prateleira**, sem merge.

## Mitigações em camadas (enquanto `unsafe-inline` estiver ativo)

- React escapa HTML por padrão (XSS via render é neutralizado).
- `sanitize-html`/DOMPurify em qualquer HTML dinâmico (privacy).
- Sem conteúdo de usuário (UGC) em HTML nas páginas públicas.
- CSP forte (nonce) já ativa no **backend** (T021/helmet).

## Gatilhos de reavaliação (reabrir esta branch quando qualquer um ocorrer)

1. Next.js suportar **nonce + geração estática/ISR** ao mesmo tempo.
2. Entrada de **UGC rico em HTML** (comentários/descrições de usuário).
3. Nova ordem do Operador.

---

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
