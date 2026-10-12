# Tooling de design: o que adotar, adaptar, consultar ou descartar

Matriz de decisão das 22 ferramentas/skills/registries avaliadas para o MEDIA Rate
(T208/D-580). Licença é critério de bloqueio: só entra o que permite uso comercial
em produto proprietário. Reavalie quando licença/versão mudar.

## Adotado (instalado e em uso)

| Ferramenta | Licença | Como está no repo |
|---|---|---|
| **Impeccable detector** (pbakaus/impeccable) | Apache-2.0 | devDependency fixa `impeccable@4.5.2` + `npm run design:detect` (`apps/web/scripts/design-detect.mjs`) + `.impeccable/config.json`. Regras de uso: `.zcode/skills/design-review/references/design-linter.md` |
| **Playwright** (microsoft/playwright) | Apache-2.0 | já era devDependency (`@playwright/test ^1.62`, `@axe-core/playwright`); tooling de evidência em `.zcode/skills/visual-qa/` |
| **React Bits** (DavidHDev/react-bits) | MIT + Commons Clause | registry `@react-bits` em `components.json`; `CountUp` adaptado como `apps/web/src/components/media-rate-ui/CountUpValue.tsx` (locale-aware, SSR-safe, reduced-motion) |
| **Motion** (motion.dev) | MIT | já instalado; gate global `<MotionConfig reducedMotion="user">` em `apps/web/src/providers/motion-provider.tsx` |
| **GSAP** (gsap.com) | GSAP standard "no charge" (grátis, inclusive comercial) | já instalado (`gsap`, `@gsap/react`); padrão de uso em `motion-review-standards.md`. Plugins "Club" (ScrollSmoother/DrawSVG) **não** usar |
| **emilkowalski/skills** | MIT © 2026 Emil Kowalski | 10 skills vendorizadas em `.agents/skills/` (local) + recorte versionado em `references/motion-review-standards.md`. Atualização: `.agents/skills/_upstream/README.md` |
| **Taste Skill** (Leonxlnx) | MIT © 2026 Leonxlnx | `redesign-skill` + `output-skill` em `.agents/skills/` + recorte versionado em `references/marketing-preflight.md` |

## Registries configurados (código só quando houver lacuna real)

`apps/web/components.json` → `registries`:

| Namespace | URL | Licença | Política |
|---|---|---|---|
| `@react-bits` | `https://reactbits.dev/r/{name}.json` | MIT + Commons Clause | **allow-list** (abaixo); proibido revender/redistribuir os componentes |
| `@kokonutui` | `https://kokonutui.com/r/{name}.json` | MIT (Pro é pago) | puxar no máximo 1–3 componentes; catálogo declara Tailwind v4 → portar classes para nossos tokens; rejeitar itens glass/liquid |
| `@bklit` | `https://ui.bklit.com/r/{name}.json` | MIT (Bklit **Studio** é proprietário — não tocar) | só se o `recharts` não entregar (sankey/sunburst/gauge); cada chart traz `@visx/*` → decidir caso a caso |
| `@componentry` | `https://componentry.dev/r/{name}.json` | MIT | opcional; itens usam `framer-motion` → trocar import para `motion/react` |
| `@obsidian` | `https://www.obsidianui.dev/r/{name}.json` | MIT | opcional; só itens de texto/scroll (evitar glass/WebGL/cursor-aura) |

### Allow-list React Bits (baixo risco, sem deps novas)

`CountUp`, `AnimatedList`, `Stepper`, `LogoLoop`, `PillNav`, `FadeContent`,
`AnimatedContent`, `ClickSpark`.

**Bloqueado por política** (viola D-065 ou pressiona o LCP): `Aurora`,
`SoftAurora`, `FluidGlass`, `GlassSurface`, `GlassIcons`, `SplashCursor`,
`MetaBalls`, `BlobCursor`, `SplitText`/`BlurText`/`ScrollReveal` **no H1** (LCP é
texto server-rendered), e qualquer background `three`/`ogl`.

### Workaround obrigatório do CLI shadcn nesta máquina

O `~/.npmrc` define `allow-scripts=...` (módulos nativos do Graft). O npm 12
recusa essa opção em instalação project-scoped, e o `shadcn add` quebra com
`EALLOWSCRIPTS`. Rodar com um `userconfig` limpo:

```powershell
$env:npm_config_userconfig = "$env:TEMP\npmrc-empty"   # arquivo vazio
npx shadcn@latest add "@react-bits/CountUp-TS-TW" -c apps/web -y
```

Depois **sempre** revisar o diff: o CLI pode escrever em
`apps/web/src/components/ui/` (primitivos shadcn do projeto) — aceite apenas
arquivos novos e nunca sobrescreva os primitivos.

## Adaptado só como padrão/ideia (não instalar)

| Ferramenta | Licença | Por quê |
|---|---|---|
| **metal-fx** (metal.jakubantalik.com) | MIT | efeito WebGL de borda metálica; colide com LCP server-first e vira enfeite. Se um dia entrar: só no CTA primário, com `paused` no reduced-motion |
| **Anime.js** | MIT | já instalado; usar import por subpath para tree-shaking (`.zcode/skills/media-rate-ui-ux/references/motion-review-standards.md`) |
| **Bencho** (bencho.dev) | MIT (blocos) | galeria de micro-interações; ler `llms.txt` e reimplementar em `motion/react` + Base UI com nossos tokens |
| **Loading** (loading.daniasyrofi.com) | **sem licença** | só referência visual para estados de carregamento — **não copiar código** |
| **UI UX Pro Max** | MIT (dados de terceiros OFL/Apache) | motor exige Python 3 (fora do stack) e promove glassmorphism/aurora; extrair apenas regras de UX/a11y à mão |
| **21st.dev** | por componente | agregador com API key e limite de 2 instalações/dia no free tier; usar para **descobrir** e instalar pelo registry de origem |
| **Refero** (refero.design) | proprietária (Free/Pro) | banco de referência visual; nada instalável, credencial é individual |

## Descartado (bloqueio legal ou técnico)

| Ferramenta | Licença/razão |
|---|---|
| **Aceternity UI** | **proprietária**: termos com "All Rights Reserved", uso declarado apenas "for your own personal use" e proibição explícita de reproduzir/copiar/redistribuir. Registry marcado como *degraded* (84,3) no índice do shadcn. ⚠️ Atenção: `DECISOES.md` (linha ~541) listou um "Animated Hero" da Aceternity como candidato — **não pode ser usado** por licença; qualquer adoção exige licença escrita do vendor + registro em `DECISOES.md` |
| **Kobra Design System** | proprietária: tier gratuito é "personal use only" — uso em produção comercial é violação |
| **FigmaToCode** (bernaferrari) | **GPL-3.0**: não vendorizar/forkar (copyleft). O plugin é usado no Figma como referência de layout; o Tailwind gerado ignora nossos tokens e usa posicionamento absoluto |
| **Replit** | SaaS proprietário: não reproduz Postgres/Stripe com fidelidade e não substitui o fluxo CLI-first (`gh`/`vercel`/`railway`) |

## Ordem de precedência em conflito

`AGENTS.md` + `DECISOES.md` + `design-tokens.ts` → `.zcode/skills/media-rate-ui-ux/`
→ `.agents/skills/motion-design/` → packs de terceiros. Nenhuma sugestão de
terceiro sobrepõe D-065, o gate de contraste AA, o server-first/LCP ou a paridade
i18n em 3 locales.
