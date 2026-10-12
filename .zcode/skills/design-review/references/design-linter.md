# Linter de design (Impeccable detector)

Detector **determinístico** de anti-padrões de UI (59 regras: "AI tells",
acessibilidade, contraste, tipografia, layout, movimento, alvos de toque). Não usa
LLM, não usa API key e não entra no bundle. Fonte: https://github.com/pbakaus/impeccable
(Apache-2.0 © 2025 Paul Bakaus) — instalado como devDependency **fixa**
(`impeccable@4.5.2`) na raiz.

## Como rodar

```bash
npm run design:detect            # resumo legível de apps/web/src (exit 2 = achados)
npm run design:detect:json       # JSON cru para CI/tooling
node apps/web/scripts/design-detect.mjs src/components   # alvo específico
```

O wrapper `apps/web/scripts/design-detect.mjs` fixa a versão, desliga telemetria
(`DO_NOT_TRACK=1` / `IMPECCABLE_NO_TELEMETRY=1`), resume por regra e preserva os
exit codes do detector: **0** limpo · **2** com achados · **1** falha operacional.

Scan de página **renderizada** (usa um Chrome/Edge instalado; nunca em produção
com usuários reais). É o modo mais valioso: mede o que está pintado (contraste
por pixel, comprimento de linha real, hierarquia de headings, padrões de DOM) e
pega o que a leitura do fonte não vê:

```bash
node node_modules/impeccable/cli/bin/cli.js detect http://localhost:3000/pt-BR --json
```

Baseline medido (T209, dev server local, 3 rotas):

| Rota | Achados | Composição |
|---|---|---|
| `/pt-BR` | 56 | `low-contrast` 39 · `line-length` 14 · `gradient-text` 1 · `hero-eyebrow-chip` 1 · `overused-font` 1 |
| `/pt-BR/catalog` | 21 | `low-contrast` 19 · `gradient-text` 1 · `overused-font` 1 |
| `/pt-BR/pricing` | 13 | `low-contrast` 10 · `gradient-text` 1 · `overused-font` 1 · `skipped-heading` 1 |

Leitura do baseline (prioridade por impacto):

1. **`low-contrast` (68 nós)** — maioria é **score/número sobre pôster** nos
   carrosséis (`#carousel-list-*`): a razão real depende do pixel da capa
   (`1.1:1` a `1.7:1` medidos). Correção: scrim/gradiente atrás do badge ou
   fundo sólido do token. O resto é o débito conhecido `#6B7280`/`#6B6B85`.
2. **`line-length` (14, só na home)** — parágrafos de `HomeContentSections`
   (`p.text-sm.text-[#6B7280]`) com 117–124 caracteres por linha; somar
   `max-w-[70ch]`. Note que essas mesmas linhas têm o problema de contraste
   acima — vale corrigir as duas coisas na mesma passada.
3. **`hero-eyebrow-chip` (1)** — era o pill de marca do hero; **corrigido em
   T209** (removido). Regra e guarda em `media-rate-ui-ux/references/anti-patterns.md`.
4. **`skipped-heading` (1, pricing)** — hierarquia de heading furada; corrigir a
   ordem h1→h2→h3.
5. **`gradient-text` (3 rotas)** e **`overused-font`** — ver tabela de triagem abaixo.

## Política de triagem (não é gate de merge)

O detector é **advisory**. Ele conhece boas práticas genéricas, não o contrato da
marca: parte dos achados é decisão consciente do MEDIA Rate. Regra:

1. Achado é **real** → vira tarefa (corrigir ou aceitar com justificativa em
   `DECISOES.md`).
2. Achado é **falso positivo** ou **decisão travada** → entra em
   `.impeccable/config.json` via `npx impeccable ignores ...` **com `--reason`**.
3. Nunca promover a gate de CI sem reconciliar com D-065 e com o
   `contrast-audit` — dois gates de design que se contradizem paralisam o PR.

Gestão dos ignores:

```bash
npx impeccable ignores list
npx impeccable ignores add-rule <regra>
npx impeccable ignores add-value <regra> "*" --file "<glob>" --reason "<por quê>"
```

## Estado atual (baseline do repo)

`npm run design:detect` em `apps/web/src`: **5 achados** (2 regras), ambos
pré-existentes ao redesenho da hero e nenhum no hero novo:

| Regra | Onde | Situação |
|---|---|---|
| `gradient-text` | `components/AuthForm.tsx:117`, `:319`, `ui/gradient-menu.tsx:18`, `ui/hover-text-effect.tsx:15` | **aberto** — texto com `bg-clip-text` + gradiente em links/efeitos. É "AI tell" e o gradiente em texto pode reduzir previsibilidade de contraste. Decidir por tela: trocar por cor sólida do token (recomendado em `AuthForm`, que é fluxo de conversão) ou manter como micro-interação deliberada (com justificativa). |
| `overused-font` | `dashboard/DashboardOverview.tsx:635` | **aberto** — `font-family:Arial` dentro do HTML gerado para a janela de impressão do relatório. Trocar por `Inter`/`Georgia` (ou aceitar: janela de impressão isolada). |
| `low-contrast` (pixel) | carrosséis (`#carousel-list-*`), `#6B7280`/`#6B6B85` | **aberto** — 68 nós no DOM renderizado das 3 rotas medidas. Prioridade 1: score sobre pôster (scrim). Prioridade 2: sweep de muted (`#6B6B85`→`#80809B`, 56 ocorrências) e `#6B7280`→`#9CA3AF`. |
| `line-length` | `HomeContentSections` (`p.text-sm`) | **aberto** — 117–124 caracteres/linha; somar `max-w-[70ch]`. |
| `skipped-heading` | `/pricing` | **aberto** — ordem h1→h2→h3 furada. |
| `hero-eyebrow-chip` | hero da home | **corrigido em T209** — pill de marca removido; guarda em `test/hero-constellation.spec.tsx`. |

Aceitos por decisão (com motivo registrado em `.impeccable/config.json`):

| Regra | Escopo | Por quê |
|---|---|---|
| `codex-grid-background` | `app/globals.css:271` | Grade 40 px faz parte do `LayeredBackground` (D-066) — identidade visual do produto, não enfeite decorativo. |
| `broken-image` | `components/MediaDetailClient.tsx` | T031: `<img>` estático com `srcSet` própria (o `next/image` não aceita `srcSet` customizado); o `src` sempre vem do guard `media.posterUrl`. Falso positivo. |
| `overused-font` (Space Grotesk/Inter) | todo o app (modo DOM) | Fontes são decisão travada do design system (V3 §12/D-065). O achado de `Arial` na janela de impressão continua **aberto** (não há ignore para ele). |

## Regras que valem revisar sempre

- **Contraste/qualidade**: o detector é uma segunda opinião — o gate oficial de
  contraste é `.zcode/skills/design-review/scripts/contrast-audit.mjs` e o de
  a11y é `apps/web/e2e/a11y.spec.ts` (axe AA, `E2E_FULL=1`).
- **Alvos de toque, ordem de headings, comprimento de linha, padding apertado**:
  achados recorrentes em telas de produto (dashboard/biblioteca).
