# Conceito v8 — Home (o símbolo cresce, a caixa não)

> **Versão vigente.** Correção do [v7](./45-conceito-v7-home.md): eu havia aumentado a **caixa** (104 → 112)
> quando o pedido era aumentar o **símbolo**. O v7 continua sendo a referência do **efeito Dock** (fórmula,
> implementação e guardas) — aqui só muda a proporção.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/`
> — `home-conceito-v8.png` (a tela, 1440×1960)
> — `icones-dock.png` (o efeito em três estados, com o símbolo novo)
> — `selo-estados.png` (o ciclo do selo) · `conceito-home.figcraft` (3 páginas) · `conceito-home.jsonl` (470 comandos)

## 1. O erro e a correção

| Medida | v5/v6 | v7 (errado) | **v8 (correto)** |
|---|---|---|---|
| Caixa | 104 px | 112 px ✗ | **104 px** |
| Frame do símbolo | 40 px (38%) | 78 px (70%) | **88 px (85%)** |
| Traço aparente | ~28 px | ~55 px | **~62 px** |
| Rótulo | fora da caixa | dentro da caixa | **fora da caixa** |

**A causa raiz do meu erro:** eu tratei "ícone pequeno" como "caixa pequena" e mexi nas duas medidas — o que
manteve o símbolo proportionally contido. O pedido era claro: **crescer o símbolo, manter a caixa**.

**O detalhe que destravou:** o rótulo estava **dentro** da caixa (decisão do v7) e ocupava a metade inferior
que o símbolo precisava. Com ele **fora**, o símbolo pode ir a 88 px — 85% da caixa, contra 70% — sem mexer
em nenhuma dimensão da caixa.

## 2. Por que 88 px, e não 104

Os SVG do Lucide têm ~⅔ de traço dentro do viewBox, então um frame maior **não** significa traço maior na
mesma proporção. Em 88 px o traço fica em ~62 px e sobram ~8 px de respiro em cada lado — de propósito:

- o símbolo **domina** a caixa sem encostar na borda (encostar lê como recorte, não como presença);
- com o efeito Dock em 1,32, a caixa vai a 137 px e o símbolo a 116 px — o respiro cresce junto, então o
  estado magnificado nunca "vaza";
- a faixa continua centrada: 6 × 104 + 5 × 56 = **904 px**.

## 3. O que **não** mudou

- O **efeito Dock** segue exatamente como especificado no v7: queda em cosseno ao quadrado, alcance de ~2
  casas, 1,32 / 1,18 / 1,01, `transform-origin: bottom center`, `pointermove` em `requestAnimationFrame`
  gravando variáveis CSS, guardas de ponteiro fino/1024 px, foco sem onda e `prefers-reduced-motion`
  desligando a escala.
- **Uma consequência verificada nesta versão:** com o rótulo fora da caixa, ele **viaja junto com a peça**
  magnificada (`y + lado + 12`, medido a partir do topo já deslocado). É o comportamento do Dock — o rótulo
  acompanha o ícone, não fica ancorado na linha de base.

## 4. Ciclo do selo e sincronia da régua

Inalterados desde o [v6](./44-conceito-v6-home.md) — `selo-estados.png` continua sendo a referência dos seis
estados, e o documento do v6 tem a especificação de tempo, pausa, viewport e reduced-motion.

## 5. Se aprovar

1. **Variante `row` do `CategoryIconRow`**: caixa 104, símbolo 88, rótulo abaixo (o componente já tem os 6
   pares, o `aria-label` e as camadas de movimento);
2. **Efeito Dock** (CSS + `pointermove` em rAF) — inclui um teste para o `pointerleave` e para o estado sem
   movimento;
3. **Ciclo do selo + sincronia da régua** (v6);
4. Os três cartões: manter, dar peso a um, ou a variante assimétrica do v3.

Cada passo com `test:hydration`, `design:contrast`, `design:detect`, pixel e i18n verdes, screenshots 1440/375.
