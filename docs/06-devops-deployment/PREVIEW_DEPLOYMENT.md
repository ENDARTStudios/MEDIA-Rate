# PREVIEW_DEPLOYMENT — Previews por PR (Vercel)

## Como funciona

Todo PR para `main` gera **preview da Vercel** (integração Git do projeto
`end-art-studios/media-rate`) — URL `https://media-rate-<hash>-end-art-studios.vercel.app`,
comentada no PR (job `Vercel Preview Comments`).

## Regras e fatos

1. **Previews são `noindex`** via `VERCEL_ENV` (T030) — produção indexável.
   Verificar quando tocar robots/SEO: `curl -sI $PREVIEW_URL` → esperar
   `X-Robots-Tag: noindex` (ausente em produção).
2. **Preview da WEB fala com a API de PRODUÇÃO** (a URL pública é o default) —
   smoke em preview deve ser **read-only**; mutações tocam dados reais.
3. **ZAP Baseline roda contra o preview** do PR. URL longa demais (branch longa)
   já quebrou DNS → o CI resolve a URL real via API da Vercel com fallback (D-530);
   ainda assim, **branch curta** é a convenção.
4. Preview pula deploy quando o PR não toca web (ex.: api-only → "Skipped - Not
   affected") — estado normal, não é falha.

## Usar o preview no review

- Conferir visual/UI com dados reais de catálogo (read-only).
- Testar SEO headers/robots de mudança de frontend.
- E2E automatizado NÃO roda no preview — roda local (`E2E_FULL=1`) com API+DB
  locais (`scripts/evidence-local.mjs`) — nunca mutar produção a partir de preview.

## Matriz preview × CI

| Job | Fonte |
|---|---|
| `Vercel` / `Vercel Preview Comments` | deploy do preview |
| `ZAP Baseline (DAST)` | escaneia a URL do preview (resolvida via API, D-530) |
| `Build` | build web + api (independente do preview) |
| `Build OpenNext (CF)` | **informativo** (migração CF gated por flag) |
