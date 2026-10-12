---
name: media-rate-ui-ux
description: >
  Guarda-chuva de UI/UX do MEDIA Rate: contrato de design (tokens canônicos,
  anti-padrões proibidos D-065), regra server-first/LCP (D-380/T405), orçamento de
  movimento (motion-design), funil de marketing gancho→promessa→prova→CTA, gates de
  a11y AA e paridade i18n em 3 locales. Use SEMPRE que criar, redesenhar ou revisar
  qualquer tela, componente visual, hero, landing, animação ou copy de interface
  neste repositório — antes de escrever JSX/CSS.
---

# UI/UX MEDIA Rate (uso pelo agente)

Atalho operacional para trabalho visual no monorepo. As fontes canônicas
continuam sendo `design-system/media-rate/MASTER.md`, `DECISOES.md`,
`docs/` e `AGENTS.md` — em conflito, vence o arquivo do repo.

## Ordem de leitura obrigatória (antes de codar UI)

1. `.agents/skills/motion-design/SKILL.md` — qualquer animação/transição.
2. `references/tokens.md` — tokens, escala de radius, tipografia, cores.
3. `references/anti-patterns.md` — o que é PROIBIDO na marca (D-065).
4. `references/performance-lcp.md` — server-first, LCP, CLS, hidratação.
5. `references/marketing-funnel.md` — estrutura de copy de conversão.
6. `references/hero-playbook.md` — contrato específico da home/hero.
7. `references/design-tooling.md` — o que adotar/adaptar/descartar (22 ferramentas,
   registries shadcn, allow-list e bloqueios por licença).
8. `references/motion-review-standards.md` — limiares de movimento + formato de review.
9. `references/marketing-preflight.md` — checklist de landing/hero/pricing.
10. `../../skills/ux-copywriting/SKILL.md` — ao escrever texto de interface.

## Regras não negociáveis

- **Ícones de categoria são canônicos.** Os 6 tipos (`movie`, `series`, `game`,
  `book`, `comic`, `manga`) e suas cores vivem em
  `apps/web/src/lib/design-tokens.ts` (`CATEGORY_TOKENS`) e são validados por
  `apps/web/test/contrast-aa.spec.ts` (AA sobre fundo e card). Nunca invente cor,
  ícone ou tipo novo; nunca troque a biblioteca de ícones (Lucide).
- **Sem emoji como ícone.** Sem SVG ad-hoc quando existe ícone Lucide.
- **Texto nunca `#FFFFFF`.** Use `text.primary` (`#F5F5F7`); secundário
  `#A0A0B8`; muted `#80809B` (mínimo AA sobre `#09090F`/`#05050A`).
- **Server-first no acima da dobra.** O conteúdo do LCP (H1/subtítulo/CTA) sai
  como HTML puro; animação de entrada em ilha client mínima ou CSS puro. Ver
  `references/performance-lcp.md`.
- **`prefers-reduced-motion` sempre respeitado.** CSS: media query; JS:
  `useReducedMotionPref()` (`@/lib/useReducedMotionPref`) ou
  `useReducedMotion` do `motion/react`.
- **Paridade i18n obrigatória** nos 3 locales (`pt-BR`, `en-US`, `es-ES`) com as
  mesmas chaves; nunca hardcode texto de UI em JSX; nunca PT vazando em EN/ES.
- **Números de marketing são DERIVADOS, nunca digitados.** Contagens (fontes,
  categorias, títulos) vêm de `@/lib/sources` (`NUM_FONTES_ATIVAS`,
  `FONTES_ATIVAS`) ou da API. Texto com número fixo diverge do produto (foi a
  causa do "11 fontes" com 14 fontes ativas).
- **Sem promessa perpétua de gratuidade** (T087/D-xxx): proibido "grátis para
  sempre" / "free forever" / `landing.ctaTrust`. Teste-guarda:
  `apps/web/test/hero-promessa-perpetua.spec.ts`.
- **`main` é auto-deployado.** Mudança visual só entra por PR com CI verde
  (D-457/T459); nunca push direto.

## Fluxo de trabalho visual

1. **Mapear** (GRAFT-FIRST + `grep`) quais componentes/tokens/testes tocam a área.
2. **Spec primeiro**: escreva a estrutura (gancho→promessa→prova→CTA), os tokens
   usados e o orçamento de movimento ANTES do JSX.
3. **Implementar** respeitando server-first + ilhas client mínimas.
4. **Validar** com os gates abaixo.
5. **Evidência**: screenshots + relatório de contraste, registrando decisão nova
   em `DECISOES.md` quando alterar padrão visual travado.

## Gates de validação (rodar da raiz, salvo indicação)

```bash
npm run typecheck                          # tsc API + web
npm run lint                               # eslint 9 (flat config)
npm test --workspace apps/web              # vitest (inclui contrast-aa, i18n-parity)
npm run design:detect                      # linter de anti-padrões de UI (advisory, exit 2 = achados)
npm run design:contrast                    # contraste AA dos tokens (exit 1 = reprova)
npm run design:visual -- --locales pt-BR,en-US,es-ES   # screenshots + overflow + axe (dev server no ar)
npm run test:a11y --workspace apps/web     # axe AA (requer E2E_FULL=1 + stack local)
```

`design-review` traz a heurística de crítica visual; `visual-qa` traz o harness
Playwright; `design:detect` (Impeccable) traz o detector determinístico de
anti-padrões — triagem em `../../skills/design-review/references/design-linter.md`
(ele é **advisory**: parte dos achados é decisão consciente de marca).

## Checklist de entrega (copiar para o PR)

- [ ] Estrutura de funil: gancho → promessa → prova → CTA única e explícita.
- [ ] Informação útil: cada linha da tela tem função (valor, prova ou ação).
- [ ] Zero número de marketing hardcoded (derivado do registro/API).
- [ ] Tokens de `design-tokens.ts`/`globals.css`; nenhum hex novo sem justificativa.
- [ ] Contraste AA: texto normal ≥ 4.5:1, grande ≥ 3:1 (rodar contrast-audit).
- [ ] `prefers-reduced-motion` desliga entrada, loop e parallax.
- [ ] Foco visível em todo elemento interativo; navegação por teclado ok.
- [ ] Alvos de toque ≥ 44×44 px; sem overflow horizontal em 375 px.
- [ ] Transições 150–300 ms em hover/press; hover não desloca layout.
- [ ] 3 locales com paridade; JSON validado; nenhum PT em EN/ES.
- [ ] LCP acima da dobra é HTML puro (sem imagem nova, sem motion de entrada).
- [ ] Testes: spec de regressão para copy/estrutura nova + `npm test` verde.
- [ ] Screenshots 375/768/1024/1440 anexados como evidência.
