# Logo Design Skill — decisão de adoção (skill externa → skill do MEDIA Rate)

> **Status:** adotada como `.zcode/skills/logo-design/` (conceito v2).
> **Frente:** `feat/conceito-v2-multiart` · worktree
> `.agents/worktrees/feat/conceito-v2-multiart`.
> **Fonte analisada:** [`kaankiziltug/logo-design-skill`](https://github.com/kaankiziltug/logo-design-skill)
> @ `1ec463a` (2026-11-03) — **MIT** (© 2026 kaankiziltug).
> **Não é decisão de marca:** o artefato demo é conceito; virar identidade oficial
> exige PR + aprovação do Operador (D-457/T459).

---

## 1. O que foi analisado

Clone raso em `%TEMP%\logo-design-skill` (fora do repositório). Leitura em
detalhe de `SKILL.md`, de `references/processo.md`, `svg-construction.md`,
`testing-checklist.md`, `visual-techniques.md`, `discovery-brief.md`,
`mark-types.md` (mapa das demais pelo índice do SKILL.md), do template de
guidelines e de `README`/`LICENSE`/`TRADEMARKS.md`. Os 10 scripts Python foram
**inventariados pela documentação** (nenhum executado); a licença dos assets foi
checada antes de qualquer ideia de reuso.

O repositório é uma *Agent Skill* (formato aberto, só Markdown + Python sem
dependências) que transforma o agente em designer de identidade: processo de
briefing → conceitos → construção vetorial → testes → apresentação → kit.

### Licença

| Parte | Licença | Uso |
|---|---|---|
| Texto, scripts, templates, catálogo | **MIT** (© 2026 kaankiziltug) | pode adaptar com atribuição — foi o que fizemos |
| `assets/library/svg/` (1.432 logos) | **trademarks de terceiros; o MIT NÃO cobre** (`TRADEMARKS.md`) | só estudo — **nada copiado para cá** |
| Imagens de exemplo (`docs/images/`) | marcas fictícias do autor | não reusadas |

Consequência prática: absorvemos **processo e critério**, não arquivos.

## 2. O que a skill prescreve (síntese)

- **Modos:** Design, Crítica, Redesign, Sistema, Assets.
- **7 fases:** descoberta/brief → pesquisa e estratégia (clichês, word map,
  tipos de marca) → 8–12 conceitos de uma linha (construir 3) → SVG uma cor
  primeiro → testar/refinar em loop → **checkpoint** (concept sheet cinza +
  recomendação + oferta de kit) → kit (cor, tipografia, lockups, board de
  mockups, ícone/favicon, guidelines).
- **12 princípios:** identificar sem explicar; simples mas não chato; relevante
  sem literal; distinto; memorável; uma ideia; 16 px e 16 m; atemporal; fundação
  de sistema; craft; firmeza sem teimosia; quem/o quê/por quê primeiro.
- **Craft:** malha e ângulos inteiros, poucos anchors, correções ópticas
  (overshoot, bone effect, irradiação, horizontais mais finas, centro óptico),
  buracos com `evenodd`, letter test, junction check, peer test, shelf test.
- **Artefatos:** concept sheet (PNG), preview HTML de testes, board de
  apresentação com mockups por indústria, variantes exportadas (black/white/
  mono/square/favicon/app-icon + webmanifest), guidelines em Markdown.
- **Ferramentas próprias:** 9 scripts Python (`svg_audit`, `preview_sheet`,
  `concept_sheet`, `render_png`, `export_variants`, `presentation_board`,
  `search_library`, `build_catalog`, `svglib`) + biblioteca de 1.432 SVGs.
- **Honestidade explícita:** não há clearance de marca; licença de fonte importa;
  não afirmar teste que não rodou.

### Genérico × opinião do autor

| Genérico (método) | Opinião do autor (contexto dele) |
|---|---|
| brief, word map, conceitos em uma frase, tipos de marca | "sempre 3 conceitos, sempre parar no checkpoint" |
| correções ópticas e testes de escala/cor/silhueta | biblioteca de 1.432 logos como etapa de pesquisa |
| master limpo (sem texto/raster/filtro), contornos | scripts Python e dependência de Chrome/qlmanage |
| mockups no contexto do negócio, guidelines | boards "industry-specific" prontos, catálogo SVG |
| assets/trademark são de terceiros | tom de agência/EN e exemplos fictícios de 28 marcas |

## 3. O que absorvemos

| Do original | Onde vive no repo |
|---|---|
| Processo em fases com portão de checkpoint | `.zcode/skills/logo-design/references/processo.md` |
| Testes de 16 px / uma cor / reverso / silhueta / shelf / letra / junção | `references/checklist-teste.md` |
| Construção geométrica, espaço negativo, correções ópticas | `references/construcao-svg.md` |
| Regra de master sem fonte/raster/efeito | `references/construcao-svg.md` §8 + `logo-audit.mjs` |
| Honestidade (trademark, licença de fonte, não fingir teste) | `SKILL.md` §Limites |
| Ideia de auditar o SVG e renderizar para olhar | `scripts/logo-audit.mjs` + `scripts/logo-render.mjs` |
| Formato de apresentação no checkpoint | `references/processo.md` §7 |

## 4. O que adaptamos (e por quê)

| Original | MEDIA Rate | Por quê |
|---|---|---|
| Inglês, tom de agência | **pt-BR**, tom do repo (direto, com gates) | idioma de trabalho e das skills existentes |
| "Black first" (preto no branco) | **luz sobre mesa** (`tinta.1` em `mesa.0`) **e** tinta sobre papel | o produto é dark; testar as duas polaridades evita símbolo que só funciona no claro |
| Paleta livre, 1–2 cores | **acento `#E8543F`** + as 6 faixas só onde há nota | tokens v2 e D-065 são travados |
| Board de mockups "por indústria" | mockups do negócio (ficha, header, tile, cartão social) **gerados por nós** | sem assets de terceiros/licença |
| Scripts Python | `logo-audit.mjs` / `logo-render.mjs` (Node, sem deps) | toolchain do repo é npm/Node; e reimplementar mantém o vocabulário |
| Biblioteca de 1.432 logos como referência | **proibida** de copiar; repertório vem do design system + busca própria | trademark; risco jurídico e de plágio |
| "Sempre pare no checkpoint" | checkpoint por padrão; **pular é possível quando o pedido autoriza** ("entrega tudo") | o fluxo real do repo às vezes é entrega completa aprovada de antemão |
| Renderização por Chrome/qlmanage | **VectorCraft** (`vectorcraft-cli convert`) | ArtCraft instalado; determinístico e headless |
| Guideline em template `.md` do autor | guidelines de 1 página no nosso formato | consistência com `design-system/media-rate` |

## 5. O que descartamos (e por quê)

| Item | Motivo |
|---|---|
| `assets/library/svg/` (1.432 logos) | trademarks de terceiros; MIT não cobre — não entra no repo |
| `docs/images/` (boards/exemplos) | material do autor, sem licença para reuso |
| 7 scripts Python (`svg_audit`, `preview_sheet`, `concept_sheet`, `export_variants`, `presentation_board`, `render_png`, `search_library`) | reimplementados no essencial por `logo-audit.mjs`/`logo-render.mjs`/`build.mjs`; rodar script externo sem auditoria não vale o risco |
| `build_catalog.py`/`svglib.py` | só existem para manter a biblioteca, que não adotamos |
| Etapa obrigatória de buscar na biblioteca | depende de asset não licenciado; substituída por repertório próprio + busca de imagem |
| Mockups genéricos por indústria | exigiriam assets de terceiros; mockups próprios bastam para o checkpoint |
| Pausa obrigatória e inflexível | vira fricção quando o pedido já define escopo; registramos a decisão no relatório |
| Framing "você é um designer sênior de agência" | o repo usa instruções operacionais, não persona |

## 6. Como usar

```bash
# skill (ler antes de desenhar)
.zcode/skills/logo-design/SKILL.md
.zcode/skills/logo-design/references/{marca-media-rate,processo,construcao-svg,checklist-teste}.md

# validar um master
node .zcode/skills/logo-design/scripts/logo-audit.mjs <logo>.svg
node .zcode/skills/logo-design/scripts/logo-render.mjs <logo>.svg --sizes 16,24,32,64,512

# regenerar o artefato de demonstração (VectorCraft headless)
node docs/02-architecture-design/conceito-v2/logo/build.mjs
```

Gates de UI (`npm run design:detect`, `design:contrast`, `design:hex`) continuam
valendo **quando** o asset for para o app — o que exige PR; nesta fase, nada entra
em `apps/web/src/**`.

## 7. Prova: o artefato de demonstração

Saída em [`docs/02-architecture-design/conceito-v2/logo/`](../02-architecture-design/conceito-v2/logo/README.md):
selo v2 "corte" (variação do losango do v1), construído por comandos do
VectorCraft, com SVG e PNG do mesmo documento.

| Verificação | Resultado |
|---|---|
| SVG master `selo-corte-v2.svg` | `viewBox="0 0 256 256"`, 2 `polygon` chapados, `#e8543f`, **0** `<text>`, **0** `font-family`, **0** `currentColor` |
| Outros 5 SVGs (mono, reverso, construção, teste, exploração) | todos com viewBox, sem texto/fonte/currentColor |
| `logo-audit.mjs` nos 3 masters | **0 FAIL · 0 WARN** |
| PNG do master (512×512) | aberto e conferido (`read_image`) |
| PNG da grade de construção (1280×1280) | aberto e conferido: marca sólida, malha 8 u, losango-base 45°, vão 16 u, emenda ±16 u, vértices, rótulos em contorno |
| PNG da folha de teste (1240×540) | aberto e conferido: 16/24/32/48/64/96/128 px reais, mono sobre papel, acento sobre mesa/papel — a ideia lê a 16 px |
| Escada de render | 16, 24, 32, 64, 512 px gerados por `logo-render.mjs`, dimensões conferidas no IHDR do PNG |
| Glifos | rótulos exportados com `svg.outlineText` → paths; nada de fonte viva |

Geometria (documentada no README do artefato): losango-base 45° de 192 × 192
(`D = 96`), vão de 16 u (= 1 px a 16 px), emenda de ±16 u ao longo do corte;
bbox final 224 × 208 centrada em (128,128); reverso 3% mais fino (irradiação).

## 8. Riscos e limites

- **Não substitui registro de marca.** Recomendar busca (INPI/USPTO/EUIPO) e
  imagem reversa; a skill original também não dá clearance.
- **Demo é conceito, não aprovação.** O selo v2 "corte" não foi escolhido pelo
  Operador; o oficial continua `design-system/media-rate/logo/**` (v1) e
  `Logo.tsx`.
- **Duplicidade de frente:** `design-system/media-rate/logo/**` é de outro
  agente; esta frente só lê. Consolidar exige PR único.
- **Licença de assets:** qualquer mockup/foto futura precisa de licença
  compatível (ou ser gerada por nós, como aqui).
- **Ledger de decisão:** esta adoção não cria número de decisão em `DECISOES.md`;
  se o selo v2 for adotado, aí sim vira decisão formal com PR.

## 9. Referências

- Repositório original: <https://github.com/kaankiziltug/logo-design-skill> (MIT).
- `TRADEMARKS.md` do original (biblioteca fora do MIT).
- `docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md` (tokens e direção v2).
- `design-system/media-rate/logo/README.md` (equity do selo v1).
- `.zcode/skills/media-rate-ui-ux/references/anti-patterns.md` (D-065).
- `AGENTS.md` (GRAFT-FIRST, PR/CI, i18n, segredos).
