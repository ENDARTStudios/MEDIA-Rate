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
  (exige conta DataForSEO) · `screaming-frog-mcp` (licença Screaming Frog —
  **status 2026-09-29/T150**: SF instalado em `D:\Program Files (x86)\Screaming
  Frog SEO Spider`, porém tier FREE — GUI apenas; `--headless`, crawl e o MCP
  nativo `--mcp-streamable-http-server` FATALam sem `licence.txt` (testado ao
  vivo). **Descoberta: o wrapper comunitário bzsasson/screaming-frog-mcp é
  desnecessário — o SF v24+ tem MCP server nativo**; com licença, usar o
  nativo. Enquanto isso, baseline SEO gratuito do próprio site via script
  (`.claude/reports/seo-audit/seo-baseline.py`, não versionado; achados no
  relatório `seo-baseline-2026-09-29.md` — inclui contradição noindex×sitemap
  em tipos preview) · `strix` (pentest agêntico — SOMENTE staging, dados
  sintéticos, autorização formal em DECISOES.md).
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

---

## Plandex — avaliado, **não** adotado como runtime do projeto

Fonte: <https://github.com/plandex-ai/plandex> (README, consultado em 2026-10-17).

**O que é.** Agente de código de **terminal** (`plandex`/`pdx`), open source, que planeja e
executa tarefas grandes que atravessam dezenas de arquivos: contexto de ~2M tokens, project
map com tree-sitter (30+ linguagens), **sandbox de diff cumulativo** (as mudanças ficam
separadas dos arquivos do projeto até serem aplicadas), execução de comandos com rollback,
combinação de modelos (Anthropic/OpenAI/Google/open source), autonomia configurável (de
total a passo a passo), debug automatizado de build/lint/teste, chat com consciência do
projeto, versionamento dos planos e integração com git (geração de mensagem de commit e
commit automático **opcional**).

**Por que não vendorizamos.** Plandex **não é biblioteca** — não existe papel de dependência
em `apps/web` ou `apps/api`. Adotá-lo significa somar um **segundo runtime de agente** ao lado
do que já existe neste repositório (harness DSH, `.zcode/agents/`, `.zcode/skills/`, Grafo
Graft): custo de manutenção e de credencial, sem ganho claro, porque as funções que ele
oferece já estão cobertas aqui.

**Pré-requisitos, medidos nesta máquina.**
- `wsl -l -v` → **só a distro `docker-desktop`** (utilitária). Falta uma distro Linux real, e o
  próprio projeto declara que Plandex **não funciona** em CMD/PowerShell.
- `docker --version` → **29.8.1 presente** (necessário para o local mode).
- `plandex`/`pdx` → ausentes.
- **Plandex Cloud está sendo encerrado** (03/10/2025, sem novos usuários) → resta o self-hosted.
- Exige chave de provider (OpenRouter/Anthropic/…): segredo, então só em `.env`/secret manager.

**Riscos, se adotado.**
- **Commit automático tem de ficar desligado.** `main` é auto-deployado e push direto é
  proibido (D-457/T459) — o fluxo aqui é branch dedicada + PR.
- Custo de tokens em provider pago, com contexto grande.
- Mais um serviço local (Docker) para manter.

**Como adotar, se for decisão do Operador.** (1) instalar uma distro Linux no WSL (ex.: Ubuntu);
(2) instalar o CLI dentro dela (`curl -sL https://plandex.ai/install.sh | bash`); (3) subir o
local mode em Docker; (4) exportar a chave do provider no ambiente do WSL; (5) **desligar o
commit automático** e trabalhar em branch, como qualquer agente deste repositório.
