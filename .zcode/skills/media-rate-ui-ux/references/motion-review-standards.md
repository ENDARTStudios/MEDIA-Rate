# Padrões de revisão de movimento (MEDIA Rate)

Recorte curado e **adaptado** de `emilkowalski/skills` (`review-animations`,
`animation-performance`, `mobile-native`, `animate`) — MIT © 2026 Emil Kowalski.
Fonte vendorizada localmente: `.agents/skills/review-animations/SKILL.md`
(+ `STANDARDS.md`). Atribuição: `.zcode/skills/THIRD-PARTY.md`.

Use junto com `.agents/skills/motion-design/SKILL.md` (princípios) e este
contrato (limiares). Em conflito, vence o contrato do projeto.

## Os 10 padrões não negociáveis

1. **Movimento justificado.** Toda animação responde "por que isto anima?" —
   consistência espacial, indicação de estado, feedback, explicação, evitar
   mudança brusca. "Fica legal" em elemento visto com frequência é bloqueador.
2. **Frequência manda.** Ação de teclado / 100+×/dia → **nenhuma** animação.
   Dezenas/dia → reduzida. Ocasional → padrão. Rara/primeira vez → pode ter charme.
3. **Easing responsivo.** Entrada/saída com `ease-out` ou curva forte custom.
   `ease-in` em UI é bloqueador. Curvas nativas do CSS são fracas — use
   `cubic-bezier(0.22, 1, 0.36, 1)` (assinatura da marca) ou equivalentes.
4. **UI abaixo de 300 ms.** Acima disso só com justificativa (reveal dramático da
   hero/landing pode chegar a ~700 ms em elemento não interativo).
5. **Origem e física.** Popover/dropdown/tooltip escalam da origem do gatilho
   (`transform-origin`), não do centro. Nunca `scale(0)`: comece em
   `scale(0.9–0.97)` + opacity. Modal é a exceção (fica centralizado).
6. **Interrompível.** Toast/toggle/drag: use transição/spring que retargeta do
   estado atual — nunca keyframes que reiniciam do zero.
7. **Só GPU.** Anime `transform` e `opacity`. `width`/`height`/`margin`/`padding`/
   `top`/`left` = achado de performance.
8. **Acessibilidade.** `prefers-reduced-motion` respeitado — **mais suave, não
   zero**: mantenha opacidade/cor, remova deslocamento. Hover só sob
   `@media (hover: hover) and (pointer: fine)` (evita "hover preso" no touch).
9. **Entrada ≠ saída.** Ação deliberada (press, hold, confirmar destrutivo) anima
   mais devagar; resposta do sistema é seca. Tempo simétrico em press-and-release
   é achado.
10. **Coesão.** O movimento combina com a personalidade do produto — aqui:
    *premium com toque energético*, nada de bounce/elastic em dado, nada de
    elastic em texto. Na dúvida, o melhor movimento costuma ser **deletar**.

## Gatilhos de escalonamento (sinalize na hora)

- `transition: all` · `scale(0)` · entrada só com fade (sem transform inicial)
- `ease-in` em interação de UI; easing nativo fraco em animação deliberada
- animação em atalho de teclado / command palette / ação 100+×/dia
- duração > 300 ms em UI sem justificativa
- `transform-origin: center` em popover ancorado ao gatilho
- keyframes em toast/toggle ou algo disparado em rajada
- animar propriedade de layout
- atualizar variável CSS no pai para mover filho (tempestade de style recalc)
- `prefers-reduced-motion` ausente em movimento · `:hover` sem gate
- entrada "tudo de uma vez" onde caberia stagger de 30–80 ms

## Hierarquia de remédio (prefira o primeiro movimento)

1. **Deletar** a animação (alta frequência / sem propósito / por teclado).
2. **Reduzir** — duração, deslocamento, nº de propriedades.
3. **Corrigir easing** — `ease-in` → `ease-out`/curva custom.
4. **Corrigir origem/física** — `transform-origin`; `scale(0)` → `scale(0.95)`+opacidade.
5. **Tornar interrompível** — keyframes → transição/spring.
6. **Mover para a GPU** — layout props → `transform`/`opacity`.
7. **Assimetria** — desacelere a fase deliberada, acelere a resposta.
8. **Polir** — blur para mascarar crossfade, stagger em grupos, `@starting-style`.
9. **A11y e coesão** — reduced-motion + gate de hover; casar com a personalidade.

## Orçamento por elemento (projeto)

| Elemento | Duração | Easing |
|---|---|---|
| Tooltip / micro-feedback | 80–120 ms | ease-out |
| Press/hover de botão | 120–180 ms | `cubic-bezier(0.22,1,0.36,1)` |
| Transição de ícone | 150–250 ms | ease-out |
| Card entra/sai | 200–350 ms | ease-out (entrada 30–50% mais longa que saída) |
| Modal/dialog | 300–400 ms | ease-out |
| Transição de página | 400–600 ms | `--easing-in-out` |
| Reveal dramático (hero/landing, não interativo) | 600–1200 ms | ease-out forte |

Loops ambientes: amplitude ≤ 8 px, `opacity`/`transform` apenas, fase deslocada
entre irmãos; nunca em elemento que recebe clique.

## Mapa por biblioteca (stack deste repo)

| Caso | Ferramenta | Regra local |
|---|---|---|
| Scrolltelling, pin, scrub, timeline longa, split de palavras | **GSAP** (`gsap` + `@gsap/react`) | `useGSAP()` com `scope` (cleanup automático) e `gsap.matchMedia()` para reduced-motion; nunca `SplitText` no H1 (LCP é texto) |
| Micro-interação, hover/press, entrada/saída de UI, `AnimatePresence`, layout | **motion/react** | `MotionConfig reducedMotion="user"` global (já ativo em `providers/motion-provider.tsx`); `useReducedMotionPref()` |
| Contador/valor numérico, stagger curto, loop leve | **animejs v4** | import por subpath (`animejs/animation`, `/utils`) para tree-shaking; curto-circuitar quando `shouldReduce` |
| Animação de entrada da hero (LCP-neutra) | **CSS puro** | keyframes + `animation-delay` por índice; sem lib, sem hidratação |

## Formato do parecer de revisão de movimento

Tabela única, uma linha por achado: `arquivo:linha` · regra violada (nº acima) ·
evidência · correção sugerida (na hierarquia) · severidade
(`bloqueador`/`achado`/`sugestão`). Aprovar exige declarar explicitamente
"nenhum bloqueador de movimento" — não invente achado para parecer útil.
