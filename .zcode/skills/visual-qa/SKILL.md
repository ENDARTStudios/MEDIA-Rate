---
name: visual-qa
description: >
  Verificação visual e de acessibilidade do MEDIA Rate com Playwright: captura
  screenshots em 375/768/1024/1440 (claro/escuro não se aplica — app é dark),
  valida reduced-motion, detecta overflow horizontal, mede a dobra em 1366×768,
  roda axe AA e confere foco/teclado. Use depois de qualquer mudança visual, como
  evidência de PR, ou quando o pedido for "confira como ficou na tela".
---

# Visual QA (MEDIA Rate)

Evidência visual antes de pedir review humano. Nunca aponte para produção com
usuário real (ver `media-rate-conventions`): use `next dev`/`next start` local
ou o preview do PR.

## Receita

```bash
# 1. subir o web (a API é opcional: a home degrada sem ela)
npm run dev --workspace apps/web            # http://localhost:3000

# 2. capturar + auditar
node .zcode/skills/visual-qa/scripts/visual-qa.mjs --base-url http://localhost:3000 --path /pt-BR
```

O script grava em `.dsh-artifacts/visual-qa/<timestamp>/`:

- `1440.png`, `1024.png`, `768.png`, `375.png` (viewport completo, full-page);
- `1440-reduced-motion.png` (com `prefers-reduced-motion: reduce` forçado);
- `report.json` com, por viewport: overflow horizontal, altura do H1, posição
  do CTA primário, se ele está acima da dobra, contagem de alvos < 44 px e
  violações axe (quando `--axe`).

Flags: `--path` (default `/{locale}`), `--locales pt-BR,en-US,es-ES`, `--axe`,
`--scope <selector>` (limita o axe a um recorte), `--settle <ms>`, `--out <dir>`,
`--headed`. Atalho pela raiz: `npm run design:visual -- --locales pt-BR,en-US,es-ES`.

## Regressão por pixel (Playwright `toHaveScreenshot`)

Para travar o desenho do hero contra mudança não intencional (token, espaçamento,
peso de fonte), há um harness **local** separado do e2e de CI:

```bash
npm run test:visual --workspace apps/web          # compara com o baseline
npm run test:visual:update --workspace apps/web   # (re)gera o baseline
```

- Config `apps/web/playwright.visual.config.ts` (testDir `./visual`; projetos
  `desktop-1440` e `mobile-375`; `webServer` reaproveita o dev server no ar).
- O baseline de pixel roda com **`prefers-reduced-motion: reduce`** de propósito:
  é a única forma de obter dois frames estáveis (exigência do Playwright) e, de
  quebra, congela o contrato de movimento reduzido do hero.
- **Nunca** entra no CI: baseline de imagem é sensível a SO/fonte (o job de E2E
  roda em Linux). Ficam git-ignored por máquina — rode `--update-snapshots` na sua.
- O mesmo arquivo traz um teste **estrutural** (cross-platform, movimento ligado):
  H1 presente, CTA primária acima da dobra, 6 tiles, sem scroll horizontal.
- Se o teste de pixel falhar logo após você editar um arquivo do app, rode de novo:
  com `next dev`/Turbopack a primeira requisição recompila e os frames não ficam
  estáveis (o Playwright exige dois frames idênticos). Em CI isso não acontece
  porque o harness não roda lá.

## O que reprova automaticamente (exit 1)

- `document.scrollWidth > clientWidth + 1` (scroll horizontal);
- H1 ausente ou invisível (`#hero-title`);
- CTA primário abaixo da dobra em 1366×768;
- erro de console do tipo `pageerror` (runtime quebrado);
- com `--axe`: qualquer violação `wcag2a`/`wcag2aa`.

## Checagem manual obrigatória (o que o script não vê)

1. **Só teclado**: Tab do começo ao fim. Foco visível em todo interativo; ordem
   lógica; Skip link funciona.
2. **Reduced-motion**: comparar `1440.png` com `1440-reduced-motion.png` — nada
   deve desaparecer nem ficar deslocado; loops devem estar parados.
3. **Zoom 200%** e **fonte grande** no navegador: sem corte de texto.
4. **Rede lenta/offline**: a home ainda mostra H1/CTA (dados vêm com fallback).
5. **Estados**: vazio, erro, carregando (`?` de dados, filtros sem resultado).
6. **i18n**: abrir `/en-US` e `/es-ES` — nenhum texto em PT; strings longas de
   alemão/espanhol não podem quebrar o layout.
7. **Dobras alvo**: 1366×768 (notebook), 390×844 (iPhone), 768×1024 (iPad).

## Interpretação

- Diferença de screenshot entre execuções não é regressão por si só (dados
  ISR/animais de loop variam) — fixe o estado com `--reduced-motion` para
  comparar.
- LCP/CLS locais com `next dev` não representam produção; use Lighthouse em
  preview/produção para números.
- Anexe 2–3 PNGs por viewport no PR (não os 4 sempre): 375 (mobile), 1024
  (tablet/notebook pequeno) e 1440 (desktop) bastam, + reduced-motion quando a
  mudança for de movimento.

## Integração com CI

O gate oficial de a11y é `apps/web/e2e/a11y.spec.ts` (axe, `E2E_FULL=1`). Este
script é a ferramenta de **desenvolvimento/evidência** — mais rápido, roda contra
`next dev` e produz os artefatos que o PR precisa. Não substitui o gate.
