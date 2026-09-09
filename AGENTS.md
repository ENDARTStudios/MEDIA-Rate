# AGENTS.md — MEDIA Rate / END ART Studios

Diretrizes para agentes de código (Claude Code, DeepSeek Harness, etc.) neste repositório.

## GRAFT-FIRST (navegação de código — obrigatório)

Antes de **ler ou editar** qualquer fonte, use o **grafo de código (Graft)** para
navegar primeiro. Isso economiza tokens e reduz acertos às cegas.

- **Fluxo padrão de navegação:**
  1. `graft ask "<pergunta sobre o código>"` — localizar símbolos, funções,
     tipos, módulos e o papel de cada um.
  2. `graft grep "<padrão>"` — buscar referências/ocorrências no grafo.
  3. `graft callers "<símbolo>"` — ver quem chama/decide o quê (dependências).
  4. **Só então** `grep`/`read`/`glob` na fonte para confirmar detalhes.
  - Leia os **nós do grafo** (definições, dependências, imports) antes de abrir
    o arquivo-fonte.

- **Quando o Graft não estiver disponível** (ex.: ambiente sem o runtime
  nativo do tree-sitter), **caia para** `grep`/`glob`/`read`: localize o símbolo,
  mapeie os importadores/chamadores e leia o arquivo **antes** de editar.
- **Nunca** edite às cegas ou faça refactor sem mapear primeiro os pontos que
  dependem da mudança (callers/imports/uso).

## Resolução de caminho no run_code (importante)

- O process.cwd() do worker de run_code NAO e o workspace (pode apontar para
  outro projeto, ex.: Almanaque). process.chdir() e NAO suportado no worker.
- **Sempre** use os **tools.** (read/grep/glob/write) para acesso a arquivos -
  eles resolvem para o **workspace DEPOIS** (MEDIA Rate).
- Se precisar de fs direto (Node), use **caminho absoluto**
  (ex.: D:\\PROJETOS\\MEDIA Rate\\MEDIA Rate\\apps\...); **nunca caminho relativo**
  (o fs segue o cwd do worker, que pode estar em outro projeto).
## Regras gerais (projeto)

- **Next.js 16 (App Router, Turbopack) + next-intl v4 + React Server Components.**
- **i18n em `apps/web/src/messages/{pt-BR,en-US,es-ES}.json`** — sempre atualizar
  as **3 línguas** com paridade (chaves iguais), e validar JSON após editar.
- **Nunca** alterar texto legal (Termos/Privacidade/rodapé identificação) sem
  manter consistência entre Termos, Política e rodapé, e sem o gate legal.
- **npm (package-lock), não pnpm.** Testes: `vitest` com `NODE_ENV=test`
  (rodar de `apps/web` p/ alias `@/`; `apps/api` de `apps/api`).
- **Segredos** (`sk_`, `whsec_`, senhas DB, credenciais de teste): **nunca** em
  chat/log/commit/evidência; só em `.env` (gitignored) / secret manager.
- **Strays que não se commita:** `.od-skills/`, protótipo `*.html`, `*.sketch.json`,
  `apps/web/scripts/_*.mjs`.
- **`main` é auto-deployado** (Vercel web + Railway api). Confirmar produção após
  merge em mudanças visíveis.
- **Fidelidade de mocks do Prisma (D-447):** mocks devem refletir os tipos reais
  do driver (`bigint` → `BigInt`, `bytea` → `Buffer`, etc.); todo endpoint novo
  exige teste que serializa a resposta (`JSON.stringify`) — é o que pega 500
  de serialização sem precisar de produção.

## Lembrete

Se o agente não estiver usando o grafo, lembre-o:
**"siga o AGENTS.md — GRAFT-FIRST."**
