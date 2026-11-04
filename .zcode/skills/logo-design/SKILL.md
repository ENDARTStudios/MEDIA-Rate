---
name: logo-design
description: >
  Design de logo e marca do MEDIA Rate, do briefing ao master vetorial:
  descoberta e brief, word map, escolha do tipo de marca, conceitos, construção
  geométrica em malha de 8/45°, correções ópticas, cor e tipografia, testes
  (16 px, uma cor, reverso, silhueta, shelf), checkpoint de conceitos e kit de
  entrega (lockups, ícone, favicon, guidelines). Use SEMPRE que o pedido for
  criar, redesenhar, criticar ou comparar logo, símbolo, wordmark, monograma,
  ícone de app/favicon, grade de construção ou diretrizes de marca do MEDIA
  Rate — e antes de desenhar qualquer SVG de logo.
---

# Logo Design (MEDIA Rate)

Um logo é **identificador, não explicação**: uma ideia clara, construída com
craft, que sobrevive a 16 px, a uma cor, invertida e por décadas. O trabalho é
achar uma ideia, provar que ela funciona e apresentar para ser julgada nos
critérios certos — não para agradar no primeiro olhar.

Esta skill é a nossa versão do processo da skill pública
[`kaankiziltug/logo-design-skill`](https://github.com/kaankiziltug/logo-design-skill)
(MIT). A decisão completa — o que absorvemos, adaptamos e descartamos — está em
[`docs/07-operations-marketing/LOGO-DESIGN-SKILL.md`](../../../docs/07-operations-marketing/LOGO-DESIGN-SKILL.md).

## Ordem de leitura (antes de desenhar)

1. `references/marca-media-rate.md` — tokens v2, equity do logo v1, clichês que recusamos.
2. `references/processo.md` — as 7 fases, brief, word map, checkpoint, kit.
3. `references/construcao-svg.md` — SVG limpo, malha, correções ópticas, pipeline ArtCraft.
4. `references/checklist-teste.md` — o que testar antes de mostrar e antes de entregar.
5. `.zcode/skills/media-rate-ui-ux/references/anti-patterns.md` — D-065 (o logo não pode
   introduzir vício de design de IA que a UI proíbe).

## Modos

| O pedido é… | Modo | Comece por |
|---|---|---|
| novo logo / variação de marca | **Design** | `processo.md` §1 |
| opinião sobre logo existente | **Crítica** | `checklist-teste.md` (viram critérios) |
| modernizar/substituir o selo | **Redesign** | `processo.md` §8 (equity primeiro) |
| guidelines, sub-marcas, padrões | **Sistema** | `processo.md` §7 + `marca-media-rate.md` |
| favicon/ícone/variantes de um selo aprovado | **Assets** | `construcao-svg.md` §7 + kit |

Atalho: se o pedido já chega com contexto suficiente (marca, público, adjetivos),
pule as perguntas, **declare as suposições no brief** e vá para os conceitos. Se
o pedido é vago, faça no máximo 5 perguntas em uma mensagem só.

## Contrato MEDIA Rate (não negociável)

- **Cor:** uma cor de trabalho (`acento #E8543F`) e as seis faixas da régua só
  onde representam nota. O símbolo precisa funcionar em **uma cor**; nada de
  terceira cor, gradiente ou sombra para "salvar" a forma.
- **Superfície:** o produto é escuro (`mesa.0 #08080C`). "Preto primeiro" aqui é
  **luz sobre a mesa** (`tinta.1 #F2F0EB` no escuro) *e* tinta sobre papel
  (`papel.0 #F4F1EA` / `papel.tinta #14141C`) — teste as duas polaridades.
- **Tipografia:** Space Grotesk (OFL) é a fonte de marca; wordmark sempre em
  **contornos** (nunca `<text>` no master). Alternativa de sistema: Inter.
- **Equity:** o losango + play é o selo v1. Continuidade é opcional, mas se
  mexer, declare o que preserva (forma, cor, leitura em 16 px) e por quê.
- **D-065:** sem glassmorphism, sem aurora-blob, sem glow, sem cartão de cartão,
  sem emoji como ícone, sem texto `#FFFFFF` (use `#F2F0EB`).
- **Proibido copiar.** Nada de asset de terceiro no repo sem licença compatível;
  a biblioteca de 1.400 logos da skill externa é **material de estudo**, é
  trademark de terceiros e o MIT não a cobre.
- **`apps/web/src/**` fora de escopo sem PR.** Ícones/favicon/OG só entram no app
  por PR aprovado; nesta fase de conceito, escreva em
  `docs/02-architecture-design/conceito-v2/logo/**` (o material de
  `design-system/media-rate/logo/**` é de outra frente — leitura apenas).

## Processo (7 fases — detalhe em `references/processo.md`)

1. **Descoberta → brief** curto (nome exato, o que faz, público, 3–5 adjetivos,
   concorrentes, restrições, decisor) + suposições explícitas.
2. **Pesquisa e estratégia:** liste os clichês da categoria (e proíba-se deles),
   faça o **word map** (nome/oferta/adjetivos/promessa → substantivos, metáforas,
   opostos) e escolha 2+ tipos de marca.
3. **Conceitos:** 8–12 frases de uma linha, com twist próprio; pontue e construa
   só **os 3 mais fortes e diferentes**. Frase que serviria para o concorrente
   não é conceito.
4. **Construir em SVG, uma cor primeiro:** descreva a construção em palavras,
   canvas `viewBox="0 0 256 256"`, malha de 8 u, ângulos 45° exatos, buracos com
   `fill-rule="evenodd"`; salve `-v1`, `-v2`… em vez de sobrescrever.
5. **Testar e refinar (≥2 voltas):** `logo-audit.mjs` + `logo-render.mjs`, olhar
   os PNGs de 16/24/32 px, corrigir overshoot/irradiação/peso/centro óptico,
   checar leituras involuntárias. Detalhe em `checklist-teste.md`.
6. **Checkpoint:** uma imagem com os conceitos em cinza + uma linha por conceito +
   recomendação + oferta do kit; **parar e esperar** a escolha. Só pule o
   checkpoint se o pedido autorizar explicitamente ("entrega tudo").
7. **Kit (só para a direção escolhida):** refino final, cor, tipografia e lockups,
   variações (mono, reverso, símbolo, ícone/favicon), folha de teste e guidelines
   de uma página. No MEDIA Rate isso vai para `docs/.../conceito-v2/logo/` (ou
   `design-system/media-rate/logo/` quando for o selo oficial, com coordenação).

## Ferramentas (ArtCraft instalado + scripts da skill)

| Ferramenta | Uso |
|---|---|
| `vectorcraft-cli` | **o** vetor: `run` (comandos JSONL headless), `convert` (SVG↔PNG), `commands` (catálogo), `info` |
| `figcraft-cli` | quadros/folhas de apresentação, páginas, grids |
| `photocraft-cli` | mockups em bitmap, composição de imagem |
| `designcraft-cli` | composições de layout/apresentação |
| `scripts/logo-audit.mjs` | auditoria determinística do SVG (viewBox, texto, raster, cor, vão, ângulo, centro) |
| `scripts/logo-render.mjs` | render PNG nos tamanhos de teste via VectorCraft + verificação de dimensão |

Localização no Windows: `C:\Program Files\VectorCraft\vectorcraft-cli.exe` (idem
FigCraft/PhotoCraft/DesignCraft). Todos estão instalados; nesta sessão o
`vectorcraft-cli` foi o verificado de ponta a ponta (`run`/`convert`/`commands`) e
é o único obrigatório para logo vetorial. O `logo-render.mjs` acha o binário sozinho.

### Loop de prova (obrigatório antes de mostrar qualquer coisa)

```bash
# 1. estrutura: sem texto vivo, sem raster/efeito, cor chapada, vão que sobrevive a 16 px
node .zcode/skills/logo-design/scripts/logo-audit.mjs caminho/do/selo.svg

# 2. raster: 16/24/32/64/512 px, dimensão conferida no PNG
node .zcode/skills/logo-design/scripts/logo-render.mjs caminho/do/selo.svg --sizes 16,24,32,64,512

# 3. OLHAR os PNGs (tool de imagem), começando por 16 e 32 px
# 4. corrigir e repetir — duas voltas no mínimo
```

Se não deu para renderizar ou olhar, **diga isso**; não afirme teste que não rodou.

## Entrega (o que um kit nosso contém)

- Master SVG (uma cor, contornos, sem fonte/raster) + PNGs 512/1024.
- Mono (tinta), reverso (fino ~3% por irradiação) e leitura sobre mesa/papel.
- Lockups: horizontal, vertical e símbolo (relações travadas em `cap`).
- Ícone/favicon: símbolo em tile, 512/192/180/32/16.
- Folha de teste (tamanhos reais, uma cor, positivo/reverso) e grade de construção.
- Guidelines de uma página: área de proteção, tamanhos mínimos, cor, usos proibidos.
- Nomes previsíveis (`<marca>-<peça>-<variante>.<ext>`) e gerador determinístico
  (a geometria mora num `.mjs`; o SVG é saída, não fonte).

## Checklist final (copiar para o PR)

- [ ] Brief com adjetivos e suposições; conceitos em uma frase; os 3 mais fortes construídos.
- [ ] Checkpoint mostrado (ou autorização explícita para não parar).
- [ ] Master: vector puro, texto em contorno, strokes expandidos, sem filtro/raster, viewBox limpo.
- [ ] `logo-audit.mjs` sem FAIL (WARN triado e justificado).
- [ ] PNGs 16/24/32/64/512 olhados; ideia legível a 16 px (ou corte pequeno desenhado).
- [ ] Uma cor, reverso mais fino, greyscale separa por valor, contraste ≥ 3:1 sobre a mesa.
- [ ] Gradiente/terceira cor/glow: não existem. Símbolo não passaria a depender deles.
- [ ] Sem leitura involuntária (espelhar, girar 180°, ver minúsculo).
- [ ] Nada copiado da biblioteca de referência; sem asset de terceiro sem licença.
- [ ] Alerta de trademark: não damos clearance; recomendar busca profissional.

## Limites (honestidade)

- **Não garantimos registro de marca.** Recomende busca em base de marcas (INPI
  para o Brasil, USPTO/EUIPO quando fizer sentido) e busca reversa de imagem.
- **Licença de fonte** precisa permitir uso em logo; Space Grotesk é OFL e o uso
  em logo é permitido, mas o master sai em contorno de qualquer forma.
- **Demo não é decisão.** Artefato em `conceito-v2/logo/` é conceito; só vira
  identidade oficial com PR, aprovação e atualização do `design-system`.
- **Budget de teste:** o que não foi olhado não foi testado.

## Fonte e licença

Processo absorvido de `kaankiziltug/logo-design-skill` (commit `1ec463a`,
2026-11-03), licença **MIT** (© 2026 kaankiziltug) — texto e scripts podem ser
adaptados com atribuição. **Não copiamos** os arquivos nem os 1.432 SVGs de
`assets/library/` (trademarks de terceiros; o MIT não os cobre — ver
`TRADEMARKS.md` do repositório original). Nossos scripts e referências são
reimplementação no vocabulário do MEDIA Rate.

