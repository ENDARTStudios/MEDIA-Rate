# MEDIA Rate — identidade visual (logo)

> **Conceito:** o selo do que você assiste.
> Um losango (o selo, a nota) com um play dentro (a mídia). O indigo carrega a estrutura;
> o rose marca a nota.

Construído no **VectorCraft Desktop** (0.13.1) pelo canal de controle JSON — todos os
arquivos desta pasta saem do mesmo documento-fonte: [`src/media-rate-logo.vectorcraft`](src/media-rate-logo.vectorcraft).

---

## 1. Racional

| Elemento | Papel | Por quê |
|---|---|---|
| **Losango de cantos suaves** | o selo | Herda o losango do logo anterior (continuidade), mas ganha massa: lê a 16 px e sustenta tipografia pesada. Forma de "selo/nota" sem virar estrela genérica. |
| **Play** | a mídia | O gesto universal de consumir mídia (filme, série, jogo, livro). Vazado no centro do selo, é o "conteúdo" avaliado. |
| **Rose `#E11D48`** | a nota | É a cor de ação do produto (CTA). No logo, ela é a única cor "quente" — o olho vai direto para o play, como vai para a nota. |
| **Indigo `#818CF8`** | a estrutura | Cor de acento da interface. Dá o contraste frio que faz o rose funcionar. |
| **Contraste de peso** | a hierarquia | `MEDIA` em 700 (o assunto) e `RATE` em 300 com entreletra ampla (a ação, o rigor). O mesmo contraste aparece nos dials de score do app. |

A leitura em três tempos: **losango → play → MEDIA RATE**. Primeiro a forma (o selo),
depois o significado (a mídia), depois o nome.

## 2. Anatomia e construção

O símbolo parte de uma malha de 64 unidades (1 S = lado do losango):

| Medida | Valor | Referência |
|---|---|---|
| Losango | 1 S × 1 S (diagonal) | quadrado girado 45° |
| Raio dos cantos | 0,14 × metade da diagonal | cantos suaves, sem virar "bolha" |
| Play — comprimento (base → ponta) | 0,42 S | eixo horizontal, ponta à direita |
| Play — base (altura) | 0,38 S | proporção 1,09:1 |
| Deslocamento óptico do play | +0,02 S | corrige o peso visual à esquerda do triângulo |

No lockup horizontal, tudo é derivado da **altura de caixa alta** (`cap`):

| Relação | Valor |
|---|---|
| Símbolo (S) | `1,42 × cap` |
| Espaço símbolo → palavra | `0,44 × cap` |
| Espaço MEDIA ↔ RATE | `0,72 × cap` |
| Baseline | única para as duas palavras |
| Centro do símbolo | `cap ÷ 2` acima da baseline |

## 3. Tipografia

- **Família:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (OFL) — a fonte de títulos do produto.
- `MEDIA` → **Bold 700**, tracking **−20** (milésimos de em).
- `RATE` → **Light 300**, tracking **+90**.
- Nos arquivos finais a tipografia está **em contornos** (sem dependência de fonte).
- Alternativa de sistema (quando não houver arquivo): Inter 700 / Inter 300 com o mesmo tracking — nunca outra família.

## 4. Cores do logo

| Papel | Hex | Token de interface |
|---|---|---|
| Estrutura (losango) | `#818CF8` | `--accent-indigo` |
| Nota (play) | `#E11D48` | `--accent-brand` |
| Fundo escuro | `#05050A` | `--bg` |
| Tinta (versão clara) | `#0F172A` | `--foreground` |
| Branco (versão escura) | `#FFFFFF` | — |

Regras: **duas cores** no símbolo ou **uma cor** (versão mono, com o play vazado).
Nunca uma terceira cor dentro do símbolo.

## 5. Área de proteção e tamanhos

- **Área de proteção:** `½ × S` em todos os lados (nenhum texto, ícone ou borda entra nessa margem).
- **Tamanhos mínimos:** símbolo **16 px** (digital) / **8 mm** (impresso); lockup horizontal **≥ 120 px** de largura; lockup vertical **≥ 96 px**.
- Abaixo de 24 px, use o símbolo — nunca o lockup completo.

## 6. Versões

| Versão | Uso |
|---|---|
| **Lockup horizontal** (primário) | cabeçalho, assinaturas, materiais amplos |
| **Lockup vertical** | espaços quadrados, capas, avatar de perfil |
| **Símbolo** | favicon, app, marca d'água, elementos de UI |
| **Mono positivo / mono tinta** | uma cor só (impressão, gravação, fundos claros/escuros) |
| **Ícone do app** | tile escuro com símbolo centralizado (52–58% do lado) |

**No produto:** o lockup do header é caixa alta (`MEDIA RATE`), como nos assets; o nome em
texto corrido (copy, metadados, rodapé) continua **“MEDIA Rate”**. O componente
[`Logo.tsx`](../../../apps/web/src/components/Logo.tsx) implementa o lockup com o símbolo em
SVG e o wordmark em Space Grotesk (700 / 300).

## 7. Arquivos

```
design-system/media-rate/logo/
├─ src/media-rate-logo.vectorcraft   documento vetorial editável (9 pranchetas)
├─ exports/svg/                      vetores finais (contornos, sem fonte)
│  ├─ media-rate-logo-primary.svg
│  ├─ media-rate-logo-stacked.svg
│  ├─ media-rate-symbol.svg
│  ├─ media-rate-icon.svg
│  ├─ media-rate-logo-mono-white.svg
│  ├─ media-rate-logo-mono-ink.svg
│  └─ media-rate-logo-light.svg
├─ exports/png/                      PNGs (fundo transparente + pranchas @2x)
│  ├─ media-rate-logo-primary@1x/@2x/@3x.png     tipografia branca → fundos escuros
│  ├─ media-rate-logo-light@2x.png               tipografia tinta → fundos claros
│  ├─ media-rate-logo-mono-white@2x.png          uma cor, branco
│  ├─ media-rate-logo-mono-ink@2x.png            uma cor, tinta
│  ├─ media-rate-logo-stacked@2x.png
│  ├─ media-rate-symbol-128/256/512/1024.png
│  ├─ media-rate-icon-512/384/192/180.png
│  ├─ favicon-48/32/16.png
│  ├─ 01-primary@2x.png … 09-mono-ink@2x.png   (pranchas de apresentação)
│  └─ 08-brand-sheet@2x.png                     (folha de marca)
├─ exports/pdf/media-rate-brand-sheet.pdf
├─ fonts/                            Space Grotesk (OFL) + licença — só na reconstrução
└─ tools/                            scripts que dirigem o VectorCraft
```

## 8. Uso correto

**Pode**

- Usar o símbolo isolado em qualquer cor de fundo (com a versão mono quando necessário).
- Escalar proporcionalmente a partir do símbolo ou do lockup.
- Usar a versão mono sobre foto, com contraste ≥ 4,5:1.

**Não pode**

- Esticar, comprimir, rotacionar ou inclinar.
- Trocar as cores do símbolo, adicionar gradiente, sombra, brilho ou contorno.
- Separar o play do losango ou redesenhar o play com outro ângulo.
- Recompor o nome com outra fonte, outro peso ou outro tracking.
- Colocar o lockup sobre fundo de baixo contraste ou dentro da área de proteção.

## 9. Reconstrução

Requisitos: VectorCraft Desktop aberto com `--control 7981` (instância isolada) e Node 20+.

```powershell
cd design-system/media-rate/logo/tools
node install-font.mjs   # uma vez: instala a Space Grotesk no perfil do VectorCraft
node build.mjs          # recria o documento e salva o .vectorcraft
node export.mjs         # exporta SVG/PNG/PDF a partir do arquivo salvo
node show.mjs           # abre o documento e captura a janela do VectorCraft
```

`build.mjs` desenha tudo por comandos (formas, contornos de texto, pathfinder, camadas)
e `export.mjs` lê o arquivo salvo e fatia os ativos. Nenhum arquivo é desenhado à mão fora
do documento. O perfil `.vc-profile/` (isolado) guarda a fonte instalada e é ignorado pelo git.

---

*MEDIA Rate · identidade visual v1.0 · 2026*

