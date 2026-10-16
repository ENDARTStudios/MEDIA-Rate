# Conceito v2 — Home (proposta)

> **Superado pelo [conceito v3](./41-conceito-v3-home.md)** — que corrige três vícios deste (eyebrow chip,
> anel de score no lugar da constelação, e 3 cards iguais). Este fica como histórico da iteração.
>
> **É uma proposta, não uma substituição.** A linguagem visual atual do MEDIA Rate continua valendo até
> aprovação explícita (foi o que você pediu quando recusou o conceito anterior). Este documento descreve o
> conceito, mostra o mockup e diz **exatamente** o que mudaria — e o que **não** mudaria.
>
> **Artefatos** (gerados com o **FigCraft**, a ferramenta do projeto):
> `docs/02-architecture-design/figcraft/conceito-home/` — `conceito-home.jsonl` (o desenho como script de
> 240 comandos), `conceito-home.figcraft` (o arquivo nativo, abrível no FigCraft Desktop) e
> `home-conceito-v2.png` (1440×2000).

## 1. A tese em uma frase

**O MEDIA Rate não vende catálogo — vende decisão.** O score é a régua que responde "vale o meu tempo?",
então a home deve ser organizada por **decisão**, não por prateleira (gênero, lançamento, popularidade).

O conceito anterior era uma vitrine; este é uma **bússola**. Três movimentos:

1. **O número vira o selo da marca** — um anel grande, na cor da faixa, com a fonte ao lado;
2. **A escala vira um objeto visível** ("A régua") — o usuário entende de imediato o que 7, 8 e 9+
   significam, sem ler manual;
3. **A confiança vira seção, não rodapé** ("Como o score nasce" + "Sem nota de marketing").

## 2. O que muda em relação à home atual

| Bloco | Hoje | Conceito v2 | Por quê |
|---|---|---|---|
| **Hero** | título + CTAs de navegação | título + **busca como caminho primário** + o anel do score | a intenção de quem chega é "o que eu assisto?", não "navegar" |
| **A escala** | existe só no produto (ficha, rankings) | faixa horizontal com as 6 cores canônicas | transforma um detalhe de implementação em argumento de confiança |
| **Seções** | por tipo de mídia / destaque | por **intenção** ("Vale seu tempo", "Boa pedida", "Se você gosta de…") | a pergunta do usuário é decisão, não categoria |
| **Método** | fora da home (página própria) | uma faixa curta na home, ligada a `/methodology` | confiança precisa estar onde a decisão acontece |
| **Prova** | números de marketing | **nenhum número fixo** | a regra do D-583.4, agora como argumento de produto |

## 3. Fundamentos (nada novo inventado)

Tudo vem de `apps/web/src/lib/design-tokens.ts` e de `globals.css` — a lição do D-598 (um conceito anterior
nasceu com paleta inventada e virou premissa de outro projeto):

| Papel | Token | Uso no conceito |
|---|---|---|
| Fundo | `surface.bg` `#05050A` | tela inteira |
| Cartão | `surface.card` `#12121C` | busca, cartões, chips |
| Elevado | `surface.elevated` `#1B1B2C` | chips de faixa, contador de etapa |
| Borda | `surface.border` `#2A2A3D` | todos os contornos (1px, sem sombra pesada) |
| Acento | `accent.indigo` `#818CF8` | CTA, links, número da etapa |
| Texto | `fg.primary/secondary/muted` | hierarquia em 3 níveis, nunca mais |
| Faixas de score | `score.{9,8,7,6,5,low}` | **só onde o número significa algo** |
| Tipografia | `Space Grotesk` (títulos) · `Inter` (corpo) | 56/30/22/17/15/13 — escala curta e previsível |
| Movimento | `motion.presets` (entrada + `stagger` curto) | nada decorativo; `prefers-reduced-motion` respeitado |

**Regra de cor:** cor é **informação**, não enfeite. O indigo é a única cor de marca; as cores de faixa
aparecem **somente** onde expressam o score.

## 4. Acessibilidade e i18n (o conceito já nasce dentro das regras do produto)

- **Contraste AA** em todos os pares: `#F5F5F7`/`#05050A` (18,9:1) · `#A0A0B8`/`#05050A` (7,3:1) ·
  `#818CF8`/`#05050A` (6,0:1) · **cor de faixa nunca é o único canal** — a faixa tem rótulo textual
  ("Muito bom") além da cor;
- **Hierarquia** `h1` → `h2` → `h3`, sem pular nível (o hero é o único `h1`);
- **Busca** com o padrão combobox/listbox já implementado na paleta ⌘K (D-629) — o campo do hero é a mesma
  experiência, não uma segunda;
- **Nada de número inventado**: o mockup mostra **faixas** ("9+", "8", "afinidade") onde um valor seria
  fictício — em produção o valor vem do cálculo, com a fonte ao lado;
- **i18n**: texto curto e sem jargão; as mesmas chaves nos 3 locales; nenhuma promessa de disponibilidade;
- **Sem carrossel automático** e sem contador regressivo: a home não apressa o usuário.

## 5. Como reproduzir (o pipeline do FigCraft)

```powershell
# 1) tokens do produto dentro da ferramenta (script que já existia)
npm run design:figcraft

# 2) o desenho do conceito é um script de comandos — versionável e revisável em diff
node apps/web/scripts/figcraft-conceito-home.mjs   # gera conceito-home.jsonl (240 comandos)

# 3) construir e renderizar
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\conceito-home\conceito-home.jsonl `
    --out docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' render docs\02-architecture-design\figcraft\conceito-home\conceito-home.figcraft `
    -o docs\02-architecture-design\figcraft\conceito-home\home-conceito-v2.png --scale 1 --page "Home — conceito v2"
```

O desenho **não** é um binário opaco: é um `.jsonl` de comandos, então a revisão do conceito acontece em
**diff** (o mesmo motivo pelo qual a auditoria inteira foi feita sobre o código).

## 6. Duas iterações registradas

O mockup foi **olhado** depois de renderizado, e a primeira versão tinha dois defeitos reais:

1. os chips de fonte (TMDB/IMDb/Metacritic) **cruzavam a borda do anel** do score, sujando o selo da marca;
2. o artboard tinha **~500 px de vazio** no fim — o desenho parecia inacabado.

Ambos corrigidos na segunda renderização. Fica registrado porque é o mesmo princípio que guiou o programa:
**conferir o artefato, não a intenção** — foi assim que se descobriu que uma classe CSS usada no admin não
era gerada pelo Tailwind (D-625).

## 7. Se aprovado, o que vem depois

1. **Home** (este conceito) — a menor peça de código: hero, régua, três cartões, faixa de método;
2. **Ficha da obra** — o anel grande e o breakdown por fonte (o selo já existe no produto);
3. **Rankings** — a régua como navegação (filtrar por faixa, não por página);
4. **Catálogo** — manter a grade atual, mas com a faixa sempre visível no cartão.

Cada passo entra com os gates do projeto (`test:hydration`, `design:contrast`, pixel, i18n) e screenshot
1440/375 anexado — **nada** entra sem o gate verde.
