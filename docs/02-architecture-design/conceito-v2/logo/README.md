# Selo v2 "corte" — artefato de demonstração da skill `logo-design`

> **Status:** conceito, **não aprovado**. Variação de marca do MEDIA Rate para o
> conceito v2 ("mesa de montagem": régua, corte, editorial). O selo oficial
> continua sendo o v1 em `design-system/media-rate/logo/**` — esta pasta não o
> substitui nem o edita.
>
> Gerado por `build.mjs` com `vectorcraft-cli` (VectorCraft headless): a mesma
> geometria vira SVG e PNG. Nada é desenhado à mão no arquivo final.

## 1. Conceito

**O selo do que você assiste, cortado pela régua.** O losango do v1 (o selo, a
nota) é atravessado por um corte horizontal; as duas metades deslizam em
sentidos opostos — o gesto de edição ("corte, não fade" é princípio do v2). Ler
em três tempos: **forma (losango) → corte (a régua) → nome**.

O que mudou em relação ao v1: fora o play (clichê nº 1 da categoria) e fora a
dependência de duas cores; entra o corte como ideia e a cor de trabalho única.
O que preserva: o losango como silhueta-base e a leitura a 16 px.

## 2. Geometria (fonte: `build.mjs`)

Canvas de montagem `256 × 256`, malha de 8 u, losango a 45° exato
(`|x−128| + |y−128| = 96`).

| Medida | Valor | Observação |
|---|---|---|
| Losango-base | 192 × 192 (`D = 96`) | 45°, ângulos inteiros |
| Corte | horizontal, 0° | reta pelo centro |
| Vão entre as metades | **16 u** | = **1 px a 16 px** — mínimo aceitável |
| Emenda (deslizamento) | **±16 u** ao longo do corte | sentidos opostos (efeito emenda) |
| Bbox final | **224 × 208** | centrada em (128, 128) |
| Folga no canvas | 16 u (laterais) · 24 u (topo/base) | ~6–9% |

Coordenadas finais:

```txt
metade de cima: (112,24) (208,120) (16,120)
metade de baixo: (48,136) (240,136) (144,232)
```

**Decisões ópticas**

- **Sem overshoot nos ápices:** o ápice do losango já é o extremo da forma; o
  overshoot de 1–3% serve para curvas contra arestas retas, não para este caso.
- **Vão = 1 px a 16 px:** o menor vão sobrevive ao favicon (regra de 1/32 da
  largura). Abaixo disso, a marca fecha — por isso não há versão com vão menor.
- **Emenda de 16 u (= vão):** o deslocamento acompanha a abertura; mantém o
  ritmo da malha (2 × 8 u) e o centro da bbox no centro do canvas.
- **Reverso 3% mais fino:** branco-sobre-escuro irradia e parece maior; a versão
  reversa encolhe a geometria em 3% (fator 0,97) para parecer do mesmo peso.
- **Uma cor:** acento `#E8543F`; mono tinta `#14141C` para papel. Sem terceira
  cor, sem gradiente.

## 3. Testes (o que passou)

| Teste | Resultado |
|---|---|
| 16 px real (folha de teste) | ideia lê: losango com corte/emenda |
| 24/32/48/64/96/128 px | lê sem borrão |
| Uma cor (mesa e papel) | passa |
| Reverso (fino 3%) | pareia com o positivo |
| Auditoria estrutural (`logo-audit.mjs`) | 0 FAIL · 0 WARN nos 3 masters |
| Render (`logo-render.mjs`) | 16/24/32/64/512 px, dimensão conferida no PNG |
| Master sem fonte/raster/efeito | 0 `<text>`, 0 `font-family`, 0 `currentColor` |
| Bbox quadrada e centrada | 224 × 208 (1,08:1) em (128,128) |

**Pendente / honestidade:** shelf test com concorrentes reais, peer test contra
marcas resolvidas e **busca de trademark** (não fazemos clearance). O vão de
1 px a 16 px é o limite: em favicon de 16 px a emenda fica no fio.

## 4. Arquivos

| Arquivo | O que é |
|---|---|
| `build.mjs` | gerador determinístico (geometria → comandos VectorCraft → SVG/PNG) |
| `exploracao-selo.svg/.png` | iteração de conceito: 5 cortes (0°, 15°, 25°) em tamanho grande + 64/32/16 px reais |
| `selo-corte-v2.svg/.png` | **master** (acento, transparente, 256 / 512 px) |
| `selo-corte-v2-mono-tinta.svg/.png` | uma cor, para papel claro |
| `selo-corte-v2-reverso.svg/.png` | luz sobre mesa, 3% mais fino |
| `selo-corte-v2-construcao.svg/.png` | grade de construção (640 / 1280 px): malha 8 u, losango-base, vão, emenda, vértices |
| `selo-corte-v2-teste.svg/.png` | folha de teste: tamanhos reais, mono/reverso/acento sobre mesa e papel |

A iteração parou no **corte 0° + emenda 16**: os cortes inclinados (15°/25°) liam
como "cacos/rachadura" e perdiam o losango em 16 px; sem emenda, a marca ficava
estática. O registro da exploração fica no prato `exploracao-selo.png`.

## 5. Regenerar

```powershell
# da raiz do repo; VectorCraft instalado
$env:Path += ";C:\Program Files\VectorCraft"
node docs/02-architecture-design/conceito-v2/logo/build.mjs
# só alguns artefatos:
node docs/02-architecture-design/conceito-v2/logo/build.mjs --only final,mono,reverso,construcao,teste
# validar
node .zcode/skills/logo-design/scripts/logo-audit.mjs docs/02-architecture-design/conceito-v2/logo/selo-corte-v2.svg
node .zcode/skills/logo-design/scripts/logo-render.mjs docs/02-architecture-design/conceito-v2/logo/selo-corte-v2.svg --sizes 16,24,32,64,512
```

`build.mjs` grava os JSONL de comando em `.build/` (descartável) e chama
`vectorcraft-cli run` headless. Fonte da geometria: função `pieces()` no topo do
script. Processo da skill: `.zcode/skills/logo-design/SKILL.md`; decisão de
adoção: `docs/07-operations-marketing/LOGO-DESIGN-SKILL.md`.

*MEDIA Rate · conceito v2 · demonstração da skill logo-design · 2026*
