# Conteúdo de terceiros (atribuição e escopo)

Registro de tudo que foi **vendorizado, adaptado ou referenciado** no tooling de
UI/UX do projeto. MIT/Apache exigem preservar o aviso de copyright; GPL e
proprietário **não** entram no repositório.

## Vendorizado localmente (não versionado)

Vive em `.agents/skills/` (git-ignored — `.gitignore` §"Skills locais"). Detalhes
de atualização: `.agents/skills/_upstream/README.md`.

| Conteúdo | Origem | Licença | Onde |
|---|---|---|---|
| 10 skills de motion/design engineering | https://github.com/emilkowalski/skills | MIT © 2026 Emil Kowalski | `.agents/skills/{emil-design-eng,animate,review-animations,improve-animations,find-animation-opportunities,animation-performance,animation-vocabulary,mobile-native,break-ui,ask-sonner}` |
| `redesign-skill`, `output-skill` | https://github.com/Leonxlnx/taste-skill | MIT © 2026 Leonxlnx | `.agents/skills/{redesign-skill,output-skill}` |

Cópias de licença: `.agents/skills/_upstream/emilkowalski-LICENSE.txt`,
`.agents/skills/_upstream/taste-skill-LICENSE.txt`.

## Adaptado e versionado (conteúdo do projeto, derivado)

Reescrito para os tokens/anti-padrões/stack do MEDIA Rate e **não** é cópia do
original; a origem é citada no cabeçalho de cada arquivo.

| Arquivo do projeto | Derivado de | Licença de origem |
|---|---|---|
| `.zcode/skills/media-rate-ui-ux/references/motion-review-standards.md` | `emilkowalski/skills` → `review-animations`, `animation-performance`, `mobile-native`, `animate` | MIT © 2026 Emil Kowalski |
| `.zcode/skills/media-rate-ui-ux/references/marketing-preflight.md` | `Leonxlnx/taste-skill` → pre-flight do `taste-skill`/`redesign-skill` | MIT © 2026 Leonxlnx |
| `.zcode/skills/media-rate-ui-ux/references/design-tooling.md` | auditoria própria (22 ferramentas) com dados públicos de licença | — |
| `.zcode/skills/design-review/references/design-linter.md` | documentação oficial do Impeccable | Apache-2.0 © 2025 Paul Bakaus |
| `apps/web/src/components/media-rate-ui/CountUpValue.tsx` | React Bits `CountUp` (registry `@react-bits`) | MIT + Commons Clause © DavidHDev — **reimplementado**, sem redistribuir o arquivo original |

## Dependências de ferramental (npm, versionadas no `package-lock.json`)

| Pacote | Licença | Papel |
|---|---|---|
| `impeccable@4.5.2` (devDependency raiz) | Apache-2.0 | detector determinístico de anti-padrões de UI (`npm run design:detect`) |

## Consultado apenas como referência (nada incorporado)

- https://refero.design · https://bencho.dev · https://loading.daniasyrofi.com ·
  https://temp.obsidianui.dev · https://kobra.systems · https://21st.dev ·
  https://ui-ux-pro-max-skill.nextlevelbuilder.io · https://componentry.dev ·
  https://kokonutui.com · https://bklit.com · https://ui.aceternity.com ·
  https://replit.com · https://github.com/bernaferrari/FigmaToCode

## Bloqueado por licença (não usar, não copiar)

- **Aceternity UI** — termos "All Rights Reserved", uso pessoal e proibição de
  reproduzir/copiar/redistribuir.
- **Kobra Design System** — tier gratuito "personal use only".
- **FigmaToCode** — GPL-3.0 (copyleft): impede vendorizar/forkar no monorepo.
- Qualquer item do 21st.dev com licença não declarada ou não comercial.
