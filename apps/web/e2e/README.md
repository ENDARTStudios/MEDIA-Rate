# E2E — onde rodar o quê (T447/D-441)

Regra de custo: cada execução contra **produção** queima transformações de
imagem e CPU do plano Hobby em **todas as regiões** (cache regional) e
esfria o ISR. Produção é para guards, não para volume.

## Preview (padrão para tudo pesado)

- `npx playwright test` com `PLAYWRIGHT_BASE_URL` apontando para o deploy
  de preview (`*.vercel.app`) do PR: Lighthouse, screenshots, fluxos
  completos, auditorias e crawls manuais.
- Previews têm Deployment Protection + `X-Robots-Tag: noindex` (T030) —
  bots não amplificam o custo.

## Produção (só guards semanais, D-410)

- Rodar contra produção **no máximo 1×/semana**, logo após o score-job:
  smoke de login, catálogo e ficha (os mesmos guards do monitoramento).
- Nunca rodar a suíte completa, Lighthouse repetido ou scripts de varredura
  contra produção — use o preview do PR.

## Por quê (evidência)

- Ago/2026: picos de transformações (700–790/dia) e CPU coincidiram com
  merges + e2e em produção + Lighthouse + auditorias (D-441).
- `cle1 48,4% + iad1 21,6%` das transformações vêm de edges dos EUA
  (tráfego automatizado), não de usuários BR (`gru1 14,4%`).
