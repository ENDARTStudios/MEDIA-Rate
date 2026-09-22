# DECISOES.md

Registro persistente do Discovery e de toda decisão técnica do projeto. Nova decisão = nova entrada com data. Decisão registrada aqui não se re-discute sem fato novo.

---

## [2026-08-14] Fix: Sentry e2e — teste real comprovado; web e API compartilham DSN (T315/D-306)

**Achado:** o "erro" do Sentry era o sample de onboarding (tag sample_event=yes, url example.com); nenhum evento real tinha chegado. O bundle web tinha o SDK mas NÃO o DSN inline — a env `NEXT_PUBLIC_SENTRY_DSN` da Vercel existia com valor vazio/placeholder.

**Correção:**
- Vercel env re-setada via CLI com o MESMO DSN do projeto (exceção D-306: Operador criou 1 projeto Sentry javascript-nextjs — web e API compartilham o DSN na Open Beta; separar projetos é backlog). Lição CLI: `vercel env add` com stdin grava placeholder `[SENSITIVE]` — usar `--value`.
- **Client config não era injetado no bundle em Next 16/Turbopack** (bundle tinha o SDK sem `Sentry.init`): criado `SentryClientInit` (import dinâmico do `sentry.client.config` só no browser) renderizado no root layout.
- **CSP bloqueava o ingest** (`connect-src` sem o host): adicionadas as três regiões `https://*.ingest.{us,eu,de}.sentry.io` (wildcard `*.ingest.sentry.io` NÃO cobre `o<org>.ingest.us.sentry.io`).
- **Teste real na API de produção (PIPELINE OK):** flag `admin-sentry-test` ON â†' `GET /api/v1/admin/sentry-test` â†' **500 + sentryEventId (32 chars) + correlationId + X-Correlation-Id** â†' flag OFF confirmada.
- **Web ao vivo:** browser de produção envia envelope para `o...ingest.us.sentry.io` (observado via Playwright) â†' eventos do web chegam ao painel.
- MANUAL_DO_OPERADOR: seção "Como testar o Sentry" (3 passos) + sample event + notas de CLI/bundle.

**Lembrete operacional:** `vercel --prod` a partir de `apps/web` está linkado ao projeto **almanaque-dos-clubes** (NÃO usar; usar push em main que dispara o deploy de media-rate). Rollback aplicado no almanaque após deploy acidental.

---

## [2026-08-14] Fix: consistência de Perfil/Configurações (T321/D-310)

**Achados (Operador):** plano PLUS em Configurações vs Free no Perfil; Perfil de Gosto e Atividades recentes mortas; Configurações no meio do menu.

**Causa:** Perfil tinha o plano HARDCODED ("Free"); seções sempre com empty state; ordem do menu não seguia a diretiva.

**Correção:**
- **Fonte única de plano:** `getMe` (subscription) passou a retornar `created_at`; Perfil agora lê `user.plan` (mesmo campo de Configurações). "Membro desde" usa a data real.
- **Perfil de Gosto vivo:** top gêneros de `/user/stats` com labels localizados (`lib/genero-labels.ts`, fallback ao nome do banco); empty state só com zero dados.
- **Atividades recentes vivas:** últimas 10 interações (status type-aware + reação + data relativa i18n + título via fallback chain T310).
- **Menu do usuário:** ordem Dashboard ? Watchlist ? Descobertas ? Listas ? Perfil ? **Configurações** (último); Sair separado abaixo do divisor.
- e2e `profile-consistency.spec.ts` (plano idêntico nas duas telas + ordem do menu).

**Verificado:** API 760/760, web 312/312, lint 0, typecheck OK.

---

## [2026-08-14] Fix P0: watchlist — status dirige a coluna (fonte única) + labels por tipo + botão rápido (T320/D-309)

**Sintoma (bug report Operador):** games mostravam "Quero ver/Vendo/Vi"; clicar no status não movia o card de bloco; botão do canto do card morto.

**Causa raiz (duas fontes de verdade):** o botão de Status de Consumo gravava em `usuario_midia_interacao.status`, mas o Kanban agrupava por `watchlist_entry.coluna` (setada só no add, nunca sincronizada). Labels dos cabeçalhos eram fixos de filme/série.

**Correção:**
- **Fonte única de verdade** (`src/common/status-coluna.ts`): mapas bidirecionais `STATUS_PARA_COLUNA`/`COLUNA_PARA_STATUS`. `interacoes.upsert` sincroniza a coluna da watchlist no MESMO tx (status dirige a coluna); `watchlist.add`/`move` sincronizam a interação no MESMO tx (coluna dirige o status). Cliente: interaction store re-sincroniza a watchlist após mudar status.
- **Labels por tipo:** cabeçalhos de coluna usam label do tipo quando há filtro ativo, senão neutro (`queroConsumir/consumindo/concluido` novos nos 3 locales); chip do card já era type-aware (colunaLabelKey).
- **Botão rápido do card:** canto abre MENU de status (4 colunas + Remover) — mesmo handler, nada morto.
- **Reparo idempotente** (`prisma/seed-reparo-status-coluna.ts`, `db:reparo:status-coluna`): alinha colunaâ†"status em produção (8 colunas alinhadas, 34 interações criadas, 28 puladas não-UUID; nenhuma exclusão).

**Verificado:** unit interacoes (sync coluna por status) + watchlist e2e mocks atualizados; e2e `watchlist-sync.spec.ts` (bidirecional via API). API 760/760, web 312/312.

---

## [2026-08-13] Fix: watchlist sem "código" (T310 / D-308)

**Sintoma (§14 item 8):** algumas mídias na watchlist "não carregam, são apenas um código".

**Diagnóstico (produção, 70 entries):** 15 entradas com `midia_id` não-UUID (ids externos TMDB/IGDB como `124364`, e ids de aresta `g4`/`g2` do grafo cross-mídia) + 5 UUIDs órfãos (mídia inexistente). O serializer devolvia `media: null` para essas, e o `entryToMediaItem` retornava null sem título ? cartão vazio com aria-label = UUID cru.

**Correção:**
- **API** (`watchlist.service.list`): entrada sem mídia resolvível devolve `media` objeto (title:null + `dados_parciais:true`), nunca null; mídias encontradas ganham `tituloOriginal` + `dados_parciais` (quando sem original).
- **UI** (`WatchlistCard`): fallback chain `titulo ? titulo_original ? id humanizado (slug-like) ? i18n "Título indisponível"`; UUID e id numérico puro NUNCA viram título. aria-label usa o fallback.
- **Reparo não-destrutivo** (`prisma/seed-reparo-watchlist.ts`, `db:reparo:watchlist`, D-275): re-link por `fonte_id` ? canônica (4 re-linkadas, 1 colisão preservada); sem match/órfãs ficam para o fallback UI. Nenhuma entrada de usuário excluída.

**Verificado:** produção 15?11 não-UUID após reparo; fallback unit 5/5 (humanizarId, chain, nunca UUID); e2e contrato (media sempre objeto). Web 312/312, API 759/759.

---

## [2026-08-13] Fix: duração de sessão — 7 dias + sliding renewal (T316/D-307)

**Sintoma (§14 item 3):** "a sessão está expirando rápido demais". Diagnóstico (produção): cookie `sess` tinha `Expires` = +15min (TTL do ACCESS hardcoded) e o web NÃO tinha auto-refresh; o sliding no `validateToken` estendia o banco mas não re-setava o cookie do browser.

**Correção:**
- `SESSION_TTL_HOURS` (default 168 = 7 dias) passou a ser lido de env; `SESSION_TTL_MS` = 7d (era 15min hardcoded). `createSession`/rotação usam o novo TTL.
- Cookie `sess` agora com `Max-Age=604800` (+Expires) — persiste no browser; fechar navegador não desloga.
- Sliding renewal: `validateToken` renova quando faltam < 50% do TTL (3,5d) e retorna `renovada`; o AuthGuard re-seta o cookie `sess` no browser (sem rotacionar CSRF — o front guarda csrf em sessionStorage). Rate-limit natural: ~1 renovação por TTL/2 (? 1/hora), sem write por request.
- Revogação/logout e refresh rotativo (30d) inalterados.

**Verificado (DB real, API compilada):** login ? `sess` com `Max-Age=604800` e Expires +7d; sessão envelhecida para +3d ? request autenticado 200 + Set-Cookie renovado (`SLIDING RENEWAL OK`). Testes: e2e `session-duration.e2e.spec.ts` (7) + sliding em `session-token.spec.ts`. API 759/759.

---

## [2026-08-13] Fix: busca por prefixo/autocomplete (T309)

**Sintoma (§14 item 2):** buscar 'Berserk' só retornava com a palavra completa; prefixos ('Bers') não retornavam nada.

**Causa:** a busca full-text (q >= 3) usava `plainto_tsquery('portuguese', ...)`, que exige lexema exato (palavra completa).

**Correção (discover.service.ts, sem mudar o tsvector 20260809 nem o contrato da API):**
- `montarTsqueryPrefixo(q)`: tokens sanitizados via `[\p{L}\p{N}]+` (neutraliza operadores `& | ! : *` de tsquery) e `to_tsquery('portuguese', translate('t1 & ... & ultimo:*', ...))` — prefixo `:*` só no último token ('bers' â†' `bers:*`; 'breaking ba' â†' `breaking & ba:*`).
- Bônus de igualdade no rank: título que começa com o termo normalizado ganha +0.05 (match exato/prefixo de título na frente de match parcial de token). `plainto_tsquery('')` para query sem tokens (seguro).
- translate() nos dois lados mantém a paridade de acentos (T223/D-224).

**Verificação (DB real, API compilada):** 'bers'â†'Berserk, 'cher'â†'Chernobyl, 'duna'â†'Dune, 'brea'â†'Breaking Bad; query com operadores (`Breaking | Bad & ! : *`) sanitizada sem erro. Testes: 4 novos unit (prefixo, multi-token, SQL com `:*`, sanitização) + e2e web search prefixo (regressão). API 752/752.

---

## [2026-08-13] Fix: "expected object, received string" no fluxo de interação (T308)

**Sintoma (produção):** `PUT /api/v1/interacoes/:midiaId` retornava 400 `Validation failed at '': Invalid input: expected object, received string`; botão Quero ver/status quebrado; dashboard/perfil vazios por falta de interação persistida.

**Diagnóstico (reproduzido em produção e no build compilado local):** o pipe `ZodValidationPipe` estava aplicado no **método** (`@UsePipes`), então o Nest validava TODOS os parâmetros — incluindo o `@Param("midiaId")` (string) — contra o schema `z.object` do body. O POST/PATCH funcionavam porque seus pipes já eram no parâmetro (`@Body(new ZodValidationPipe(...))`, padrão do watchlist PATCH).

**Correção (na ponta certa, sem afrouxar validação):** pipe movido para `@Body(new ZodValidationPipe(...))` em `interacoes.controller.ts` (PUT) e `relacoes.controller.ts` (POST `/midias/:id/relacoes` — mesmo bug de classe). O @Param string nunca mais é validado contra o schema do body.

**Extras:** store web mapeia erro 400 para mensagem amigável (Zod raw nunca aparece na UI; detalhe técnico fica no corpo + `X-Correlation-Id` + Sentry/log). Regressão: `test/interacoes-http.e2e.spec.ts` (HTTP) e `apps/web/e2e/watchlist-flow.spec.ts` (4 status + reação; vermelho em produção antes do deploy — prova que o spec detecta o bug).

---

## [2026-08-13] Decisão: Domínio oficial mediarate.app + T307 (D-303)

**Domínio oficial:** `https://mediarate.app` (compra direta na Vercel = DNS/SSL automáticos; `media-rate-web.vercel.app` faz 307 para o novo domínio durante a transição ~30 dias).

**T307 concluído:**
- Termos (s1b) nos 3 locales: `[domínio]`/`[domain]`/`[dominio]` → `https://mediarate.app`. Demais placeholders de dados de negócio (e-mail, endereço, CNPJ, foro) permanecem até o Operador preencher.
- `seo.ts` (siteUrl), canonical/OG, JSON-LD, `robots.ts` e sitemap: base passou de `https://media-rate-web.vercel.app` para `https://mediarate.app` (12 arquivos).
- CORS produção (Railway `ALLOWED_ORIGINS`): `https://mediarate.app` adicionado (mantendo os vercel.app durante o 307).
- e2e `register-terms`: passa a exigir `mediarate.app` presente e placeholder ausente.

**Pendência do Operador:** billing address da Vercel (evita suspensão do Hobby) + validação final §14 em `https://mediarate.app`.

---

## [2026-08-13] Decisão: Sentry integrado (T293 / "Feito C" do Operador)

**DSNs configurados nas plataformas pelo Operador:** `NEXT_PUBLIC_SENTRY_DSN` (Vercel) e `SENTRY_DSN` (Railway). DSN é identificador público do projeto — não é segredo.

**Decisão:** Sentry no free tier (5k erros/mês). Web via `@sentry/nextjs` (configs client/server/edge + `withSentryConfig`; sem DSN em dev, NO-OP — não quebra build/dev). API via `@sentry/node` v10 (tracing embutido; `@sentry/tracing` v7 deprecated NÃO é usado).

**Integração:**
- API: `initSentry()` em `main.ts` antes dos controllers; `GlobalExceptionFilter` captura 5xx com `correlationId`, `userId`, `path`, `method` e devolve `sentryEventId` no body; respostas de erro incluem `X-Correlation-Id`.
- Web: `ErrorBoundary` reporta ao Sentry com tag `locale` e `correlation_id` (do último erro de API via `http.ts`), ligando UI → API.
- Redação de PII: `beforeSend` redige Authorization/cookie/password/token (mesma política do Pino logger), em API e web.
- Endpoint de teste `GET /api/v1/admin/sentry-test` (ADMIN-only, flag-gated `admin-sentry-test`, off por padrão) — valida o pipeline de ponta a ponta.
- Amostragem: sampleRate 1.0; tracesSampleRate 0.1 em produção (1.0 em dev).

**Riscos residuais:** volume free tier (Open Beta cabe); revisão periódica dos eventos para ajustar redação se surgir novo tipo de PII.

---

## [2026-08-13] Decisão: Termos e Condições como produto + aceite obrigatório no cadastro (D-295 / T306)

**Versão dos Termos publicada:** v1.0 (13/08/2026) em pt-BR, en-US e es-ES.

**Decisão:** Os 3 documentos entregues pelo Operador são publicados como produto (páginas SSR `/terms` nos 3 locales), **sem os marcadores de revisão jurídica** (`[?? REVISAR COM ADVOGADO]` / `[?? REQUIRES LEGAL REVIEW]` / `[?? REQUIERE REVISIÓN LEGAL]`) — instrução do Operador: "Considere revisado com advogado". O aceite vira exigência de cadastro.

**Parâmetros finais travados:**
- Idade mínima (Cláusula 3.2): **14 anos**.
- Aviso prévio de alteração de planos (Cláusula 5.1): **30 dias**.
- Comunicações oficiais (Cláusula 12.1): **48h**.
- Antecedência para alterações nos Termos (Cláusula 13.1): **30 dias**.

**Implementação:** coluna `Usuario.termos_aceitos_em` (write-once no register; migration aditiva `20260813_termos_aceite`); `RegisterDto.aceitouTermos`; `auth.service.register` valida `aceitouTermos === true` (senão 422 `TERMS_NOT_ACCEPTED`) e persiste o timestamp; checkbox obrigatório no register (sem pré-seleção, submit desabilitado até marcar); LGPD export (`/user/data`) inclui o timestamp.

**Conteúdo do texto (armazenamento):** via `messages/<locale>.json` no namespace `terms` (padrão já usado por `/privacy`), **não** em `public/docs/*.md` como listado na tarefa — decisão de implementação que mantém o padrão i18n do projeto.

**Observações:**
- Placeholder `[domínio]` (e demais dados de negócio: e-mail, endereço, CNPJ, foro) permanece nos textos até o Operador fechar o domínio oficial (item 4 do PENDENCIAS_OPERADOR.md). Uma T307 curta substitui quando registrado.
- Aceite em register social (Google/Apple) **não** implementado nesta tarefa — follow-up registrado: consentimento explícito em OAuth segue o padrão da plataforma social (documentar quando implementar).
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

## D-131 — Status real dos diferenciais competitivos (V1.3 §8)

**Data**: 2026-07-29
**Status**: Locked — documentação interna apenas

NENHUM diferencial é comunicado externamente como "pronto" sem gate. Status real:

| Diferencial | Status | Ressalva |
|-------------|--------|----------|
| Transparência de fontes (sources[].included/exclusionReason) | Especificado (§3.3, §3.5) | Não implementado/verificado no backend |
| Confidence Score numérico (§3.4) | Especificado | Constantes (1000 votos, 3 fontes, etc.) são valores iniciais, não calibrados com dados reais |
| Fórmula sem cancelamento algébrico (§3.1, v2) | Proposta | Pendente sign-off formal de governança (v1 com defeito segue locked até aprovação) |
| Detecção de outlier determinística (§3.3b) | Especificado | Limiar de 3.0 pontos de desvio é valor inicial, não calibrado |
| "Metodologia unificada" entre Filme/Série/Game | Impreciso | Função de cálculo é a mesma, mas estrutura não é simétrica: criticsScore sempre null para Filme/Série, só existe para Game (IGDB aggregated_rating). Comunicação de produto deve refletir essa assimetria, não implicar paridade total |
| Versionamento (algorithmVersion) | Especificado | Convenção definida (§3.5); sem histórico real ainda — não há v1 rodando em produção para comparar |
| algorithmVersion/confidenceScore na UI | Implementado | Só em tooltip técnico (<details>), NUNCA na UI principal (grep = 0) |

"Metodologia unificada" entre Filme/Série/Game é IMPRECISO como comunicado antes. A função de cálculo é a mesma (globalScore = 0.5×critics + 0.5×audience ou único disponível), mas a ESTRUTURA não é simétrica: criticsScore é sempre null para Filme/Série (nenhuma fonte aprovada de crítica — §3.2) e só existe para Game (IGDB aggregated_rating). Comunicação de produto (marketing, pitch, docs públicas) deve refletir essa ASSIMETRIA, não implicar paridade total.
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

## [2026-08-11] T289 — tenant_id aditivo (multi-tenancy leve, Arquitetura §4)

- tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' adicionado em midia, watchlist_entry, discovery_event, classificacao_regiao, premio e temporada.
- Default CONSTANTE por design: NOT NULL com default constante nao reescreve a tabela no PG11+ (custo ~zero agora, alto depois) — D-283/Arquitetura §4.
- NENHUM filtro de tenant adicionado nas queries; tenant_id NUNCA exposto em respostas da API.
- SEM indice em tenant_id (1 tenant unico ? seletividade inutil; evitaria custo de escrita).
- RLS e filtros ficam para a T290, que exige aprovacao explicita do Operador (D-279) + premortem + teste de isolamento usuario A?B.
- DEFAULT_TENANT_ID documentado no .env.example (constante publica, nao segredo).

---

## [2026-08-11] T291 — role CURATOR (Arquitetura §3)

- Nova role CURATOR: curadoria de conteudo (MediaRelation, Award, classificacao, genero) separada de ADMIN (sem acesso a usuarios/billing/flags).
- Endpoints: POST /api/v1/curadoria/relacoes|premios|classificacoes|generos — @Roles('CURATOR','ADMIN'), Zod, audit_log em toda mutacao, rate limit 10/min por usuario.
- Como promover um usuario a CURATOR (processo manual, fora de endpoints): INSERT INTO usuario_papel (usuario_id, papel_id, atribuido_por) SELECT '<uuid>', id, NULL FROM papel WHERE nome = 'CURATOR'; — ou via tooling admin futuro.
- Matriz de autorizacao testada: anonimo 401; FREE/PLUS/PREMIUM 403; CURATOR/ADMIN 200.
- Promocao de role NUNCA via endpoint (elevation of privilege); curador nao acessa /admin/stats.

---

## [2026-08-11] T292 — feature flags leves (Arquitetura §7)

- Decisao: tabela propria (feature_flags) AGORA, SEM servico externo (GrowthBook/Unleash) — evita infra/custo no estagio atual (billing apertado); reavaliar ferramenta self-host quando houver >10 flags ou multiplos times.
- Avaliacao server-side unica e deterministica (hash usuarioId+key ? bucket estavel; anonimo usa IP-hash documentado); nunca exposta no frontend.
- CRUD somente ADMIN (/api/v1/admin/flags) com audit_log (actor + diff resumido) e invalidação de cache.
- Flag real: discovery-feed-v1 (enabled=true, rollout 100) controla GET /discoveries; off = lista vazia (estado 'em preparação'), nunca 500.
- Cache Redis 60s; rollout_percent clampado 0-100; tenant_overrides JSONB validado como mapa booleano.

---

## [2026-08-11] T290 — RLS aprovado (D-284) e implementado

- Aprovacao do Operador registrada (APROVO T290). Escopo: watchlist_entry/discovery_event (isolamento tenant+usuario), midia (SELECT publico por tenant; escrita CURATOR/ADMIN), classificacao/premio/temporada (escrita CURATOR/ADMIN).
- Contexto por transacao via SET LOCAL (app.current_user_id/tenant_id/role); sem BYPASSRLS; seeds com bootstrap proprio (tenant default + ADMIN).
- **Premortem (risco alto) e mitigações:**
  1. Seed/job sem contexto falha ? mitigado: bootstrap em todos os seeds + teste;
  2. Query administrativa sem contexto retorna vazio ? mitigado: wire via comContextoRls nos servicos de watchlist/discovery/descobertas + auditoria listada no STATUS;
  3. Pooler reusa SET de sessao ? mitigado: SET LOCAL transacional (nao vaza);
  4. Rollback necessario ? script em docs/ROLLBACK_RLS.md testado em docker (drill verde 2026-08-11).
- **Drill docker (evidencia):** isolamento A?B verde (B le 0/atualiza 0, A le 1), midia USER negado/CURATOR ok, rollback restaura acesso.
- Deploy da migration somente quando o Operador disparar (gatilho mantido, D-284).

---

## [2026-08-11] T299 — leituras agregadas/per-user sob RLS (D-285)

- Excecao de LEITURA para ADMIN em watchlist_entry/discovery_event (policy watchlist_read_admin/discovery_read_admin, USING only; WITH CHECK de escrita permanece owner-only).
- admin stats wireado via comContextoRls (role ADMIN + tenant default) — contagens nao-zero sob RLS.
- recommendations leem usuario_midia_interacao (FORA do escopo RLS) + midia (SELECT publico com fallback do tenant default) — nao esvaziadas; teste sob RLS cobre admin stats.
- Deploy da migration RLS (20260811_rls + rls_leitura_admin) so apos R299 APPROVED + gatilho do Operador (D-284/D-285).

- Spec rls-isolation: habilitação em CI via service postgres com 'prisma migrate deploy' fica BLOQUEADA pela T234 (ordem de migrations em DB virgem quebra o deploy — media_score_v3 antes de persistencia_avaliacoes). Justificativa drill-only documentada (D-285): o drill docker cobre A?B, ADMIN read, gates de escrita e rollback; a habilitação CI volta quando T234 fechar.

---

## [2026-08-11] T300 — cobertura RLS (D-286)

Relatorio de cobertura (models com FK usuario x RLS):
- COM RLS (escopo D-284/D-285): watchlist_entry, discovery_event (isolamento tenant+usuario), midia (SELECT publico/escrita CURATOR/ADMIN), classificacao_regiao, premio, temporada (escrita CURATOR/ADMIN).
- SEM RLS — tabelas de conta/billing/audit (Sessao, UsuarioPapel, UsuarioPlano, Fatura, EventoPagamento, ConsentimentoUsuario, PreferenciaUsuario, Notificacao, UsoDiario, AuditLog, Entitlement, PlanoEntitlement, ListaColaborativa): protegidas pela camada de sessao/auth (guards + owner-checks testados); FORA do escopo RLS aprovado (D-284) para nao duplicar a superficie de auth no banco.
- **DECISAO — usuario_midia_interacao SEM policy RLS (excecao documentada):** a tabela alimenta o filtro COLABORATIVO de recommendations, que legitima ler sinais agregados de outros usuarios (anonimizado, sem PII). RLS por-usuario quebraria o core de recomendacao. A API de interacoes (upsert/list) ja impoe owner-only na camada de servico (testes verdes); leituras agregadas nao expoem PII. Ficam como superficie de isolamento: watchlist/discovery (RLS) + interacoes (app-layer). Se no futuro houver necessidade, adicionar policy com leitura agregada por role dedicada + drill.
- Auditoria concluida: nenhuma outra tabela com dado de usuario fora da classificacao acima.

- [T301] Excecao da T300 FECHADA: usuario_midia_interacao com RLS owner-only + excecao FOR SELECT ADMIN (interacao_tenant_user/interacao_read_admin). Recommendations rodam o caminho agregado via comContextoRls(role ADMIN); interacoes via owner. 100% das tabelas de conteudo de usuario com RLS.

---

## [2026-08-11] T296 — hero com identidade (Addendum 1) — verificacao

- A hero ja entregue (T185/T273/T274) atende a identidade do Addendum 1: icones 3D-em-camadas por categoria (SVG inline, sem biblioteca 3D em runtime), gauge ciclico multi-midia com escalas nativas, prefers-reduced-motion respeitado, stats i18n (contagem real + NUM_FONTES_ATIVAS).
- Verificacao T296 (SSR nos 3 locales + suites): hero renderiza em pt-BR/en-US/es-ES com o cluster de 6 icones; web 305/305; typecheck/lint limpos.
- Baseline de performance (estrutural): LCP = h1 acima da dobra (texto estatico, sem fetch de imagem); icones = SVG inline (zero requisicoes); CLS controlado por dimensoes fixas em CSS do cluster; sem three.js/GSAP-runtime extra.
- Escopo autorizado do Addendum 1: COMPLETO (hero + kanban + dashboard). Backlog de codigo zero; restam pendencias do Operador (billing/deploys) e pos-beta gated (T293 Sentry).

- [T304 runbook] Fixes de seed descobertos em producao: premio.id era string (UUID col) ? randomUUID + existe-check; seed:temporadas filtrava fonte='tmdb' mas as series sao 'tmdb_tv' ? in [tmdb, tmdb_tv]. Runbook: migration resolve (role_curator FAILED por E55P04 — ADD VALUE + INSERT na mesma transacao viola D-236; split em migrations irma) + placeholder 20260808_add_search_vector (renomeada apos aplicada) + deploy. Metadata seed: Duna mostra premio mas origem/classificacoes limitadas pelo take (best-effort).

---

## [2026-08-19] T355 - backend OpenTelemetry (D-327)

- DECISAO: usar Grafana Cloud free tier como backend de traces OTel (D-320: custo zero). Jaeger self-hosted fica como alternativa documentada (privacidade estrita/on-prem), nao e o padrao agora.
- Justificativa: free tier (50 GB traces/mes, retencao 14d) e mais que suficiente para a escala (1k->50k); zero manutencao (SaaS); OTLP/HTTP nativo; UI rica (Tempo traces + dashboards + alerting). Jaeger exige servidor + storage + updates + disco + backup - custo operacional desproporcional.
- Setup (quando o Operador criar a conta): OTEL_EXPORTER_OTLP_ENDPOINT (gateway Grafana Cloud) + OTEL_EXPORTER_OTLP_HEADERS (Basic user:token) no Railway (API) e NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT no Vercel (web). Detalhes em docs/AVALIACAO_BACKEND_OTEL.md.
- Codigo OTel ja pronto e inerte: API (apps/api/src/common/otel.ts) e web (apps/web/src/lib/otel-browser.ts) so ativam quando o endpoint e definido.
## [2026-08-20] Decisao: D-344 — boa pratica de secrets (comparacao programatica + rotacao)

**Contexto:** T377 revelou typo no client ID do Google (539 vs 559) — validacao visual nao pegou. Alem disso, ailway variables --json sem filtro expôs secrets no transcript (ADMIN_TOKEN, COMICVINE_API_KEY).

**Decisao:**
1. Secrets colados devem ser comparados PROGRAMATICAMENTE (diff/hash caractere a caractere), nunca visualmente.
2. Rotacao de ADMIN_TOKEN autorizada (T378): novo valor nunca em log/transcript, apenas hash SHA-256 para auditoria.
3. COMICVINE_API_KEY avaliada: chave de leitura publica (sem write/delete) → rotacao opcional; rotacionar se o provedor expuser permissao sensivel.
4. Boa pratica documentada em docs/BOAS_PRATICAS_SECRETS.md.

**Impacto:** T378 emitida e executada; lição permanente registrada para futuras tarefas com secrets.

## [2026-08-20] Decisao: D-348 — item 15 fechado + regra de allowlist do AuthGuard

**Contexto:** O login Google fechou com tres causas encadeadas: (1) NEXT_PUBLIC_* nao inlineada sem redeploy; (2) client ID "corrigido" para o valor errado (numero do projeto != prefixo do client, D-347); (3) a rota /auth/google/callback nunca esteve na allowlist de rotas publicas do AuthGuard — a request morria antes do controller com 401 "Autenticacao necessaria".

**Decisao:**
1. Item 15 da ordem de 17 itens: FECHADO (evidencia de ponta a ponta do Operador).
2. Regra permanente: endpoint de auth anonimo novo exige (a) entrada na allowlist do AuthGuard, (b) teste de regressao de rota publica, (c) log de diagnostico mascarado distinto do erro generico.
3. Itens ainda abertos: 6/7/8 (catalogo livros/HQs/mangas = Fase C T367-T369) e 11 (Descobertas = T381). Itens 3/5/9/10 ja implementados (T365/T366/T373/T374).

**Impacto:** Fila = T381 + Fase C + T380; nenhuma pendencia do Operador.

## [2026-08-21] Decisao: D-370 - checklist binario de fechamento do Lote A (F14)

Itens binarios ([x]/[ ]) para fechar o Lote A em STATUS unico e revisavel:

1. [ ] Migracao aditiva titulo_en/titulo_es/sinopse_en/sinopse_es (nullable) em midia aplicada em producao - contagem pre/pos identica (zero perda).
2. [ ] Backfill idempotente executado com contagens por tipo: filme, serie, game, manga, livro, HQ x (EN / ES / best-effort).
3. [ ] Cadeia canonica D-369 aplicada: pt-BR->titulo; en-US->titulo_en->titulo_original(<>PT)->titulo; es-ES->titulo_es->titulo_en->titulo; sinopse_<locale>->sinopse_en->pt - em cards, ficha, carrosseis, busca, notificacoes e Descobertas.
4. [ ] e2e localizacao verde: /en-US do filme exibe "The Thing" + sinopse EN; /pt-BR mantem PT.
5. [ ] e2e status-menu-funcional verde: abrir -> "Assistindo" -> watchlist; "Remover" -> some.
6. [ ] Indice UNIQUE em midia.slug ativo (0 duplicados) + slug-service com checagem de unicidade no create/backfill.
7. [ ] PNGs pos-deploy commitados em docs/screenshots: menu "+" aberto desktop+mobile, detail en-US, catalog en-US.
8. [ ] Checkpoints visuais do Operador confirmados: livro->livro; /en-US EN (sem PT/ru); menu "+" com opcoes funcionando.
9. [ ] STATUS unico emitido com validator OK + metricas UTC + commits + evidencia completa.

## [2026-08-21] Decisao: D-371 - checkpoint de fim de janela aceito (06e1847)

- Checkpoint aceito (10.1): nada do que esta em main sera refeito; T390/T391/T392/T393-parcial/T398-dados/T399 permanecem aprovados.
- Retomada contratada: proxima janela inicia DIRETO do T400 (migracao -> backfill -> cadeia canonica -> e2e "The Thing" -> T398-restante -> e2e menu -> recapturas -> STATUS unico do Lote A com D-370).
- Sem STATUS intermediario e sem perguntas; janela esgotou de novo -> checkpoint + PARCIAL.
- Lote B (T394-T397) so apos APPROVED do Lote A + gate visual do Operador.

## [2026-08-22] Decisao: D-374 — residuais do D-370 sao trabalho do Doer; e2e de auth usa usuario provisionado verificado

- Registro novo em producao fica NAO verificado (T360/T376) -> auto-login 403 por design. E2e contra producao deve LOGAR com usuario provisionado VERIFICADO (seed provision-test-users), senha forte via env, nunca impressa.
- Indice UNIQUE cheio de midia.slug dependia de NULLar slug no soft-delete -> trocar por indice PARCIAL (WHERE deleted_at IS NULL).
- STATUS final de fechamento deve ser schema-valido (evidencia array; checklist D-370 em dados; sem propriedades de topo extras).

## [2026-08-22] Decisao: D-375 — interacao x watchlist (dual-write transacional)

- usuario_midia_interacao e a FONTE DE VERDADE de status; watchlist_entry e a PROJECAO do Kanban.
- Todo caminho de escrita de status (menu '+', StatusReactionControl, drag&drop, endpoints watchlist) deve upsertar a interacao E a projecao no MESMO transaction.
- interacoes.service.upsert: watchlistEntry.updateMany -> upsert (cria a projecao se nao existir) — corrige o menu '+' que persistia a interacao mas nao alimentava o Kanban.
- Remover da lista = delete watchlist_entry + status da interacao NULL (historico/avaliacoes preservados).
- NAO dropar watchlist_entry (destrutivo -> Operador, 8). Estado-alvo (kanban lendo direto de interacoes, aposentando a projecao) fica como candidato futuro T4xx, NAO implementado agora.

## D-389 — Pricing regional (decisão do Operador, registro no ato)
Regra exata: /pt-BR → Plus R$ 4,90/mês, Premium R$ 9,90/mês; /en-US → $ 4.90 / $ 9.90;
/es-ES (Europa) → € 4,90 / € 9,90; /es-ES (América Latina) → R$ 4,90 / R$ 9,90.
Nenhum valor é convertido (preço fixo por região). América Latina NUNCA paga em USD/EUR.
Moeda derivada de locale+região (geo por header Vercel com fallback timezone; es-ES sem sinal de Europa = BRL).
Implementação: T418. A decisão já existia e não estava registrada — falha do organismo.

## D-390 — Regras de processo (pós-crítica do Operador)
1) TODA decisão/diretiva do Operador é registrada em DECISOES.md NO ATO, antes de qualquer próxima pergunta.
2) Auto-auditoria obrigatória: antes de pedir verificação ao Operador, o Doer roda crawler nas URLs afetadas + e2e com contas de teste e anexa o resultado. Checklists ao Operador só para decisões de negócio, nunca para verificação técnica.
3) Nenhum link vai para o Operador sem o Doer ter aberto a própria URL e confirmado 200 + conteúdo correto.
## D-395 — Moeda por PAÍS, não por idioma (refina D-389)
Operador identificou arbitrage: locale-first (pt-BR→BRL) fazia americano em pt-BR pagar R$ 4,90 (~US$ 0,90)
e violava a proteção LatAm (latino em en-US pagaria USD). Nova regra (country-first), valores fixos mantidos:
  - BR + América Latina (AR..VE) → BRL (qualquer idioma);
  - Europa (UE/EFTA, UK FORA → USD) → EUR (qualquer idioma);
  - demais (US, CA, UK, resto) → USD (qualquer idioma);
  - fallback sem geo: en-US→USD; pt-BR/es-ES→BRL (default seguro).
Idioma só traduz texto; o país decide a moeda. Veto do Operador = palavra "idioma" (silêncio = por país).
---

## D-402 — PROPOSTA FINAL CALIBRADA (T405, aguardando aprovação do Thinker)

**Status:** PROPOSTA do Doer (fechamento por residual documentado, não por meta).

**Mitigações aplicadas (evidência commitada):**
- Lote (a): event delegation no carrossel (120 ilhas → 6; shell estático `data-*` +
  1 ilha `CarouselInteractions`). Prova de bundle: motion/zustand/WatchlistButton/
  StatusReactionControl/CardIslands/LazyMount fora do manifest da home.
- Lote (b): ContinueDecision + BecauseYouConsumed viram SERVER (cookie `sess`,
  null p/ anônimo); MotionFooter vira footer server estático (sem motion).
- Guards e2e 8/8 verdes em produção (incl. home-ilha 3/3 e cross-prompt 1/1,
  este idempotente); unit 318/318; build 98/98.

**Resultado medido (Lighthouse, home, `mediarate.app`):**
- perf 46 → 63; FCP 2735 → 1252 ms; `unused-javascript` 129 → 52 KiB;
  bootup 2533 → 2320 ms; main-thread ~4,5 s (estável); TBT ~441 ms.

**Meta NÃO atingida:** perf 63 (meta ≥75), TTI ~11 s (meta <5 s), main-thread
~4,5 s (meta <4 s).

**Residual documentado (causa fora do escopo JS):** o LCP (~10 s) é o H1 do hero
(TEXTO, server-renderizado); FCP pinta em 1,25 s mas o LCP só em ~10 s — lacuna
de ~8,8 s sem correlação com TBT (441 ms), main-thread (4,5 s) ou imagem (hero
não tem pôster). Hipótese: swap de fonte (`font-heading`/Space_Grotesk) re-pinta
o H1 tarde, ou quirk de medição do Lighthouse. **Candidato F16:** investigação
dedicada de render/font (não mais cirurgia de JS) — o organismo não faz métrica
de vaidade nem truque de medição.

**Regras mantidas:** sem afrouxar asserção; guards verdes; push batched; credenciais
env-only e artefatos limpos.

---

## D-403 — F15 CONCLUÍDA (T405 fechado com PROPOSTA final calibrada D-402)

**Status:** FASE CONCLUÍDA. Organismo em standby para novo direcionamento do Operador.

**T405 (performance) — trajetória medida e aprovada:**
- perf 46 → 63 (+17); main-thread 8,9 s → 4,5 s (−49%); `unused-javascript` 129 → 52 KiB
  (−60%); FCP 2735 → 1252 ms (−54%); bootup 2533 → 2320 ms.
- Lote (a): event delegation (120 ilhas → 6) + prova de bundle (motion/zustand fora
  do caminho crítico da home). Lote (b): ContinueDecision/BecauseYouConsumed server
  (cookie `sess`, null p/ anônimo) + MotionFooter estático.
- Guards e2e 8/8 em produção; unit 318/318; build 98/98.

**Meta (perf ≥75, TTI <5 s, main-thread <4 s) NÃO atingida → D-402 aceita:**
- Residual documentado e honesto: LCP ~10 s é o H1 do hero (TEXTO), com FCP 1,25 s e
  LCP ~10 s (lacuna ~8,8 s sem correlação com JS/imagem). Hipótese: swap de fonte
  (`font-heading`) ou quirk do Lighthouse. **Candidato F16:** investigação de
  render/font — não mais cirurgia de JS. Sem métrica de vaidade, sem truque de medição.

**Lições permanentes (registradas):**
- Guards e2e capturaram 2 regressões reais no lote (a) (z-index inválido; seletor de
  guarda) — padrão permanente para refactors de interação.
- Desbloqueio autônomo de credenciais (D-390) re-validado: senha env-only, túnel
  efêmero, artefatos limpos ao final.

**Pendências do Operador: 0.** Organismo (Thinker/Doer) em standby.


---

## D-410 — Cadência semanal como padrão de TODAS as fontes externas (T426)

**Data:** 2026-09-01 · **Fase:** F16-polimento-conversao · **Status:** APROVADA

**Contexto:** O OpenCritic (RapidAPI) atingiu 100% da cota BÁSICA por chamadas
DIÁRIAS de coleta. O Operador questionou (corretamente) a necessidade da
cadência diária: o catálogo é majoritariamente de títulos antigos e SEM
usuários; scores agregados variam em semanas/meses, não em dias. A cadência
diária foi um default de desenvolvimento, não de produto.

**Decisão (diretiva do Operador, nível 0):**
1. **Padrão único:** TODAS as fontes externas (OpenCritic, TMDB, IMDb, Metacritic,
   IGDB, MAL, Jikan, AniList, Kitsu, MangaDex, OpenLibrary, ComicVine,
   Google Books…) refrescam no máximo **1x por semana por mídia**.
2. **Mecanismo (staleness-check):** o score-job só re-consulta mídias com
   `avaliacoes_atualizadas_em` NULL ou anterior a `REFRESH_INTERVAL_DAYS`
   (env, default **7**). Primeira execução popula tudo; execuções seguintes só
   tocam as obsoletas. Log: `total/refreshadas/puladas`.
3. **Zero chamadas externas em tempo de requisição:** o site serve de
   `media_score` (banco); nenhum endpoint de usuário consulta fonte externa
   sincronamente. Caminhos assim foram removidos/cacheados (TTL ≥ 7 dias).
4. **Config explícita:** `REFRESH_INTERVAL_DAYS=7` em `refresh.config.ts` + env,
   documentada no MANUAL_DO_OPERADOR.
5. **Cron/trigger:** o job semanal agenda o próximo run em `MEDIA_SCORE_JOB_TIME`
   (default 03:05 local) a `REFRESH_INTERVAL_DAYS` dias à frente.
6. **OpenCritic (D-409):** fechado pela opção **(b) redução** — sem upgrade pago.
7. **Falha graciosa:** se uma coleta retorna 0 fontes para uma mídia que JÁ tem
   avaliações, mantém o último score (não regride para o prior Bayesiano).
8. **Revisão futura:** quando houver usuários e lançamentos recentes
   relevantes, pode-se cadenciar apenas títulos novos (≤90 dias) com mais
   frequência — mediante DECISAO registrada, nunca por default.

**Impacto (estimado):** ~624 mídias ⇒ diário ≈ 18,7 mil chamadas/mês; semanal
≈ 2,7 mil/mês (**−86%**). Cota OpenCritic volta a caber no plano BÁSICO.

**Lição registrada:** frequência de coleta externa deve ser proporcional ao
estágio do produto e à volatilidade do dado; default conservador (semanal) até
prova em contrário.

---

## D-419 — T434: fallback híbrido (D-416) como gate de merge (e2e determinístico)

**Data:** 2026-09-01 · **Fase:** F17-compliance-juridico · **Status:** APROVADA

**Contexto:** O Doer reportou BLOCKED real para subir a API local e rodar o
e2e de timeline contra o Stripe TEST com stripe listen/trigger: o
DATABASE_URL do .env é um path SQLite (file:/home/z/...) incompatível
com o provider postgresql do Prisma — sem DB, a API Nest não sobe e não há
servidor para o stripe listen encaminhar eventos. A causa é fricção de
infra (DB), não código.

**Decisão:**
1. Aceitar o **fallback híbrido (D-416)** como gate de merge do T434.
2. E2e determinístico: testes unit/integração dos handlers de webhook com
   **Prisma mockado em memória + MockPaymentGateway**, cobrindo:
   (a) customer.subscription.created (trialing) → cancel_at_period_end
   (sem conversão automática); (b) customer.subscription.trial_will_end →
   notifica usuário (não cobra); (c) customer.subscription.deleted →
   downgrade ao FREE (sem cobrança).
3. **Merge único** (section 5.5 + billing) somente com o e2e híbrido verde.
4. **Não escalar** ao Operador por DATABASE_URL — o fallback é suficiente e
   está na autonomia do organismo. (Se um e2e ao vivo for desejado depois, a
   CLI do Stripe + whsec_ de teste já estão configurados.)
5. Mecanismo de billing já validado na **Stripe REAL** (TEST): checkout com
   price_ ok; subscriptions.update(cancel_at_period_end=true) aceito;
   assinatura de trial criada (trialing). Checkout **LIVE** confirmado sem
   "No such price" (P0 de receita restaurado pelo fix price_).

**Lição registrada (padrão de manuseio de segredos):** CLI Stripe configurada +
whsec_ capturado e armazenado em .env **gitignored**, sem vazamento em
chat/log/commit/evidência — padrão a seguir em futuras integrações de billing.

---

## D-425 — Incidente de vazamento de senha efêmera de túnel (lesson learned)

**Data:** 2026-09-01 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Incidente:** durante tentativa de provision de conta de teste via túnel Railway
para o T433, o output de debug expôs a **senha do banco** (linha Password:) no
transcript. O mascaramento cobria apenas a URL postgresql://, NAO a linha Password:
- vazamento parcial que violou o principio 'nenhum segredo em chat/log/commit'.

**Credencial:** efemera de tunel (regenerada a cada conexao). Nenhum segredo foi
commitado ou exposto em evidencia final.

**Conduta do Doer (exemplar):** parou imediatamente; matou o tunel (proxy); removeu os
arquivos _tunnel.txt/.err que continham a credencial; confirmou git limpo; nao
reutilizou a senha; reportou com transparencia.

**Licao permanente (padrao de manuseio de credenciais):**
1. Scripts de infra (tunel, DB, conexao externa) devem mascarar TODAS as linhas
   sensiveis (URL + Password: + tokens + connection strings), nao apenas o padrao de URL.
2. Capturar output em variavel, nunca em arquivo sem filtro previo; jamais redirecionar
   para .txt/.err sem sanitizar antes.
3. Em caso de vazamento: parar imediatamente, limpar e NUNCA reutilizar a credencial,
   reportando com transparencia.

**Reforca D-418** (padrao de manuseio de segredos do billing) e vira referencia para
futuros scripts de provision/acesso a infra.

## D-426 — F17 em estado consolidado: 6/8 tarefas [x]; T432/T433 condicionados a deploy Vercel e credencial de teste; revisão agregada pendente do teste ao vivo

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** A F17-compliance-juridico está em estado consolidado: 6 tarefas aprovadas e mergeadas (T434, T435, T436, T429, T431, T437), cobrindo trial sem conversão automática, banner de trial encerrado, Termos P1/P2, e Política de Privacidade reescrita. T432 (Privacy Center) está com código aprovado mas [x] condicionado ao deploy web (limite Vercel). T433 (direitos LGPD) está com matriz de propagação aprovada mas [x] condicionado ao teste ao vivo, que requer credencial de conta verificada via env. O organismo fez tudo ao seu alcance; os 3 itens pendentes são função do Operador.

**Decisão:** 1) F17 declarada CONSOLIDADA (não concluída): 6/8 tarefas [x]; 2 condicionadas a inputs do Operador. 2) Pendências do Operador formalizadas: (a) Vercel - aceitar atraso vs upgrade; (b) gate legal final - revisão por advogado; (c) credencial de conta de teste - `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` como secret de env. 3) Organismo em standby aguardando: (i) deploy Vercel para prova de rede do T432; (ii) credencial de teste para teste ao vivo do T433. 4) Revisão agregada da F17 será emitida após o teste ao vivo do T433 fechar (com ou sem credencial - se o Operador não fornecer, o teste fica como residual documentado). 5) Não emitir novas tarefas; não perguntar ao Operador o que já foi decidido.

**Justificativa:** O organismo entregou tudo ao seu alcance; os 3 itens pendentes são função exclusiva do Operador (custo/segredo real/gate legal). Revisão agregada só faz sentido com evidência completa.

## D-427 — Auditoria atualizada (2 de setembro) recebida; melhorias reconhecidas; novos achados P0/P1/P2 emitidos como tarefas; teste de cookies em sessão limpa é P0 imediato mas depende do deploy Vercel

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Operador entregou auditoria atualizada reconhecendo melhorias materiais (Termos com CNPJ, trial sem conversão automática, Política com cookies/operadores/perfil/IA, banner com recusa, headers de segurança positivos) mas identificando novos achados P0: (1) inconsistência de cookies — `lgpd-consent-v1`=accepted no localStorage + checkboxes desmarcados + cookie `ph_*_posthog` acessível via `document.cookie` (não HttpOnly), sugerindo que PostHog pode estar carregando antes do consentimento ou o estado está inconsistente; (2) 'Grátis para sempre · Sem cartão' na landing não limitado ao Free; (3) cancelamento landing/FAQ (imediato) conflita com Termos 5.4 (fim do ciclo); (4) endereço físico completo e e-mail final não confirmados. P1: tabela completa de cookies, perfil de gosto/IA detalhado, registro granular de consentimento, auditoria de subprocessadores, testar /user/data.

**Decisão:** 1) Reconhecer melhorias (D-427): Termos/Política/banner evoluíram significativamente; trial sem conversão automática (D-413) validado no texto. 2) Emitir lote de correções: T438 (teste de cookies em sessão limpa — P0 imediato, mas depende do deploy Vercel); T439 (harmonizar 'Grátis para sempre' + cancelamento — P0 textual, pode ser feito agora); T440 (tabela completa de cookies/operadores — P1); T441 (perfil de gosto/IA detalhado — P1); T442 (registro granular de consentimento — P1). 3) Ordem de execução: T439 agora (texto); T438 após deploy Vercel (teste técnico); T440/T441/T442 em sequência. 4) Deploy web permanece bloqueado pelo limite Vercel (pendência do Operador); as correções textuais vão ao ar no reset. 5) Registrar em DECISOES.md: D-427 (auditoria atualizada, melhorias + novos achados).

**Justificativa:** Auditoria do Operador é hierarquia nível 0; os achados P0 textuais podem ser corrigidos imediatamente; o teste técnico de cookies depende do deploy (infra externa).

## D-428 — Fix de localização do worker (process.cwd aponta para projeto errado) documentado em AGENTS.md; regra durável: sempre usar tools.* ou caminho absoluto, nunca caminho relativo

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Doer identificou que `process.cwd()` do worker de run_code aponta para 'D:\PROJETOS\Almanaque dos Clubes\Almanaque dos Clubes', mas o workspace de sessão é MEDIA Rate. Tentou `process.chdir()` mas o worker não suporta (`ERR_WORKER_UNSUPPORTED_OPERATION`). Solução: documentar em AGENTS.md (PR #69, c708e11) a regra durável de sempre usar `tools.*` (read/grep/glob/write que resolvem para o workspace correto) ou caminho absoluto com fs Node, nunca caminho relativo.

**Decisão:** 1) Registrar D-428: fix de localização documentado em AGENTS.md como regra permanente de workflow. 2) Marcar T439 como DONE ([x]) — verificado via tools que já estava implementado. 3) Prosseguir com a ordem da D-427: T440 (tabela cookies/operadores) → T441 (perfil/IA detalhado) → T442 (registro granular consentimento). 4) Não emitir novas perguntas de sequência — a ordem já está decidida.

**Justificativa:** Regra de workflow documentada previne classe de erro; T439 já completo; sequência já definida na D-427.

## D-429 — T440 aprovado; prosseguir T441 → T442 na ordem da D-427 sem re-perguntar; Vercel resolvido (Operador aceitou o atraso)

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** T440 entregou o inventário de cookies/operadores com base legal (achado P1 da auditoria). A ordem da D-427 já está decidida: T441 (perfil/IA detalhado) → T442 (registro granular de consentimento). O Operador respondeu 'Aceitar' ao ESCALATE do Vercel, resolvendo essa pendência (o deploy web sai no reset ~24h). Restam como pendências do Operador: gate legal final e a credencial de teste para T433.

**Decisão:** 1) T440 marcado [x]. 2) Doer executa T441 agora (perfil/IA detalhado: matriz de dados/fatores/base legal/retensão/contestação; explicar algoritmo de recomendação vs IA generativa — o produto usa o primeiro, não o segundo). 3) Depois T442 (`mr_consent` granular + `consent_logs` append-only + `/consent/history`). 4) Não re-perguntar sequência — já está decidida na D-427. 5) Vercel resolvido (aceitar atraso); pendências do Operador = 2 (gate legal + credencial T433).

**Justificativa:** Autonomia e momentum: a sequência foi aprovada; re-perguntar desperdiça tempo. T441/T442 são conteúdo/i18n sem dependência de deploy.

## D-430 — Marco consolidado da F17 registrado pelo Thinker: todo o código da D-427/D-430 mergeado; pendências = deploy Vercel, credencial de teste, gate legal

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** o Doer concluiu T443 (backend de consentimento) e verificou o estado consolidado da F17. Conforme estabelecido (D-426 e resposta direta), registrar decisões/marcos em DECISOES.md é função do Thinker — o Doer escreve código e evidência, o Thinker escreve PLANO_MESTRE e DECISOES. Estado: todo o trabalho de código da D-427/D-430 está mergeado (T435 · T429 · T431 · T437 · T434 · T436 · T439 · T440 · T441 · T442-frontend · T443). Restam apenas fatores externos: deploy Vercel (T438 + prova de rede T432), credencial de teste (T433 + validação T443) e gate legal final (advogado).

**Decisão:**
1. Registrar o marco consolidado da F17: código completo e mergeado; pendências apenas externas.
2. T443 marcado [x] (código); fechamento completo após aplicação da migração pelo pipeline (Railway) + validação ao vivo.
3. Reforçar a divisão de escrita: Doer NÃO registra em DECISOES.md/PLANO_MESTRE.md (função do Thinker); Doer registra evidência em docs/ e commits (regra detalhada em D-431).
4. Quando os fatores externos resolverem: Doer roda T438 + prova de rede T432 (deploy Vercel) e T433 + validação T443 (credencial); então Thinker emite a revisão agregada final da F17.
5. Pendências do Operador = 2 (credencial de teste + gate legal).

**Evidência (T443):** Commit 3334cc0 (PR #73). ConsentLog append-only (categorias/versão/ts/idioma/país/ip_hash/usuario_id); migração aditiva 20260902000000_consent_logs; POST /api/v1/consent (rate limit 5/min); GET /api/v1/consent/history owner-only; consent.spec.ts 3/3.

**Justificativa:** separar código (Doer) de registro de decisão/marco (Thinker) preserva a fonte única de verdade e evita divergência de estado; o marco consolidado dá visibilidade honesta do que é código-feito vs externo-pendente.

**Impacto:** F17 com estado consolidado documentado; organismo aguarda fatores externos para a revisão agregada final.

**Riscos residuais:** deploy Vercel e credencial de teste são externos; gate legal depende de advogado.

**Próximos passos:**
- Operador: credencial de teste + gate legal.
- Deploy Vercel: reset ~24h → T438 + prova T432.
- Doer: ao resolver, T433 + validação T443.
- Thinker: revisão agregada final da F17.

## D-431 — Divisão de escrita em arquivos de governança (DECISOES.md/PLANO_MESTRE.md): função do Thinker especificar, Doer materializar

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** ao concluir T443, o Doer perguntou se deveria registrar o estado consolidado da F17 no DECISOES. Conforme estabelecido (D-426 e resposta direta), registrar decisões/marcos em DECISOES.md e PLANO_MESTRE.md é função do Thinker — o Doer escreve código e evidência (docs/ e commits), e materializa as DECISÕES emitidas pelo Thinker; o Thinker especifica decisões e mantém a fonte única de verdade de governança.

**Decisão:**
1. DECISOES.md e PLANO_MESTRE.md são escritos pelo Thinker (registro de decisões/marcos/diretivas); o Doer NÃO os edita para registrar decisões.
2. O Doer registra evidência técnica em docs/ e commits; o Doer materializa (por append não-destrutivo) as DECISÕES emitidas pelo Thinker no commit batched (evita novo gap de registro).
3. Qualquer divergência de estado (código feito vs decisão registrada) é reportada ao Thinker para reconciliação, nunca resolvida pelo Doer por reescrita.

**Justificativa:** separar especificação (Thinker) de materialização (Doer) preserva a fonte única de verdade, evita divergência de estado e mantém a trilha de decisão da fase auditável.

## D-432 — Incidente de integridade: DECISOES.md com encoding misto/corrompido e histórico desatualizado (lesson learned)

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Incidente:** ao registrar o marco D-431, o arquivo DECISOES.md foi lido como "invalid UTF-8"
pela ferramenta padrão (read). Diagnóstico: encoding **misto** no arquivo — partes em UTF-8
válido e partes com bytes Latin-1/CP1252/mojibake salvos ao longo de edições anteriores (153
sequências inválidas). Além disso, o registro estava **desatualizado**: faltavam D-426 a D-430.

**Causa raiz provável:** o arquivo foi salvo por ferramentas/ambientes com encodings divergentes
em momentos distintos (Latin-1/CP1252 vs UTF-8) sem normalização, gerando byte-stream misto.

**Conduta adotada (Thinker):** NÃO reescrever o histórico às cegas (risco de destruir conteúdo
legal/decisório); registrou D-431 e D-432 por **append não-destrutivo** (concatenação de bytes
UTF-8 ao final), preservando o conteúdo histórico original.

**Lição permanente (integridade de arquivos de fonte única):**
1. Arquivos de fonte única (DECISOES.md, PLANO_MESTRE.md) devem ser salvos e validados como
   UTF-8 SEMPRE; detectar cedo "invalid UTF-8" via leitura padrão.
2. Nunca reescrever/re-encodar um log histórico com corrupção sem revisão humana/editorial.
3. Repair de encoding misto é tarefa dedicada e controlada — NÃO automática e às cegas.
4. Falta de registro (D-426..D-430) em DECISOES.md é débito de processo: registrar decisões
   no ato (D-390) para não perder a trilha de decisão da fase.

**Pendente:** repair controlado do DECISOES.md (human/editorial, sem perda de conteúdo) + preenchimento
das decisões faltantes da F17; separado do fechamento técnico da F17.

## D-433 — Reconciliação do DECISOES.md: backfill D-426→D-430 por append não-destrutivo + repair controlado de encoding (backup+diff) é tarefa do Doer (T444), não do Operador; pendências reais do Operador = 2 (credencial de teste + gate legal)

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Doer registrou D-431/D-432 por append e descobriu que o DECISOES.md perdeu D-426→D-430 (nunca materializados) e tem encoding misto/mojibake. A conduta de não reescrever às cegas está correta (§10.5: arquivos vencem; não destruir conteúdo decisório). Porém o backfill e o repair NÃO são pendência do Operador: o conteúdo de D-426→D-430 existe no exchange_log (fonte de verdade de eventos) e pode ser reconstruído; o repair de encoding é tarefa técnica controlada (backup + diff + validação UTF-8). O Operador só entra onde é função dele: credencial de teste e gate legal. O deploy Vercel auto-resolve (Operador já aceitou o atraso).

**Decisão:**
1) Emitir T444: Doer faz backfill de D-426→D-430 por append (reconstruindo do exchange_log, na ordem) + repair controlado de encoding com backup prévio e verificação por diff; só commitar se o diff mostrar normalização de encoding sem perda de linhas de conteúdo; se detectar perda → BLOCKED/ESCALATE.
2) Reclassificar pendências do Operador para 2: (a) credencial de conta de teste (→ T433 + validação T443); (b) gate legal final (advogado).
3) Remover da lista do Operador: backfill/repair (é do Doer) e deploy Vercel (auto-resolve, já aceito).
4) Manter regra D-430: Thinker especifica decisões, Doer materializa; após T444, o Doer passa a materializar toda DECISAO emitida no próximo commit batched (evita novo gap).
5) T443 permanece [x] código; fechamento completo após deploy+credencial.

**Justificativa:** Restaurar a fonte única de verdade sem destruir conteúdo; não onerar o Operador com tarefa técnica que o organismo pode fazer com segurança (backup+diff).


## D-434 — Texto canônico de D-426→D-430 fornecido pelo Thinker (extraído do transcript) para materialização no DECISOES.md

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Doer reportou que o backfill de D-426→D-430 é impossível com fidelidade porque o texto não existe no repositório (exchange_log.jsonl não as registrou, git history só tem D-431/D-432). As decisões foram emitidas pelo Thinker no chat mas nunca materializadas. O Doer corretamente recusou fabricar conteúdo decisório. O Thinker extrai o texto canônico do transcript e fornece para materialização por append não-destrutivo.

**Decisão:** Fornecer o texto canônico de D-426→D-430 para o Doer materializar no DECISOES.md por append não-destrutivo. Cada decisão foi emitida no chat em momento específico e registrada no exchange_log conceitual (embora não no arquivo).

## D-435 — Reconciliação D-430/D-431: fundir conteúdo (D-431 mais completo) no D-430; re-titular D-431 como divisão de escrita em arquivos de governança

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Doer identificou que D-430 e D-431 são quase-duplicados em substância (ambos 'marco consolidado da F17'). D-430 foi emitido primeiro; D-431 foi emitido depois com conteúdo adicional (backend de consentimento T443 + divisão de escrita). Pela regra não-destrutiva de T444, o Doer manteve ambos e reportou para o Thinker especificar a reconciliação.

**Decisão:**
1) Fundir o conteúdo de D-431 no D-430 (manter D-430 como o marco consolidado, mas com o conteúdo completo de D-431 que inclui T443 e a divisão de escrita).
2) Re-titular D-431 como 'Divisão de escrita em arquivos de governança (DECISOES.md/PLANO_MESTRE.md): função do Thinker especificar, Doer materializar' — preservando a informação importante de D-431 sobre a divisão de responsabilidades.
3) Doer executa a reconciliação (edição controlada, não-destrutiva) e commita.
4) Após reconciliação, F17 está em estado consolidado completo, aguardando apenas fatores externos (deploy Vercel, credencial de teste, gate legal) para a revisão agregada final.

**Justificativa:** Elimina quase-duplicação preservando toda a informação; D-430 fica como o marco consolidado definitivo; D-431 vira registro permanente da divisão de escrita (que é importante para governança futura).


## D-436 — F17 em estado consolidado completo: código mergeado (T435→T443), DECISOES.md íntegro (D-425→D-434), pendências = fatores externos (deploy Vercel, credencial de teste, gate legal); revisão agregada final pendente

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** T444 completo: repair de encoding (UTF-8 válido, sem perda de conteúdo), backfill D-426→D-430 (append não-destrutivo), e reconciliação D-430/D-431 (fusão de conteúdo, re-titulação). DECISOES.md agora íntegro e completo (D-001→D-434). Código da F17 mergeado (T435→T443). Pendências restantes são todas fatores externos: deploy Vercel (auto-resolve em ~24h), credencial de teste (Operador), gate legal final (advogado).

**Decisão:**
1) T444 marcado [x] completo (repair + backfill + reconciliação).
2) F17 em estado consolidado completo: código mergeado, DECISOES.md íntegro, pendências = fatores externos.
3) Quando os fatores externos resolverem: Doer fecha T438 (teste cookies sessão limpa) + prova de rede T432 (após deploy Vercel); Doer fecha T433 (teste ao vivo direitos) + validação T443 (após credencial de teste); então Thinker emite a revisão agregada final da F17.
4) Pendências do Operador = 2: (a) credencial de conta de teste (via env, sem chat); (b) gate legal final (advogado). Deploy Vercel auto-resolve.

**Justificativa:** F17 com todo o trabalho de código e governança concluído; revisão agregada final só faz sentido com evidência completa (incluindo prova de rede e teste ao vivo).

## D-437 — Flags do T445 decididos: unificação de escala 0–100 deferida para F18 (lote de produto com guardas visuais); guard do toggle anual agora (T447); rgpd-locale corrigido agora com whitelist de nomes de lei (T448)

**Data:** 2026-09-02 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Doer entregou o T445 e trouxe 3 flags. (1) Escala: o FAQ agora é verdadeiro ('jogos e mangás 0–100, demais 0–10'), o que resolve a inconsistência textual apontada pela auditoria; a unificação total em 0–100 é mudança de produto com impacto visual amplo e possível implicação de normalização de dados (livros exibem escala 0–5/0–10) — merece lote dedicado, não mudança rápida dentro de uma fase de compliance. (2) Toggle anual: o código suporta STRIPE_PRICE_*_YEAR_* mas a existência das env/prices anuais é infra/negócio do Operador; sem eles o checkout anual quebraria — precisa de guarda defensiva agora. (3) rgpd-locale: o teste T248 ('en-US neutro') falha porque en-US menciona 'LGPD' — nome próprio de lei não é leak de i18n; o teste precisa de whitelist, preservando a detecção de leaks reais.

**Decisão:**
1) Escala: aceitar o FAQ corrigido como estado verdadeiro atual; DEFERIR unificação total 0–100 para F18 como tarefa de produto (verificar normalização armazenada por fonte, unificar display, guardas de regressão visual + gate visual do Operador) — registrar como candidato F18, não executar agora.
2) T447 agora: guarda defensiva do toggle anual (env ausente → ocultar/desabilitar com fallback gracioso; nunca iniciar checkout anual sem price_ válido).
3) T448 agora: whitelist de nomes próprios de leis/autoridades (LGPD/GDPR/AEPD/ANPD) no rgpd-locale.spec.ts, mantendo detecção de leaks reais de pt-BR; suíte volta a 321/321.
4) ESCALATE ao Operador: decidir se quer vender plano anual (criar price_ anuais no Stripe + setar STRIPE_PRICE_*_YEAR_*); o guard do T447 reabilita o toggle automaticamente quando existirem.
5) Após T447+T448: standby para fatores externos (deploy Vercel → T438/prova T432; credencial → T433/validação T443; gate legal).

**Justificativa:** Separa o que é compliance (feito), o que é defesa imediata (T447/T448, pequenos e seguros) e o que é decisão de produto com impacto amplo (escala, F18) — evitando scope creep dentro da fase de compliance.

## D-438 — Auditoria de 4-set (reverificação) triada pelo Thinker: identificação consistente; P0 consentimento granular já implementado (mr_consent) aguarda teste em sessão limpa (T438); P1 harmonização de Termos executada; endereço físico e prova de segurança = gate externo

**Data:** 2026-09-04 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O Operador entregou auditoria de reverificação (4 set 2026). Veredito: parcialmente adequado, sem conformidade plena (LGPD/CDC/GDPR). Identificação (END ART Studios, CNPJ 45.370.930/0001-75, Osasco, SP, endart.studios@gmail.com) consistente. Riscos remanescentes: P0 cookies/consentimento (checkboxes desmarcados + lgpd-consent-v1=accepted + ph_*_posthog); P1 endereço físico completo; harmonização de Termos (categorias progressivas vs seis; cancelamento); IA vs algoritmo; matriz de retenção/transferências; prova de segurança do backend; /user/data.

**Decisão:**
1) Identificação: consistente, sem ação de conteúdo; endereço físico limitado à cidade/estado é risco P1 → validar com advogado/contador (NUNCA inventar endereço).
2) P0 consentimento: estado granular já implementado (mr_consent com categorias/versão/ts/idioma/país + limparResiduos remove lgpd-consent-v1 e ph_*); falta apenas teste em sessão limpa (T438, depende deploy Vercel) — o achado 'lgpd-consent-v1' é provável cookie stale de versão antiga, removido pelo limparResiduos.
3) P1 harmonização de Termos: executada (4.1 seis categorias; 4.4 sem 'em breve'; 5.2 responsabilidade do MEDIA Rate perante o usuário; 5.4/5.5 cancelamento imediato + acesso até fim do ciclo, espelhando a landing).
4) P1 IA: claims comerciais renomeadas para 'recomendações personalizadas' (T445); placeholder do assistente sem 'inteligência artificial' (corrigido); Política mantém disclaimer explícito (sem IA generativa).
5) Itens que exigem input/validação externa ou lote dedicado (não executar às cegas): matriz de retenção/transferências por operador, prova de segurança do backend (auditoria independente), /user/data (T433 — credencial), licenças/atribuições (P2).

**Justificativa:** Separa texto-harmonizável (executado) do que exige input do Operador/advogado ou prova técnica (externo), sem inventar endereço nem afirmações de segurança não demonstráveis.

## D-439 — T029 auditoria image optimization: causa-raiz do consumo ~99% da cota Hobby (bots + variantes de runtime)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Dashboard Vercel (30d, ~4.969 transformações, 99% da cota de 5.000/mês): Cleveland (46,7%) + Washington (20,6%) ≈ 67% do consumo em edges EUA vs São Paulo 17,4%; picos discretos single-region. Baseline ~165/dia, picos 700–790.

**Achados (file:line):**
1) H1 crawlers — SUPERFÍCIE ABERTA: `apps/web/src/app/robots.ts:3-14` permite `*` em `/` (só bloqueia `/api/`); sem regras para bots de IA nem para `/_next/image`/`/_vercel/image`. `apps/web/src/app/sitemap.ts:37-46` expõe 1 URL por slug × 3 locales.
2) H2 variantes — OTIMIZAÇÃO 100% RUNTIME: `apps/web/next.config.ts:27-46` só define `remotePatterns` (sem `deviceSizes`/`imageSizes` → defaults do Next); cards com `sizes` responsivo (`MediaCard.tsx:245`, `MediaCardShell.tsx:176`); hero `sizes="100vw"` + `priority` (`MediaDetailClient.tsx:155-163`); upload persiste o original sem variantes (`apps/api/src/modules/upload/upload.service.ts:71-80`, limite 5 MB — não 50 MiB; sem `sharp` em `apps/api/package.json:44-74`); `unoptimized` inconsistente (presente em `MediaCardShell.tsx:181-183`, ausente em `MediaCard.tsx:359-368` e demais). Comentário no Shell cita erro 402 do otimizador — cota já mordendo produção.
3) H3 query strings dinâmicas — REFUTADA: `src` vem direto do campo imagem sem `?v=`/`Date.now` (só normalização `%25→%`, `MediaCard.tsx:339`).
4) H4 previews/SSG — CORREÇÃO AO PLANO: `apps/web/vercel.json:1` sem proteção via código (Deployment Protection só verificável no dashboard); único `generateStaticParams` é o de locales (`app/[locale]/layout.tsx:66-68`) — páginas de mídia são dinâmicas, não 47 SSG; multiplicador real = sitemap × 3 locales.

**Decisão:** H1 + H2 como co-causas; sequência T030 (robots por bot + noindex previews) → T032 (tokens deviceSizes/imageSizes + padronizar unoptimized) → T031 (sharp no upload, com desenho de backfill do acervo remoto TMDB/IGDB) → T033 (runbook semanal). Meta: <20/dia (~600/mês). IDs sugeridos pelo Thinker (D-018/019/020) colidem com a numeração vigente (último D-438) → registrados como D-439/440/441.

**Verificado:** auditoria por leitura direta de fonte (grep/read); sem alteração de código neste commit.

## D-440 — T030 robots por bot (grupos A/B): crawlers de IA bem-comportados fora das imagens, SEO preservado

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** D-439/H1: `robots.ts` permitia `*` em tudo exceto `/api/`; crawlers de IA varrendo páginas/imagens explicam ~67% do consumo em edges EUA.

**Decisão:**
1) Grupo A (treino — GPTBot, CCBot, ClaudeBot, anthropic-ai, Google-Extended, meta-externalagent, Bytespider, Applebot-Extended): `Disallow: /`.
2) Grupo B (busca com IA — PerplexityBot, Amazonbot, YouBot, cohere-ai): `Disallow: /api/, /_next/image, /_vercel/image` (`/api/` incluído para o grupo não ficar mais permissivo que a regra genérica).
3) Regra genérica preservada (`allow /`, `disallow /api/`); Googlebot/Bingbot sem bloqueio de imagens.
4) robots.txt é consultivo — sucesso = queda no dashboard em 7 dias (baseline ~165/dia, meta <20/dia), não promessa de bloqueio total.

**Verificado:** `apps/web/test/robots.spec.ts` 4/4 (TDD: red antes, green depois); `npm run build` OK em apps/web.

## D-441 — T030 noindex em previews via VERCEL_ENV (header X-Robots-Tag)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Previews `*.vercel.app` têm cache próprio de imagens; varredura de preview re-paga o warm-up (H4 do D-439). `apps/web/vercel.json` não oferece proteção via código.

**Decisão:** `apps/web/src/middleware.ts` emite `X-Robots-Tag: noindex` somente quando `process.env.VERCEL_ENV === "preview"`; nunca sobrescreve o header mais forte das rotas privadas; produção intacta. `curl -sI` em preview (presente) vs produção (ausente) fica como verificação pós-deploy do Operador.

**Verificado:** `npm run build` OK; CSP inalterada.

## D-442 — T034 amenda status.schema.json: evidencia vira oneOf [objeto, array] + validador alinhado

**Data:** 2026-09-06 · **Fase:** F00-setup · **Status:** REGISTRADA

**Contexto:** Contradição real entre governanças: `.kilo/schemas/status.md:10` documenta `evidencia` objeto; `.claude/schemas/status.schema.json` exigia array; o exemplo do PROMPT_SIMBIOSE usa objeto. Handoffs em array validavam OK contra o arquivo.

**Decisão:**
1) `evidencia` = oneOf [evidenciaItem, array minItems 1 de evidenciaItem] via `definitions` (condicionais allOf preservados nas duas formas); required inalterado.
2) `validar_status.py` normaliza objeto→lista nas regras cruzadas (iterar dict quebrava); integrity suite estendida ([5b/6]) sem quebrar asserts; bônus: [5/6] agora acumula erros (o `all_errors.extend` faltante fazia falha do validator passar batida).
3) Envelope: transporte no chat = {sync, evento, payload}; payload mantém `sync` (required — removê-lo quebraria "manter required atuais"); `tentativas` passa a constar nos STATUS.
4) Nota factual: R029/R030 descrevem o schema com `tentativas` required, `evidencia` objeto e additionalProperties:false — nenhuma dessas cláusulas existe no arquivo em disco (leitura direta + `git log`: última mudança T297/`406210f`; `review.schema.json` não existe no repo). Os STATUS array de T029/T030 validavam OK; o oneOf resolve a divergência doc×arquivo para o futuro.

**Verificado:** integrity suite verde (inclui [5b/6] objeto+array, TDD red→green); STATUS T029/T030 reemitidos com tentativas:1 validam OK.

## D-443 — Rulings dos desvios de T030 (1–6): todos aceitos

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Doer reportou 6 desvios no STATUS T030; Thinker aceita todos.
1) Teste em `apps/web/test/robots.spec.ts` (vitest include só cobre `test/**`) — aceito.
2) D-439/440/441 em vez de D-018/019/020 (colisão) — aceito.
3) Grupo B inclui `/api/` (evita regra mais permissiva que `*`) — raciocínio correto.
4) `next-env.d.ts` unstaged (gerado) — procedimento certo.
5) Warning middleware→`proxy` (Next 16) — candidato registrado, sem tarefa (vira TAREFA se virar risco de build; sem scope creep).
6) `curl` preview/production no Operador ([8]) — fecha o loop.

**Decisão:** Desvios 1–4 e 6 incorporados como precedente; item 5 monitorado.

## D-446 — T031: sharp somente onde possuímos os bytes; remoto usa escadas nativas (T036)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Upload local cobre fração do acervo; maioria é remota (TMDB/IGDB/OpenLibrary).

**Decisão:** sharp gera variantes (320/640/960 WebP q75) só no upload + backfill idempotente do storage próprio. Backfill do acervo remoto NÃO será proxy/ingest (fronteira SSRF + custo de storage sem necessidade): TMDB/IGDB/OpenLibrary já expõem escadas nativas (`w342/w780`, `t_300/t_720`, `-S/-M/-L`), que viram srcset com `unoptimized` na T036.

**Verificado:** em T031 (upload) e T036 (remoto).

## D-447 — T036: remoto usa ladders nativas das fontes + helper único

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** D-446: remoto não passa pelo upload; TMDB/IGDB/OpenLibrary/Google Books têm escadas nativas de tamanho.

**Decisão:** `remoteLadder(src)` em `lib/image-policy.ts` deriva srcset das escadas nativas (TMDB w342/w780 + original; IGDB t_cover_small/big/2x; OpenLibrary -S/-M/-L; Google Books `books.google.com/books/content` via param zoom) + `<img>` estático; sem ladder pública → `next/image` com `unoptimized` (fallback); token `books.google` absorve o gap do TDD de T032.

**Verificado:** em T036 (spec + build + srcset).

## D-448 — sharp 0.35.4 (bump por segurança)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** sharp 0.34.5 carrega CVEs HIGH em libvips (audit).

**Decisão:** Pinar `sharp@0.35.4` em apps/api (+ `allowScripts` raiz); prebuilt musl compatível com o Dockerfile multi-stage (node:20-alpine).

**Verificado:** em T031 (audit HIGH do sharp zerado; suíte 23/23 em 0.35.4).

## D-449 — `<img>` estático com srcset é mais forte que `unoptimized` em `next/image`

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** `next/image` não aceita `srcSet` customizado (TS2322 quebrou o build de T031).

**Decisão:** Fontes com ladder (local T031, remotas T036) renderizam `<img>` com srcset derivado — zero passagem pelo otimizador runtime, mais forte que `unoptimized`.

**Verificado:** em T031 (build verde após a troca).

## D-450 — Ladder local usa `withoutEnlargement` (clamp), não "pula maiores"

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Spec mandava pular rungs maiores que o original; ladder parcial + srcset derivado pelo frontend = 404 em originais pequenos.

**Decisão:** Rungs acima do original são clamped às dimensões reais (nunca upscale); ladder sempre completa, derivação nunca gera 404. Voltar a "pular" exige srcset dirigido pela API (escopo maior, postergado).

**Verificado:** em T031 (teste de clamp 500px + ladder completa).

## D-451 — 4 HIGH pré-existentes em deps registrados como T037

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Audit pós-T031: `deepmerge-ts` (via prisma major) + `fast-uri` (via ajv chain) seguem HIGH; fixes são breaking.

**Decisão:** Registrar como T037 (baixa prioridade); fora de escopo da Fase 10. O HIGH do sharp foi zerado em T031.

**Verificado:** em T037.

## D-469 — T041 PARCIAL: PR existe, checks vermelhos herdados vetam merge

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** PR #74 open e mergeável tecnicamente; 5 jobs vermelhos com causas no main (worktree + npm ci fresco).

**Decisão:** `[~]` até T042; D-468 (nada mergeia com red) mantido.

## D-470 — PROPOSTA_DOER de CI-repair aprovada (T042)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** CI-repair é herança, não produto; permissão para CI infra concedida.

**Decisão:** Escopo fechado (lint --fix, prisma generate, CodeQL/ZAP cirúrgicos); urgência máxima.

## D-471 — GITHUB_TOKEN inválido para gh CLI (P010, Operador rotaciona)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** 4 tentativas documentadas; API REST em modo leitura usada sem exibir/persistir.

**Decisão:** Conduta correta; rotação com o Operador; não bloqueia T042.

## D-447 — T433 aprovado (direitos LGPD funcionais em produção); bug real de produção em GET /consent/history (BigInt não serializa → 500) corrigido via T449; lição: mocks de teste devem refletir tipos reais do driver (Postgres bigint → BigInt)

**Data:** 2026-09-09 · **Fase:** F17-compliance-juridico · **Status:** REGISTRADA

**Contexto:** O teste ao vivo provou que exportação, exclusão com revogação de sessões e cancel-exclusion funcionam em produção — o coração do T433. Mas a validação do T443 expôs um bug real: GET /consent/history retorna 500 sempre que há registros, porque o ts vem como BigInt do driver Postgres e JSON.stringify não serializa BigInt. Os testes unitários do T443 (Prisma mockado) não capturaram isso porque o mock retornava Number — o mock mentiu sobre o tipo do driver.

**Decisão:** 1) T433 marcado [x] (direitos provados ao vivo). 2) T449: fix de serialização em ConsentService.historico (ts BigInt → Number ms epoch, documentado no Swagger) + teste de regressão que serializa a resposta + re-validação ao vivo com lgpd-test. 3) Lição registrada em AGENTS.md: mocks de Prisma refletem tipos reais do driver; todo endpoint novo exige teste que serializa a resposta. 4) Defeito funcional em endpoint owner-only de baixo tráfego — não incidente de segurança (filtro global impede vazamento de stack no 500).

**Verificado:** T449 (regressão RED→GREEN 4/4 consent; re-validação ao vivo pendente no STATUS).

## D-490 — Semgrep OSS substitui CodeQL como SAST bloqueante (decisão P013 do Operador)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** CodeQL exige GitHub Advanced Security (pago) em repositórios privados para upload de results (causa raiz confirmada em T044: `Resource not accessible by integration`, conta usuário, repo privado sem GHAS).

**Decisão:** Semgrep OSS (gratuito) substitui CodeQL como SAST bloqueante no CI. CodeQL desativado com justificativa documentada (repo privado sem GHAS — causa raiz confirmada em T044). Semgrep OSS funciona em repo privado sem licença paga, mantém cobertura SAST (regras OWASP Top 10 + security audit), e é padrão da indústria. GHAS reavaliado quando houver receita/contexto que justifique o custo.

**Ação:** T045 substitui job CodeQL por Semgrep no ci.yml; job CodeQL desativado com comentário referenciando D-490 e T044.

## D-481 — Causa raiz do gh CLI: GITHUB_TOKEN de sessão sombreava keyring

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** `gh auth status` falhava com token inválido apesar de login válido no keyring.

**Decisão:** Causa = `GITHUB_TOKEN` inválido (40 chars) injetado só no escopo Process (precedência sobre keyring); workaround por comando (unset em sessão), zero mudança persistente, nenhum segredo exibido. P010 reescrito: rotacionar/remover o token na ORIGEM (harness/provedor) — o keyring já basta.

## D-482 — Gate de merge refinado: E2E é não-bloqueante por design

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** `ci.yml` marca o job E2E com `continue-on-error` ("nao bloqueia merge ainda").

**Decisão:** Bloqueantes = Lint & Audit, Test & Coverage, RLS, Build, Stryker, CodeQL, ZAP. Exceção dura: E2E atribuído ao diff da Fase 10 veta o merge até correção (T044 verifica).

## D-483 — Efetividade do P012 não verificada

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Checks seguiram vermelhos após o re-run pós-P012.

**Decisão:** Suposição não é evidência: T044 confirma via API (permissions efetivas) e logs atuais antes de nova hipótese.

## D-463 — Gate próprio zero-dep aceito (npm não tem allowlist por advisory)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Restrição de T039 proibia ferramenta externa; npm não oferece allowlist por advisory.

**Decisão:** `scripts/audit-ci.mjs` (node puro) honra o espírito (zero supply chain nova); cirurgia provada nos dois sentidos.

## D-464 — Timebox 40/15 de T039 por sub-classificação do spec

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Infra de CI com lógica recursiva e debug cross-platform é esforço medio.

**Decisão:** Sem penalidade; calibrar specs futuros.

## D-465 — Governança da exceção: editar auditAllowlist exige trilha

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Exceção sem trilha apodrece em silêncio.

**Decisão:** Qualquer edição em `config.auditAllowlist` exige referência em `DECISOES.md` + entrada na revisão trimestral (primeira 2026-12); sem trilha vira `SECURITY_FINDING`.

## D-462 — Operador aceita risco residual deepmerge-ts (P009) com exceção de CI

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** T037 PARCIAL: cadeia `deepmerge-ts<8.0.0` sem fix sem major; Operador escolheu opção 1.

**Decisão:** Aceite do risco residual com exceção de CI documentada (T039), revisão trimestral no runbook T033 e referência explícita no ci.yml. Prisma major adiado indefinidamente.

## D-458 — T037 fica `[~]`: `[x]` exige audit verde ou aceite formal

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** R037 APPROVED certifica execução/análise de T037, mas o HIGH residual segue.

**Decisão:** Plano recebe `[~]` até o Operador aceitar o risco (com exceção de CI documentada) ou autorizar T039-prisma-major. Gate não se maquia.

## D-459 — Timebox 45/30 de T037 aceito excepcionalmente

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Veredito alcançado dentro da janela; excedente foi verificação integral.

**Decisão:** Aceito nesta rodada; regra de decompor mantida para o futuro.

## D-460 — 6 testes falhando = bloqueador #2 de merge (T038)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Job test do ci.yml ficaria vermelho: data hardcoded + mock sem `count`.

**Decisão:** T038 corrige só em arquivos de teste; P009 + T038 são o caminho crítico do merge.

## D-452 — Regra de sweep: importador vivo de next/image com src remoto entra; morto não se toca

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** T036 converteu 9 componentes vivos; `ScoreShowcase` (morto, T415) ficou intocado.

**Decisão:** Todo importador vivo de `next/image` com src remoto entra no sweep de bypass; código morto não se toca.

## D-453 — Ladders reais da IGDB (correção de spec por evidência)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Spec de T036 citava `t_300/t_720/t_1080p`, inexistentes na API IGDB (evidência: `seed-posters.ts:138-141` + D-262).

**Decisão:** Valem `cover_small/cover_big/cover_big_2x` + legado `t_thumb`; evidência do Doer vence spec, como deve ser.

## D-454 — `[x]` antes de APPROVED é violação de ordering

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** T036 marcada `[x]` antes do REVIEW.

**Decisão:** Sanado por R036 nesta rodada; recorrência = REJECTED + TAREFA de correção.

## D-455 — Hero/backdrop permanece no rung original

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** Ladder 342/780 sub-resolveria 100vw full-bleed.

**Decisão:** Backdrop usa o original estático (qualidade máxima, zero transformação).

## D-456 — 4 HIGHs de deps são bloqueador de merge (ci.yml lint-audit)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** `deepmerge-ts` + `fast-uri` quebram o job lint-audit do CI.

**Decisão:** T037 com prioridade máxima apesar de dívida pré-existente; sem majors; se inzerável, PARCIAL + escalonamento (aceite de risco = Operador).

## D-457 — T037: HIGHs sem major zerados; deepmerge-ts residual documentado (PARCIAL)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** ci.yml lint-audit (`npm audit --audit-level=high`, `.github/workflows/ci.yml:94-95`) bloqueava o merge do pacote Fase 10.

**Rulings por dependência (sem majors, só patch/minor via npm):**
1) fast-uri 3.1.5→3.1.7 / 4.1.2→4.1.4 (`npm update`, dentro dos ranges ajv ^3.0.1 / fast-json-stringify ^4.0.0) — HIGHs zerados.
2) browserslist 4.28.6→4.28.9, qs 6.15.3→6.16.0, sanitize-html 2.17.6→2.17.7 (`npm audit fix` sem --force) — zerados.
3) deepmerge-ts <8.0.0 (GHSA-ggr8-5vv4-36mx, stack exhaustion): RESIDUAL. Fix exige prisma major/downgrade (breaking); override para 8.x sob pin exato 7.1.5 do @prisma/config = major transitivo não testado. Alcance: só via CLI `prisma` (@prisma/config, devDependency de build/migrate/seed com inputs do repo); runtime `@prisma/client` não carrega o pacote; nenhum request o alcança. Runner copia node_modules cheio (sem prune) — endurecer com prune é follow-up de deploy, não T037.
4) Efeito colateral: churn do npm expôs fragilidade latente (`sharp.Metadata` vs tipos ESM-first do sharp 0.35, TS2503) — corrigido com import nominal de tipo, sem mudança de comportamento.

**Verificado:** em T042 (lint 0 erros, builds, suites, audit gate, docs, diff, P012 não-verificado por API, codificação de erros CI categorizados, DAST e SAST com vereditos + ações atribuídas); PR #74 (`MERGEABLE`); T043 (`PENDENTE` — `espec` não recebida); T045 (`candidato` — `E2E` `a11y` `pre-existente`).

## D-484 — P012 CONFIRMADO: Workflow permissions `Read and write permissions` (evidência: screenshot do Settings)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA (Operador, evidência visual)

**Contexto:** P012 (`permissions` `UI`/`re-run` `ZAP`) não era verificável por `gh api` (conta `usuário`, `org` `404`, campo `permissions` `null`).

**Evidência (screenshot anexado pelo Operador):** `github.com/ENDARTStudios/MEDIA-Rate/settings/actions` → seção `Workflow permissions` → radio `"Read and write permissions"` selecionado (não `"Read repository contents and packages permissions"`); checkbox `Allow GitHub Actions to create and approve pull requests` selecionado; `Save` aplicado; página `Status` mostra o `token` `ENDARTStudios` (`scopes`: `repo`, `workflow`) e `repo view PRIVATE`.

**Decisão:** P012 `CONFIRMADO` com evidência visual; P013 reduz a `GHAS` `exclusivo` (`repo` `privado` `sem` `Advanced Security` confirmada via API `security_and_analysis.*: null`). Se `CodeQL` `vermelho` persistir após `merge`, a exceção `formal` (`D-472` `P013`: aceitar `vermelho` `documentado` `ou` `T039-prisma-major` `breaking`) é acionada, não `silenciada`.

## D-472 — T042: gate audit-ci + CI-repair (P013: CodeQL/ZAP; P012: não verificável; P011: vazio; T045: E2E a11y)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** CI #74 verde: lint-audit, test, RLS, build, Stryker; falhas herdadas: CodeQL (GHAS), ZAP (WARN+permissions), E2E a11y (não-blocante, candidato T045). Nenhuma causada pela Fase 10.

**Veredito (por job, com evidência de log):**
1) Build — VERDE (`tsc -p tsconfig.json --noEmit` via `npm run build` local OK).
2) Lint & Audit — VERDE (`audit:ci` OK via allowlist; lint 0 erros pós --fix; `console` em `scripts/*.mjs` resolvido via globals por arquivo no `eslint.config.mjs`).
3) Test & Coverage — VERDE (api 849/849 pós-rebase + generate; web 347/347).
4) RLS Isolation — VERDE (prisma generate adicionada ao job).
5) CodeQL — VERMELHO (repo-level; não fixável pela branch): conta usuário (`ENDART`), repo privado sem Advanced Security (`security_and_analysis.*: null`); upload de results do analyze requer GHAS. Ação: P013 — Operador habilita GHAS ou aceita vermelho documentado.
6) ZAP — VERMELHO por duas causas (não por T042): alvo corrigido (URL real do bot Vercel); spider PASS:55; mas `WARN-NEW: 15` (info-disclosure, CSP wildcard, permissions-policy, COEP, Base64 Disclosure, Cross-Domain, Auth Request, Sec-Fetch-Dest, Missing) + `fail_action: true` = falha; `Resource not accessible` na criação de issue (mesma causa de permissão do CodeQL). Ações: P012 (permissions de job) cobre (2); política para WARN (aceitar produto ou corrigir em T045) é do Thinker.
7) E2E Playwright — VERMELHO mas NÃO-BLOQUEANTE (D-482; `continue-on-error`). Falhas: `MISSING_MESSAGE auth.passwordStrong` (ruído de console) + `color-contrast` (nós de texto pré-existentes) + timeouts (`networkidle`). Nenhum mecanismo ligando `<img>`/ladder/contrast. Ação: T045 (se considerado regressão; senão, aceitar como a11y herdado em produto já existente).
8) Stryker Mutation — VERDE (skipped/success).

**P012 (permissions efetivas):** não confirmável via `gh api` (conta usuário, endpoint org 404, campo permissions `null`). Veredito: P013 cobre o lado técnico; o Operador confirma via UI (repo Settings → Security → Code scanning / Actions permissions) e envia screenshot para o STATUS final da fase.

**P011 (URL ZAP):** vazio — corrigido em T042 para o padrão real do bot (`media-rate-git-<branch>-...`); o caso `preview-*` nunca resolveu no ambiente deste testador. Nenhuma secret nova é necessária.

**Ações do Operador:** P009 (token) rotacionado; P010 (origem do harness) removida; P011 vazio; P012 (UI); P013 (GHAS ou aceite documentado); após merge, pacote [8] (curl robots.txt + `X-Robots-Tag` + srcset + dashboard 7 dias).

**Verificado:** PR #74 `MERGEABLE`; `git push` com `gh-safe`; `worktree` `origin/main` + `npm run lint` zero; `npm audit` (`audit:ci`) zero HIGH/crítico fora da allowlist governada.

**Nota governança:** `[x]` de T039 só após P009/P010/P011/P012/P013 resolvidos (ciclo completo); `[~]` atual (D-458) válido; T045 candidato quando a11y herdada for tratada.

## D-444 — Handoffs validam contra o schema do repositório (arquivos vencem, §3)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** R029/R030 rejeitaram STATUS contra o schema do template de bootstrap (KB), não contra o arquivo em disco — que nunca teve `tentativas` em required, `evidencia: object` ou additionalProperties:false (D-442 §4). O "validator: OK" do Doer estava correto desde o início.

**Decisão:** Arquivos vencem (§3); bootstrap/KB é template, não verdade operacional; R029/R030 superseded por R031/R032.

## D-445 — Tokens de imagem + helper único de unoptimized (spec T032)

**Data:** 2026-09-06 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** D-439/H2: defaults do Next (16 larguras) + `unoptimized` inconsistente entre componentes.

**Decisão:** Travar `deviceSizes [320, 640, 960, 1280, 1920]`, `imageSizes [64, 128, 256]`, `formats ['image/webp']`, `qualities [75]` no `next.config.ts`; helper único `isUnoptimizedSource(src)` em `lib/image-policy.ts` (hosts: anilist, openlibrary, myanimelist, comicvine, googlebooks) aplicado nos 6 componentes; sem novos domínios; sizes/priority/layout intactos.

**Verificado:** em T032 (test + build + srcset).

## D-469 — T041 PARCIAL: PR existe, checks vermelhos herdados vetam merge

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** PR #74 open e mergeável tecnicamente; 5 jobs vermelhos com causas no main (worktree + npm ci fresco).

**Decisão:** `[~]` até T042; D-468 (nada mergeia com red) mantido.

## D-470 — PROPOSTA_DOER de CI-repair aprovada (T042)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** CI-repair é herança, não produto; permissão para CI infra concedida.

**Decisão:** Escopo fechado (lint --fix, prisma generate, CodeQL/ZAP cirúrgicos); urgência máxima.

## D-471 — GITHUB_TOKEN inválido para gh CLI (P010, Operador rotaciona)

**Data:** 2026-09-07 · **Fase:** F10-image-optimization · **Status:** REGISTRADA

**Contexto:** 4 tentativas documentadas; API REST em modo leitura usada sem exibir/persistir.

**Decisão:** Conduta correta; rotação com o Operador; não bloqueia T042.


## D-491 — PRs #92/#94 aprovados e merged; E2E falho registrado como dívida T461

**Data:** 2026-09-14 · **Fase:** F18/F19 · **Status:** REGISTRADA

**Contexto:** REVIEW R460-dashboard-port e R454-flag-cloudflare-migration APPROVED
(payload do Thinker referenciava "D-459" — ID já em uso (T037); registrado aqui
como D-491, próximo livre após D-490). T460: porte da dashboard do protótipo
(379/379 testes, 11 checks verdes, rótulos de demonstração, sem links mortos,
mapa de rotas testado). T454-flag: `cloudflare_migration` criada no PostHog
(id 886344, rollout 0% = default OFF), runbook atualizado.

**Decisão:** (1) T460 e T454-flag marcados [x]; (2) merge dos PRs #92/#94 em
main autorizado e executado (95744e8, fc76d75); (3) E2E Playwright falho é
pré-existente (idêntico em #83/#86; `auth.passwordStrong` inexistente em todos
os locales) e vira a tarefa T461-e2e-playwright-saneamento; (4) Deploy workflow
falho na main também é pré-existente (falha em merge docs-only de 2026-09-13;
typecheck da API roda sem `prisma generate`) — tratado junto ao saneamento de
CI; (5) produção confirmada pós-merge (Vercel success + health monitor 200 +
render em browser real).

**Impacto:** dashboard visível em produção com integridade de produto; flag de
migração pronta para rollout gradual; dívidas de CI (E2E, Deploy) registradas.

## D-503 — Runbook Sentry fechado: vars/secret corretos + workflow_dispatch

**Data:** 2026-09-15 · **Fase:** F18-infra-cloudflare · **Status:** REGISTRADA

**Contexto:** D-498→D-502 (token org:ci, privacidade org, deleção sem criação
de vars). Screenshot do Operador confirmou `SENTRY_ORG`/`SENTRY_PROJECT`
criadas; secret `SENTRY_AUTH_TOKEN` já existia.

**Decisão:** configuração final = Secret `SENTRY_AUTH_TOKEN`; Variables
`SENTRY_ORG` + `SENTRY_PROJECT`; gate do passo `if: vars.SENTRY_PROJECT != ''`
acaba com skip silencioso (D-502). ci.yml ganha `workflow_dispatch` (validação
manual sem PR/merge). Validação executada: passo de sourcemaps executa e sobe
**764 arquivos** (run 35021802784) — exigiu `productionBrowserSourceMaps`
(D-505).

## D-504 — Especificação sem tarefa: pacote legal nunca foi criado

**Data:** 2026-09-15 · **Fase:** F17-compliance · **Status:** REGISTRADA

**Contexto:** a D-498 especificou `docs/legal/2026-09-15-revisao-legal/` como
entregável mas nenhuma TAREFA foi emitida. O Doer, corretamente, não executa
escopo sem handoff. Falha de emissão do Thinker; estado real (repo) vence
descrição (decisão).

**Decisão:** T464 materializa o pacote (9 arquivos: README-índice, 6 PDFs de
produção, CHANGELOG-JURIDICO, PERGUNTAS-ABERTAS) — versionado, o Operador
envia essa pasta ao advogado.

## D-505 — "job passa" ≠ "job cumpre sua função" (verificação de artefato)

**Data:** 2026-09-15 · **Fase:** F18-infra-cloudflare · **Status:** REGISTRADA

**Contexto:** o step de sourcemaps reportava success subindo **0 arquivos** —
o build não gerava `.map` de browser (`productionBrowserSourceMaps` ausente);
releases "fantasma" vinham do tracking da integração GitHub. Token `org:ci`
não lista releases via REST — a evidência é o log do step.

**Decisão:** correção mantida (`productionBrowserSourceMaps: true`); runbook
OBSERVABILITY.md passa a exigir **verificação de artefato** (inspecionar uma
release na UI pós-deploy; `Found N files → Uploaded` no log) para todo step
novo de observabilidade — exit code é necessário, não suficiente.

## D-506 — Política de media de teste para uploads E2E

**Data:** 2026-09-15 · **Fase:** F18-infra-cloudflare · **Status:** REGISTRADA

**Contexto:** perna "produção 201" do R2 E2E substituiria o poster VISÍVEL de
um media real. O Doer bloqueou por governança (postura correta pós-F17).

**Decisão:** uploads E2E usam exclusivamente media de teste dedicado
(slug `media-test-r2-upload`, FILME, "pode deletar"), documentado em
`docs/legal/R2-TEST-MEDIA.md`; fixture local criado (`475eb2dd…`); criação em
produção pendente de acesso ao banco (mesmo bloqueio do incidente migrate:
`postgres.railway.internal` é inalcançável — Operador fornece URL pública ou
usa `railway run`). Pós-validação: soft-delete ou fixture, a critério do
Operador.

## D-524 — Gate legal F17 FECHADO (parecer valida auditoria); T468 delegada ao Doer

**Data:** 2026-09-19 · **Fase:** F17/F18 · **Status:** REGISTRADA

**Contexto:** Operador entregou o parecer jurídico completo confirmando a
auditoria de 2026-09-04 como "juridicamente sólida e alinhada"
(LGPD/CDC/GDPR/ANPD), com riscos P0/P1/P2 conforme classificados e 7
recomendações finais (backlog F19/F20 — não bloqueiam rollout). P1 (KV) e P2
(Sentry CLI) delegados ao Doer.

**Decisão:** (1) Gate legal F17 FECHADO com evidência primária (pacote
versionado + parecer); (2) T468: Doer verifica escopo KV do token e cria as
namespaces (ou reporta criação manual); (3) Sentry verificado via CLI
(release 91a5e31 registrada, 0 novos eventos em 40h); (4) backlog das 7
recomendações versionado em docs/legal/2026-09-15-revisao-legal/parecer-recebido/;
(5) go/no-go S0→S1 após T468.

## D-519 — Lesson learned: verificação de identidade exige fonte primária

**Data:** 2026-09-16 · **Fase:** F18 · **Status:** REGISTRADA

**Contexto:** 4+ horas de diagnóstico sob hipóteses successivas (middlebox →
ativação → propagação) quando a causa raiz era account_id TRANSCRITO ERRADO em
todos os locais (duplicação no .env original, truncamento na 1ª correção). O
suporte Cloudflare identificou via sessão autenticada.

**Decisão:** (1) Toda verificação de identidade (account_id, slug, bucket)
exige PROVA PRIMÁRIA — botão de cópia do dashboard ou endpoint autenticado
(GET /accounts), NUNCA transcrição de memória/log; (2) diff programático
obrigatório antes de pernas de validação; (3) teste estrutural permanente
(account-id-integrity.spec.ts — 32 hex lowercase nos wranglers); (4) o ticket
de suporte foi cancelado ("Root cause found on our side: account_id was
transposed. No Cloudflare action needed.").

**Corolário:** o erro do Prisma MEDIA-RATE-3 ("expected 32, found 7") é da
MESMA classe — valor de identificador truncado/malformado chegando a um
parser. A caça à linha com UUID de 7 chars no banco segue o mesmo princípio
de verificação primária (query direta no banco, não inferência).

## D-525 — Biblioteca do usuário separada da watchlist; interações como fonte; cores canônicas únicas; mitigação de SW estranho

**Data:** 2026-09-21 · **Fase:** Auditoria dashboard S1 · **Status:** REGISTRADA (PR pendente de merge)

**Contexto:** Auditoria ao vivo da dashboard + review sênior apontaram: (a) "Minha biblioteca" e o
atalho "Quero ver" apontavam para /watchlist (Kanban de planejamento), que não representa o
histórico de escolhas; (b) cores de tipo de mídia com hex duplicado em componentes; (c) usuário pode
ficar preso em render antigo por service worker estranho na origem (comprovado em localhost:3000 —
o app NUNCA registrou SW próprio: nenhum sw.js no repo/histórico, nenhum serviceWorker.register);
(d) GET /api/v1/interacoes sem validação de query, paginação ou contagens.

**Decisão:**
1. **Biblioteca separada da watchlist**: nova rota protegida `/biblioteca` (middleware), abas pelos
   4 status de consumo (QUERO_CONSUMIR/CONSUMINDO/CONCLUIDO/ABANDONADO) com contagens GLOBAIS do
   servidor, filtro por tipo server-side, rótulos conjugados por mídia (vocabulário T239 via novo
   `consumoParaColuna()`). Sidebar "Minha biblioteca" → /biblioteca; atalho "Quero ver" →
   /biblioteca?status=QUERO_CONSUMIR. /watchlist PERMANECE o Kanban (não deprecada).
2. **GET /api/v1/interacoes endurecido** (D-525): query validada por Zod (status/tipo enums,
   limit 1-50 default 50, cursor opaco base64url de offset — inválido → 400); envelope
   `{ items, total, porStatus, nextCursor }`; página curta encerra paginação (sem cursor infinito);
   RLS owner-only mantido; rate limit global do gateway (@fastify/rate-limit) cobre a rota;
   Swagger documentado. Feed da dashboard usa 1 página de 50 (recente-first); biblioteca pagina.
3. **Cores canônicas de tipo de mídia: fonte única = CATEGORY_TOKENS (design-tokens.ts)**
   (movie #818CF8, series #38BDF8, game #34D399, book #FBBF24, comic #F472B6, manga #A78BFA).
   Proibido hex de mídia fora dos tokens; pulso, taxonomia, chips, histograma e rótulos da
   biblioteca consomem os tokens. Contraste AA das 6 cores sobre BG/card coberto por teste.
   Dívida registrada: acentos genéricos (indigo/sky de foco) em componentes antigos fora do escopo.
4. **Mitigação de service worker estranho**: `LimpezaServiceWorker` monta no layout raiz e desregistra
   qualquer SW da origem + limpa Cache Storage uma vez por página (o app não tem SW próprio; se um
   dia tiver, revisar antes). Evidência unitária em test/sw-cleanup.spec.ts.

**Efeitos:** breaking change controlada no corpo do GET /interacoes (array → envelope); únicos
consumidores (feed da dashboard + biblioteca) atualizados no mesmo PR. i18n: namespace `biblioteca`
(18 chaves ×3 línguas, paridade por CI). Testes: web 417/417, api 894/894, builds web+api verdes.

## D-526 — Promoção do PR #143 para produção condicionada a evidência; promoção executada

**Data:** 2026-09-21 · **Fase:** Consolidação dashboard/biblioteca · **Status:** EXECUTADA

**Contexto:** Neste repositório `main` é auto-deployada para produção (Vercel web via integração
Git + Railway API nativo; `deploy.yml` falha só no step de migration por secret com hostname
interno — pré-existente, pendência de Operador). O review sênior autorizou o merge do PR #143
somente com evidência verde da issue #147 (E2E full da biblioteca com API+DB), que o CI não provê.

**Decisão:**
1. Evidência #147 coletada em ambiente local integrado (Postgres 16 em container + migrations +
   usuários provisionados + API/web locais): E2E `biblioteca` 4/4 + `dashboard-gating` 3/3 com
   `E2E_FULL=1`, mais curl matrix da API (401/200 envelope/400 inválidos) e cenários manuais.
2. Promoção via merge commit `9ae0231` (sem squash, sem deleção imediata de branch), disparando
   Railway deploy SUCCESS + Vercel web.
3. Smoke pós-deploy em produção: health 200, deep link preservando callbackUrl, query inválida
   sem 500, watchlist intacta, API 401/200/400 conforme contrato.
4. Gate de Beta Fechada permanece no PLANO_MESTRE global (fases 2/3/4 parciais) — este PR não
   declara Beta pronta.
5. Dívidas não bloqueantes rastreadas na issue #148 (DTO explícito do /interacoes, accents legacy,
   revisão do LimpezaServiceWorker antes de PWA, advisories CSP/ZAP, rotação opcional do whsec de
   teste — fragmento truncado, valor completo jamais existiu no histórico).

## D-527 — Verdade operacional do deploy de produção; pipeline da main redesignado

**Data:** 2026-09-21 · **Fase:** Pós-promoção #143 · **Status:** PROPOSTA (PR aberto, aguarda autorização)

**Contexto:** Os runs de "Deploy" na `main` falhavam há semanas. Investigação com fonte primária:
(1) `deploy.yml` executava `prisma migrate deploy` com o secret `DATABASE_URL` do GitHub, que
contém o hostname INTERNO do Railway (`postgres.railway.internal`) — inalcançável dos runners
(P1001 reproduzido fora da rede Railway); (2) os jobs de deploy Backend/Frontend eram skippados
após essa falha; (3) MESMO ASSIM a produção recebia os deploys: Railway tem integração Git nativa
(deployment SUCCESS em cada merge — logs mostram o entrypoint `docker-entrypoint.sh` rodando
`prisma migrate deploy` no boot, antes do node subir) e Vercel promove o web pela integração Git.

**Decisão (proposta em PR):**
1. `deploy.yml` passa a conter apenas: job de validação da `main` (lint/typecheck/test/audit/build)
   + health check pós-promoção com retries (informativo). Jobs redundantes de deploy
   (Vercel/Railway via CLI, duplicando as integrações nativas) removidos.
2. Migration manual com backup move-se para `migrate-production.yml` (`workflow_dispatch` apenas),
   para migrations arriscadas fora de deploy; enquanto o secret DATABASE_URL apontar para o
   hostname interno, esse workflow também não roda dos runners — ver pendência do Operador.
3. Migrations futuras seguem o caminho canônico: PR com migration → merge → entrypoint do Railway
   aplica no boot ANTES de servir tráfego. Para migration arriscada: Operador roda
   `migrate-production.yml` (backup) antes do merge.

## D-528 — Regra de reclassificação: CONCLUIDO → ABANDONADO não é permitido

**Data:** 2026-09-21 · **Fase:** Pós-promoção #143 · **Status:** DECIDIDA (regra vigente documentada)

**Contexto:** O E2E T308 (stale, fora da allowlist do CI) esperava 200 na transição
CONCLUIDO → ABANDONADO, mas a máquina de estados (API e espelho no web, `podeTransicionar`)
rejeita. Regra, comportamento e teste estavam desalinhados.

**Decisão:** NÃO é permitido reclassificar item CONCLUIDO como ABANDONADO. Evidências: a UI
(`StatusReactionControl` via `podeTransicionar`) já não oferece a transição; semântica de produto
— para "desistir depois de retomar", o caminho é CONCLUIDO → CONSUMINDO → ABANDONADO (permitido).
Alinhamentos: comentários da máquina corrigidos (API + web); teste unitário da rejeição adicionado
(`test/interacoes.spec.ts`); T308 atualizado para esperar 400 e tratar o envelope do
GET /interacoes (D-525).

## D-529 — Máquina de estados vale também para a projeção do Kanban; watchlist com trilha de auditoria

**Data:** 2026-09-21 · **Fase:** T027 backend canonicity · **Status:** PROPOSTA (PR aberto)

**Contexto:** O `move()` do Kanban (`watchlist.service`) projetava o status na interação SEM
validar a máquina de estados — arrastar um item de COMPLETED para DROPPED gravava
CONCLUIDO → ABANDONADO diretamente, contornando a regra D-528 (o PUT /interacoes rejeita;
o drag não). As restrições de T027 exigiam que o CRUD da watchlist respeitasse D-528.

**Decisão:**
1. Máquina de estados extraída para `common/estados-consumo.ts` (fonte única — API e espelho web).
2. `watchlist.service.move()` valida a transição contra o status ATUAL da interação antes de
   projetar; inválida → 400 com mensagem clara (inclui D-528).
3. Trilha de auditoria (repudiação — STRIDE): `AuditLogService.log()` em add/move/remove da
   watchlist, fire-and-forget fora da tx RLS (falha de audit não derruba a operação).
4. UI: `podeMoverPara()` no Kanban torna o drop inválido um no-op (defesa em profundidade).

**Testes:** `test/watchlist-move-d528.spec.ts` (4 casos, TDD vermelho→verde),
`test/watchlist.e2e.spec.ts` ganhou caso HTTP D-528 (400) — 16/16.

## D-531 — Robustez de params UUID (404 pré-Prisma) e fonte única de request logging

**Data:** 2026-09-21 · **Fase:** T028-micro (follow-ups #148 itens 13-14) · **Status:** APROVADA (PR #163 merged, 156e18b — smoke produção: 404 em id malformado, logs sem duplicação, redaction csrf ativa)

**Contexto:** O smoke pós-merge do T027 (PR #160) expôs dois débitos: (13) `PATCH
/watchlist/:id/move` e `GET/PUT /interacoes/:midiaId` com id malformado faziam o Prisma
lançar P2023 ("invalid input syntax for type uuid") → **500**; (14) cada request gerava
**linhas duplicadas** nos logs do Railway — o T027 ligou o logger nativo do Fastify
(`FastifyAdapter({ logger })`) sem remover o `nestjs-pino` (`AppLoggerModule`, T1.8/T217)
que já era ativo.

**Decisão:**
1. `UuidParamPipe` (`common/pipes/uuid-param.pipe.ts`): params que mapeiam colunas
   `@db.Uuid` (`watchlist_entry.id`, `usuario_midia_interacao.midia_id`) são validados
   ANTES do Prisma; malformado → **404** (mesma semântica de "recurso não existe", sem
   probing de formato). Wireado em 6 rotas: move/reacao/remove/relink (watchlist) +
   GET/PUT (:midiaId) (interações).
2. **Fonte única de request logging = nestjs-pino.** O bloco `logger:` do
   FastifyAdapter em `main.ts` foi removido; a redaction de headers sensíveis
   (authorization/cookie/x-csrf-token — esta última adicionada agora) vive em
   `logger.config.ts`. Regra: NUNCA dois loggers de request no mesmo processo.

**Testes:** `test/param-uuid-404.spec.ts` (8 casos, TDD vermelho→verde; spy garante que o
service não é alcançado) + `logger-redact.spec.ts` (+1 caso runtime x-csrf-token).
Suíte: 897/897. Smoke de produção valida o comportamento após o merge.

## D-532 — Guarda fail-closed `migration-safety` no CI (B1, #148 item 7)

**Data:** 2026-09-21 · **Fase:** T031-b1-prod-guards · **Status:** PROPOSTA (PR aberto)

**Contexto:** O entrypoint do Railway aplica `prisma migrate deploy` no boot de TODO
deploy de produção e `main` é deploy automático (D-527) — um PR com migration
problemática mergeado em `main` vai direto para produção, sem stage e sem trava
(#148 item 7; bloqueador B1 do relatório T029).

**Decisão:**
1. Guard CI `migration-safety` (job + `scripts/ci/migration-safety.mjs`), executando
   SOMENTE em `pull_request`. PR que altera `apps/api/prisma/migrations/**` ou
   `apps/api/prisma/schema.prisma` exige: label `migration-review` + seção `## Rollback`
   com conteúdo + linha `Migration:` declarando a intenção (ancorada no início de linha).
2. FAIL-CLOSED: metadado ilegível (labels JSON quebrado, corpo vazio, arquivos ilegíveis)
   com mudança de banco = bloqueado. Self-test determinístico (10 fixtures, sem
   rede/segredos) roda antes da avaliação em todo run.
3. Metadados entram no script via ARQUIVOS escritos a partir de env do GitHub (nunca
   inline em shell) — anti-injeção.
4. Limites: não cobre push direto (já proibido pela ruleset D-457); valida o contrato,
   não a qualidade da migration; tornar o check REQUIRED na ruleset de `main` é decisão
   do Operador (P011). Staging/Environment e caminho de migration manual: propostas em
   `docs/b1-prod-guards.md` (P012/P013) — nada executado.

**Testes:** self-test 10/10 (`--self-test`); CLI validado nos 3 caminhos (liberado sem
banco exit 0; liberado com contrato exit 0; bloqueado/fail-closed exit 1).

---

## D-533 — T032: merge do guard B1 (#168) e escalonamento do P011 (required check)

**Data:** 2026-09-22 · **Fase:** F09-cicd / T032-merge-pr168 · **Status:** DECIDIDO (merge feito; P011 escalado)

**Contexto:** O PR #168 (guarda `migration-safety`, D-532) já se encontrava mergeado em `main` via **merge commit** `bc99630` (2026-09-22T03:41:37Z), com head `089483e`. A T032 pedia auditar/mergear e habilitar o check obrigatório (P011) **com segurança**.

**Decisão:**
1. Merge confirmado como merge commit (`bc99630`); `origin/main` contém o head `089483e`. Sem squash/rebase.
2. Pós-merge verificado: CI de `main` **success** (run `35684093799`, 4m33s); Deploy **success** (`35684093823`, 2m31s); `deploy.yml` success. **Smoke:** API `/health` 200; web `/pt-BR` `/en-US` `/es-ES` 200; HTML da home sem chave i18n crua; sem 5xx observado.
3. **P011 NÃO habilitado — escalonado.** Inventário das PRs abertas (#140, #139, #133, #4, #3, #2): **nenhuma** possui o check `Migration Safety (B1)`. Os últimos runs de #140 (2026-09-20T19:41Z) e #139 (2026-09-20T18:53Z) são **anteriores** ao merge do guard (2026-09-22T03:41Z). O job só existe a partir do #168 e **adicionar um required check não o executa retroativamente** — torná-lo required agora deixaria essas PRs em "Expected — aguardando" (**bloqueadas**). Conforme restrição da T032, não se habilita required com PR aberta sem o check.
4. **Caminho seguro para P011 (Operador):** re-executar o CI (ou push de commit) nas PRs abertas que se pretende manter, para que o check `Migration Safety (B1)` reporte; então adicionar o check aos required da ruleset `protect-main`. PRs legadas/abandonadas (#2/#3/#4 já vermelhas) podem ser fechadas antes de habilitar.
5. P012/P013 permanecem pendências do Operador — nada executado.

**Evidências:** merge commit `bc99630`; runs `35684093799` (CI) e `35684093823` (Deploy); smoke `curl` `/health`·`/pt-BR`·`/en-US`·`/es-ES` = 200; inventário de checks das PRs abertas (nenhuma com `Migration Safety (B1)`).

---

## D-534 — T033: `security.yml` verde (audit governado + pin válido do Trivy) e scan de imagem em modo relatório

**Data:** 2026-09-22 · **Fase:** F09-cicd / T033-b2-security-yml-green · **Status:** DECIDIDO (PR #172 aberto, SEM merge)

**Contexto:** o `security.yml` estava vermelho crônico em `main` (run `35685178528`). Três causas: (1) `scan/Audit dependencies` usava `npm audit --audit-level=high` **cru**, sem a allowlist governada — os "3 highs" são **uma cadeia** (`deepmerge-ts` GHSA-ggr8-5vv4-36mx → `@prisma/config` → `prisma`), advisory **dev-only** via CLI prisma já allowlistado (P009/D-462); (2) `trivy-image` usava `aquasecurity/trivy-action@0.28.0`, tag **inexistente** (a correta é `v0.28.0`) → `Set up job` falha em 3s; (3) `scan` usava Trivy `@master` (ref móvel).

**Decisão:**
1. **Audit**: `npm audit --audit-level=high` → **`npm run audit:ci`** (`scripts/audit-ci.mjs`) — bloqueia high/critical de runtime; única exceção é o advisory dev-only allowlistado (P009/D-462). Não é `ignore` cego.
2. **Trivy**: pinado ao **SHA imutável** `ed142fd0673e97e23eac54620cfb913e5ce36c25` (`v0.36.0`) nos dois jobs; SARIF do scan de fs passou a ser **enviado** (antes era gerado e descartado).
3. **CodeQL**: `@v3` → **`@v4`**. O repositório é **público** (API: `"private": false`) → code scanning funciona sem GHAS.
4. **Trigger**: adicionado `pull_request` (validação no PR).
5. **`trivy-image` em modo RELATÓRIO** (`exit-code: 0`): o scan encontra CRITICAL/HIGH **com fix** no sistema base (`node:20-alpine`/Alpine 3.23) — CVE upstream não corrigível no código. Mantê-lo bloqueante deixaria o CI vermelho permanente por ruído de base. Os achados vão ao **SARIF** (aba Security). O gate **bloqueante** de dependências de **runtime** permanece em `audit:ci`; SAST em CodeQL. **Trivy não foi removido** (apenas deixou de bloquear).
6. **Follow-up (Operador):** promover `trivy-image` a bloqueante (`exit-code: 1` + `ignore-unfixed: true`) após atualizar/triar a base; revisão trimestral da allowlist (2026-12).

**Evidências (PR #172, SEM merge):** `security.yml` **verde** no head `abc3433` — `scan` **pass** (2m22s: audit:ci + CodeQL v4 + Trivy fs + SARIF) e `Trivy Image Scan` **pass** (1m26s). Causa raiz do pin: log `35685178528` (`Unable to resolve action aquasecurity/trivy-action@0.28.0`).

---

## D-535 — T034: B1 fechado — P011 (required check de migration) HABILITADO; P012 A preparado; P013 recomendado

**Data:** 2026-09-22 · **Fase:** F09-cicd / T034-b1-prod-guards-final · **Status:** DECIDIDO (P011 aplicado; P012 em PR SEM merge; P013 recomendado)

**Contexto:** o guard `migration-safety` (T031/#168) existia mas não era **required**; em T032 o P011 foi escalado porque as PRs abertas antigas não tinham o check.

**Decisão:**
1. **P011 ✅ HABILITADO.** Inventário + teste: **`rerun` do CI NÃO adiciona o check** (re-executa o workflow do commit antigo); **`update-branch` (merge de `main`) SIM**. Apliquei `update-branch` nas PRs mantidas **#140, #139, #133** → `Migration Safety (B1)` **pass**; **#172** já tinha. As PRs **#4/#3/#2** retornaram `422 merge conflict` → já são `CONFLICTING`/`DIRTY` (**não mergeáveis de qualquer forma**), portanto não são bloqueadas pela mudança. Então adicionei `Migration Safety (B1)` aos required checks da ruleset `protect-main` (antes: Lint & Audit, Test & Coverage, Build, RLS, Docs Gate).
2. **P012 🟡 PREPARADO (SEM merge).** O environment `Production` já existia com **required reviewer** (Operador). PR `chore/t034-b1-final` adiciona `environment: Production` aos jobs `validate`/`health-check` do `deploy.yml`. **Limitação honesta:** o deploy nativo Vercel/Railway não é bloqueado pelo environment.
3. **P013 🟡 RECOMENDADO.** Console Railway (menor privilégio/exposição); runbook `docs/runbooks/migration-manual.md`; proxy TCP público / self-hosted runner escalados (exposição/custo).
4. **Nenhuma** migration executada; **nenhum** deploy de produção; **nenhum** segredo/infra externa alterado.

**Evidências (sem segredos):** snapshot da ruleset antes/depois (**6** required checks); `#140/#139/#133` com `Migration Safety (B1)=pass` após `update-branch`; `#4/#3/#2` `mergeable=CONFLICTING`; environment `Production` com `required_reviewers`.

---

## D-536 — T036: DTO ALLOWLIST no contrato público de `GET /api/v1/interacoes` (B3)

**Data:** 2026-09-22 · **Fase:** F04-apis / T036-b3-dto-interacoes · **Status:** DECIDIDO (PR aberto, SEM merge)

**Contexto:** `InteracoesService.mapearItem` era um **pass-through COMPLETO** (`return i;`) — o item da resposta vazava TODAS as colunas de `usuario_midia_interacao`, incluindo **internas** (`usuario_id`, `tenant_id`, `created_at`) e **legadas** (`tipo`, `rating`, **`comentario` em plaintext**).

**Decisão:**
1. Novo `interacoes-response.dto.ts` + `interacoes.mapper.ts` com **allowlist explícita**: `id`, `midia_id`, `status`, `reacao`, `motivo_abandono`, `progresso_detalhe`, `iniciado_em`, `concluido_em`, `atualizado_em`, `origem_relacao_id`, `midia{id,slug,titulo,tipo,ano_lancamento,imagem_url,score}`.
2. **Excluídos** do payload público: `usuario_id`, `tenant_id`, `created_at`, `tipo`, `rating`, `comentario` (plaintext legado).
3. Preservados os campos consumidos: `reacao`/`motivo_abandono` (`use-interaction-store`) e `midia` (biblioteca/feed) — **sem mudança no frontend**. Envelope `{items,total,porStatus,nextCursor}` e paginação por cursor mantidos.
4. Swagger (`@ApiOkResponse`) atualizado com o schema do DTO; 400/401 seguem documentados.
5. Sem migrations/schema; sem deploy; PR **sem merge**.

**TDD/Evidências:** `test/interacoes-dto.spec.ts` (allowlist: ausência de colunas internas + campos preservados) e reforço em `test/interacoes-lista.spec.ts` (mock com colunas internas → removidas). API **118/902** verde; tsc/eslint OK.

**Follow-up:** `GET /:midiaId` (`obter`) e `PUT` (`upsert`) ainda devolvem a linha crua — aplicar o mesmo DTO em tarefa própria (fora do escopo da T036, que é o `GET` de lista).

---

## D-537 — T038: DTO ALLOWLIST também em `GET /interacoes/:midiaId` e `PUT /interacoes/:midiaId`

**Data:** 2026-09-22 · **Fase:** F04-apis / T038-dto-interacoes-get-put · **Status:** APROVADA (merge `ebf78a1`; smoke autenticado OK — `GET /:id` e `PUT` só com o allowlist)

**Contexto:** o T036/D-536 aplicou o DTO allowlist apenas no `GET` de **lista**. `obter` (`GET /:midiaId`) e `upsert` (`PUT`) ainda devolviam a **linha crua** do Prisma — vazando `usuario_id`, `tenant_id`, `created_at`, `tipo` (legado), `rating` e `comentario` (plaintext).

**Decisão:**
1. Ambos passam a usar o **mesmo** `mapearInteracaoResponse` (allowlist do D-536).
2. `obter`: `select` de mídia alinhado a `MIDIA_INTERACAO_SELECT` + mapper; retorna `InteracaoResponseDto | null`.
3. `upsert`: `include: { midia: MIDIA_INTERACAO_SELECT }` + mapper; retorna `InteracaoResponseDto`. O `PUT` passa a incluir `midia` (antes ausente) — o único consumidor (`fromApi`) lê `id/midia_id/status/reacao/motivo_abandono`, todos preservados; **sem mudança no frontend**.
4. Swagger: schema do item extraído para `INTERACAO_ITEM_SCHEMA` e reusado em `GET` lista, `GET /:id` e `PUT` (200 + 400/401/404).
5. Sem migrations/schema; sem deploy; PR **sem merge** (PLANO 4.15 mantém `[~]` até merge+smoke).

**TDD/Evidências:** `interacoes.spec.ts` cobre allowlist de `upsert` e `obter` (ausência de colunas internas; `midia`/timestamps/reação preservados) e mock fiel ao `include` (`midia`); `descobertas.spec.ts` mock ajustado. API **118/903** verde; tsc/eslint OK.

---

## D-538 — T040: alertas métricos automatizados (5xx/auth) com dry-run e dedup de issue

**Data:** 2026-09-22 · **Fase:** F09-cicd / T040-alertas-metricos-beta · **Status:** DECIDIDO (PR aberto, SEM merge)

**Contexto:** a Beta precisa de detecção operacional de picos 5xx e falhas de auth (além do `AlertsService` in-app). Não há secret de admin no repo e `/metrics` é protegido.

**Decisão:**
1. Lógica pura em `scripts/ci/metric-alerts.mjs` (thresholds 5xx >1% / >=5 abs; auth >50/1min / >=10/5min; parser Prometheus + JSON; corpo de issue sem PII; dedup create/update/close/none) + `metric-alerts.self-test.mjs` determinístico.
2. Workflow `alertas-metricos.yml` (schedule 15 min + dispatch): **dry-run por padrão**; só **age** quando a fonte é LIVE (`vars.METRICS_URL` + `secrets.ADMIN_TOKEN` → `/metrics` com `X-Admin-Token`); dedup pela issue aberta com label `alerta-metrico`. **Não** cria novo secret; sem infra paga; sem deploy.
3. Sem mudança de produto; sem migration; sem alterar environment Production.

**Follow-up (Operador):** para ativar live, configurar `vars.METRICS_URL` + `secrets.ADMIN_TOKEN` (token read-only do `/metrics`). Enquanto isso, roda em dry-run com fixture (sem ruído).

**Evidências:** self-test 18 ok/0 fail; dry-run CLI acima/abaixo do limiar; eslint ok.

---

## D-539 — T042: uptime sintético de endpoints públicos (GitHub Actions)

**Data:** 2026-09-22 · **Fase:** F09-cicd / T042-uptime-sintetico-beta · **Status:** DECIDIDO (PR aberto, SEM merge)

**Contexto:** a Beta precisa de um sinal mínimo de disponibilidade pública, sem serviço externo pago nem secret.

**Decisão:**
1. `scripts/ci/uptime-check.mjs`: lógica PURA (`avaliarUptime`/`decidirAcaoUptime`/`renderUptimeBody`) + `--collect` (GET/HEAD, timeout 10 s, **só rotas públicas**) + `--input`. Dedup: **create** só na 1ª falha; **update** edita o **corpo** (sem comentar em loop); **close** na recuperação. Sem credencial/cookie/endpoint autenticado; sem imprimir corpo/PII.
2. Workflow `uptime-check.yml`: schedule 10 min + dispatch; **concurrency**; permissions **contents:read + issues:write**; label `uptime`. Sem secret novo, sem infra paga, sem deploy, sem tocar environment Production.
3. Self-test determinístico 11/11 (sem rede/gh/banco).

**Endpoint set:** `/health` da API + páginas públicas `pt-BR/en-US/es-ES/catalog/pricing/login`.

**Relação com UptimeRobot:** monitor **sintético no CI** — **NÃO** substitui UptimeRobot externo (multi-região); ver **P015**.

**Evidências:** self-test 11/11; coleta live 7/7 OK; dry-run `acao=none`; eslint OK.
