# Toolkit de UI/UX — curadoria verificada das 22 ferramentas + FigCraft

**Verificação desta rodada (2026-10-13), sempre em fonte primária:** `gh api` (licença/estrelas do
repositório), `npm view` (licença/versão do pacote), `HEAD` HTTP nos endpoints de registry e as páginas
oficiais. Onde algo **não** foi re-verificado hoje, está marcado — nada de "herdado por reputação".

**Stack real do MEDIA Rate** (conferido em `apps/web/package.json`): Next.js **16.3.8** (App Router,
Turbopack) + React 19 · Tailwind **3.4.17** (não há `@theme`) · tokens em `src/lib/design-tokens.ts` +
variáveis CSS em `globals.css` · **dark-only** · `next-intl` v4 com 3 locales · fontes Space Grotesk /
Inter / JetBrains Mono via `next/font` · `components.json` com 5 registries (política D-580).

Legenda: **ADOTADO** (em uso, com gate/skill) · **INSTALADO** (dependência) · **GATE** (verificação que
roda) · **REGISTRY** (copiar só o necessário, atrás dos tokens) · **REFERÊNCIA** (ideias, não código) ·
**NÃO USAR** (licença/stack/risco).

---

## 1. Skills e tooling de agente

| Ferramenta | Licença (verificada) | Veredito | Estado concreto neste repo |
|---|---|---|---|
| **[emilkowalski/skills](https://github.com/emilkowalski/skills)** | **MIT** (gh api; 46,3k ⭐) | **ADOTADO** | **Já vendorizado** em `.agents/skills/` (git-ignored, ferramenta de ambiente): `animate`, `animation-performance`, `animation-vocabulary`, `ask-sonner`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `review-animations`. Licença e cheatsheet em `.agents/skills/_upstream/`. |
| **[pbakaus/impeccable](https://github.com/pbakaus/impeccable)** | **Apache-2.0** (gh api; 81,2k ⭐) | **GATE** | `npm run design:detect` roda **impeccable 4.5.2** — que é a versão atual no npm (`npm view`, MIT do CLI ≠ licença do repo: o repo é Apache-2.0). Hoje: **0 achados**. Advisory por decisão. |
| **[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)** | **MIT** (gh api; 96,5k ⭐) | **ADOTADO** | **Já vendorizado**: `redesign-skill`, `output-skill` + licença em `_upstream/`. Hoje o repo virou plugin com marketplace (`.claude-plugin/`); a cópia curada continua válida. |
| **[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** | **MIT** (gh api; 135,9k ⭐) | **ADOTADO (parcial) — NOVO nesta rodada** | A URL do pedido (`ui-ux-pro-max-skill.nextlevelbuilder.io`) **redireciona para https://uupm.cc**. Vendorizei 3 skills em `.agents/skills/`: **`ui-ux-pro-max`** (73 arquivos), **`design-system`** (27), **`ui-styling`** (98) + licença em `_upstream/ui-ux-pro-max-LICENSE.txt`. **Regra de uso:** as **paletas/fontes** dele **não** entram (o produto tem tokens canônicos e o censo de hex é gate); usa-se a parte de **UX/anti-padrões e data-viz**. |
| **[FigmaToCode](https://github.com/bernaferrari/FigmaToCode)** | **GPL-3.0** (gh api) | **NÃO USAR** | Copyleft em plugin que geraria código dentro do produto. A função (design→código) é coberta pelo **FigCraft** (§6), que é ferramenta local, sem código GPL entrando no repo. |

## 2. Bibliotecas de animação

| Ferramenta | Licença (verificada) | Veredito | Estado concreto |
|---|---|---|---|
| **[Motion](https://motion.dev/)** | **MIT** (`npm view`) | **INSTALADO + ATUALIZADO** | **Subiu de `12.42.2` → `14.2.0` nesta rodada** (2 majors de atraso). Verificado: `tsc` 0, **617/617** testes, hidratação **36/36**, pixel **4/4**, build 0, detector 0, contraste 51/51, hex OK. |
| **[GSAP](https://gsap.com/)** | "Standard no charge" (`npm view`: licença própria) | **INSTALADO + EM USO** | `gsap@3.15` + `@gsap/react@2.1.2` (5 imports). Gratuito para este uso; plugins pagos não são usados. Sempre com caminho de `prefers-reduced-motion`. |
| **[Anime.js](https://animejs.com/)** | **MIT** (`npm view`) | **INSTALADO + EM USO** | `animejs@4.5.0` (6 imports). **Três motores convivem** (Motion, GSAP, Anime.js) — dívida registrada; consolidar exige medir bundle e revisar os 6 pontos, não é decisão de gabinete. |

## 3. Teste e QA

| Ferramenta | Licença (verificada) | Veredito | Estado concreto |
|---|---|---|---|
| **[Playwright](https://github.com/microsoft/playwright)** | **Apache-2.0** (gh api + `npm view`) | **INSTALADO + ATUALIZADO + 3 harnesses** | **Subiu de `1.62` → `1.64.1`** e os **browsers foram reinstalados** (`npx playwright install chromium`) — sem isso o harness quebrava em 1–3 ms com "Executable doesn't exist" (medido). Harness 1: **pixel** (`test:visual`, 4/4). Harness 2: **hidratação**, 18 rotas × 2 modos (`test:hydration`, 36/36). Harness 3: **autenticado** (`test:auth`: axe nas 8 telas de admin + baseline do dashboard) — pronto, **bloqueado por credencial** (D-588). |
| **[Replit](https://replit.com/)** | freemium (não re-verificado hoje) | **NÃO USAR** | Prototipagem em nuvem não ataca o gargalo (dados e densidade de UI) e cria mais uma superfície. |

## 4. Registries de componentes — **verificados hoje, um por um**

`apps/web/components.json` declara 5 registries. Nenhum gate checava se continuavam vivos; agora
existe: **`npm run design:registries`** (`apps/web/scripts/design-registries.mjs`, `--ci` falha o build).
Resultado desta rodada — todos responderam:

| Registry | Componentes no índice | Licença | Uso no produto |
|---|---|---|---|
| `@react-bits` | **864** | MIT + Commons Clause (não redistribuir) | só o subconjunto GSAP, quando faltar um efeito |
| `@obsidian` | **74** | MIT | 1º da fila (Next + React 19 + Motion declarados) |
| `@kokonutui` | **59** | MIT | 2º da fila (`motion/react`, `useReducedMotion`) |
| `@bklit` | **58** | MIT | só data-viz — e o repo já usa **Recharts 3.10** |
| `@componentry` | **57** | MIT | referência (quase tudo WebGL decorativo) |

Instalar por registry exige `$env:npm_config_userconfig="<npmrc vazio>"` nesta máquina **e** revisão do
diff (o CLI pode sobrescrever `src/components/ui/`). **Não instalei componente nenhum nesta rodada**:
nenhum item do backlog da auditoria pede componente de registry (o que falta é de casa: skeletons por
segmento, dialogs com Radix que **já está instalado**, `aria-live`).

## 5. Referência visual e micro-interações

| Ferramenta | Licença | Veredito | Por quê, para o MEDIA Rate |
|---|---|---|---|
| **[Refero](https://refero.design/)** | imagens/marcas dos donos | **REFERÊNCIA PURA** | research-first; sintetizar sem copiar. |
| **[metal.jakubantalik.com](https://metal.jakubantalik.com/)** | MIT (não re-verificado hoje) | **REFERÊNCIA** | WebGL no CTA custa LCP; ganho maior vem de hierarquia e contraste. |
| **[loading.daniasyrofi.com](https://loading.daniasyrofi.com/)** | MIT (não re-verificado hoje) | **REGISTRY (sob demanda)** | catálogo de loaders com reduced motion; entra atrás dos nossos tokens se um estado de carregamento precisar. |
| **[bencho.dev](https://bencho.dev/)** | blocks MIT (declarado no `llms.txt`; página `/license` ilegível sem JS) | **REGISTRY (blocks)** | micro-interações pontuais. |
| **[kobra.systems](https://kobra.systems/)** | comercial (10 grátis "personal use"; pago para uso comercial) | **NÃO USAR agora** | exige licença paga; se um dia fizer sentido, é decisão de compra do Operador. |
| **[21st.dev](https://21st.dev/)** | proprietária (proíbe scraping/redistribuição) | **NÃO USAR** | risco jurídico num produto que publica política de direitos autorais. |
| **[Aceternity UI](https://ui.aceternity.com/)** | licença não encontrada nos gratuitos | **REFERÊNCIA** | sem licença clara não entra em produto comercial (D-580). |

## 6. FigCraft — o auxiliar de design, agora ligado aos tokens do produto

Instalado em `C:\Program Files\FigCraft` com **CLI headless** (`figcraft-cli.exe`, **552 comandos**).
Nesta rodada deixou de ser "desenhar à mão" e virou **pipeline reproduzível**:

| Comando do projeto | O que faz |
|---|---|
| **`npm run design:figcraft`** | lê `design-tokens.ts` + `globals.css` e gera `docs/02-architecture-design/figcraft/tokens.jsonl`: coleções de variáveis **Cor / Tipografia / Espaço e raio / Movimento**, com `codeSyntax` apontando para o `var(--…)` **real** de cada cor, e desenha um **Guia de tokens** com os swatches de fill **ligado à variável**. Resultado: **52 cores, 60 tokens de tipografia, 5 raios, 8 durações**. |
| `figcraft-cli run <jsonl> --out <figcraft>` | executa o roteiro headless (uma linha JSON por passo; **aborta no primeiro passo inválido**) |
| `figcraft-cli export <figcraft> -o <dir> --format png --scale 2` | um PNG por frame de topo → `docs/02-architecture-design/evidencias/tokens/00 Guia de tokens.png` |

**Achados de API que custaram iteração (e ficam registrados):** `cornerTopLeftRadius` não existe (é
`cornerRadius: [tl,tr,br,bl]`); os ids vivem em **namespaces diferentes** — nó é número (a página é 1, o
primeiro nó é 2), coleção é `VariableCollectionId:N` e variável é **`VariableID:N`** (D maiúsculo);
`variable.update`/`variable.bind` **aceitam o nome**, o que elimina a previsão de id; `variable.create`
do tipo `color` **rejeita** `rgba(...)`; token com unidade (`"0.375rem"`) tem de ser `string`, não
`number`.

**Regra de ouro:** FigCraft propõe e mede **forma**; o código continua sendo a fonte da verdade. Nada de
CSS gerado copiado para o produto, e nenhuma cor que não venha de `design-tokens.ts`.

## 7. Gates de UI deste repo

| Comando | Verifica | Estado |
|---|---|---|
| `npm run design:detect` | anti-padrões (impeccable 4.5.2, advisory) | **0 achados** |
| `npm run design:contrast` | AA dos pares de token | **51/51** |
| `npm run design:hex` | hex novo fora de token | **OK — 35 valores / 696 ocorrências** |
| **`npm run design:registries`** | **NOVO:** os 5 registries declarados respondem (+ contagem e licença) | **5/5** |
| **`npm run design:figcraft`** | **NOVO:** tokens → variáveis do FigCraft + guia | **52 cores exportadas** |
| `npm run design:visual` | screenshots/overflow/axe nas rotas públicas | verde |
| `npm run test:visual --workspace apps/web` | regressão pixel | **4/4** |
| `npm run test:hydration --workspace apps/web` | hidratação + conteúdo invisível (18 rotas × 2 modos) | **36/36** |
| `npm run test:auth --workspace apps/web` | axe no admin + baseline do dashboard | **bloqueado por credencial** (D-588) |
| `npm test --workspace apps/web` | suíte | **617/617** |

## 8. O que virou ação nesta rodada (medido, não prometido)

1. **Motion 12.42.2 → 14.2.0**, **lucide-react 1.26 → 1.57**, **Playwright 1.62 → 1.64.1** + browsers
   reinstalados. Tudo passou por `tsc`, 617 testes, hidratação 36/36, pixel 4/4, build e os três gates
   de design — **as major não quebraram nada** (e o harness de hidratação foi quem pegou o browser
   desatualizado, em 1–3 ms por teste).
2. **`design:registries`**: os 5 registries deixaram de ser declaração e passaram a ser verificação
   (5/5 vivos, com contagem e licença).
3. **`design:figcraft`**: tokens do produto viraram variáveis do FigCraft (`codeSyntax` = `var(--…)`),
   com guia renderizado em PNG — o design tool passa a nascer da paleta real.
4. **UI/UX Pro Max vendorizado** (3 skills, MIT) com regra explícita de não adotar paletas/fontes.
5. **FigmaToCode barrado** por GPL-3.0, com o substituto declarado (FigCraft).

## 9. Como repetir

```powershell
npm run design:registries                 # registries vivos + contagem + licença
npm run design:figcraft                   # tokens -> variáveis do FigCraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\tokens.jsonl `
  --out docs\02-architecture-design\figcraft\tokens.figcraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' export docs\02-architecture-design\figcraft\tokens.figcraft `
  -o docs\02-architecture-design\evidencias\tokens --format png --scale 2
npm run design:detect; npm run design:contrast; npm run design:hex
npm run test:visual --workspace apps/web; npm run test:hydration --workspace apps/web
npm test --workspace apps/web
```

## 10. Ainda em aberto (honesto)

- **Não re-verifiquei hoje** as licenças de metal, loading.daniasyrofi, bencho.dev, kobra, refero,
  21st.dev e Aceternity: os vereditos acima vêm da análise anterior e estão marcados como tal. Nenhum
  deles entrou no repo, então o risco é de classificação, não de conformidade.
- **Três motores de animação** seguem convivendo (Motion/GSAP/Anime.js): falta a medição de bundle
  para decidir consolidação.
- **`test:auth` bloqueado por ambiente** (D-588): sem credencial válida, `/admin` e `/dashboard`
  continuam fora de qualquer gate.
- **FigCraft usa a fonte do sistema** (só Inter está instalada; Space Grotesk e JetBrains Mono chegam
  por webfont no app) — maquete prova forma, não tipografia final.