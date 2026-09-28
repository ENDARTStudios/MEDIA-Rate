# PRD — Documento de Requisitos de Produto (MEDIA Rate)

**Produto:** mediarate.app — plataforma de descoberta de mídia com o **MEDIA Score™**
(score unificado por obra). **Status atual:** Beta Fechada em preparação (produção no ar,
usuários reais ainda não expostos em massa).

## Problema

Avaliações de mídia estão pulverizadas (notas de filme, nota de jogo, crítica literária)
e cada tipo tem escala/semântica própria. O MEDIA Rate unifica a descoberta com um score
comparável por obra e uma biblioteca pessoal por status de consumo.

## Escopo do produto (o que existe HOJE em produção)

- **Catálogo** multi-fonte: filmes, séries, jogos, livros, mangás, quadrinhos
  (enum `TipoMidia`; ANIME deprecated no banco, animação japonesa = SERIE — D-233).
- **MEDIA Score™** por obra (`media_score`, z-score ponderado v3, pesos por tipo,
  confiança e explicabilidade).
- **Descoberta**: `/discover` (recomendação), `/search` (busca textual com paridade de
  acentos, tsvector + trgm GIN), trending, catálogo por gênero.
- **Biblioteca pessoal** (`/biblioteca`): 4 status — QUERO_CONSUMIR, CONSUMINDO,
  CONCLUIDO, ABANDONADO — com máquina de estados canônica (D-528/D-529:
  CONCLUIDO → ABANDONADO é proibido; retome antes de reclassificar).
- **Watchlist Kanban** (`/watchlist`): colunas WANT/WATCHING/COMPLETED/DROPPED
  projetadas na interação (fonte única de verdade, T320/D-309) com trilha de auditoria.
- **Dashboard** com métricas reais (total, afinidade, conclusão, descobertas) e gating
  por plano (T402: Free=4 previews, Plus=2, Premium=0).
- **Planos**: Free (limite watchlist 50), Plus, Premium — Stripe checkout + webhooks
  (Idempotency-Key + `stripe_event_id` UNIQUE), trials.
- **LGPD**: consentimento granular v2, export/exclusão do titular, matriz de retenção
  (T472), direitos executáveis com revogação testada (T473).
- **Admin**: upload de assets (R2), stats, flags, curadoria.

## Honestidade de produto (home) — T121/BETA-GAP-05

**Home não é wishlist.** A home (e a FAQ de planos) só pode apresentar como
disponível o que está implementado no `main` para o perfil adequado. Proibido:
link interno quebrado (404/500/loop), botão sem handler, "Em breve" em CTA
primário, chave i18n crua, recurso pago apresentado como gratuito, área
autenticada apresentada como pública, ou alegação factual contrária ao produto
(ex.: escala do score).

- Matriz de verdade: `.claude/reports/home-truthfulness-2026-09-28.md`.
- Regressão: `apps/web/test/home-truthfulness.spec.ts` (copy/paridade) e
  `apps/web/e2e/home-truthfulness.spec.ts` (links/keys nos 3 locales).

## Metadados de mídia — honestidade e fontes (T122/BETA-GAP-06)

A ficha de mídia exibe apenas metadados **reais** (sinopse localizada, ano, tipo,
gêneros, classificação indicativa, país/origem, prêmios, franquias, duração,
streamings, score por fontes, temporadas). **Não inventar** sinopse, elenco,
nota, autor, editora, estúdio ou fato editorial.

- **Fonte primária:** os dados já persistidos (`Midia`/`AvaliacaoFonte`/`Temporada`),
  alimentados por coletas/seed existentes (TMDB/OMDb/IGDB/OpenLibrary/Jikan etc.).
- **Ausência = empty state honesto:** a UI mostra "Sinopse indisponível",
  "Elenco ainda não disponível", "Nenhuma avaliação disponível" — nunca `0`,
  `null`, `undefined` ou placeholder fabricado.
- **Elenco/créditos e avaliações em prosa** não têm fonte legítima populada no
  escopo atual → status do gap: `PARTIAL_UI_CONTRACT_READY` (contrato/UI honestos;
  popular exige provider/schema em tarefa própria). Relatório de cobertura:
  `.claude/reports/media-metadata-2026-09-28.md`.

## Personas e papéis

Ver [DEFINE_THE_USER](DEFINE_THE_USER.md). Resumo: Visitante (browse público),
Usuário Free/Plus/Premium, Curador/Admin, Operador (infra), Auditor (legal/LGPD).

## Métricas de sucesso (referência)

- p95 de discover/search < 200ms (atual: ~14ms/22ms local — T027).
- Disponibilidade da API monitorada por `/health` + uptime externo (9.5.4).
- Zero vazamento de PII em logs (redaction + T049 mascaramento) e em respostas.
- Conversão Free→Plus (checkout Stripe; funis PostHog — ver [ANALYTICS](../07-operations-marketing/ANALYTICS.md)).

## Fora de escopo (agora)

App nativo, feed social/comentários, PWA/offline (LimpezaServiceWorker revisar antes —
#148 item 3), recomendações colaborativas (listas colaborativas já existem como CRUD).

## Referências vivas

`PLANO_MESTRE.md` (fases), `SPRINT.md` (iteração corrente), [ROADMAP](ROADMAP.md)
(bloqueadores da Beta), `docs/05-security-compliance/legal/` (pacote jurídico T464).
