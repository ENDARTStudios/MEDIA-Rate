# Pre-flight de superfícies de marketing (hero, landing, pricing)

Recorte curado e **adaptado** de `Leonxlnx/taste-skill` (`redesign-skill`,
`taste-skill` pre-flight) — MIT © 2026 Leonxlnx. Fonte vendorizada localmente:
`.agents/skills/redesign-skill/SKILL.md`. Atribuição: `.zcode/skills/THIRD-PARTY.md`.

Aplicar em `/pt-BR` (home), `/pricing`, `/about`, `/welcome` e qualquer campanha.
Não aplicar em telas de produto (dashboard, biblioteca, ficha) — lá vale o
contrato de produto (densidade, tabelas, estados).

## Checklist antes de entregar (medir, não opinar)

Dobra e composição:

- [ ] Hero inteira (gancho + promessa + CTA) dentro do viewport inicial em
      1366×768 **e** 390×844; nada de CTA exigindo scroll.
- [ ] Headline com no máximo **2 linhas** no desktop (3 no mobile) — sem órfã de
      uma palavra.
- [ ] Subtexto da promessa ≤ 20 palavras.
- [ ] CTA primária em **uma linha** no desktop (sem wrap de 2 linhas).
- [ ] Nenhuma seção com mais de 4 blocos de texto na dobra.
- [ ] Altura do cabeçalho fixo ≤ 80 px e nav em uma linha.

Ação e hierarquia:

- [ ] **Uma** intenção de CTA por página (as secundárias são visualmente
      subordinadas: outline, menor peso, nunca mesma cor de fundo).
- [ ] Cada linha da tela tem função: valor, prova ou ação (o resto sai).
- [ ] Uma única família de layout por seção (não misturar grid 2col com 3col
      na mesma faixa sem motivo).

Contraste e legibilidade (WCAG AA):

- [ ] Texto normal ≥ 4.5:1; texto grande/ícone informativo ≥ 3:1 — validar com
      `.zcode/skills/design-review/scripts/contrast-audit.mjs`.
- [ ] Botão primário: texto sobre `#E11D48` (branco puro = 4.70:1 — **não** usar
      texto `#FFFFFF` em fundo mais claro que a marca).
- [ ] Formulários: label visível, foco visível, erro com texto (não só cor).
- [ ] Nada de texto `#FFFFFF` cru (D-065) e nada de muted `#80809B` sobre
      superfície elevada `#1B1B2C` (4.42:1 reprova).

Movimento e mídia:

- [ ] `prefers-reduced-motion` desliga movimento (mantendo opacidade/cor).
- [ ] Loops com amplitude ≤ 8 px e `transform`/`opacity` apenas.
- [ ] Nenhuma imagem nova acima da dobra (LCP é o H1 em texto, server-first).
- [ ] Se houver vídeo/hero animada: `poster` + `preload="none"` + sem autoplay
      com áudio; nunca no caminho crítico do LCP.

Mobile/nativo:

- [ ] `min-h-[100dvh]` em vez de `h-screen` (100vh bug no mobile).
- [ ] Hover decorativo só em `@media (hover: hover) and (pointer: fine)`.
- [ ] Inputs com `font-size ≥ 16px` (evita zoom automático no iOS).
- [ ] Alvos de toque ≥ 44×44 px; safe-area respeitada em barra fixa.
- [ ] Sem destaque azul de tap: `-webkit-tap-highlight-color: transparent`
      quando o componente tem estado próprio.

i18n e verdade:

- [ ] Copy nos 3 locales com paridade de chaves; nenhum PT vazando em EN/ES;
      strings longas (ES/EN) testadas no layout.
- [ ] Números de marketing derivados (`NUM_FONTES_ATIVAS`, total da API) — nunca
      digitados; sem promessa perpétua de gratuidade (T087).
- [ ] Escala de score correta quando citada (game 0–100; demais 0–10).

## Protocolo de redesign (ordem obrigatória)

1. **Auditar antes de mexer**: screenshots atuais (375/768/1024/1440), lista de
   blocos por função, achados de contraste e o resultado de
   `npm run design:detect`.
2. **Diagnóstico**: o que é hierarquia, o que é densidade, o que é copy, o que é
   ruído (remover).
3. **Corrigir na ordem**: estrutura → hierarquia/espaço → tipografia → cor →
   movimento → microcopy.
4. **Provar**: `contrast-audit` + `visual-qa` (antes/depois) + axe AA na rota.
5. **Registrar**: o que mudou e por quê (token/anti-padrão associado); decisão
   travada vai para `DECISOES.md`.
