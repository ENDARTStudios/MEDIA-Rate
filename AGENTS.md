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
- **CI/merges (D-457/T459):** nenhum merge em `main` sem CI verde; **push direto
  com bypass é proibido** (exceção só em resposta a incidente, registrada em
  `DECISOES.md`). PRs só-de-docs são gateados pelo job leve `docs-gate`
  (requerido); os jobs pesados pulam docs-only. Detalhes em `docs/CI.md`.
- **Fidelidade de mocks do Prisma (D-447):** mocks devem refletir os tipos reais
  do driver (`bigint` → `BigInt`, `bytea` → `Buffer`, etc.); todo endpoint novo
  exige teste que serializa a resposta (`JSON.stringify`) — é o que pega 500
  de serialização sem precisar de produção.

## Project Automation Guidelines

### Strict Rule: Terminal & CLI First Policy

You (the AI Agent) have complete command-line and terminal access to this environment. You must maximize your autonomy using CLIs and never delegate web-based infrastructure tasks to the human operator.

### 1. Prohibited Requests

* **NEVER** ask the operator to manually open a browser or log into dashboards (such as Vercel, Railway, Supabase, Netlify, AWS, or GitHub web).
* **NEVER** ask the operator to manually create projects, trigger deployments, set environment variables, or check build logs inside a web user interface.

### 2. Autonomous Execution Flow

* **CLI Over Web UI:** If an infrastructure action is needed, immediately use the respective terminal tool (e.g., vercel, railway, gh).
* **Session Verification:** Before asking for credentials, autonomously check if a session exists using commands like vercel whoami, railway whoami, or gh auth status.
* **Deployments & Variables:** Always use execution commands (e.g., vercel deploy, railway up) and pipe/inject environment variables directly via the CLI tool tools instead of requesting manual copy-pasting.

### 3. Allowed Exceptions

You may only prompt the human operator regarding external platforms if:

* The CLI tool explicitly requires a browser-based OAuth validation link that your environment cannot automatically bypass.
* There is a terminal-blocking account restriction (e.g., payment failure or missing team permissions) that cannot be handled programmatically.

### No contexto deste repositório (aplicação da política)

- **CLIs disponíveis e comprovados**: `gh` (PRs/checks/runs/API), `vercel` (deploy/ls/env),
  `railway` (status/deployment list/variables/logs/service), `posthog-cli` (flags — receita
  em `docs/ANALYTICS.md`), `npx @sentry/cli` (releases/sourcemaps — `docs/OBSERVABILITY.md`).
- **Verificação de sessão antes de pedir credencial**: `gh auth status`, `vercel whoami`,
  `railway whoami`. Quirk conhecido (P010): `GITHUB_TOKEN` inválido injetado pelo harness
  sombreia o login válido do `gh` — contorno: `env -u GITHUB_TOKEN gh …`.
- **Variáveis/deploy via CLI, não web**: `railway variables --service <nome>`,
  `vercel env …`; deploys de produção continuam sendo pelo fluxo PR→merge (D-457/D-527) —
  a política CLI-first **não** autoriza push direto ou `--prod` fora de incidente
  registrado (ver `docs/RULES.md` e `docs/PRODUCTION_DEPLOY.md`).
- **Serviço Railway**: projeto "MEDIA Rate", serviço "MEDIA Rate" (API);
  `railway deployment list --service "MEDIA Rate" --environment production`.
- **O que segue sendo do Operador** (não é tarefa de web UI — é decisão/governança):
  aprovações no environment `Production` (gate P012), decisões P012/P013, rotação de
  segredos no dashboard Stripe (exceção legítima: sem CLI para account settings),
  criação de contas externas (ex.: UptimeRobot).

## Lembrete

Se o agente não estiver usando o grafo, lembre-o:
**"siga o AGENTS.md — GRAFT-FIRST."**
