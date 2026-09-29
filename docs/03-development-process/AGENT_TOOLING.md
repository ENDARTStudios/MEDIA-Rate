# AGENT_TOOLING — Adoção de ferramentas de agentes (T149)

Registro do plano de adoção da devolutiva de tooling de agentes (2026-09-29),
analisada contra 28 projetos (READMEs + metadados GitHub). Princípios: nada aqui
altera o produto em produção; ferramentas de segurança só em staging/local com
dados sintéticos (LGPD); toda adoção entra por PR e fica registrada nesta doc.

## 1. Adotado nesta tarefa (Ondas 0-1)

| Ferramenta | Modelo | Onde vive | Estado |
|---|---|---|---|
| OpenCodeReview (alibaba/open-code-review v1.12.11, Apache-2.0) | GitHub Action de review de IA por PR | `.github/workflows/open-code-review.yml` | Instalado; **dormente** até secrets `OCR_LLM_*` (ver §4) |
| security-audit-skill (cloudflare, MIT) | Skill de agente (auditoria multi-fase com validação independente) | `.agents/skills/security-audit/` + `skills-lock.json` | Vendored; rodar pontualmente (§3) |
| media-rate-conventions (autoral) | Skill do agente com convenções do projeto | `.agents/skills/media-rate-conventions/SKILL.md` | Ativa |
| Referências de fontes/índices (§2) | Documentação | Esta doc | Consulta |

### 1.1 Como rodar a skill security-audit (pontual, não por PR)

1. Pedir ao agente: "auditoria de segurança do codebase usando a skill
   security-audit, escopo `<diretórios>`".
2. A skill orquestra recon → hunters → validação independente → `findings.json`
   → relatório. Sandbox do SO é obrigatório para execução do alvo; sem sandbox,
   achados ficam `needs_validation`.
3. **Triagem humana obrigatória** — falsos positivos residuais; feed no fluxo de
   PENDENCIAS/DECISOES. Rodar antes de marcos (abertura do beta, auth/pagamento),
   não em todo PR (custo de tokens alto).
4. Relação com a skill `redteam` (raiz do repo): `redteam` = adversarial
   pontual contra a aplicação/agentes embutidos; `security-audit` = auditoria
   sistemática do CODEBASE por confiança. Complementares.

## 2. Fontes candidatas de metadados (insumo da decisão T145)

Decisão pendente do Operador (PENDENCIAS_OPERADOR, T130/T139) que destrava
UG-05/06/08/11/20/21/22. Filtro do projeto: fontes legítimas/licenciadas — a
lista abaixo parte de `public-apis/public-apis` (MIT) + fontes já usadas.

| Fonte | Categoria | Destrava | Observações |
|---|---|---|---|
| AniList (GraphQL) | Anime/Mangá | UG-06/07/21/22 | Cobertura de origem/staff/relações; ToS ok p/ uso não-comercial de dados — revisar |
| Jikan (MAL unofficial) | Anime/Mangá | UG-06/21 | Já usamos MAL como fonte; Jikan cobre lacunas da API oficial |
| Kitsu | Anime/Mangá | UG-06 | **Já em uso** (source-registry) |
| MangaDex | Mangá | UG-06/07/22 | Metadados de capítulos/volumes; API pública documentada |
| Google Books | Livros | UG-06/21 | **Já em uso** (preview) |
| OpenLibrary | Livros | UG-06 | **Já em uso** |
| Gutendex (Gutenberg) | Livros | UG-06 | Domínio público; complemento |
| ComicVine | HQs | UG-06/21/22 | **Preview já referenciado** (isPreviewTipo); editoras/personagens/relações |
| RAWG | Games | UG-06/21 | Metadados ricos (estúdios, gêneros, plataformas) |
| TMDB | Filmes/Séries | UG-06/20 | **Já em uso**; temporadas/episódios p/ UG-20 |

Critério de aceite por fonte (sugestão p/ T145): termo de uso permite exibição
com atribuição; campos mínimos mapeados p/ schema; rate limit suportável;
sem scraping.

Índices de consulta (custo zero): `public-apis/public-apis` (catálogo de APIs),
`punkpeye/awesome-mcp-servers` (MCP servers p/ agentes), `ripienaar/free-for-dev`
(free tiers de infra), `sindresorhus/awesome` (meta-índice + critérios de
curadoria), `ai-boost/awesome-harness-engineering` (padrões de harness; tem
tradução pt-BR).

## 4. OpenCodeReview — como ativar / operar

- Ativar: cadastrar secrets `OCR_LLM_URL`, `OCR_LLM_AUTH_TOKEN`,
  `OCR_LLM_MODEL`, `OCR_LLM_USE_ANTHROPIC` (Settings → Actions → Secrets).
  Sem elas o job sai cedo com skip — workflow dormente, zero custo.
- Comportamento: comenta na PR aberta; `continue-on-error` — NUNCA bloqueia
  merge; o review humano do par Thinker/Doer continua sendo o gate.
- Trigger: `pull_request: [opened]` (custo controlado; não roda a cada push).
- Upgrade: tag pinada `v1.12.11` — revisar trimestralmente e subir via PR.
- Registro da decisão: ao cadastrar as secrets, marcar em PENDENCIAS_OPERADOR.

## 5. Ondas futuras (pendentes de decisão/roadmap — NÃO instaladas)

- **Onda 2 (pilotos de produto IA — requer feature de assistente no roadmap):**
  TypeSafe/Jev (skill `typesafe-ai` já instalada; chave no `.env`; piloto com
  feature flag em fluxo não-crítico) · `ollama` (dev-only) · `langflow`
  (prototipagem local) · `awesome-llm-apps` (referência de padrões) ·
  `open-design` (protótipos de UI, projeto jovem).
- **Onda 3 (condicionadas a orçamento/autorização do Operador):** `open-seo`
  (exige conta DataForSEO) · `screaming-frog-mcp` (licença Screaming Frog) ·
  `strix` (pentest agêntico — SOMENTE staging, dados sintéticos, autorização
  formal em DECISOES.md).
- **Descartados (análise 2026-09-29):** OpenHands (orquestração redundante com
  o harness próprio) · OpenManus (framework p/ construir agentes — não é nosso
  caso) · openviking-plugins (20★, parado, dependência Volcengine) ·
  scientific-agent-skills (domínio irrelevante) · Agent-Reach (scraping/cookies
  conflita com a política de dados legítimos).

## 6. Ferramentas de agentes JÁ em uso (sem ação)

`trailhq/Graft` (grafo de código — mandato GRAFT-FIRST no AGENTS.md) ·
`browser-use` (plugin de browser do harness) · `diagram-design` (skill de
diagramas) · `typesafe-ai` (skill instalada, dormente) · padrão Agent Skills de
`anthropics/skills` (formato das skills acima). `codebase-memory-mcp` fica de
observação — só reavaliar se o Graft mostrar lacuna concreta (ex.: edges HTTP
entre apps/web e apps/api).
