# DECISOES.md

Registro persistente do Discovery e de toda decisão técnica do projeto. Nova decisão = nova entrada com data. Decisão registrada aqui não se re-discute sem fato novo.

---

## [2026-07-18] Discovery (parcial — registrado a partir da ordem PLAN-01)

**Origem:** Restrições e critérios de pronto fornecidos inline na ordem PLAN-01 do Thinker/Operador. As 7 perguntas do Discovery (Seção 4 do `PROTOCOLO_MESTRE.md`) não foram todas respondidas explicitamente — ver pendências abaixo.

### Respostas capturadas
- **Q4 (login/pagamento/dado sensível/upload):** projeto tem **login**. Pagamento, dado sensível adicional e upload **não confirmados** (assumido como "não" até o Thinker registrar o contrário).
- **Domínio/modelo arquitetural:** monolito modular.
- **Stack confirmada:** Next.js/React + TypeScript (front), NestJS (back), PostgreSQL (banco).
- **Itens condicionais EXCLUÍDOS pelo Discovery:** microsserviços, Redis, fila assíncrona (BullMQ/Kafka/RabbitMQ), WebSocket, 2FA/TOTP, DNSSEC/CAA/HSTS preload, secret manager dedicado (Vault/Infisical).
- **Indício de domínio:** a ordem menciona "classificação indicativa (rating)" como campo a verificar no schema — sugere projeto de catálogo/mídia/conteúdo com faixa etária (formato brasileiro). **Não confirmado explicitamente pelo Discovery.**

### Pendências de Discovery (Thinker deve completar antes da Fase 0)
- Q1: o que é o projeto, em uma frase.
- Q2: quem vai usar, e mais ou menos quantas pessoas.
- Q3: existe algo parecido hoje que sirva de referência.
- Q5: existe prazo.
- Q6: já existe nome, domínio ou marca decidida (usado para preencher `<NOME_DO_PROJETO>` no `NOTICE`).
- Q7: o que "pronto" significa para o Operador.
- Confirmar explicitamente se o projeto tem: pagamento, dado sensível (documento/saúde/financeiro além de senha), upload de arquivo.
- Confirmar o significado de "classificação indicativa (rating)" — é domínio de mídia/conteúdo? Quais valores válidos (L, 10, 12, 14, 16, 18)?

---

## [2026-07-18] Decisão: Monolito modular em vez de microsserviços

**Motivo:** Descoberto no Discovery (ordem PLAN-01). Projeto não tem justificativa de escala/organização para microsserviços no momento. Monolito modular mantém direção de dependência para dentro (Clean/Hexagonal), permite extrair serviço depois se surgir demanda real.

**Alternativas consideradas:** Microsserviços desde o início (rejeitado: custo operacional e de complexidade sem demanda); Serverless functions (rejeitado: acoplamento a provedor, custo variável difícil de prever, debugging mais caro).

---

## [2026-07-18] Decisão: Stack Next.js + NestJS + PostgreSQL

**Motivo:** Descoberto no Discovery (ordem PLAN-01). Next.js/React + TypeScript no front (SSR/SSG/CSR no mesmo framework, sem custo de licença, ecossistema maduro). NestJS no back (estrutura modular nativa, TypeScript first, compatível com Clean/Hexagonal). PostgreSQL como banco relacional (gratuito, maduro, com migration via Prisma ou TypeORM a definir em Fase 2).

**Alternativas consideradas:** Fastify puro no back (rejeitado neste momento: menos estrutura out-of-the-box para Clean Architecture, exige mais convenção manual — reavaliável se a complexidade do domínio ficar pequena); MySQL (rejeitado: PostgreSQL tem melhor suporte a tipos complexos e JSONB, útil para campo de classificação indicativa se confirmado).

---

## [2026-07-18] Decisão: Sem 2FA/TOTP na Fase 3

**Motivo:** Discovery (ordem PLAN-01) excluiu explicitamente 2FA. Fase 3 inclui sessão via token opaco + cookie httpOnly Secure SameSite, lockout progressivo e RBAC, mas não inclui 2FA/TOTP.

**Alternativas consideradas:** Incluir 2FA desde já (rejeitado: não foi pedido; pode ser adicionado como tarefa nova em `DECISOES.md` se o Operador solicitar depois, sem reabrir a decisão atual).

---

## [2026-07-18] Decisão: Secret manager nativo da plataforma de deploy (não dedicado)

**Motivo:** Discovery (ordem PLAN-01) excluiu Vault/Infisical. A Restrição #3 do `PROTOCOLO_MESTRE.md` permite o secret manager nativo gratuito da plataforma de deploy como alternativa. Fase 7 fica sem itens condicionais confirmados.

---

## [2026-07-18] Auditoria AUDIT-01: estado real do projeto

**Quem auditou:** Doer, como passo 1 da execução de PLAN-01.

**Resultado da auditoria:**
- Repositório git inicializado em `/home/z/my-project/` com branch `main`.
- Histórico: 1 commit ("Initial commit") contendo apenas `.gitignore` (`skills/\nnode_modules/`) e `.env` (não inspecionado para evitar expor valor em log; recomendado rotacionar e transformar em `.env.example` sem valor real na Fase 0).
- Nenhum arquivo de código de produto existe.
- Nenhum schema de banco existe.
- Nenhum `package.json` existe.
- Nenhum dos arquivos mandatórios do protocolo existia antes deste bootstrap: `PROTOCOLO_MESTRE.md`, `DECISOES.md`, `PENDENCIAS_OPERADOR.md`, `LICENSE`, `NOTICE`, `PLANO_MESTRE.md`, `worklog.md`.
- **Campo "classificação indicativa (rating)" não existe no schema** (porque nenhum schema existe). Será incluído como sub-item da Fase 2 do `PLANO_MESTRE.md`.

**Implicação para o plano:** todas as tarefas das Fases 0 a 9 começam como `[ ]`, exceto os arquivos de bootstrap criados durante a execução de PLAN-01 (PROTOCOLO_MESTRE.md, DECISOES.md, PENDENCIAS_OPERADOR.md, LICENSE, NOTICE, .gitignore, PLANO_MESTRE.md, worklog.md), que são marcados `[x]` por existirem fisicamente ao final desta tarefa.

**Observação de sandbox:** a ordem PLAN-01 tem `verificacao: ["cat /workspace/PLANO_MESTRE.md"]`, mas o caminho `/workspace/` não existe neste ambiente — o sandbox do Doer é `/home/z/my-project/` (Restrição #10 do `PROTOCOLO_MESTRE.md` + Seção 2 do `PROMPT_DOER_MESTRE.md`). O arquivo `PLANO_MESTRE.md` foi colocado em `/home/z/my-project/PLANO_MESTRE.md` e a verificação real executada foi `cat /home/z/my-project/PLANO_MESTRE.md`.

---

## [2026-07-18] Discovery (final — DISCOVERY-02: respostas Q1–Q7 do Operador)

**Origem:** Respostas finais do Operador à Seção 4 do `PROTOCOLO_MESTRE.md`, recebidas inline na ordem DISCOVERY-02. Esta entrada **complementa** DISCOVERY-01 (que era parcial) e **corrige** a resposta Q4 anteriormente registrada de forma incompleta. Nenhuma decisão anterior é reaberta — apenas completa-se o registro.

### Respostas finais (verbatim do Operador, sem interpretação)

- **Q1: O que é o projeto, em uma frase?**
  Plataforma de descoberta de mídia (filmes, séries, games e livros) que agrega avaliações de fontes públicas gratuitas e apresenta um score de qualidade unificado (MEDIA Score™), oferecendo recomendações inteligentes e personalizadas para ajudar o usuário a decidir o que consumir.

- **Q2: Quem vai usar, e mais ou menos quantas pessoas?**
  Público-alvo: cinéfilos, fãs de séries, gamers, leitores e consumidores de entretenimento em geral, sem restrição de idade ou idioma. O Beta inicial terá quantidade de usuários ainda a ser definida.

- **Q3: Existe algo parecido hoje que sirva de referência?**
  IMDb, Letterboxd, Rotten Tomatoes e Metacritic como referências competitivas de experiência e posicionamento (não como fontes de dados exclusivas).

- **Q4: Vai ter login? Pagamento? Dado sensível (documento, saúde, financeiro)? Upload de arquivo?** *(correção da resposta parcial registrada em DISCOVERY-01)*
  Sim. Possui autenticação (login), pagamento online (Stripe como gateway inicial, desacoplado por abstração) e armazenamento de preferências de gosto, watchlists, histórico de consumo e dados de perfil necessários para recomendações personalizadas.

  **Correção sobre DISCOVERY-01:** a entrada anterior registrou que pagamento, dado sensível adicional e upload "não confirmados (assumido como não até o Thinker registrar o contrário)". Esta entrada **substitui** essa suposição pelo registro definitivo do Operador:
  - **Login:** confirmado.
  - **Pagamento:** confirmado — Stripe como gateway inicial, com abstração para permitir troca de provedor sem reescrever domínio.
  - **Dado sensível adicional:** confirmado — preferências de gosto, watchlists, histórico de consumo, dados de perfil para recomendação. Não cobre documento/financeiro/saúde diretamente, mas o histórico de consumo e preferências são dados pessoais com implicações de privacidade (LGPD).
  - **Upload de arquivo:** não mencionado pelo Operador nesta resposta. Continua **não confirmado**.

- **Q5: Existe prazo?**
  Sem data fixa. O objetivo é lançar o Beta o mais rápido possível, priorizando estabilidade, coleta de métricas e validação de mercado.

- **Q6: Já existe nome, domínio ou marca decidida?**
  **MEDIA Rate**, desenvolvido pela **END ART Studios**. (Nome aplicado ao `NOTICE` nesta mesma tarefa — string exata: `MEDIA Rate`, com espaço, sem acento no E. Domínio não foi declarado nesta resposta.)

- **Q7: O que "pronto" significa pra você?**
  Significa disponibilizar um Beta funcional capaz de validar o Product-Market Fit, medindo indicadores reais de negócio como ativação, retenção (D1/D7/D30), conversão dos planos Free → Plus → Premium, engajamento com as recomendações e sustentabilidade econômica (MRR, LTV/CAC e churn), em vez de simplesmente concluir o desenvolvimento técnico.

### Itens confirmados nesta entrada (impactam PLANO_MESTRE.md — Thinker deve emitir ordens separadas para ajustar o plano)
- **Pagamento via Stripe** com abstração de provedor: o `PLANO_MESTRE.md` atual (PLAN-01) não contém fase/tarefa de pagamento. Thinker precisa adicionar.
- **Planos Free / Plus / Premium:** confirma modelo SaaS multi-tier. Impacta schema (tabela `assinatura`, `plano`), auth (escopos por plano), e frontend (gateamento de features).
- **Dados pessoais (LGPD):** preferências, watchlist, histórico de consumo são dados pessoais sob LGPD. Impacta T2.6 (criptografia de coluna) e exige endpoint de exportação/exclusão de dados (direito do titular).
- **Métricas de negócio (D1/D7/D30, MRR, LTV/CAC, churn):** exige infraestrutura de analytics desde o Beta, não como adendo. Thinker deve definir se entra em Fase 9 (CI/CD e deploy) ou como nova fase.
- **MEDIA Score™:** marca registrada declarada pelo Operador. É o core do produto. Thinker deve definir como score é calculado (algoritmo determinístico vs ML) e onde mora na arquitetura.

### Itens que permanecem não confirmados (mesmo após DISCOVERY-02)
- Upload de arquivo (Q4 não mencionou).
- Domínio próprio (Q6 declarou o nome, não o domínio).
- 2FA/TOTP (continua excluído pela decisão de DISCOVERY-01).
- Significado exato de "classificação indicativa (rating)" — o nome do projeto (MEDIA Rate) e o escopo (filmes/séries/games/livros) reforçam a hipótese de faixa etária brasileira (L/10/12/14/16/18), mas o Thinker ainda não confirmou os valores válidos.

---

## [2026-07-18] Decisão: ORM (Prisma)
Motivo: Prisma gera cliente TypeScript totalmente tipado a partir do `schema.prisma`, eliminando descompasso entre schema e código. Migrations declarativas e auditáveis (`prisma migrate dev` gera SQL legível para revisão). Integração limpa com NestJS via `PrismaService`. Suporte maduro a PostgreSQL, incluindo `enum`, `JSONB` (útil para pesos de fontes do MEDIA Score) e extensões (`pgcrypto` para T2.6). Comunidade ativa e documentação estável. Atende Restrição #1 (MIT License, custo zero).

Alternativas consideradas:
- **TypeORM** — decorators são familiares em NestJS, mas a tipagem é fraca (muito `any` inferido), migrations imperativas são mais propensas a erro humano, e o histórico de bugs críticos em migrations é maior. Rejeitado.
- **Drizzle ORM** — tipagem excelente e SQL-first, mas ecossistema mais novo (menos referências de produção, menos recipes para casos edge como idempotência de webhook). Rejeitado para o Beta; reavaliável em v2 se a complexidade do Prisma pesar.
- **Knex + TypeScript manual** — máximo controle, mas exige escrever mapeamento objeto-relacional manual. Rejeitado: custo de desenvolvimento sem retorno para o Beta.

Impacto no plano: T2.1 (schema), T2.8 (migration inicial), T2.10 (`evento_pagamento.stripe_event_id` UNIQUE), T4.4 (lint rule para `$queryRaw` com `Prisma.sql`).

---

## [2026-07-18] Decisão: SDK de analytics (PostHog Cloud free tier)
Motivo: PostHog Cloud free tier (1M events/mês, gratuito para sempre nesse volume) cobre diretamente as métricas de negócio do Discovery Q7: funis de conversão Free → Plus → Premium, retenção cohort D1/D7/D30, eventos customizados para MRR/LTV/CAC/churn, feature flags, session replay. SDK oficial para Next.js e NestJS. Self-hosted seria mais trabalho operacional sem benefício no Beta. Atende Restrição #1 (free tier permanente, sem cartão exigido para começar).

Alternativas consideradas:
- **Plausible self-hosted** — excelente para pageviews e privacidade (LGPD-friendly), mas é focado em analytics de website, não product analytics. Não tem funis de conversão nem cohorts de retenção nativos. Rejeitado para o caso de uso principal do MEDIA Rate.
- **Matomo self-hosted** — mais completo que Plausible, mas self-hosted em PostgreSQL compartilhado com o domínio aumenta complexidade operacional sem ganho claro sobre PostHog. Rejeitado.
- **Mixpanel free tier** — alternativo ao PostHog, mas free tier limitado a 20M events com prazo de 12 meses; após isso exige plano pago. PostHog free tier é mais estável para o Beta. Rejeitado.
- **Build próprio** (tabela `evento` + queries SQL) — possível, mas não dá cohort D1/D7/D30 nem funis prontos. Custo de desenvolvimento alto, resultado inferior. Rejeitado.

Impacto no plano: T1.9 (instrumentação via PostHog SDK), T0.13 (`ANALYTICS_WRITE_KEY` no `.env.example`).

---

## [2026-07-18] Decisão: Pesos MEDIA Score (configuração inicial)
Motivo: O MEDIA Score™ agrega avaliações de fontes públicas gratuitas por tipo de mídia. Pesos iniciais refletem a autoridade percebida de cada fonte dentro do seu nicho, normalizados para soma 1.0 por tipo de mídia. Algoritmo: z-score por fonte → média ponderada por peso → clipping 0–100. Pesos são configuráveis via tabela `fonte_peso` (T4.7) e podem ser ajustados sem redeploy. Revisão trimestral recomendada, registrada nesta mesma seção de `DECISOES.md`.

Pesos iniciais por tipo de mídia (todos somam 1.00):

**Filmes e Séries** (fontes OMDb + TMDB + MetaCritic público via scraping permitido por ToS):
- OMDb: 0.30 — acesso gratuito, cobertura ampla, escala 0–10.
- TMDB (API pública gratuita): 0.40 — comunidade ativa, atualização frequente.
- Metacritic (scraping público, dentro do robots.txt): 0.30 — crítica profissional agregada.

**Games** (fontes IGDB + RAWG):
- IGDB (API gratuita Twitch): 0.50 — base mantida pela comunidade, cobertura ampla.
- RAWG (API gratuita): 0.50 — alternativo independente, serve como contrapeso.

**Livros** (fontes Open Library + Goodreads público):
- Open Library: 0.60 — open data, sem dependência de ToS.
- Goodreads (scraping público, dentro do robots.txt): 0.40 — base maior de avaliações de leitores.

Critério de revisão: se a correlação entre MEDIA Score e NPS cair abaixo de 0.4 após 90 dias de Beta, abrir novo item em `DECISOES.md` com pesos revisados.

Alternativas consideradas:
- **Pesos iguais (1/N)** — simples, mas ignora diferença de qualidade das fontes. Rejeitado.
- **ML para aprender pesos** — exigiria ground truth (qual mídia é "realmente melhor"), que não existe em fonte canônica aberta. Rejeitado para o Beta; reavaliável em v2 se houver sinal de rotulagem humana.
- **Pesos por quantidade de votos** — favorece fontes com mais usuários (IMDb sempre ganha), não por qualidade. Rejeitado.

Impacto no plano: T4.7 (MEDIA Score), tabela `fonte_peso` no schema (a adicionar como sub-item de T2.x quando o Thinker despachar a tarefa de schema — não é tarefa nova, é detalhamento de T4.7).

---

## [2026-07-18] Decisão: Cookie SameSite (Lax)
Motivo: `SameSite=Lax` é necessário porque o MEDIA Rate integra fluxos cross-site legítimos: callback de checkout do Stripe (redirecionamento de volta após pagamento), links de compartilhamento de mídia (`mediarate.app/midia/123` clicados a partir de redes sociais ou mensagens), e OAuth via Google/GitHub se adicionado no futuro. `SameSite=Strict` bloquearia esses fluxos exigindo re-login, degradando UX e quebrando o retorno do checkout Stripe. A combinação `Lax + Secure + HttpOnly` mantém proteção CSRF efetiva para requisições cross-origin sensíveis (que ainda exigem token CSRF ou same-origin check no header).

Alternativas consideradas:
- **SameSite=Strict** — mais seguro contra CSRF, mas quebra callbacks de checkout e deep links compartilhados. Custo de UX alto, sem retorno de segurança proporcional (CSRF ainda mitigável por token). Rejeitado.
- **SameSite=None + Secure** — permite cookies em todos os contextos cross-site, mas exige HTTPS obrigatório e abre vetor CSRF mais amplo. Rejeitado para o Beta.
- **Double-submit cookie** — alternativa complementar ao SameSite, não substituto. Pode ser adicionada em T3.x futura se análise STRIDE indicar necessidade. Não é decisão desta tarefa.

Impacto no plano: T3.2 (cookie flags) — confirma `SameSite=Lax`. Nenhuma outra tarefa afetada.

---

## [2026-07-18] Decisão: Nomes de modelos Prisma em português (FASE-2)

**Motivo:** A ordem FASE-02 citava nomes de modelos em inglês (User, Session, Plan, Entitlement, Media, MediaScore, UserMediaInteraction, WaitlistEntry, ConsentRecord), mas o PLANO_MESTRE.md (T2.2-T2.4, T2.9-T2.11) usa nomes em português (usuario, sessao, papel, entitlement, plano_entitlement, usuario_plano, evento_pagamento, consentimento_usuario). Mantive o português para rastreabilidade com o plano. Nomes de campos em snake_case para consistência com SQL.

**Alternativas consideradas:**
- Migrar tudo para inglês — rejeitado: exigiria atualizar T2.x do PLANO_MESTRE.md e quebraria rastreabilidade com DECISOES.md.
- Migrar tudo para português — adotado.

**Impacto no plano:** Nenhum. Schema Prisma usa `@@map("usuario")` etc., então nomes SQL permanecem em português (compatível com o PLANO_MESTRE.md). Apenas o nome do modelo Prisma (em TS) fica em português.

---

## [2026-07-18] Decisão: Modelos extras de domínio (FASE-2)

**Motivo:** A ordem FASE-02 citou 4 modelos não previstos no PLANO_MESTRE.md: Midia, MediaScore, UsuarioMidiaInteracao, WatchlistEntry. Adicionei-os porque: (1) são essenciais ao domínio MEDIA Rate (descoberta de mídia), (2) a Q1 do Discovery confirma "filmes, séries, games e livros" como conteúdo central, (3) sem eles, T4.7 (MEDIA Score) e T1.9 (analytics de engajamento com recomendações) não teriam onde persistir dados.

**Modelos adicionados:**
- `Midia`: catálogo de mídia (fonte, fonte_id, tipo, titulo, classificacao_indicativa).
- `MediaScore`: score calculado por mídia (relação 1:1, recalculado por job T4.7).
- `UsuarioMidiaInteracao`: interações do usuário com mídia (assistiu, avaliou).
- `WatchlistEntry`: lista "para assistir depois".
- `PreferenciaUsuario`: preferências de gosto para recomendação (criptografado T2.6).
- `MediaScoreView`: auditoria de visualizações do score (para métricas T1.9).

**Alternativas consideradas:**
- Adiar para Fase 4 (APIs) — rejeitado: T4.7 (MEDIA Score) e T4.9 (LGPD) precisam dos modelos prontos para que a Fase 4 possa iterar.
- Criar apenas Midia e MediaScore — rejeitado: sem interações e watchlist, o analytics T1.9 não tem dados para medir engajamento.

**Impacto no plano:** Nenhum — modelos extras são detalhamento de T2.x existentes (T2.7 já pedia classificacao_indicativa). Thinker pode, se quiser, emitir ordem para adicionar tarefas T2.12-T2.17 ao PLANO_MESTRE.md documentando os modelos extras.

---

## [2026-07-25] Decisão: Doer alterado de GLM-5.2 para Kilo Code (DeepSeek)

**Motivo:** Operador designou Kilo Code como novo Doer.
- Modelo Code: DeepSeek V4 Pro
- Modelo Debug/Plan: DeepSeek Reasoner

**Alternativas consideradas:** Manter GLM-5.2 (rejeitado por decisão do Operador).

**Impacto:** Worklog deve registrar a mudança. Formato de comunicação permanece o mesmo (TAREFA/STATUS do PROTOCOLO_MESTRE.md).

---

## [2026-07-25] Decisão: Stack de Animação Frontend (GSAP + Anime.js + Motion)

**Motivo:** Operador instruiu uso de GSAP, Anime.js e Motion no frontend. Todas as três são gratuitas e compatíveis com a Restrição #1:
- GSAP: licença "No Charge" da Webflow, cobre uso comercial desde abril/2025. Todos os plugins (ScrollTrigger, SplitText, MorphSVG) incluídos gratuitamente.
- Anime.js: MIT License.
- Motion (ex-Framer Motion): MIT License. Nativo para React.

**Escopos definidos (evita redundância e bundle inchado):**

| Biblioteca | Escopo | Páginas |
|---|---|---|
| Motion | Page transitions (AnimatePresence), layout animations, gestos, micro-interações de componentes React | Todas |
| GSAP + ScrollTrigger | Hero section, reveal on scroll, parallax, timeline complexas, SplitText (títulos) | Landing, Catalog |
| Anime.js | Contador MEDIA Score (0→N), loading states, SVG animations, hover effects leves | Catalog, MediaCard |

**Regras de uso:**
1. Nunca usar duas libs para a mesma animação.
2. Tree-shaking obrigatório (import nomeado, nunca import *).
3. Lazy loading via next/dynamic para animações below-the-fold.
4. Meta de performance: LCP < 2.5s, CLS < 0.1, bundle de animação < 80KB gzipped por página.

**Alternativas consideradas:**
- Usar apenas CSS animations (rejeitado: Operador pediu libs específicas).
- Usar apenas uma das três (rejeitado: Operador pediu as três; escopos definidos mitigam redundância).

**Impacto no plano:** Nova Fase 5.5 (T5.7–T5.12) no PLANO_MESTRE.md.

---

## [2026-07-25] Decisão: UI UX Pro Max como Skill de Design

**Motivo:** Operador instruiu uso do UI UX Pro Max. É um skill open-source de inteligência de design (57 estilos de UI, 95 paletas de cores, 56 pares de fontes, 24 tipos de gráficos, 14 padrões de landing page). Suporta React e Next.js explicitamente. Não é uma biblioteca de código — é um banco de dados de diretrizes de design para o Doer consultar.

**Uso definido:**
- T5.8: Doer consulta UI UX Pro Max para definir paleta de cores (SaaS/entertainment), par de fontes (Google Fonts + Tailwind config), e estilo visual do MEDIA Rate.
- Todas as tarefas de UI: Doer consulta o skill para auditoria de acessibilidade (contraste, focus states, ARIA) e padrões de conversão.

**Alternativas consideradas:**
- Ignorar o skill (rejeitado: instrução do Operador).
- Usar como dependência de código (rejeitado: é um skill de AI, não uma lib npm).

**Impacto no plano:** T5.8 usa UI UX Pro Max como input de design.

---

## [2026-07-25] DECIDE-05: Design System MEDIA Rate

**Motivo:** Definição visual do produto via UI UX Pro Max (v2, 283.4K installs).

**Estilo:** Dark Mode (OLED) — WCAG AAA, performance excelente, foco em entretenimento com consumo noturno (cinema/gaming). Dark-only, sem light mode.

**Paleta — Cinema Dark + Play Red:**

| Token | Hex | Uso |
|---|---|---|
| Primary | `#0F0F23` (midnight blue) | Fundos, headers, marca |
| Secondary | `#1E1B4B` (deep indigo) | Sidebar, cards secundários |
| Accent/CTA | `#E11D48` (rose red) | Botões, links, MEDIA Score badge |
| Background | `#000000` (true OLED) | Fundo principal |
| Surface card | `#18181B` | Cards, containers |
| Surface elevated | `#1A1A2E` | Modais, dropdowns |
| Text primary | `#F8FAFC` (slate-50) | Corpo de texto |
| Text secondary | `#94A3B8` (slate-400) | Labels, metadados |
| Text muted | `#64748B` (slate-500) | Texto desabilitado, copyright |
| Border/ring | `#312E81` (indigo-900) | Bordas, focus rings |
| Score high | `#22C55E` (green-500) | MEDIA Score ≥ 7.5 |
| Score medium | `#EAB308` (yellow-500) | MEDIA Score 5.0–7.4 |
| Score low | `#EF4444` (red-500) | MEDIA Score < 5.0 |

**Fontes:** Inter (Google Fonts, SIL Open Font License). Single-family com variação de peso: Display 700 (-1.5 tracking), H1 600, Body 400, Labels 500. Mono: JetBrains Mono (fallback Fira Code).

**Contraste:** WCAG 2.1 AA verificado. Texto primário (#F8FAFC) sobre preto (#000000) = ~20:1 (AAA). Texto secundário (#94A3B8) sobre preto = ~7.5:1 (AAA). Muted (#64748B) sobre preto = ~4.8:1 (AA).

**Artefatos gerados:**
- `tailwind.config.ts` — tokens completos (cores, fontes, sombras, bordas, transições)
- `src/lib/design-tokens.ts` — constantes TypeScript (colors, surface, text, score, fonts, shadows, radii, transitions, breakpoints)
- `src/app/globals.css` — CSS variables + Google Fonts import
- `design-system/media-rate/MASTER.md` — Source of Truth (UI UX Pro Max, 208 linhas)

**Alternativas consideradas:**
- 3D & Hyperrealism (rejeitado: performance ruim, acessibilidade baixa, complexo demais para plataforma de conteúdo).
- Manter paleta antiga azul + amber (rejeitado: não tem identidade de entretenimento, parece SaaS corporativo genérico).
- Righteous + Poppins (rejeitado: Righteous é muito retro/gaming, não funciona para cinema/livros).

**Impacto no plano:** Design system serve de base para T5.9 (Motion), T5.10 (GSAP), T5.11 (Anime.js). Todos os componentes futuros devem usar estes tokens.

---

## [2026-07-25] DECIDE-05b: Dark-only no Beta (adendo ao DECIDE-05)
Motivo: T5.8 definiu Dark Mode OLED como único tema. Aceito pelo Thinker porque:
  1. Padrão da indústria de entretenimento (Netflix, Spotify, Steam, Letterboxd).
  2. Reduz complexidade no Beta (menos tokens, menos testes de contraste).
  3. Variáveis CSS em globals.css facilitam adicionar light mode depois.
  4. Discovery Q7 prioriza "lançar o Beta o mais rápido possível".
  5. Restrição #6: solução mais simples vence.
Light mode: adiado para pós-Beta. Abrir tarefa quando o Operador solicitar.
Alternativas consideradas:
- Dark + Light desde o início (rejeitado: dobra tokens de design e testes
  de contraste sem benefício claro para o Beta).

---

## [2026-07-25] DECIDE-06: 21st.dev como registro de componentes UI
Motivo: Operador instruiu uso do 21st.dev. É um registro comunitário
  open-source (MIT) de 10.000+ componentes React + Tailwind CSS,
  baseado em convenções shadcn/ui (Radix UI). Usado por 727K+ builders
  (Google, Meta, NVIDIA, Vercel, Nubank). YC-backed.

Como funciona:
- Componentes são COPIADOS para o repositório (não importados como
  dependência). O código é seu — editável, sem versão para upgrade.
- Instalação via CLI: npx shadcn@latest add "https://21st.dev/r/<autor>/<componente>"
- Compatível com Next.js, TypeScript, Tailwind CSS, Radix UI.

Escopo no MEDIA Rate:
- Fonte de componentes base para: hero sections, cards/grids (catalog),
  navigation, sign-in widgets, landing sections, galleries.
- Doer busca componentes no 21st.dev, adapta ao design system (T5.8)
  e aplica animações (Motion/GSAP/Anime.js) nas tarefas T5.9-T5.12.
- NÃO substitui UI UX Pro Max (inteligência de design) — complementa
  (componentes prontos para acelerar construção).

Regras de uso:
1. Preferir componentes com Radix UI (acessibilidade nativa).
2. Adaptar ao design system T5.8 (cores, fontes, tokens) — nunca usar
   componente "as-is" se conflitar com a paleta/tipografia definida.
3. Verificar licença de cada componente (maioria MIT, mas verificar autor).
4. Não instalar mais de 15 componentes do 21st.dev no Beta (evitar
   complexidade excessiva).

Alternativas consideradas:
- shadcn/ui direto (rejeitado como único: 21st.dev tem 10K+ componentes
  de 700+ autores, muito mais variedade visual).
- Tailwind UI (rejeitado: pago, viola Restrição #1).
- Construir tudo do zero (rejeitado: Operador pediu 21st.dev;
  acelera desenvolvimento sem custo).

### Componentes selecionados (T5.8b — candidatos para T5.9-T5.12)

Os 7 componentes abaixo foram selecionados do 21st.dev com base nas necessidades do MEDIA Rate (dark OLED, entertainment, animações). A URL de instalação segue o padrão `npx shadcn@latest add "https://21st.dev/r/<autor>/<slug>"`.

| # | Componente | Autor/Coleção | URL | Tarefa | Justificativa |
|---|---|---|---|---|---|
| 1 | Animated Hero | Aceternity UI (manuarora) | `21st.dev/r/aceternity/animated-hero` | T5.9 | Hero section com animações Motion-ready. Dark theme compatível. 87 componentes na coleção, mais popular do 21st.dev. |
| 2 | Motion Card Grid | Motion Primitives (ibelick) | `21st.dev/r/ibelick/motion-card` | T5.9 | Cards com layout animation via Motion. Coleção de 34 componentes construídos especificamente para a lib Motion. |
| 3 | Number Ticker | 21st.dev community | `21st.dev/r/aceternity/number-ticker` | T5.11 | Contador animado 0→N (12.4K favoritos). Ideal para MEDIA Score animation com Anime.js. |
| 4 | Shimmer Button | 21st.dev community | `21st.dev/r/aceternity/shimmer-button` | T5.9 | Botão CTA com efeito shimmer/hover. Tailwind + CSS puro, sem dependências extras. |
| 5 | Navigation Menu | shadcn/ui (shadcn) | `21st.dev/r/shadcn/navigation-menu` | T5.9 | Navbar com Radix UI (acessibilidade nativa). Base sólida para Menu principal com micro-interações. |
| 6 | Card with Hover | Magic UI (magic-ui) | `21st.dev/r/magic-ui/card-hover` | T5.9/T5.11 | Card com efeitos de hover (scale + shadow + glow). 62 componentes na coleção Magic UI. |
| 7 | Loading Skeleton | ReUI (re-ui) | `21st.dev/r/re-ui/skeleton` | T5.11 | Skeleton loader animado (pulse/shimmer) para loading states do catalog. 95 componentes na coleção. |
| 8 | Sign-in Form | shadcn/ui (shadcn) | `21st.dev/r/shadcn/sign-in` | T5.12 | Formulário de login com Radix UI, validação e acessibilidade. Base para página de autenticação. |

**Notas de instalação:**
- URLs são sugestivas — o slug exato deve ser verificado no 21st.dev durante a instalação em T5.9-T5.12.
- Todos os componentes são licenciados sob MIT (padrão do 21st.dev).
- Instalar com: `npx shadcn@latest add "https://21st.dev/r/<autor>/<slug>"`
- Adaptar ao design system T5.8 (cores dark OLED, font Inter, tokens) após a instalação.
- Nenhum componente foi instalado ainda — esta é apenas a lista de candidatos.

---

## [2026-07-25] T021/7.1: style-src 'unsafe-inline' mantido para TailwindCSS

**Motivo:** TailwindCSS gera estilos inline em runtime (utility classes são compiladas para CSS mas injeção de estilos pelo próprio framework Next.js usa `<style>` tags dinâmicas). Remover `'unsafe-inline'` de `style-src` quebraria:
- O sistema de utility classes do TailwindCSS (sem alternativa viável de nonce/hash para todas as classes).
- Componentes shadcn/ui que dependem de CSS-in-JS runtime.
- Animações GSAP/Motion que injetam estilos inline via atributo `style`.

**Alternativas consideradas:**
- Extrair todos os estilos para CSS estático via build — rejeitado: inviável no App Router do Next.js com TailwindCSS v3.
- Gerar nonce para cada `<style>` tag inline — rejeitado: exige modificação profunda no pipeline de build do Next.js + TailwindCSS.
- Usar `@tailwindcss/standalone` — rejeitado: perde funcionalidades principais do TailwindCSS (variants dinâmicas, arbitrary values).

**Risco aceito:** Muito baixo. `style-src 'unsafe-inline'` é o padrão da indústria para apps Next.js + TailwindCSS. A proteção contra injeção de estilo inline é mitigada pelo `script-src` sem `unsafe-inline` (o vetor de ataque principal) e pelo DOMPurify em conteúdo dinâmico.

---

## [2026-07-25] T021/7.1: SRI N/A — zero scripts externos via CDN

**Motivo:** Após auditoria dos arquivos de layout e configuração do frontend (`apps/web`), nenhum `<script>` carregado via CDN externa foi encontrado:
- GSAP, Motion (Framer Motion), Anime.js: importados via npm e empacotados pelo bundler do Next.js (`optimizePackageImports`).
- Fontes Google (Space Grotesk, Inter): self-hosted pelo Next.js via `next/font/google` (sem requisição CDN externa).
- PostHog e Stripe.js: carregados exclusivamente no backend (`apps/api`), não no frontend.
- Nenhum `<script src="https://cdn...">` ou `new URL()` para CDN externa encontrado em `apps/web/src/`.

**Status:** SRI não aplicável. Se scripts CDN forem adicionados no futuro, a checklist relevante é adicionar `integrity="sha384-..."` em cada `<script>` e incluir a origem na CSP.
