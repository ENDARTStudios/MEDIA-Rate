# PADROES_DESENVOLVIMENTO.md — MEDIA Rate

> Fonte única dos critérios de desenvolvimento e do workflow de Issues/PRs.
> **Todo agente (de qualquer modelo) deve ler este arquivo antes de planejar ou
> codar.** Complementa o PROTOCOLO_MESTRE.md (governança) — aqui ficam os
> critérios técnicos e de qualidade.

## 1. Workflow de Issues e PRs (obrigatório)

1. **Toda tarefa** (correção, melhoria ou nova função) vira **Issue no GitHub**
   ANTES de qualquer código. Issue contém: contexto, critérios de aceite,
   arquivos afetados e testes necessários.
2. Trabalho em **branch** a partir da Issue; um **PR por Issue**.
3. O **PR menciona a Issue na descrição** (`Closes #NN`) — obrigatório.
   Nunca um PR sem Issue vinculada.
4. **Deploys são gerenciados por PRs**: merge na `main` = deploy (Vercel/Railway
   auto). Push direto na `main` só para documentação/evidência
   (`DECISOES.md`, `docs/`), registrado no commit.
5. PR exige: link da Issue, evidência (testes executados), revisão aprovada.
   Regra de ouro: **teste antes de implementar; guard vermelho = revert**.

## 2. Critérios de desenvolvimento (Skill de Dev)

| Critério | Estado atual | Critério de aceite |
|---|---|---|
| **PRD** — Product Requirements Document | ❌ ausente | `docs/PRD.md`: problema, personas, escopo, fora de escopo, métricas de sucesso, requisitos funcionais/não-funcionais |
| **UML** — classes + sequência | ❌ ausente | `docs/UML.md`: diagrama de classes (domínio core) + sequência (fluxos críticos: auth, watchlist, pagamento) |
| **RBAC** — matriz de níveis | ⚠️ código (papel USER/ADMIN) sem matriz documentada | `docs/RBAC.md`: matriz recurso × papel (USER/ADMIN + planos Free/Plus/Premium) |
| **RLS** — Row Level Security | ✅ T328 FORCE RLS + `rls-context.ts` + e2e | manter: nenhuma tabela com dado pessoal sem RLS; teste de isolamento por usuário |
| **Secrets management** | ✅ `.env` gitignored + Railway vars + BOAS_PRATICAS_SECRETS.md | segredo nunca em chat/commit/log; rotação; `gitleaks` no CI |
| **Arquitetura modular + feature flags** | ⚠️ monorepo ok; modelo `FeatureFlag` existe sem uso no código | catálogo de apps/módulos documentado; flags usadas para lançamento progressivo |
| **Error reporting** | ✅ Sentry + ErrorBoundary + correlationId | todo erro de UI/API rastreável (correlationId → Sentry); fallback amigável |
| **Testes (unit + integração + E2E)** | ✅ 318 web + 819 API + Playwright | novo código = teste no mesmo PR; suíte 100% verde no merge |
| **Security audit — gate de deploy** | ✅ `security:gate` + workflow security.yml | gate verde obrigatório antes do deploy; sem bypass |
| **WAF + Bot fight mode + rate limiting** | ⚠️ rate limiting ✅; WAF/Bot fight ❌ | Cloudflare WAF + Bot Fight Mode na frente do domínio; rate limit por IP/chave mantido |
| **TLS/SSL + HSTS (Full Strict)** | ⚠️ TLS via Vercel ✅; HSTS ❌ | header `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` + SSL Full (Strict) |
| **Observabilidade** | ✅ Sentry (web) + OTel (api) | métricas/rastros/alertas por serviço; alarme para falha crítica |
| **Qualidade de código** | ⚠️ ESLint+Prettier; Biome/Knip/Stryker ❌ | lint estrito no CI; contratos de arquitetura; mutação (Stryker) em módulos críticos |
| **Cobertura** | ⚠️ sem codecov | codecov no CI com gate de cobertura por pacote |

## 3. Motion design (Skill Motion Principles — github.com/kylezantos/design-principles)

Instalada em `.agents/skills/motion-design/`. Regra para **toda** interface:
- **Skeleton** em todo carregamento de dados (cards, listas, dashboards).
- **Lazy loading** de imagem/conteúdo abaixo da dobra (native `loading="lazy"` + ilhas).
- **Entrada/saída suaves** (fade/slide com duração e easing deliberados).
- **Progresso visível** em toda ação > 300 ms (spinner/barra/estado).
- Respeitar `prefers-reduced-motion` (nunca animar sem fallback estático).

## 4. Ferramentas de frontend (integração UI-UX)

Direção visual → tipografia → composição → hierarquia → identidade; fluxo do
usuário → componentes → responsividade → animações → acessibilidade.
3D: Three.js, React Three Fiber, WebGL, Web 3D Integration Patterns, Scroll World.
Animações: GSAP, Anime.js, Motion (motion.dev). UI: UI UX Pro Max, 21st.dev,
Kokonut UI, Bklit UI, React Bits, Aceternity UI, Componentry, Refero.
Escolher a menor ferramenta que resolve o problema — 3D só onde agrega valor
(nunca no caminho crítico de performance; ver T405).

## 5. SEO, AEO, AIO e GEO

Objetivos, táticas e métricas em `docs/SEO_AEO_AIO_GEO.md`. Evitar erros comuns:
- title/description únicos por página; canonical correto; sitemap + robots.txt válidos;
- Open Graph + dados estruturados (JSON-LD) completos; sem páginas bloqueadas por engano;
- AEO: conteúdo respondível por assistentes (FAQ, how-to, schema); GEO/AIO: entidade e
  contexto para LLMs (o Google precisa descobrir E entender a página).
CLIs de apoio: strix, open-seo, spec-kit, screaming-frog-mcp, ollama, langflow, mcp-servers.

## 6. Zero Trust

1. **IAM/IGA** — identidade central + RBAC (✅ base); revisar papéis por plano.
2. **MFA** — TOTP/WebAuthn obrigatório para admin e pagamento (❌ pendente).
3. **ZTNA** — acesso à API/infra apenas via túnel autenticado (Railway tunnel ✅ para
   operação; revisar exposição pública da API).
4. **NAC + microsegmentação** — serviços isolados por rede; DB nunca exposto sem túnel.
5. **Endpoint security + monitoramento** — alertas de acesso anômalo (login novo
   dispositivo, múltiplas falhas), logs de auditoria (AuditLog ✅).

## 7. Workflow de Sprint

- Análise → escolher 1 funcionalidade (maior impacto × menor complexidade).
- Dividir em tarefas + critérios de conclusão + arquivos + testes → salvar em `SPRINT.md`.
- **Não implementar antes de salvar em SPRINT.md.**
- Implementar **apenas** o escopo do SPRINT.md; listar arquivos/dependências antes de
  editar; criar teste → implementar → executar → validar; não sair do escopo.
- Fechamento: evidência real (testes executados, Lighthouse quando couber), guards verdes.

## 8. Workflow de bug

- **Causa raiz antes de corrigir:** rastrear o fluxo completo, mostrar evidência nos
  arquivos, registrar hipótese + resultado esperado. Não corrigir antes disso.
- **Correção test-first:** escrever teste que reproduz o bug → confirmar que falha →
  corrigir só a causa raiz → rodar o teste novo + a suíte relacionada → explicar
  causa, correção e riscos restantes.

## 9. Auditorias periódicas (checklists)

- **Segurança completa:** auth, permissões, rotas, banco, inputs, secrets, uploads,
  webhooks, SQLi, XSS, SSRF, APIs, criptografia, sessão, agent security, autorização,
  SAST, IaC, Code Owners, race condition, configs perigosas, dependências. Procurar
  segredos vazados (.env, API keys, tokens, service keys, URLs privadas, credenciais
  em código/logs). Cada falha: impacto + severidade + correção. Rodar também ataques
  negativos: acessar conta alheia, rota admin, registro de outro, API sem auth.
- **Performance:** queries repetidas, renders excessivos, operações bloqueantes,
  chamadas lentas, falta de cache, imagens gigantes, JS desnecessário, requisições
  duplicadas, fontes pesadas. Lighthouse/CWV a cada passo (D-398).
- **Banco:** tabelas sem proteção, RLS ausente/permissivo, queries sem limite, índices
  faltando, duplicação, cascade perigosa, dado sensível desnecessário. Pergunta final:
  **se eu precisar restaurar tudo amanhã, existe backup?**
- **SEO:** title/description/canonical/robots/sitemap/OG/dados estruturados/bloqueios.
- **QA hostil:** campos vazios, inputs inválidos, valores extremos, cliques repetidos,
  sessão expirada, duas abas, falha de API, requisições duplicadas, uploads, SQLi, XSS,
  segredos, dependências vulneráveis → transformar em testes reproduzíveis.
- **Responsividade:** 375 px, 390 px, 768 px — overflow horizontal, modal cortado,
  botão impossível, teclado cobrindo form, texto minúsculo, layout quebrado.
- **Erro em produção:** simular falha em ação importante e confirmar logs úteis,
  monitoramento, analytics, alertas (o quê, onde, com quem).
- **Limpeza:** código duplicado, arquivos órfãos, funções não usadas, dependências
  abandonadas, mocks em produção, TODOs esquecidos, código morto, CSS morto, assets
  esquecidos → plano de limpeza por risco × impacto.
