# Construção do SVG e pipeline ArtCraft

> O master é geometria pura: uma cor chapada, contornos, sem dependência de
> fonte, raster, filtro ou efeito. A geometria mora num gerador determinístico;
> o SVG é saída, não fonte editada à mão.

## 1. Convenções do arquivo

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <title>MEDIA Rate — selo v2</title>
  <g id="symbol">
    <polygon points="…" fill="#e8543f"/>
  </g>
</svg>
```

- **viewBox primeiro**, canvas inteiro limpo. Símbolo: `0 0 256 256`; lockup
  mantém a altura 256 e a largura acompanha.
- **Folga** de ~4–12% do canvas; a área de proteção é regra separada (½ × S).
- **Coordenadas** inteiras ou com 1–2 casas. `127.99999` esconde desalinhamento.
- **`<title>`** para nome acessível; grupos com id significativo.
- **Um arquivo por variante**, nome previsível: `<marca>-<peça>-<variante>.svg`.

## 2. Estratégia de construção

- Descreva em palavras antes do código: primitivos, raios, ângulos, unidade de
  malha e **relações** (não medidas soltas).
- Escolha uma **unidade** (8 ou 16 no canvas 256) e encaixe medidas-chave nela —
  griding depois fica trivial.
- Reaproveite raios e ângulos; a consistência é o que parece "feito por gente".
- Prefira `polygon`/`rect`/`circle` para primitivos; `path` para o contorno
  final. Arcos `A r r` para geometria circular (não Bézier que "quase" imita).
- 45° é 45°: desvios de 1–2° leem como erro. O audit sinaliza ângulo não inteiro.

## 3. Marca cortada / deslocada (a geometria do selo v2)

O artefato demo usa esta receita, que é o padrão para marcas "cortadas":

```txt
losango: |x−CX| + |y−CY| = D, com CX=CY=128 e D=96 (192 × 192, 45° exato)
corte: reta pelo centro num ângulo `angle` (0 = horizontal)
  · cada metade se afasta `gap/2` na perpendicular ao corte → vão `gap`
  · cada metade desliza `shift` ao longo do corte, em sentidos opostos
resultado (angle 0, gap 16, shift 16): bbox 224 × 208, centro (128,128)
```

Geometria exata do demo (256 u):

```txt
metade de cima: (112,24) (208,120) (16,120)
metade de baixo: (48,136) (240,136) (144,232)
```

O vão de 16 u = **1 px a 16 px** — é o mínimo aceitável. Abaixo disso, desenhe
uma **versão pequena** com o vão maior (a marca perde o corte a 16 px).

## 4. Espaço negativo, buracos e emendas

- Buraco de verdade: um path com dois subpaths e `fill-rule="evenodd"` (ou
  sentidos opostos no `nonzero`).
- Onde duas formas da mesma cor se tocam, una num path só — evita costura de
  1 px na impressão.
- Evite `<mask>`/`<clipPath>` no master: bake a geometria. (O audit avisa.)
- Vão entre formas separadas: ≥ 1/32 da largura da marca para sobreviver a
  16 px. O audit **reprova** vão abaixo disso.

## 5. Strokes e tipografia

- Explore com stroke; no master **expanda para contorno** (ou construa o
  contorno direto). Stroke restante é avisado pelo audit.
- **Nunca `<text>` vivo no master.** Space Grotesk é OFL, mas fonte instalada
  não existe na máquina do outro. No VectorCraft, exporte com contorno:
  `"svg": { "outlineText": true }` (ver §6) e confirme que o SVG final não tem
  `<text>` nem `font-family`.
- **`currentColor`** só é aceitável em variante de UI, nunca no master de
  entrega (cor indefinida fora do CSS). O audit reprova.

## 6. Pipeline ArtCraft (determinístico)

Os CLIs ficam em `C:\Program Files\VectorCraft\` (idem `FigCraft`, `PhotoCraft`,
`DesignCraft`). Papéis:

| CLI | Papel | Comandos úteis |
|---|---|---|
| `vectorcraft-cli` | documento vetorial (o logo) | `commands`, `run --commands`, `convert`, `info` |
| `figcraft-cli` | quadros/páginas de apresentação | `run`, `render` |
| `photocraft-cli` | mockup bitmap/composição | `run`, `export` |
| `designcraft-cli` | composição de layout/board | `run`, `export` |

Fluxo canônico (o mesmo do `build.mjs` do demo):

1. Um gerador Node calcula a geometria e emite **JSONL de comandos**:
   `file.new` → `path.create`/`shape.*` → `paint.setFill`/`stroke.set` → `document.export`.
2. `vectorcraft-cli run --commands passos.jsonl` (headless, sem GUI).
3. Exporta SVG **com texto em contorno** e PNGs nas escalas necessárias.

Exemplo mínimo verificado:

```jsonl
{"command":"file.new","params":{"width":256,"height":256,"units":"Pixels","name":"Selo v2","title":"MEDIA Rate — selo v2"}}
{"command":"select.none"}
{"command":"paint.setFill","params":{"color":"#E8543F"}}
{"command":"paint.setStroke","params":{"none":true}}
{"command":"path.create","params":{"d":"M112 24 L208 120 L16 120 Z","closed":true}}
{"command":"document.export","params":{"path":"C:\\tmp\\selo.svg","format":"svg","svg":{"outlineText":true}}}
{"command":"document.export","params":{"path":"C:\\tmp\\selo.png","format":"png","scale":2,"background":"transparent"}}
```

Observações que economizam tempo:

- **`paint.*` com nada selecionado define o padrão** dos próximos objetos (novo
  objeto herda). Por isso `select.none` antes de pintar cada lote.
- Objetos novos nascem **branco com stroke preto** — sempre defina fill e
  `paint.setStroke {none:true}` antes de criar o contorno.
- `text.create` usa fontes do sistema/app (Space Grotesk está disponível);
  `svg.outlineText` converte tudo em path no export.
- Export SVG inclui o fundo da prancheta por padrão (`includeArtboardFill`):
  para master transparente, **não** defina cor da prancheta.
- `convert IN OUT --scale N` rasteriza sem GUI; `--scale` = pixels por ponto.
- `commands` imprime o catálogo completo em JSON (consulte antes de inventar
  parâmetro).
- **Nada de aleatoriedade**: mesmo gerador → mesmo arquivo. Para mockups
  (`photocraft`) a regra é a mesma: assets próprios ou licença compatível.

> Alternativa no repositório: `logo-render.mjs` já embrulha `convert` com
> verificação de dimensão do PNG. Para regenerar o demo:
> `node docs/02-architecture-design/conceito-v2/logo/build.mjs`.

## 7. Variantes e ícone/favicon

Gere a partir da **mesma geometria** (não redesenhe):

- `*-mono-tinta.svg` (papel.tinta sobre claro), `*-reverso.svg` (fino ~3%),
  `*-color.svg` (acento).
- `*-symbol.svg`; lockups horizontal/vertical com relações travadas.
- Ícone/favicon: símbolo em tile com 52–58% do lado; PNG 512/192/180/32/16.
- A 16 px, se o corte/vão desaparecer, use a **versão pequena** simplificada e
  documente o tamanho mínimo (px digital / mm impresso).

## 8. O que evitar no master

| Evitar | Por quê | Em vez disso |
|---|---|---|
| `<text>` | fonte ausente muda tudo | contornos |
| `<image>`/PNG embutido | não é vetor | paths |
| filtro/sombra/glow | renderiza diferente em cada saída | forma chapada |
| máscaras/clips | incompatível com corte/bordado | geometria baked |
| gradiente | perde vigor em CMYK e a 16 px | cor chapada + versão alternativa |
| > 3 cores / detalhe < 1/64 | má reprodução, perde a 16 px | fundir/remover |
| ângulo "quase" | lê como erro | ângulo inteiro |
| `currentColor` no master | cor indefinida | hex da paleta |
| metadado do editor / precisão 6 casas | peso e ruído | limpar no export |

## 9. Validação (antes de mostrar)

```bash
node .zcode/skills/logo-design/scripts/logo-audit.mjs <selo>.svg
node .zcode/skills/logo-design/scripts/logo-render.mjs <selo>.svg --sizes 16,24,32,64,512
```

O audit é **estrutural**; o teste de verdade é olhar o PNG em 16 e 32 px e
passar o `checklist-teste.md`. Se o logo for para `apps/web`, aí valem também os
gates de UI (`npm run design:hex`, `design:contrast`, `design:detect`) — mas
asset de logo não entra em `apps/web/src` sem PR aprovado.
