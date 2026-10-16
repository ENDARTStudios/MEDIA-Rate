# Auditoria visual de UI/UX — MEDIA Rate (2026-10-13)

**Método:** detector determinístico do Impeccable **no DOM renderizado** de 18 rotas públicas (com o SO
em modo claro, como o gate), captura de tela real de 11 telas + 3 telas pós-correção, inspeção do
código com `arquivo:linha` e a bateria de gates do repo. Complementa
[`AUDITORIA-UI-UX-2026-10.md`](./AUDITORIA-UI-UX-2026-10.md) (que segue sendo a lista canônica): aqui
o foco é o que o **pixel e o DOM** acusam hoje, e o que foi corrigido.

## 1. Achados de máquina e resultado

| Rota | Antes | Depois | O que era |
|---|---|---|---|
| `/pt-BR/media/breaking-bad` | **7** | **0** | contraste AA 3,7:1 · hierarquia `h1→h3` · 5 "card dentro de card" |
| `/pt-BR/about` | 2 | **0** | medida de linha (~89 caracteres) · excesso de travessão |
| `/pt-BR/login`, `/register`, `/welcome` | 1 cada | **0** | "card dentro de card" (a superfície externa do card de auth) |
| `/pt-BR/top` | 0 | **0** | *(sem achado de detector — mas 28 classes de cinza/branco fora do design system; ver §3)* |
| demais 13 rotas | 0 | 0 | — |
| **Total** | **13** | **0** | |

## 2. O que foi corrigido (com o gate que prova)

| # | Achado | Correção | Prova |
|---|---|---|---|
| 1 | **Contraste AA 3,7:1** — `#E11D48` como TEXTO sobre a própria tinta de 12% na `SourceMiniCard` | texto passou a usar `#FB7185` (a convenção que o repo já usa quando o rose é texto: `Bar.tsx`, `/sources`, `global-error`); a tinta continua na cor da marca | detector: `low-contrast` **0** |
| 2 | **Hierarquia quebrada** — `<h1>Breaking Bad` seguido de `<h3>MEDIA Score` | o rótulo do módulo de score virou `<h2>` e os 9 rótulos de seção da ficha também (`h1` → `h2`); `tsc` confirma que não sobrou tag desbalanceada | detector: `skipped-heading` **0** |
| 3 | **5 "card dentro de card"** — as fontes eram cartões dentro do cartão de score | `SourceMiniCard` entra como **linha** (`border-transparent bg-transparent`) quando vive no módulo | detector: `nested-cards` **0** |
| 4 | **"card dentro de card" no auth** (regressão do D-595) | a superfície externa do `AuthBladeCard` deixou de ser um card; a faixa segue varrendo | detector: login/register/welcome **0** |
| 5 | **Medida de leitura** em `/about` (~89 caracteres por linha) | `max-w-[38rem]` nos parágrafos e `max-w-[34rem]` no lead | detector: `line-length` **0** |
| 6 | **Excesso de travessão** (telltale de texto gerado) | 5 frases reescritas com vírgula/dois-pontos/parênteses **nos 3 locales**, com paridade de chaves mantida | detector: `em-dash-overuse` **0** (restam 2 travessões: o separador do `metaTitle`) |
| 7 | **Separador decimal inconsistente** — cards mostravam "8,2" e a ficha "93.3"/"81.5" | `Bar.tsx` e `CriticsVsAudienceBar.tsx` passaram a usar o `formatarScoreLocale` **que já existia** no repo; valores crus interpolados saíram | 2 testes que **codificavam o defeito** foram corrigidos + 1 teste novo de locale |
| 8 | **Cinza default do Tailwind no produto público** (47 usos) | varredura para os tokens canônicos (`text-fg-primary/secondary/muted`, `bg-surface-card/elevated`, `border-surface-border`) em 10 arquivos | censo de cinza: **47 → 4** |
| 9 | **`/top` era light-first** (`bg-white dark:bg-gray-800`, `text-gray-900 dark:text-gray-100`) | 28 classes trocadas por tokens; o chip ativo passou a usar a tinta escura convencional (`text-[#0F172A]`, a mesma de `ui/button.tsx`) depois de o detector acusar 2,7:1 na primeira tentativa | `/top` **0 achados** + captura `top-depois.png` |
| 10 | **Hex fora de token** no módulo de score (`#1C1C2E`, `#9CA3AF`) | trocados pelos canônicos (`#2A2A3D`, `#A0A0B8`) | censo de hex: **696 → 679 ocorrências** (−31 vs baseline) |

**Capturas:** `evidencias/atual-2026-10/{top,ficha,about}-depois.png` (antes: `top.png`, `ficha.png`).

## 3. Refutações (achados meus que a evidência derrubou)

- **"O anel do catálogo ignora a faixa de score"** — **refutado**: `MediaScoreBadge` usa `scoreColor()`
  e 8,2/8,1 caem na **mesma faixa** (8 → sky). A cor igual é comportamento correto, não defeito.
- **"Título duplicado sobre o pôster" (N1)** — **refutado**: baixei a imagem original do TMDB; o texto
  verde "Breaking Bad" **faz parte da arte oficial**, não é overlay de UI.

## 4. Habilidades novas aplicadas (de onde veio cada decisão)

- **UI/UX Pro Max (`design-system`, `ui-styling`)** — a varredura de cinzas/brancos para tokens veio do
  princípio "um sistema só": classe de cor default do framework **não** é design system. É o mesmo
  eixo do `A10`/`B3` da auditoria canônica.
- **Emil Kowalski (`animation-performance`, `improve-animations`)** — as regras de movimento já
  aplicadas no ciclo (só `transform`/`opacity`, `reduced-motion` não decide markup) foram o critério
  para não "consertar" nada com animação e para manter o harness de hidratação nos dois modos.
- **Impeccable (gate `design:detect`)** — foi o árbitro de todas as correções: cada item acima só foi
  considerado fechado quando o detector no DOM voltou a 0.
- **FigCraft** — a evidência de tokens (`npm run design:figcraft`) usa as cores canônicas; nenhuma cor
  nova entrou no repo por causa desta auditoria.

## 5. O que continua aberto (e por quê)

| Item | Situação |
|---|---|
| **Admin**: 36 `text-gray-500`, tabelas sem `scope="col"`, 5 fluxos com `prompt/confirm` | **Bloqueado** — arquivos em edição por outro agente (a auditoria canônica já marca B2/M8–M14 assim) |
| `LgpdBanner.tsx` com 1 cinza default | **Não tocado de propósito**: D-582.10 reserva o arquivo ao Operador (compliance) |
| ~~`/verificar-email` sem base SSR (`A7`)~~ | **Resolvido (D-603 §1)**: casco renderizado no servidor; o HTML servido traz `<h1>` + descrição nos 3 locales |
| Migração `dash-*` → tokens no dashboard (`B3`) | Pendente: exige baseline visual **autenticado** (D-588, bloqueado por credencial) |
| ~~`SeasonTabs.tsx` e `SeriatedScoreTree.tsx` com `toFixed(1)`~~ | **Resolvido (D-602)**: os 10 sites passaram ao separador do locale |
| ~~FAQ em 3 fontes (`M14`)~~ | **Resolvido (D-603 §3)**: a home consome a fonte canônica; 13 chaves órfãs removidas |
| ~~H1 institucional em 3 tamanhos/2 cores (`M14`)~~ | **Resolvido (D-603 §3)**: 6 páginas com um único padrão |
| ~~404 tratado como falha de rede (`M16`)~~ | **Resolvido (D-603 §2)**: 404 é estado honesto; rede/servidor tem "Tentar novamente" |
| ~~Sem teste unitário em `prefers-reduced-motion: reduce` (§11.6)~~ | **Resolvido (D-603 §4)**: `test/reduced-motion.spec.tsx` |
| ~~Contraste de literais no JSX~~ | **Resolvido (D-604)**: gate estático cobre 221 pares (era 51) e pegou 4 falhas AA reais |
| ~~`i18n-leak` em 5 rotas~~ | **Resolvido (D-604)**: varredura do catálogo inteiro nos 3 locales (0 vazamentos medidos) |
| ~~Hex "só congelado"~~ | **Atacado (D-604)**: censo de 710 → **135** ocorrências; o mecanismo segue por baseline, agora com folga |
| ~~`/admin` e `/dashboard` fora do axe~~ | **Medido (D-605)**: harness rodou — **6 passam / 5 falham**, todas violações reais (`color-contrast` em 4 telas com números, e `<dl>` inválido em `/admin/metricas`); correções report-only (arquivos do outro agente) |

## 6. Verificação final

`tsc` **0** · eslint **0** · **622/622** testes (90 arquivos; +4: locale, movimento reduzido ×3 e fonte única de FAQ, com 5 asserções corrigidas que
afirmavam o formato errado) · hidratação **36/36** · pixel **4/4** · `next build` **0** ·
`design:detect` **0** · `design:contrast` **51/51** · `design:hex` **679 ocorrências** ·
`design:registries` **5/5** · detector no DOM: **0 achados em 18 rotas**.