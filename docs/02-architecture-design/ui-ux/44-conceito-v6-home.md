# Conceito v6 — Home (selo animado, sincronizado com a régua)

> **Versão vigente.** Evolução do [v5](./43-conceito-v5-home.md) pelo seu pedido: **o selo é animado e
> percorre a escala, variando a nota conforme as cores da régua.**
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/`
> — `home-conceito-v6.png` (1440×1960, a tela)
> — **`selo-estados.png` (1440×720, o storyboard dos 6 estados — é a evidência do movimento)**
> — `conceito-home.figcraft` (abre no FigCraft Desktop, duas páginas) · `conceito-home.jsonl` (334 comandos)
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`

## 1. A ideia: o ciclo ensina a escala (não é enfeite)

O selo percorre **seis estados, um por faixa da régua**, e a cada estado:

1. o **número** muda (com tween, não salto);
2. a **cor do anel** passa para a cor daquela faixa (crossfade);
3. o **rótulo** muda ("Excepcional" → "Muito bom" → …);
4. a **barra correspondente na régua acende** e cresce — no mesmo instante.

É isso que dá função ao movimento: em ~16 s de ciclo, quem chega entende a escala inteira, com cor, número e
nome. A régua e o selo deixam de ser duas peças e passam a ser **um sistema**.

## 2. Honestidade: número que muda sozinho precisa se explicar

Número que troca sozinho pode ser lido como **dado real** — e isso colide com o princípio da casa ("sem nota
de marketing", D-583.4). Então:

- o selo leva a legenda **"a régua em movimento · exemplo da escala"** — o ciclo se declara;
- **no produto, cada estado é uma obra real**: o selo mostra o **título** e a **nota que vieram do cálculo**
  (o `ScoreDial` já tem contador animado com `IntersectionObserver`; o ciclo só passa a trocar de obra);
- e o fecho da página diz, em texto: *"o ciclo percorre obras reais do catálogo, com as notas reais — o valor
  nunca é escolhido para render movimento"*.

Ou seja: o mockup declara que os números são exemplo; o produto não precisa declarar porque **não são**.

## 3. Especificação do movimento

| O quê | Como | Tempo |
|---|---|---|
| **Troca de estado** | número por tween (contagem), cor do anel por crossfade, rótulo trocando no meio da transição | 400 ms |
| **Permanência** | cada estado fica parado o suficiente para ser lido | 2,6 s |
| **Ciclo completo** | 6 estados, na ordem da régua (9+ → abaixo) | ~18 s |
| **Sincronia da régua** | a barra do estado ativo cresce por `scaleY` (18 px contra 10 px) e o rótulo vai a 100% de opacidade | 200 ms |
| **Pausa** | hover/focus no selo **ou** na régua congela o ciclo no estado atual | — |
| **Só com a seção visível** | `IntersectionObserver` liga/desliga — nada roda fora da viewport | — |
| **`prefers-reduced-motion`** | ciclo desligado; o selo fica **parado no estado da faixa do topo** e a régua mantém todas as barras visíveis | — |

Amplitude e regras gerais seguem o playbook: nada de movimento que desloque layout, nada de cintilância, e a
cor **nunca** é o único canal — o estado é dito por **número + rótulo + cor + posição**.

## 4. O que muda na tela (v5 → v6)

- A régua ganhou **valores de exemplo por faixa** (9,4 · 8,7 · 7,3 · 6,4 · 5,2 · 4,1) — os mesmos do
  storyboard —, então ela também ensina por número, não só por cor;
- a faixa ativa aparece **acesa e mais alta** no mockup: é a sincronia mostrada em imagem estática;
- o subtítulo da régua ficou curto ("A mesma escala para tudo. A faixa acesa é a do selo.") porque a versão
  longa quebrava em duas linhas e encostava nos números;
- a legenda do selo virou **"a régua em movimento · exemplo da escala"** (antes: "MEDIA Score™ · escala 0 a
  10"). O nome do produto já está no hub e no rodapé — aqui a legenda tem de explicar o que se vê.

## 5. O que **não** mudou

Os **6 ícones seguem primários e centrados** (v5), o selo continua **menor e na seção da régua** (não voltou
ao hero), a cópia segue à esquerda (o H1 é o primeiro elemento lido), e nada de chip/eyebrow acima do H1.

## 6. Duas iterações

1. **v6.a:** o subtítulo longo da régua quebrava em duas linhas e **encostava nos números das faixas**;
2. **v6.b (esta):** subtítulo curto, números com respiro, storyboard em página própria (para a tela não
   ganhar densidade — e para o movimento ter evidência separada).

## 7. Encaixe no produto

O selo animado **já existe em parte**: `media-rate-ui/ScoreDial` tem contador por viewport e
`StaticScoreDial` é a versão de servidor (para os carrosséis não hidratarem JS). O ciclo é uma **variante**
do mesmo componente: recebe uma lista de obras reais (do catálogo) em vez de um valor único, e emite o estado
ativo para a régua — que passa a ser um componente irmão (`ScoreScale`) alimentado pelo mesmo índice.

Nada disso pede dependência nova, e o `prefers-reduced-motion` já tem infraestrutura no produto
(`useReducedMotionPref` + o `MotionConfig` do layout).
