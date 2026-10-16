# Conceito v4 — Home (base no v2, com os 6 ícones e movimento)

> **Esta é a versão vigente.** O [v3](./41-conceito-v3-home.md) segue como alternativa (layout assimétrico);
> o [v2](./40-conceito-v2-home.md) é a base escolhida por você: mais limpo, menos blocos.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/` — `home-conceito-v4.png` (1440×1900),
> `conceito-home.figcraft` (abre no FigCraft Desktop), `conceito-home.jsonl` (270 comandos).
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`.

## 1. O que veio do v2 (sua escolha)

| Bloco | Como está no v4 |
|---|---|
| Hero | texto à esquerda, **selo de score à direita** (anel de 300 px, a leitura "Muito bom", os chips das fontes) |
| Busca | campo grande como caminho primário, com botão de marca |
| "A régua" | seção própria, 6 faixas com cor canônica, valor **e** nome |
| "Por decisão, não por prateleira" | **três cartões em fileira** (como você gostou) |
| "Como o score nasce" | três etapas numeradas |
| "Sem nota de marketing" | faixa de largura total |

## 2. Os 6 ícones entraram — onde eles têm função

Você pediu para mantê-los. Eles aparecem como **filtros de tipo** logo abaixo da busca: `ícone + rótulo`,
em chip, cada um na **cor canônica da categoria** e ligado a `/catalog?type=…` — que é o comportamento real
de navegação por tipo. Assim eles:

- **não competem** com o selo de score no hero (o v3 tinha posto os dois no mesmo plano, e ficava carregado);
- fazem o que fazem no produto (o `CategoryIconRow` da constelação é a mesma função, com outra forma);
- usam os **mesmos glifos** — os SVG reais do Lucide, importados no FigCraft
  (`clapperboard`, `tv`, `gamepad-2`, `book-open`, `book-image`, `book-marked`).

Ordem canônica preservada do `CATEGORY_TOKENS`: **movie, series, game, book, comic, manga**.

> **Nota de fidelidade:** no mockup os chips são estáticos. No produto, o ícone herda a cor da categoria
> (`currentColor`) e o chip inteiro é o alvo de toque — 40 px de altura no desktop, e no mobile precisa
> chegar a **44 px** (regra de alvo de toque).

## 3. O chip do v2 saiu — e a informação ficou

O v2 tinha uma pill "MEDIA Score™ · escala 0 a 10" **acima** do H1. Isso é o anti-padrão `hero-eyebrow-chip`
("o hero padrão de AI SaaS", D-065, com teste guardando: `test/hero-constellation.spec.tsx` exige que o H1
não tenha irmão anterior). No v4 o mesmo texto virou **legenda do selo** — abaixo de "Muito bom", onde ele
explica em vez de decorar. Visualmente o hero continua tão limpo quanto o v2; a regra da casa é respeitada.

## 4. Movimento — a parte que um PNG não mostra

Tudo abaixo é **especificação**, para implementar em CSS (o produto já tem as camadas equivalentes na
constelação — `category-orbit.module.css` — então isto é reuso de vocabulário, não invenção).

### 4.1 A régua

| O quê | Como | Tempo |
|---|---|---|
| **Varrido** de leitura | um gradiente de **≤ 8% de alfa** atravessa as 6 barras da esquerda para a direita; nada pisca, nada muda de cor | 1,6 s de travessia, a cada 6 s |
| **Faixa ativa (hover/focus)** | a barra cresce por `transform: scaleY(1.2)` (nunca `height` — a regra proíbe hover que desloca layout) e o nome da faixa vai a 100% de opacidade | 180 ms, `ease-out` |
| **Entrada** | as barras aparecem preenchendo da esquerda (`scaleX` de 0 → 1, origem à esquerda), com `delay` de 60 ms por faixa | 520 ms, `cubic-bezier(0.22,1,0.36,1)` |
| **Só quando visível** | o varrido só roda com a seção na viewport (`IntersectionObserver`) | — |

### 4.2 Os ícones de tipo

| O quê | Como | Tempo |
|---|---|---|
| **Entrada** | `opacity 0→1`, `translateY(8px)→0`, `scale(.92)→1`, `delay = índice × 60 ms` (seis chips: 360 ms de cascata) | 520 ms |
| **Flutuação ambiente** | `translateY 0 → -3px → 0` contínuo, fase defasada por índice (`-0.77s × i`, como na constelação) | 4,6 s por ciclo |
| **Glow** | um halo de baixa opacidade na cor da categoria pulsando entre 0.22 e 0.5 — **nunca** piscando | 4,6 s |
| **Hover/focus** | a borda e o rótulo assumem a cor da categoria; `scale` máximo **1.02** (a regra limita a 1.08); só `transform`/`border-color` | 150–250 ms |

### 4.3 Regras que valem para os dois

- **`prefers-reduced-motion: reduce` desliga tudo**: ícones e barras ficam visíveis e estáticos
  (`opacity: 1` garantido) — é o que o produto já faz na constelação, e o gate `test:hydration` roda nos
  dois modos de movimento.
- **Amplitude ≤ 8 px** em qualquer loop; nada de deslocamento grande nem cintilância (risco vestibular).
- **Nenhum loop toca fora da viewport** (economiza CPU e bateria).
- Movimento **não** é usado para dizer estado importante: a faixa é dita por **rótulo + cor + posição**;
  a animação é conforto, não informação.

## 5. Uma exceção consciente, registrada

O v4 mantém os **três cartões iguais em fileira** porque você preferiu esse bloco — e ele é justamente um
anti-padrão travado do projeto (D-065: *"3 cards iguais em fileira como seção de destaque"*). Fica
**registrado como exceção consciente**, não como descuido:

- o v3 tem a variante assimétrica (uma decisão dominante + espinha de duas linhas) pronta para quando você
  quiser trocar;
- a alternativa mais barata, se preferir manter os três: dar **peso diferente** a um deles (o de 9+ com a
  faixa em destaque), o que já quebra a leitura de "três caixas idênticas" sem mudar o layout.

## 6. Como reproduzir

```powershell
node apps/web/scripts/figcraft-conceito-home.mjs          # gera o .jsonl (270 comandos)
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\conceito-home\conceito-home.jsonl `
    --out docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' render docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft `
    -o docs\02-architecture-design\figcraft\conceito-home\home-conceito-v4.png --scale 1 --page "Home — conceito v4"
```

Como o desenho é um script, mudar a proposta é mudar número/posição e rodar de novo — a revisão acontece em
**diff**, e o mesmo script serve para gerar as variações (v3 saiu dele).

## 7. Próximo passo, se aprovar

1. **Os 6 chips de tipo no hero** — mudança pequena e de ganho imediato (reusa `CATEGORY_TOKENS` e
   `/catalog?type=…`, que já existem);
2. **Movimento da régua e dos chips** — CSS puro reaproveitando as camadas da constelação, com
   `prefers-reduced-motion` desligando tudo (o gate `test:hydration` cobre os dois modos);
3. **A régua na seção de prova** ou como seção própria (como está no v4) — decisão de IA que muda pouco
   código;
4. Os três cartões: manter, dar peso a um, ou adotar a variante assimétrica do v3.

Cada passo com `test:hydration`, `design:contrast`, `design:detect`, pixel e i18n verdes, e screenshots
1440/375 anexados.
