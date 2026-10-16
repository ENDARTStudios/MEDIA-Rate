# Conceito v7 — Home (símbolos maiores + efeito Dock nos ícones)

> **Versão vigente.** Evolução do [v6](./44-conceito-v6-home.md) por duas correções suas: os **símbolos
> estavam pequenos dentro das caixas** e os ícones precisavam de uma **animação de aproximação, como o Dock
> do macOS**.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/`
> — `home-conceito-v7.png` (a tela, 1440×1960)
> — **`icones-dock.png` (o efeito em três estados — a evidência do movimento)**
> — `selo-estados.png` (o ciclo do selo) · `conceito-home.figcraft` (3 páginas) · `conceito-home.jsonl` (470 comandos)
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`

## 1. Símbolo maior dentro da caixa

O problema não era a caixa — era a **proporção**. Os SVG do Lucide têm padding interno (o traço ocupa ~⅔ do
viewBox), então um frame de 60 px rendia ~40 px de desenho. Números de agora:

| Medida | v6 | v7 |
|---|---|---|
| Caixa | 104 px | **112 px** |
| Frame do símbolo | 60 px (58%) | **78 px (70%)** |
| Traço aparente | ~40 px | **~55 px** |
| Respiro entre caixas | 64 px | 56 px |
| Rótulo | fora da caixa | **dentro**, abaixo do símbolo |

O rótulo entrou para a caixa porque, com o símbolo maior, a peça passa a ser **autoexplicativa** (ícone +
nome) sem depender do espaço abaixo — e a faixa continua centrada (6 × 112 + 5 × 56 = 952 px).

## 2. O efeito Dock, na fórmula

Quando o ponteiro entra na fileira, cada peça cresce conforme a **distância até o ponteiro** — a peça sob o
cursor cresce mais, as vizinhas crescem menos e a influência cai a zero em ~2 casas. É a mesma curva do Dock:
**queda em cosseno ao quadrado**.

```ts
const ALCANCE = 2.2; // em casas
const MAX = 1.32; // escala da peça sob o ponteiro

function dock(i: number, ponteiro: number) {
  const queda = Math.cos(Math.min(Math.abs(i - ponteiro) / ALCANCE, 1) * (Math.PI / 2)) ** 2;
  return { escala: 1 + (MAX - 1) * queda, sobe: queda * 10 };
}
```

O que a curva produz — e o que o storyboard mostra lado a lado:

| Distância do ponteiro | Escala | Sobe |
|---|---|---|
| 0 (sob o cursor) | **1,32** | 10 px |
| 1 casa | **1,18** | 5,7 px |
| 2 casas | 1,01 | 0,2 px |
| 3+ casas | 1,00 | — |

## 3. Como implementar (sem re-render do React)

- **CSS decide, JS só escreve números.** Cada peça lê duas variáveis:
  `transform: scale(var(--s, 1)) translateY(calc(var(--up, 0) * -1px))` com
  **`transform-origin: bottom center`** — é isso que faz a peça **crescer para cima** e a fileira ganhar o
  "arrojo" do Dock.
- **`pointermove` na fileira, dentro de `requestAnimationFrame`**: calcula o índice sob o cursor e escreve
  `--s`/`--up` em cada peça. Zero estado do React por frame (o mesmo padrão que o parallax da constelação já
  usa no produto).
- **`pointerleave`** devolve tudo a 1 em 220 ms.
- **Sem deslocamento de layout**: só `transform`. A fileira precisa de `padding-block` (≈ 24 px) para a peça
  ampliada não ser recortada, e a peça em foco recebe `z-index` para passar à frente das vizinhas.
- **Só onde faz sentido**: `(min-width: 1024px) and (pointer: fine)`. Toque **não** magnifica (no mobile a
  fileira vira grade 3×2 e o alvo segue ≥ 44 px).
- **Teclado tem o mesmo realce, sem a onda**: foco em uma peça dá borda cheia + tint 20% (sem empurrar as
  vizinhas). Foco visível é obrigatório; a onda é enfeite de ponteiro, não de foco.
- **`prefers-reduced-motion: reduce`**: escala desligada — fica só o realce de borda/cor. O produto já tem
  `useReducedMotionPref` e o `MotionConfig` no layout.

## 4. Relação com o que já existe

Nada disso é componente novo: a fileira é o **`CategoryIconRow`** (que já tem os 6 pares do
`CATEGORY_TOKENS`, `aria-label` por tipo e as camadas de movimento) numa variante `row`, e o efeito Dock é
CSS + um listener de ponteiro — o mesmo tipo de trabalho que o **parallax da constelação** já faz
(`--tx`/`--ty` no stage, via `requestAnimationFrame`, só em ponteiro fino).

## 5. Duas iterações

1. **v7.a:** símbolo em 60 px — bonito no papel, **pequeno no render** (o traço do Lucide não preenche o
   frame). E a rota da página do efeito falhou porque o nome tinha emoji/acento — corrigido passando a
   página exata no `render`.
2. **v7.b (esta):** símbolo em **78 px**, rótulo dentro da caixa, caixa em 112 px, e a página do Dock com os
   **três estados** desenhados pela mesma fórmula que está especificada acima (mockup e spec não divergem).

## 6. Se aprovar

1. **Variante `row` do `CategoryIconRow`** com caixa 112 e símbolo 78 (o componente já tem os dados e o
   `aria-label`);
2. **Efeito Dock** (CSS + `pointermove` em rAF, com as guardas acima);
3. **Ciclo do selo + sincronia da régua** (v6, `selo-estados.png` como referência dos estados);
4. Os três cartões: manter, dar peso a um, ou a variante assimétrica do v3.

Cada passo com `test:hydration`, `design:contrast`, `design:detect`, pixel e i18n verdes, screenshots 1440/375
e o efeito gravado (o `test:hydration` roda nos dois modos de movimento, e o Dock precisa de um teste próprio
para o `pointerleave`).
