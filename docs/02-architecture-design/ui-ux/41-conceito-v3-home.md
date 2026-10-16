# Conceito v3 — Home (evolução do v2, ancorada no que o projeto já decidiu)

> **Substitui o v2.** O v2 ([`40-conceito-v2-home.md`](./40-conceito-v2-home.md)) tinha a tese certa e
> **três vícios** que as regras do próprio projeto proíbem. Este documento começa pela análise que faltava.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-home/` — `conceito-home.jsonl` (238 comandos),
> `conceito-home.figcraft` (abre no FigCraft Desktop), `home-conceito-v3.png` (1440×1620).
> **Gerador:** `apps/web/scripts/figcraft-conceito-home.mjs`.

## 1. O que a análise encontrou (e que mudou a proposta)

Antes de propor, li o que o projeto **já decidiu**. Quatro achados mudaram o desenho:

| Achado | Onde | Consequência |
|---|---|---|
| **O hero é um contrato fechado** | `.zcode/skills/media-rate-ui-ux/references/hero-playbook.md` | Grid assimétrico, H1 como **primeiro elemento**, **sem chip/eyebrow** (anti-padrão `hero-eyebrow-chip`, guardado por `test/hero-constellation.spec.tsx`), âncora visual = **constelação dos 6 ícones** |
| **Os 6 ícones são pares imutáveis** | `CATEGORY_TOKENS` (`design-tokens.ts:280-289`) | `movie→Clapperboard #818CF8` · `series→Tv #38BDF8` · `game→Gamepad2 #34D399` · `book→BookOpen #FBBF24` · `comic→BookImage #F472B6` · `manga→BookMarked #A78BFA` |
| **Vícios de design estão escritos e travados** | `.zcode/skills/media-rate-ui-ux/references/anti-patterns.md` (D-065) | Proibido: `hero-eyebrow-chip`, **"3 cards iguais em fileira"**, `rounded-2xl` blanket, aurora-blob, glassmorphism blanket, emoji como ícone, `#FFFFFF` |
| **A faixa de prova já existe no hero** | `HeroSection.tsx` | Já carrega o método (pills crítico/público/consenso) e a contagem de fontes **derivada** de `@/lib/sources` |

**Traduzindo:** o v2 trocou a âncora da marca (os 6 ícones) por um anel de score — um **downgrade** — e
cometeu dois vícios proibidos: o *eyebrow chip* acima do H1 e os **3 cards iguais em fileira**. Foi o que
esta versão corrige.

## 2. O que fica exatamente como está (decidido, não se toca)

- A **estrutura do hero**: H1 primeiro, subtítulo, CTA primária de marca (`brand #E11D48` → catálogo,
  dominante) + secundária outline (→ cadastro), microcopy factual.
- A **constelação**: 6 tiles de 84 px a 60° num anel de raio ~148 px, com hub do wordmark, os 3 níveis de
  movimento do `motion-design`, `:has()` no staging, parallax só em `pointer: fine`, e a a11y já especificada
  (`nav` + `ul role="list"` + `aria-label` por tipo + decorativos `aria-hidden`).
- **Tokens, fontes e raios** do design system; hierarquia de heading sem pulos; contraste AA.
- A ordem canônica dos tipos: **movie, series, game, book, comic, manga**.
- O que existe abaixo da dobra: `HomeStats`, `HomeContentSections`, `BecauseYouConsumed`, `MediaCarousel`,
  `ContinueDecision` (que é "continue de onde parou", não a seção de decisão).

## 3. O que evolui (três movimentos)

### 3.1 A Régua entra na faixa de prova

A faixa de prova já é a seção do **método**. A régua é a *visualização* desse método — então ela não é uma
seção nova: é a mesma seção, agora mostrando a escala (6 faixas, cores canônicas, rótulo **e** nome por
faixa). O usuário entende "7, 8, 9+" sem abrir manual, e o CTA de método (`/methodology`) fica a um clique.

### 3.2 "Por decisão, não por prateleira" vira layout assimétrico

A tese que você aprovou permanece — a forma muda para não bater no anti-padrão:

- **Uma decisão dominante** ("Vale cada minuto", faixa 9 a 10) ocupando 2/3 da largura, com amostra de
  linhas de catálogo (sem nota digitada à mão — só a faixa);
- **uma espinha** de duas linhas de peso menor ("Boa pedida" · "Se você gosta de…"), em coluna estreita.

Nada de três caixas idênticas: a hierarquia **diz** qual decisão importa mais — que é o próprio argumento
da seção.

### 3.3 Dois papéis de cor, separados (regra nova)

O ponto mais técnico — e o mais útil para o projeto seguir:

> **Cor de tipo** (as 6 cores de `CATEGORY_TOKENS`) vive **só** nos ícones e nos filtros de tipo.
> **Cor de faixa** (as 6 faixas de score) vive **só** onde há score: a régua e os chips de faixa.

Motivo medido: `movie #818CF8`, `series #38BDF8` e `game #34D399` **são os mesmos hex** das faixas 7, 8 e 9 —
na mesma tela, o olho não sabe se a cor fala de "que tipo é" ou "quão bom é". Separando por contexto, a cor
volta a ser informação.

## 4. O que saiu do v2, e por qual regra

| Vício do v2 | Regra que proíbe |
|---|---|
| Pill "MEDIA Score™ · escala 0 a 10" acima do H1 | `hero-eyebrow-chip` — "o hero padrão de AI SaaS" (detector de DOM + `hero-constellation.spec.tsx`) |
| Anel de score como âncora do hero | o contrato do hero define a constelação de tipos como âncora |
| Três cartões idênticos em fileira | D-065: "3 cards iguais em fileira" |
| `rounded-2xl` (16) em todos os cartões | D-065: `rounded-2xl` blanket |
| "8,7" no hero | sem número digitado à mão / nota de exemplo como real (D-583.4) |

Raios agora: **12** cartão · **8** chip/botão · **6** detalhe. E nada de `#FFFFFF` fora do CTA de marca
(`onBrand`, que é decisão documentada e passa AA).

## 5. Como reproduzir

```powershell
node apps/web/scripts/figcraft-conceito-home.mjs      # gera o .jsonl (238 comandos)
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\conceito-home\conceito-home.jsonl `
    --out docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' render docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft `
    -o docs\02-architecture-design\figcraft\conceito-home\home-conceito-v3.png --scale 1 --page "Home — conceito v3"
```

Os ícones são os **SVG reais** do Lucide (`node_modules/lucide-static`), com `currentColor` trocado pela cor
canônica antes da importação — o desenho mostra os mesmos glifos que o produto usa, não aproximações.

## 6. Duas iterações, com os defeitos nomeados

Renderizei, **abri a imagem** e corrigi o que estava errado — o mesmo princípio do D-625 (conferir o artefato,
não a intenção):

1. **v3.a:** o H1 quebrou em três linhas e **colidiu com o subtítulo**; os rótulos dos tiles **invadiam o
   hub** (o de cima) e a legenda (o de baixo); "abaixo de 5" **estourava** a coluna da régua.
2. **v3.b (esta):** H1 curto em duas linhas, tiles **ícone-only** (que também é o comportamento real: o nome
   aparece no hover), "abaixo" na régua, marquee de fontes com respiro.

## 7. Se você aprovar, a ordem

1. **Faixa de prova → régua** (menor mudança, maior ganho de compreensão; mexe em um componente só);
2. **Seção de decisão assimétrica** (substitui o bloco de destaques atual);
3. **Regra dos dois papéis de cor** aplicada onde os dois se cruzam hoje (cartões com ícone de tipo + score);
4. Só então ficha/rankings, se você quiser levar o mesmo vocabulário adiante.

Cada passo com os gates verdes (`test:hydration`, `design:contrast`, `design:detect`, pixel, i18n) e
screenshot 1440/375 — nada entra sem gate.
