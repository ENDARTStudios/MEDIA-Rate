# Reestruturação do site — estado e continuação

> Documento de continuidade. Quem retomar o trabalho começa por aqui; ele existe porque
> erros de medição custaram rodadas inteiras e não devem ser repetidos.

## Estado (branch `feat/reestrutura-site`)

| Etapa | Entrega | Verificação |
|---|---|---|
| Bot v1 | mede `page.tsx` | superado pelo v2 |
| Casca de página | `PageShell` + `SectionBlock` + `PageContainer`/`PageTitle` | `tsc` 0 · `eslint` 0 · `detect` 0 |
| Rodapé por intenção | Produto / Conteúdo / Legal / Social, 5 colunas | idem |
| **Bot v2** | mede **página + cadeia de componentes** (`--depth`, `--json`, `--all`); ignora comentários; rotas que só redirecionam saem das contas | `npm run audit:routes` |
| **Bot v3** | `scripts/bots/tokenize-hex.mjs` — troca literal por token com mapa explícito e audita o que sobrou | `--write`, `--rotas=`, `--json` |
| **Cluster descoberta** | `/discover`, `/compare`, `/catalog`, `/discoveries` | gates por cluster |
| **Cluster conta** | `/biblioteca`, `/watchlist`, `/profile`, `/settings`, `/historico`, `/user/data`, `/verificar-email`, `/billing/success` | idem |
| **Cluster institucional** | `/about`, `/methodology`, `/sources`, `/faq`, `/seguranca`, `/assistant`, `/welcome`, `/feedback`, `/design-system`, `/listas`, `/listas/[slug]` | idem |
| **Clusters legal + detalhe + home** | legal (5 rotas), detalhe (`/media/[slug]`, `/user/[id]`, `/pricing`, `/checkout/[plan]`, `/login`, `/register`) e a home | idem |
| **Faixa final do rodapé** | idioma (`LocaleSwitcher` com `placement="top"`) · status (link real) · identificação legal | spec `footer-faixa-final` |
| **`/status`** | sonda `GET /health` na hora (`force-dynamic`, timeout 3 s) — nunca promete status fixo | `tsc` · spec |

### Progresso numérico (bot v2, rotas públicas)

| Métrica | Início | Agora |
|---|---|---|
| Hex cru | 799 | **1** (dourado `#D4AF37` do confete — sem token de ouro) |
| Rotas com ZERO token do conceito | 1 | **0** |
| Rotas sem `<h1>` | 2 (falsos, eram redirect) | **0** |
| Rotas com `rounded-2xl` (D-065) | 3 | **1** (`/top`, banner deliberado) |
| Literais fora de token no app (`design:hex`) | 139 ocorrências / 35 valores | **63 / 26** |

### Tokens criados nesta fase

| Token | Valor | Por quê |
|---|---|---|
| `accent.indigo.hover` | `#A5B4FC` | par de hover do índigo, era hex em ~20 links/CTAs |
| `brand.hover` | `#C31442` | hover dos CTAs de marca |
| `fg.disabled` | `#4A4A60` | estado desabilitado (abaixo de AA de propósito) |
| `surface.border-hover` | `#3A3A52` | borda no hover, era hex em 6 componentes |
| `ink` | `#0F172A` | tinta sobre fundo de `score.*` (não tem foreground próprio) |

Consolidações (valor antigo → token): `#1C1C2E` e `#11111E` → `surface-card`/`surface-elevated`;
`#09090F`, `#05050A`, `#0D0D14`, `#0D0D1A` → `surface-bg`; `#151524`, `#18152D`, `#1A1A28` →
`surface-elevated`; `#12121F` → `surface-card`; `#8B7CFF` → `accent-indigo`; `#A69CFF` →
`accent-violet`; `#EF4444` → `destructive`; `#2A2A3E` → `surface-border` (D-586 quando aplicável).

## Armadilhas que já foram pagas (não repita)

1. **`[locale]` em caminho no PowerShell** — `[locale]` é **classe de caracteres**;
   `Get-Content`/`Select-String` falham em silêncio. Use `-LiteralPath` ou Node.
2. **`[locale]` também engana o `eslint`** — `eslint "apps/web/src/app/[locale]/x.tsx"` linta
   **zero arquivo e sai 0**. Escape `[[]locale[]]` (ou rode de dentro do diretório) e confirme
   com `--format json` contando arquivos. `git add` aceita o caminho literal, mas confira com
   `git show --stat`.
3. **Script/boilerplate via here-string do PowerShell** — regex com `/` se corrompe na
   travessia. **Use a ferramenta de escrita de arquivo.**
4. **Verificar HTML cru para i18n** — o Next serializa todas as mensagens no HTML. Para "está
   na tela?" meça o **DOM**.
5. **Medir comentário como tela** — o bot v2 ignora comentários (docstring que citava `<h1>` e
   `rounded-2xl` inflava a rota). Se for mexer no bot, preserve esse strip.
6. **`PageShell` não pode renderizar `<main>`** — o landmark é do `[locale]/layout.tsx`
   (`<main id="main">`, alvo do skip-link). A raiz do shell é uma `div`.
7. **Chave camelCase no `tailwind.config.ts` gera classe morta** — `surface.borderHover`
   produzia `border-surface-borderHover` (ninguém usa), não `border-surface-border-hover`.
   Use chave kebab. **Nenhum gate pega isso**: verifique compilando o CSS
   (`@tailwindcss/postcss` + `globals.css`) e procurando a classe.
8. **O bot de tokenização só mexe em `-[#RRGGBB]`** (valor arbitrário de classe). Cor em
   `style={{…}}`, `text-white` e hex em atributo SVG aparecem no relatório como sobra e são
   decisão humana.

## Como continuar (receita)

```bash
node scripts/bots/audit-routes.mjs                 # mede antes
node scripts/bots/tokenize-hex.mjs --write --rotas=/rota,/outra
node scripts/bots/tokenize-hex.mjs                 # lista as sobras
```

Depois: `tsc` 0 · `eslint` nos arquivos alterados (com `[[]locale[]]`) · `design:detect` 0 ·
`design:contrast` · `design:hex` · `npm test --workspace apps/web` · `audit:routes` (número
antes/depois) · captura 375/1024/1440 quando houver mudança visual.

## Decisões tomadas no caminho (não reabrir sem motivo)

- **`/top` mantém o `rounded-2xl`**: banner do Nº 1 (imagem de fundo, raio 16). O D-065 proíbe
  raio grande **em bloco**; um elemento deliberado é permitido. O bot sinaliza: falso positivo.
- **Cada rota/cluster é um commit**, não um commit gigante: revisão possível e `git bisect` útil.
- **Fluxos centrados** (`/login`, `/register`, `/checkout/[plan]`, `/billing/success`,
  `/welcome`, `/verificar-email`) mantêm composição centrada própria, mas com a mesma escala de
  título e os mesmos tokens — PageShell é para páginas de conteúdo.
- **`scoreColor()` não serve para escalas 0-100 com limiares próprios** (ex.: comparador com
  70/40): tem limiares 9/8/7 na escala 0-10. Use `colors.score.*`.
- **Status do rodapé aponta para `/status`**, que mede na hora. Selo verde fixo seria promessa
  inventada (regra do `home-truthfulness`).

## Evidência visual (375/768/1024/1440)

`node .zcode/skills/visual-qa/scripts/visual-qa.mjs --base-url http://127.0.0.1:3000 --path /<rota>`
rodou em pt-BR sobre 10 rotas migradas. Dois achados:

1. **Overflow horizontal de 865 px em TODA rota a 768 px** — causa medida no DOM: a barra
   desktop da `Navbar` (`hidden md:flex`) tem 773 px de conteúdo e aparecia já em 768 px. Passou
   a entrar em `lg` (menu hambúrguer abaixo disso). Depois da correção: `/`, `/about` e `/status`
   fecham com "Visual QA OK — sem overflow, H1 presente e CTA acima da dobra".
2. **`h1=AUSENTE` nas rotas que não são a home é falso positivo do harness**: ele procura
   `#hero-title`, que só existe na hero. O h1 do `PageShell` está no DOM (o bot v2 conta
   `PageShell`/`PageTitle` justamente por isso).

Artefatos em `.dsh-artifacts/visual-qa/` (não versionado).



## Aberto (fora do escopo desta fase)

- **Varredura do hex no admin/dashboard** — `design:hex` ainda lista 63 ocorrências (26 valores,
  incl. `#9CA3AF` e `#EDE7DC`); é a paleta legada do protótipo, congelada por D-586.

### #603 (vitest 4.1.10 → 4.1.11): são DOIS problemas — medido, não suposto

Reproduzido numa branch própria a partir de `origin/main` (nunca na branch do Dependabot, que
carrega trabalho de outro agente).

**1. Tipos — resolvido, código pronto.** O bump derruba a augmentação de `Assertion` e o
`tsc --noEmit` acusa `Property 'toHaveStyle' does not exist on type 'Assertion<Element>'`
(33 erros). Um `.d.ts` em `apps/web/test/` resolve:

```ts
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
```

Com ele, `tsc` vai de 33 erros para **0** — verificado.

**2. Snapshots — em aberto.** Com os tipos resolvidos, a suíte falha em
`test/image-policy.spec.ts` (2 testes):

```
Error: The snapshot state for 'image-policy.spec.ts' is not found.
       Did you call 'SnapshotClient.setup()'?
Snapshots  2 obsolete
```

O `.snap` existe e é lido, mas o 4.1.11 marca as entradas como obsoletas: é comportamento do
bump, não do nosso código. **Não rodar `--update` sem antes comparar** o snapshot novo com o
versionado.

**Causa provável, já localizada (não é o conteúdo do snapshot).** O snapshot versionado está em
`apps/web/test/__snapshots__/image-policy.spec.ts.snap`, mas o 4.1.11 procura o estado em
`image-policy.spec.ts` (ao lado do spec) — o erro diz `The snapshot state for
'image-policy.spec.ts' is not found`. Ou seja: mudou a **resolução de caminho** do snapshot, não
o snapshot. O conserto é fixar o caminho legado na config (`apps/web/vitest.config.ts`), em vez
de regerar o arquivo:

```ts
import { basename, dirname, join } from "node:path";
// dentro de test: {}
resolveSnapshotPath: (testPath, snapExtension) =>
  join(dirname(testPath), "__snapshots__", basename(testPath) + snapExtension),
```

Conferir antes: `git ls-files | grep '\.snap$'` mostra o arquivo em `__snapshots__/`, e o
`Test-Path` ao lado do spec dá `False`. Se a config resolver, `--update` nunca entra na história. Caminho: conferir `snapshotFormat`/`resolveSnapshotPath` na config do vitest e como
o spec monta o snapshot; só então corrigir a config ou aceitar o formato novo com justificativa.

**Falso positivo de `tsc`:** um `.next/` de outra branch (ex.: a que tem `/status`) faz o
`tsc` acusar `Cannot find module '...[locale]/status/page.js'`. Apague `apps/web/.next` antes de
medir — não é regressão de código.

### PR e branches

- PR **#661** (este programa) está draft com CI verde; "ready for review" e merge são decisão do
  Operador (`main` auto-deploya).
- A branch `dependabot/npm_and_yarn/vitest-5.0.5` **não é nossa** — tem 19 commits de outro
  agente. Não faça `push`, `reset` nem `branch -D` nela.
- **Capturas 375/1024/1440** — executadas (ver "Evidência visual"); o overflow global de 768 px
  que elas acharam já está corrigido.
- **PR da branch**: os commits estão empurrados; CI só roda em PR para `main` ou push em `main`.
- **#603** (`vitest` 4.1.10 → 4.1.11): falta declarar os tipos de `toHaveStyle`/
  `toBeInTheDocument` em `apps/web/test/`.

## Regras que continuam valendo

`main` auto-deploya; merge só com CI verde e nunca push direto (D-457/T459). Branch dedicada por
item. Não tocar em `.zcode/` (território de outros agentes) — bots vão em `scripts/bots/`.
Deploy de `Production` é aprovação do Operador (gate P012). Texto legal não muda sem manter
Termos + Política + rodapé coerentes e o gate legal.
