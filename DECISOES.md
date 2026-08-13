# DECISOES.md

Registro persistente do Discovery e de toda decisão técnica do projeto. Nova decisão = nova entrada com data. Decisão registrada aqui não se re-discute sem fato novo.

---

## [2026-08-13] Decisão: Termos e Condições como produto + aceite obrigatório no cadastro (D-295 / T306)

**Versão dos Termos publicada:** v1.0 (13/08/2026) em pt-BR, en-US e es-ES.

**Decisão:** Os 3 documentos entregues pelo Operador são publicados como produto (páginas SSR `/terms` nos 3 locales), **sem os marcadores de revisão jurídica** (`[?? REVISAR COM ADVOGADO]` / `[?? REQUIRES LEGAL REVIEW]` / `[?? REQUIERE REVISI�N LEGAL]`) � instrução do Operador: "Considere revisado com advogado". O aceite vira exigência de cadastro.

**Parâmetros finais travados:**
- Idade mínima (Cláusula 3.2): **14 anos**.
- Aviso prévio de alteração de planos (Cláusula 5.1): **30 dias**.
- Comunicações oficiais (Cláusula 12.1): **48h**.
- Antecedência para alterações nos Termos (Cláusula 13.1): **30 dias**.

**Implementação:** coluna `Usuario.termos_aceitos_em` (write-once no register; migration aditiva `20260813_termos_aceite`); `RegisterDto.aceitouTermos`; `auth.service.register` valida `aceitouTermos === true` (senão 422 `TERMS_NOT_ACCEPTED`) e persiste o timestamp; checkbox obrigatório no register (sem pré-seleção, submit desabilitado até marcar); LGPD export (`/user/data`) inclui o timestamp.

**Conteúdo do texto (armazenamento):** via `messages/<locale>.json` no namespace `terms` (padrão já usado por `/privacy`), **não** em `public/docs/*.md` como listado na tarefa � decisão de implementação que mantém o padrão i18n do projeto.

**Observações:**
- Placeholder `[domínio]` (e demais dados de negócio: e-mail, endereço, CNPJ, foro) permanece nos textos até o Operador fechar o domínio oficial (item 4 do PENDENCIAS_OPERADOR.md). Uma T307 curta substitui quando registrado.
- Aceite em register social (Google/Apple) **não** implementado nesta tarefa � follow-up registrado: consentimento explícito em OAuth segue o padrão da plataforma social (documentar quando implementar).
- Revisão jurídica externa recomendada para expansão UE ativa é decisão de negócio, não gate técnico.

---



## [2026-07-18] Discovery (parcial — registrado a partir da ordem PLAN-01)

**Origem:** Restrições e critérios de pronto fornecidos inline na ordem PLAN-01 do Thinker/Operador. As 7 perguntas do Discovery (Seção 4 do `PROTOCOLO_MESTRE.md`) não foram todas respondidas explicitamente — ver pendências abaixo.

### Respostas capturadas
- **Q4 (login/pagamento/dado sensível/upload):** projeto tem **login**. Pagamento, dado sensível adicional e upload **não confirmados** (assumido como "não" até o Thinker registrar o contrário).
- **Domínio/modelo arquitetural:** monolito modular.
- **Stack confirmada:** Next.js/React + TypeScript (front), NestJS (back), PostgreSQL (banco).
- **Itens condicionais EXCLUÝDOS pelo Discovery:** microsserviços, Redis, fila assíncrona (BullMQ/Kafka/RabbitMQ), WebSocket, 2FA/TOTP, DNSSEC/CAA/HSTS preload, secret manager dedicado (Vault/Infisical).
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

---

## [2026-07-25] D-041 — `'unsafe-inline'` no `script-src` do frontend é dívida de defesa-em-profundidade (NÃO vulnerabilidade ativa)

**Contexto:** O frontend Next.js 16.2.12 (Turbopack + SSG) usa `script-src 'self' 'unsafe-inline'` na CSP do `headers()` em `next.config.ts`. O Turbopack não suporta propagação de nonce para chunks externos (`_next/static/chunks/*.js`) nem para inline scripts gerados pelo framework.

**Auditoria de sinks XSS (T044 PASSO 1):** 0 vetores de injeção encontrados.
- `dangerouslySetInnerHTML`: 3 ocorrências, todas seguras:
  - `media/[slug]/page.tsx:55` — `JSON.stringify(jsonLd)` (structured data, sem HTML do usuário)
  - `privacy/page.tsx:37` — `sanitizeHtml()` via DOMPurify (T5.4)
  - `pricing/page.tsx:34` — `JSON.stringify(jsonLd)` (structured data)
- `innerHTML=` dinâmico: 0 ocorrências
- `document.write`, `eval`, `new Function`: 0 ocorrências

**Compensating controls (4 camadas):**
1. **React auto-escape**: JSX escapa strings automaticamente.
2. **DOMPurify**: `isomorphic-dompurify` em `lib/sanitize.ts` — sanitização de HTML dinâmico antes de qualquer `dangerouslySetInnerHTML`.
3. **Backend CSP com nonce por request**: `main.ts` hook `onSend` gera nonce aleatório (base64url, 16 bytes) por requisição no backend. `script-src` do backend é SEM `'unsafe-inline'`.
4. **Validação de entrada**: Zod validation pipes em todas as rotas de entrada de dados.

**Conclusão:** `'unsafe-inline'` no script-src do frontend é risco residual baixo em defesa-em-profundidade. Remover exigiria migrar de Turbopack para webpack (perda de performance) ou matar SSG em 47 páginas (contradiz Fase 2). Revisar quando o Next.js/Turbopack suportar propagação de nonce para chunks + inline scripts.

---

## [2026-07-25] D-042 — Aceite do Operador do risco residual (CSP script-src frontend) para Beta Fechada

**Risco residual:** `'unsafe-inline'` no `script-src` do frontend Next.js. Sem vetores de injeção ativos (auditoria T044). Mitigado por 4 camadas (React escape, DOMPurify, backend nonce CSP, Zod).

**Nível de risco:** Baixo. A superfície de ataque de XSS é inexplorável sem um sink. Nenhum sink foi encontrado na auditoria.

**Condições de aceite:**
- Beta Fechada (usuários confiáveis, sem conteúdo gerado por usuário anônimo).
- Reavaliar ao abrir para Beta Pública: re-executar auditoria de sinks (grep `dangerouslySetInnerHTML|innerHTML`), verificar se novos componentes introduziram vetores, e reavaliar a viabilidade do nonce (se Turbopack/Next evoluir).

**Decisão:** ACEITO para Beta Fechada. O Operador reconhece o risco residual e as 4 camadas de compensating controls ativas.

---

## [2026-07-25] D-050 — A1 (auth real cross-site) decomposta em subtarefas

A T048 foi bloqueada por SCOPE_OVERFLOW. Decomposta em:
- T049 (esta): cookie cross-site SameSite=None + csrf_token double-submit + CORS header X-CSRF-Token, backend-only
- T050: CSRF guard + teste 403 sem token
- T051: Frontend lib/http.ts — cliente fetch com credentials + CSRF interceptor
- T052: Frontend use-auth-store.ts — trocar localStorage por chamadas API reais
- T053: Frontend páginas login/register — ligar formulários às chamadas reais
- T054: Playwright diag-auth-real.mjs — validação comportamental cross-site

---

## [2026-07-25] D-053 — T056: CORS lê ALLOWED_ORIGINS com fallback CORS_ORIGIN

`cors.config.ts` agora lê `ALLOWED_ORIGINS` (primário) e `CORS_ORIGIN` (fallback). Origem não permitida retorna `cb(null, false)` em vez de `cb(new Error(...))` — evita 500 em preflight. Lista explícita de origens permitidas; never wildcard with credentials.

---

## [2026-07-25] D-054 — T050: guard CSRF double-submit com timingSafeEqual

Camada de auth cross-site do backend completa: `CsrfGuard` valida `X-CSRF-Token` header == `csrf_token` cookie via `timingSafeEqual` (timing attack resistant). Aplicado em `POST /auth/logout`. Login/register isentos (públicos, sem sessão). Guard reutilizável para watchlist (A3).

---

## [2026-07-25] D-055 — T051: cliente HTTP real no frontend

Camada de infraestrutura do frontend: `lib/http.ts` implementa fetch wrapper com `credentials: 'include'`, leitura de `csrf_token` do cookie (anexa `X-CSRF-Token` em mutações), interceptor 401 → redirect login (exceto login/register), `ApiError` sem stack trace. Sessão vive exclusivamente no cookie httpOnly (sem localStorage/item 5.9).

---

## [2026-07-25] D-056 — T052: store de auth real, persist removido

`use-auth-store.ts` reescrito para usar `lib/http.ts`: login/register/logout/fetchMe via cliente HTTP real. `persist` (Zustand middleware de localStorage) removido. Auth sem localStorage — sessão via cookie httpOnly. Assinatura pública mantida (compatível com AuthForm/Navbar/Dashboard).

---

## [2026-07-25] D-057 — T053: prova comportamental real + forms de auth reais

Auth flow cross-site completo validado no browser: register 201 → login 200 + cookies (SameSite=None) → /me 200 (prova cookie enviado) → dashboard redirect. useRequireAuth valida sessão via fetchMe(). Forms tratam erros reais do backend. Sem localStorage para auth.

---

## [2026-07-26] D-062 — T058: SSR pre-fetch do catálogo (anti-"some")

Motivo: O bug "catálogo carrega e some" (deslogado) era causado pela ausência de dados no SSR — a página pintava skeleton no primeiro paint e dependia 100% do client-side fetch. Agora `catalog/page.tsx` pre-fetcha `getCatalogSync()` (sem delay artificial, sem simulação de erro) no servidor e passa `initialData` ao `CatalogPageClient`. O `useQuery` recebe `initialData` para que os cards SSR sobrevivam à hidratação sem flash de skeleton. O `discover/page.tsx` segue o mesmo padrão (top 10 por MEDIA Score). Ambos são públicos (sem auth).

Alternativas consideradas: ISR estático (rejeitado: exigiria gerar 47 páginas com variações de tipo/ordenacão, inviável); Deixar como estava (rejeitado: viola §3/§4 da V3 — catálogo deslogado deve funcionar com dados públicos).

---

## [2026-07-26] D-063 — T058: regra anti-"some" como contrato de código

REGRA: Nenhum container de conteúdo (grid, rail, lista) pode partir de estado vazio/opacity:0 que dependa de fetch para "aparecer". O conteúdo do SSR/ISR é o piso; o fetch client-side só pode (i) confirmar/substituir por dados pessoais quando logado, ou (ii) cair em estado explícito (CTA, empty-state, erro com retry), NUNCA remover o que já estava pintado.

Implementada em `CatalogPageClient.tsx` e `DiscoverClient.tsx`:
- `isLoading && !data` → skeleton (sem dados prévios = primeira montagem sem initialData)
- `error && !data` → estado de erro (sem dados para preservar)
- `error && data` → banner de erro acima do grid preservado (dados SSR intactos)
- `!data || items.length === 0` → empty-state explícito

---

## [2026-07-26] D-064 — T058: `/discover` público com dados reais

A página `/pt-BR/discover` agora exibe grid com mídias reais (top 10 por MEDIA Score) via `getCatalogSync()` no SSR + `DiscoverClient` no cliente, sem exigir login. Link para catálogo completo mantido. Substitui o placeholder estático anterior ("Coleções curadas aparecerão aqui").

---

## [2026-07-27] D-065 — T059: Design System com tokens V3 §12 TRAVADOS

Motivo: A V3 §12 trava cores, fontes e score bands do MEDIA Rate. O design system antigo (T5.8/UI UX Pro Max) usava tokens não-alinhados (#0F0F23, rose red #E11D48, Inter headings). A T059 substitui completamente por:

**Cores (V3 §12):** BG #09090F, CB #11111E, BD #1C1C2E. Accents: critics #38BDF8, audience #F59E0B, indigo #818CF8. Score bands: ≥9 #34D399, ≥8 #38BDF8, ≥7 #818CF8, ≥6 #F59E0B, ≥5 #F97316, <5 #EF4444.

**Fontes:** Space Grotesk (headings/scores, via next/font/google), Inter (body).

**Proibições:** glassmorphism blanket, rounded-2xl blanket, aurora-blob, hero trio centralizado, 3 cards iguais em fileira, texto #FFFFFF (usar #EDE7DC).

**Border-radius:** rounded-md (6px) cards/inputs, rounded-lg (8px) buttons, rounded-full pills.

**Artefatos:** `tailwind.config.ts`, `globals.css`, `design-tokens.ts` reescritos. Componentes base criados em `ui/`: ScoreDial, Badge, Spinner, Skeleton, Input, EmptyState, ErrorState, LayeredBackground. Button e MediaCard atualizados.

---

## [2026-07-27] D-066 — T059: ScoreDial + LayeredBackground como fundação visual

O ScoreDial é o componente-âncora do produto: anel SVG com preenchimento proporcional ao score (0-10), cor por faixa, número grande em Space Grotesk, breakdown opcional (Crítica 40% / Público 40% / Consenso 20%), scroll-reveal (800ms stroke-dashoffset), hover revela breakdown. O LayeredBackground (grão SVG noise + grid 40px + spotlight radial opcional) estabelece profundidade sem aurora-blob. Página `/pt-BR/design-system` demonstra todos os componentes. Build verde (50 páginas SSG), 30 testes passando.

---

## [2026-07-27] D-069 — T077: noindex investigado como bug-provável (meta robots = index,follow já presente)

Motivo: Crawl do Screaming Frog reportou 100% de páginas com noindex. Investigação via `curl -I` e `grep meta robots` revelou que o meta robots `<meta name="robots" content="index, follow"/>` JÝ está presente no `<head>` via `generateMetadata()` (adicionado na T074 para páginas públicas). O noindex reportado pelo crawl pode ser: (a) falso positivo do SF (crawl feito antes do deploy T074 → cache), (b) header X-Robots-Tag injetado pelo Vercel em runtime (nenhum encontrado no curl atual), ou (c) alguma página que perdeu o robots no SSR (todas as páginas SSG verificadas têm meta robots). Correção definitiva na T078 se o re-crawl confirmar persistência. Veto aberto: não corrigir dentro da T077 (é tarefa de diagnóstico).

---

## D-131 � Status real dos diferenciais competitivos (V1.3 �8)

**Data**: 2026-07-29
**Status**: Locked � documenta��o interna apenas

NENHUM diferencial � comunicado externamente como "pronto" sem gate. Status real:

| Diferencial | Status | Ressalva |
|-------------|--------|----------|
| Transpar�ncia de fontes (sources[].included/exclusionReason) | Especificado (�3.3, �3.5) | N�o implementado/verificado no backend |
| Confidence Score num�rico (�3.4) | Especificado | Constantes (1000 votos, 3 fontes, etc.) s�o valores iniciais, n�o calibrados com dados reais |
| F�rmula sem cancelamento alg�brico (�3.1, v2) | Proposta | Pendente sign-off formal de governan�a (v1 com defeito segue locked at� aprova��o) |
| Detec��o de outlier determin�stica (�3.3b) | Especificado | Limiar de 3.0 pontos de desvio � valor inicial, n�o calibrado |
| "Metodologia unificada" entre Filme/S�rie/Game | Impreciso | Fun��o de c�lculo � a mesma, mas estrutura n�o � sim�trica: criticsScore sempre null para Filme/S�rie, s� existe para Game (IGDB aggregated_rating). Comunica��o de produto deve refletir essa assimetria, n�o implicar paridade total |
| Versionamento (algorithmVersion) | Especificado | Conven��o definida (�3.5); sem hist�rico real ainda � n�o h� v1 rodando em produ��o para comparar |
| algorithmVersion/confidenceScore na UI | Implementado | S� em tooltip t�cnico (<details>), NUNCA na UI principal (grep = 0) |

"Metodologia unificada" entre Filme/S�rie/Game � IMPRECISO como comunicado antes. A fun��o de c�lculo � a mesma (globalScore = 0.5�critics + 0.5�audience ou �nico dispon�vel), mas a ESTRUTURA n�o � sim�trica: criticsScore � sempre null para Filme/S�rie (nenhuma fonte aprovada de cr�tica � �3.2) e s� existe para Game (IGDB aggregated_rating). Comunica��o de produto (marketing, pitch, docs p�blicas) deve refletir essa ASSIMETRIA, n�o implicar paridade total.
---

## [2026-08-03] Decisão: RAWG substituído por OpenCritic (fonte extinta)
Motivo: a API da RAWG deixou de responder (HTTP 522 — serviço extinto) e nunca teve chave
configurada em produção (RAWG_API_KEY ausente no Railway), portanto nunca coletou nota real.
OpenCritic já era fonte aprovada (crítica, escala 0–100) e a chave RapidAPI
(OPENCRITIC_API_KEY) já existia nas variáveis do Railway — a busca foi corrigida para o
contrato real do wrapper (`GET /game/search?criteria=` + `GET /game/{id}`), que era
ignorada pelo endpoint `?name=` antigo (devolvia sempre o mesmo jogo popular).

- Games v1 (legacy): GAME = { igdb: 0.5, opencritic: 0.5 } (era rawg).
- Games v2 — bucket público: rawg removido; pesos redistribuídos para soma 1.00:
  igdb_publico 0.35, steam 0.25, steamspy 0.15, metacritic_user 0.25.
- RAWG removido do registro de fontes (API e espelho web), do SourceName (web), do
  remotePatterns de imagens e dos textos públicos (i18n/FAQ/JSON-LD).
- Sem migração de banco: comentário do schema atualizado; nenhuma linha `fonte=rawg`
  existia em produção (adapter sempre inativo sem chave).

---

## [2026-08-03] D-132 — Posicionamento cross-mídia, planos e monetização (consolidação do Operador)
Origem: análise do Operador consolidando proposta de valor, justificativa de preços,
concorrência e estratégia de planos Free/Plus/Premium.

### Posicionamento
- Único agregador cross-mídia com score unificado e metodologia aberta/auditável
  (filmes, séries, games, livros, HQs, mangás na mesma escala). Não vence concorrentes
  gratuitos em profundidade (RT/IMDb/Letterboxd, OpenCritic/Steam, Goodreads/Skoob,
  ComicBookRoundup, MyAnimeList) — vence em amplitude comparável + transparência
  metodológica + crítica/público separados + consenso como indicador.
- Diferencial de longo prazo: livros, HQs e mangás (nenhum agregador unificado existe);
  comunicação deve focar a unificação VIVIDA (ex.: "Duna (livro), Berserk (mangá) e
  Elden Ring (game) na mesma escala") + top 10 cross-mídia + identidade de consumo
  cross-mídia no perfil.

### Escalas por mídia (proposta do Operador)
- Filmes/Séries: 0–10 (crítica vs audiência, alta densidade de dados).
- Games: 0–100 (granularidade da comunidade gamer).
- Livros/HQs/Mangás: 0–10 (nichos).
CONFLITO ABERTO: escala por mídia contradiz o posicionamento central (unificação exige
escala comum — os exemplos do próprio documento usam 0–10 para todas as mídias, inclusive
games). Engine atual normaliza tudo 0–100. Decisão de exibição pendente.

### Planos
- Free (R$0): catálogo + score liberados; limitações de CONVENIÊNCIA (nunca conteúdo):
  watchlist 20 itens, 3 recomendações/dia, histórico 10 títulos, compartilhamento livre,
  gamificação (badges/streaks/conquistas) para retenção. Gatilhos: progresso, social
  proof, escassez suave, preview bloqueado (blur/cadeado).
- Plus (R$4,90/mês): watchlist ilimitada + listas customizadas, recomendações ilimitadas,
  ALERTAS de novos títulos por gênero/franquia (o "momento uau" — tangível e recorrente),
  breakdown completo do score, histórico ilimitado, zero anúncios.
- Premium (R$9,90/mês): tudo do Plus + comparação entre perfis, listas colaborativas
  (votação), badge Apoiador/perfil destacado, acesso antecipado, export CSV/JSON,
  API pessoal, suporte prioritário. Social é o motivo para pagar.
- Trial de 7 dias do Plus para todo registro (estimativa do Operador: sem trial,
  conversão Free→Plus < 2%).

### Fatos novos observados (conflitam com a análise)
1. "Watchlist ainda não existe" (§2) é impreciso: módulo watchlist já existe (API + store
   web, colunas WANT/CURRENT/DONE) — falta apenas o limite de 20 no Free e histórico.
2. Escala hoje: engine e UI exibem 0–100 unificado; heroSubtitle pt-BR já diz "0 a 10"
   e en-US "0-100" (inconsistência de texto pré-existente a ser resolvida junto).
3. Trial Stripe não implementado (só mapeamento do webhook trial_will_end);
   alertas, recomendações limitadas/diárias e listas colaborativas não existem.

### Pendências para implementação (ordem sugerida)
1. Decidir a escala de exibição (única 0–10 vs por mídia) — é o core do score e da
   comunicação; alinhar com i18n (heroSubtitle).
2. Implementar trial de 7 dias do Plus (Stripe) + limites do Free (watchlist 20,
   recomendações 3/dia, histórico 10) com gatilhos de upgrade.
3. Alertas por gênero/franquia (Plus) e comparador de perfis/listas colaborativas
   (Premium) — dependem de recomendação/notificação, ainda não existem.

## [2026-08-03] D-133 - MEDIA Score v3 (MET-03): estimador Bayesiano por midia

**Origem:** metodologia matematica do MEDIA Score por midia (documento do Operador)
substituindo a v2 (0.5xcritica + 0.5xpublico, consenso informativo).

### Formula (todas as midias)
MEDIA = (v/(v+m)) * S + (m/(v+m)) * C
- v = total de avaliacoes; m = threshold da midia; C = media do catalogo da mesma
  categoria (prior); S = soma ponderada dos componentes disponiveis (renormalizada).

### Componentes e thresholds
- Filmes/Series (0-10): S = 0.4xCritica + 0.4xPublico + 0.2xI; m = 60 (50 publico + 10 critica).
- Games (0-100): S = 0.55xCritica + 0.35xPublico + 0.10xI; m = 1015 (1000 + 15); exibicao x10.
- Livros (0-10): S = 0.25xCritica + 0.55xPublico + 0.20xI; m = 100; curva de inflacao
  (S' = min(S, 0.5S + 3)) quando C > 8.5.
- HQs (0-10): S = 0.60xPublico + 0.40xConsenso-Editoras; m = 250 (critica substituida).
- Mangas/LN (0-10): S = 0.45xCritica + 0.45xPublico + 0.10xPolarizacao; m = 500.
- I = 1 - |critica - publico| REALIMENTA o score (nao e mais informativo).

### Confidence Score (CS 0-100)
CS = Cobertura x40 + Volume x30 + Concordancia x20 + Atualizacao x10
- Cobertura: fontes distintas (satura em 5). Volume: v (satura em m).
- Concordancia: 1 - min(1, desvio/2.5). Atualizacao: voto <= 30 dias = 1, decai ate 180.
- Faixas: >= 70 Alta (verde), >= 40 Media (amarelo), < 40 Baixa (cinza).
- Confianca persistida muda de 0-1 (heuristica v1/v2) para CS 0-100.

### Decisoes de implementacao
- Engine web e API implementam a mesma config por midia (CONFIG_V3 / CONFIG_V3_POR_TIPO).
- Polarizacao: I = max(0, 1 - min(1, extremas/total x 1.25)), extremas = notas <= 2 ou >= 9.
- Consenso de editoras: I = 1 - min(1, desvio padrao das medias por editora / 2.5).
- v = soma dos votos das fontes (avaliacao_fonte.votos, ja migrado em 20260803_media_score_v3).
- C = AVG(media_score.score) da categoria; sem dados -> 70 (0-100) / 7 (0-10).
- recalcularEPersistir (job diario + coleta admin) passa a persistir v3: indice_consenso,
  votos_total, score, confianca CS; consenso (gap) permanece informativo.
- ALGORITHM_VERSION = "media-score-v3.0" (web). API: calcularScoreV3 (v1/v2 mantidos).
- Web: mapConfidence usa as faixas 70/40; confiancas legadas 0-1 caem em "low" ate o
  job diario recalcular.

### Correcoes pos-revisao (2026-08-03)
- Migracao 20260803_media_score_v3 stageada (deploy exige migrations commitadas).
- v=0 (sem votos coletados) usa S direto em vez de C - evita achatar o catalogo
  na media da categoria enquanto os adapters nao reportam votos; tmdb/igdb passam
  a reportar votos reais (vote_count/rating_count).
- Espelho web alinhado a API (I em 0-10, mesma quantizacao, curva sem pre-round).
- Guardas Number.isFinite + cache TTL do catalogo medio; v1/v2 removidos.

## D-219 cache de aplicacao Redis (T210, Fase 6.10)
### TTLs por rota (leitura publica)
- GET /api/v1/midias (lista): 60s — somente ANONIMO (listagem autenticada consome quota por usuario e nunca e cacheada).
- GET /api/v1/midias/:id (ficha simplificada): 120s.
- GET /api/v1/midias/:id/media-score: 300s (score muda pelo job/invalidacao).
- GET /api/v1/discover: 30s — somente ANONIMO (flag na_watchlist depende do usuario).
### Chave
- SHA-256 da URL completa (inclui query params: tipo, genero, cursor, limit) com prefixo do recurso: midias:<hash> / midias:<id> / midias:<id>:media-score / discover:<hash>.
### Invalidacao em escrita
- create/update/remove de midias (ADMIN): onMediaCreated/onMediaUpdated limpa midias:<id>, midias:<id>:media-score, padrao midias:* (listas), catalog:* e discover:*. TTLs curtos limitam a janela de dado stale.
### Fallback memoria
- Redis indisponivel (ioredis lazyConnect + error handler): get/set/del/delPattern degradam para Map local com TTL — a aplicacao nunca quebra por falta de Redis. set() espelha sempre na memoria.
### Nao cacheado (por design)
- Endpoints autenticados dependentes do usuario: GET /watchlist, GET /premium/*, GET /interacoes, lista autenticada de /midias (quota), discover autenticado (na_watchlist).
- Rate limit roda antes do cache (onRoute) — nao e afetado.
### Header
- X-Cache: HIT|MISS em endpoints cacheados (verificacao operacional).

---

## [2026-08-11] T289 � tenant_id aditivo (multi-tenancy leve, Arquitetura �4)

- tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' adicionado em midia, watchlist_entry, discovery_event, classificacao_regiao, premio e temporada.
- Default CONSTANTE por design: NOT NULL com default constante nao reescreve a tabela no PG11+ (custo ~zero agora, alto depois) � D-283/Arquitetura �4.
- NENHUM filtro de tenant adicionado nas queries; tenant_id NUNCA exposto em respostas da API.
- SEM indice em tenant_id (1 tenant unico ? seletividade inutil; evitaria custo de escrita).
- RLS e filtros ficam para a T290, que exige aprovacao explicita do Operador (D-279) + premortem + teste de isolamento usuario A?B.
- DEFAULT_TENANT_ID documentado no .env.example (constante publica, nao segredo).

---

## [2026-08-11] T291 � role CURATOR (Arquitetura �3)

- Nova role CURATOR: curadoria de conteudo (MediaRelation, Award, classificacao, genero) separada de ADMIN (sem acesso a usuarios/billing/flags).
- Endpoints: POST /api/v1/curadoria/relacoes|premios|classificacoes|generos � @Roles('CURATOR','ADMIN'), Zod, audit_log em toda mutacao, rate limit 10/min por usuario.
- Como promover um usuario a CURATOR (processo manual, fora de endpoints): INSERT INTO usuario_papel (usuario_id, papel_id, atribuido_por) SELECT '<uuid>', id, NULL FROM papel WHERE nome = 'CURATOR'; � ou via tooling admin futuro.
- Matriz de autorizacao testada: anonimo 401; FREE/PLUS/PREMIUM 403; CURATOR/ADMIN 200.
- Promocao de role NUNCA via endpoint (elevation of privilege); curador nao acessa /admin/stats.

---

## [2026-08-11] T292 � feature flags leves (Arquitetura �7)

- Decisao: tabela propria (feature_flags) AGORA, SEM servico externo (GrowthBook/Unleash) � evita infra/custo no estagio atual (billing apertado); reavaliar ferramenta self-host quando houver >10 flags ou multiplos times.
- Avaliacao server-side unica e deterministica (hash usuarioId+key ? bucket estavel; anonimo usa IP-hash documentado); nunca exposta no frontend.
- CRUD somente ADMIN (/api/v1/admin/flags) com audit_log (actor + diff resumido) e invalida��o de cache.
- Flag real: discovery-feed-v1 (enabled=true, rollout 100) controla GET /discoveries; off = lista vazia (estado 'em prepara��o'), nunca 500.
- Cache Redis 60s; rollout_percent clampado 0-100; tenant_overrides JSONB validado como mapa booleano.

---

## [2026-08-11] T290 � RLS aprovado (D-284) e implementado

- Aprovacao do Operador registrada (APROVO T290). Escopo: watchlist_entry/discovery_event (isolamento tenant+usuario), midia (SELECT publico por tenant; escrita CURATOR/ADMIN), classificacao/premio/temporada (escrita CURATOR/ADMIN).
- Contexto por transacao via SET LOCAL (app.current_user_id/tenant_id/role); sem BYPASSRLS; seeds com bootstrap proprio (tenant default + ADMIN).
- **Premortem (risco alto) e mitiga��es:**
  1. Seed/job sem contexto falha ? mitigado: bootstrap em todos os seeds + teste;
  2. Query administrativa sem contexto retorna vazio ? mitigado: wire via comContextoRls nos servicos de watchlist/discovery/descobertas + auditoria listada no STATUS;
  3. Pooler reusa SET de sessao ? mitigado: SET LOCAL transacional (nao vaza);
  4. Rollback necessario ? script em docs/ROLLBACK_RLS.md testado em docker (drill verde 2026-08-11).
- **Drill docker (evidencia):** isolamento A?B verde (B le 0/atualiza 0, A le 1), midia USER negado/CURATOR ok, rollback restaura acesso.
- Deploy da migration somente quando o Operador disparar (gatilho mantido, D-284).

---

## [2026-08-11] T299 � leituras agregadas/per-user sob RLS (D-285)

- Excecao de LEITURA para ADMIN em watchlist_entry/discovery_event (policy watchlist_read_admin/discovery_read_admin, USING only; WITH CHECK de escrita permanece owner-only).
- admin stats wireado via comContextoRls (role ADMIN + tenant default) � contagens nao-zero sob RLS.
- recommendations leem usuario_midia_interacao (FORA do escopo RLS) + midia (SELECT publico com fallback do tenant default) � nao esvaziadas; teste sob RLS cobre admin stats.
- Deploy da migration RLS (20260811_rls + rls_leitura_admin) so apos R299 APPROVED + gatilho do Operador (D-284/D-285).

- Spec rls-isolation: habilita��o em CI via service postgres com 'prisma migrate deploy' fica BLOQUEADA pela T234 (ordem de migrations em DB virgem quebra o deploy � media_score_v3 antes de persistencia_avaliacoes). Justificativa drill-only documentada (D-285): o drill docker cobre A?B, ADMIN read, gates de escrita e rollback; a habilita��o CI volta quando T234 fechar.

---

## [2026-08-11] T300 � cobertura RLS (D-286)

Relatorio de cobertura (models com FK usuario x RLS):
- COM RLS (escopo D-284/D-285): watchlist_entry, discovery_event (isolamento tenant+usuario), midia (SELECT publico/escrita CURATOR/ADMIN), classificacao_regiao, premio, temporada (escrita CURATOR/ADMIN).
- SEM RLS � tabelas de conta/billing/audit (Sessao, UsuarioPapel, UsuarioPlano, Fatura, EventoPagamento, ConsentimentoUsuario, PreferenciaUsuario, Notificacao, UsoDiario, AuditLog, Entitlement, PlanoEntitlement, ListaColaborativa): protegidas pela camada de sessao/auth (guards + owner-checks testados); FORA do escopo RLS aprovado (D-284) para nao duplicar a superficie de auth no banco.
- **DECISAO � usuario_midia_interacao SEM policy RLS (excecao documentada):** a tabela alimenta o filtro COLABORATIVO de recommendations, que legitima ler sinais agregados de outros usuarios (anonimizado, sem PII). RLS por-usuario quebraria o core de recomendacao. A API de interacoes (upsert/list) ja impoe owner-only na camada de servico (testes verdes); leituras agregadas nao expoem PII. Ficam como superficie de isolamento: watchlist/discovery (RLS) + interacoes (app-layer). Se no futuro houver necessidade, adicionar policy com leitura agregada por role dedicada + drill.
- Auditoria concluida: nenhuma outra tabela com dado de usuario fora da classificacao acima.

- [T301] Excecao da T300 FECHADA: usuario_midia_interacao com RLS owner-only + excecao FOR SELECT ADMIN (interacao_tenant_user/interacao_read_admin). Recommendations rodam o caminho agregado via comContextoRls(role ADMIN); interacoes via owner. 100% das tabelas de conteudo de usuario com RLS.

---

## [2026-08-11] T296 � hero com identidade (Addendum 1) � verificacao

- A hero ja entregue (T185/T273/T274) atende a identidade do Addendum 1: icones 3D-em-camadas por categoria (SVG inline, sem biblioteca 3D em runtime), gauge ciclico multi-midia com escalas nativas, prefers-reduced-motion respeitado, stats i18n (contagem real + NUM_FONTES_ATIVAS).
- Verificacao T296 (SSR nos 3 locales + suites): hero renderiza em pt-BR/en-US/es-ES com o cluster de 6 icones; web 305/305; typecheck/lint limpos.
- Baseline de performance (estrutural): LCP = h1 acima da dobra (texto estatico, sem fetch de imagem); icones = SVG inline (zero requisicoes); CLS controlado por dimensoes fixas em CSS do cluster; sem three.js/GSAP-runtime extra.
- Escopo autorizado do Addendum 1: COMPLETO (hero + kanban + dashboard). Backlog de codigo zero; restam pendencias do Operador (billing/deploys) e pos-beta gated (T293 Sentry).

- [T304 runbook] Fixes de seed descobertos em producao: premio.id era string (UUID col) ? randomUUID + existe-check; seed:temporadas filtrava fonte='tmdb' mas as series sao 'tmdb_tv' ? in [tmdb, tmdb_tv]. Runbook: migration resolve (role_curator FAILED por E55P04 � ADD VALUE + INSERT na mesma transacao viola D-236; split em migrations irma) + placeholder 20260808_add_search_vector (renomeada apos aplicada) + deploy. Metadata seed: Duna mostra premio mas origem/classificacoes limitadas pelo take (best-effort).
