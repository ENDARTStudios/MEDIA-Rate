# User Gap Registry — 2026-09-30 (T139, docs-only)

Registro formal do mapa de gaps relatado pelo usuário (devolutiva recebida em
2026-09-29), cobrindo os **18 gaps originais** + **4 novos requisitos (19–22)**.
Objetivo: dar rastreabilidade estável (IDs `UG-xx`) para os próximos pacotes de
trabalho (T140–T145), sem alterar código, BETA-GAPs ou pendências existentes.

- **Natureza:** registro de devolutiva. Os statuses espelham a devolutiva do
  usuário, cruzada com os relatórios de BETA-GAP existentes (§6); PRs citados
  foram reconfirmados ao vivo neste registro (ver §7).
- **Escopo desta tarefa:** docs-only. Nenhuma alteração de
  código/deps/schema/segredo/infra/environment. Nenhum BETA-GAP reclassificado.
- **GO convites:** SUSPENSO.

---

## 1. Registry UG-01..UG-22

Legenda de status: `DONE` (corrigido com evidência técnica) · `PARTIAL` (parcial,
com variante da lacuna na coluna Status) · `NOT_FIXED` (não corrigido) ·
`BLOCKED` (bloqueado por decisão/dado/provider).

| ID | Gap | Status | Evidence | Next Action |
|---|---|---|---|---|
| UG-01 | Login social Google não funciona | PARTIAL_VALIDATION | BETA-GAP-01 endurecido (`email_verified` obrigatório; botão oculto sem client ID) | Validação manual em navegador (T140) |
| UG-02 | Dashboard não reagia à remoção de escolhas/favoritos | DONE | BETA-GAP-02 PR #325 (`ABANDONADO` fora de total/tipos/gêneros/streak) | Validar edge de favorito/reacao como sinal independente |
| UG-03 | Acesso administrador | PARTIAL_GRANT | BETA-GAP-03 PR #327 (RBAC + guards reais + CLI `db:set-role` + anti-lockout) | Operador executa `db:set-role` e valida `/admin` (T141) |
| UG-04 | Menus/design precisam melhorar | PARTIAL | BETA-GAP-10/11/14 (sidebar, densidade, home honesta, seções por tipo) | Auditoria UI objetiva (matriz rota/componente/severidade) |
| UG-05 | Conteúdo limitado; home prometia demais | PARTIAL | BETA-GAP-05 (promessas falsas removidas; copy manga 0–10) | Decisão de fonte de conteúdo; catálogo mínimo viável |
| UG-06 | Fichas sem sinopse/elenco/avaliações/metadados | PARTIAL | BETA-GAP-06 (contrato/UI honestos; crédito fabricado removido) | Fonte legítima: provider licenciado OU dataset curado OU adiar |
| UG-07 | Sequências e conteúdo relacionado | PARTIAL_DATA | BETA-GAP-07 (relacionados/sequências honestos; slug canônico) | Dataset de relações (franquia/coleção/ordem confiável) |
| UG-08 | Muitas mídias sem nota de críticos | BLOCKED | BETA-GAP-08 (não inventar nota de crítico) | Decisão de provider/licença (T145) |
| UG-09 | Escala de notas (games 0–100; demais 0–10; sem arredondamento) | PARTIAL_ROUNDING | BETA-GAP-09 (mangá corrigido para 0–10; copy corrigida) | Auditoria de arredondamento em todas as superfícies (T143) |
| UG-10 | Catálogo sem sidebar / identidade visual | PARTIAL_VISUAL | BETA-GAP-10 (sidebar, URL state, drawer mobile, facetas reais) | Ícones/cores canônicas por tipo + contraste (T1.3) |
| UG-11 | Banner, TOP 10, editoras/estúdios, lançamentos, por onde começar | NOT_IMPLEMENTED | BETA-GAP-11 base (seções por tipo, relacionados, filtros) | Epic dividido: T-Banner-Media / T-Top10-Catalog / T-Category-Pages / T-Publisher-Studio / T-Current-Year-Launches / T-Where-To-Start |
| UG-12 | Planos não especificam quais mídias cada plano libera | PENDING | BETA-GAP-13 parcial (registry indica DONE; sem matriz explícita) | Matriz de entitlement + copy `/pricing` + enforce backend (T1.4) |
| UG-13 | Botões de assinatura desalinhados em Planos | NOT_FIXED | nenhum | Fix CSS/grid + E2E de alinhamento em 3 breakpoints (T142) |
| UG-14 | Cards da biblioteca muito grandes | DONE | BETA-GAP-14 PR #324 (desktop 6 colunas, mobile 2, overflow corrigido) | nenhum (validação visual do Operador, opcional) |
| UG-15 | Títulos não mudam de idioma | PARTIAL_DATA | BETA-GAP-15 (busca/detalhe localizam; fallback determinístico D-369) | Cobertura `titulo_en`/`titulo_es` + relatório de cobertura |
| UG-16 | Gêneros da dashboard limitados a 6 | NOT_FIXED | nenhum (origem dos 6 a diagnosticar: hardcode/top N/query) | Taxonomia por tipo + agregação real (T144) |
| UG-17 | Conquistas mais elaboradas (medalhas por gênero/gosto) | NOT_FIXED | nenhum | Spec de produto (regras/eventos/modelo/UI) — BLOCKED_AMBIGUOUS_SPEC |
| UG-18 | Perfil mais elaborado | NOT_FIXED | nenhum | Spec de UX/dados (preferências, stats, LGPD) — BLOCKED_AMBIGUOUS_SPEC |
| UG-19 | Indicação por gosto, não aleatória | NOT_FIXED | nenhum | Perfil de gosto determinístico + ranking explicável + cold start |
| UG-20 | Nota por temporada/episódio/sequência | NOT_FIXED | nenhum | Modelo de dados granular + fonte (provider/avaliações internas) |
| UG-21 | Gêneros, origem, prêmios, continuidade | PARTIAL | base de metadados existente (gêneros/classificação exibidos quando reais) | Auditoria de campos + fonte de dados |
| UG-22 | Continuidade por sequência/relação para todas as mídias | PARTIAL_DATA | BETA-GAP-07 (contrato/UI existem) | Mesmo dataset de relações do UG-07 |

Resumo: **2 DONE + 2 parcial-mecanismo/contrato fechados com lacuna de dados**
(UG-02, UG-14 plenos; UG-03/07/09/10/15 fechados no contrato, abertos em dados ou
concessão) · **8 PARTIAL** · **7 NOT_FIXED/BLOCKED**.

---

## 2. Plano em ondas (proposto pela devolutiva; NADA executado nesta tarefa)

- **Onda 0 — destravar decisões/validações humanas (Operador):**
  T0.1 validar login Google real (evidência sanitizada) · T0.2 conceder admin ao
  Operador via CLI interna · T0.3 decidir provider/fonte de metadados (elenco,
  avaliações, críticos, origem, prêmios, editoras/estúdios, sequências,
  temporadas) · T0.4 decidir hosting definitivo (A/B/C/D — já em
  `PENDENCIAS_OPERADOR.md` via T136) · T0.5 ADR política de falha do audit de
  auth (já registrado via T133) · T0.6 decidir PR #300 (já registrado via T138).
- **Onda 1 — quick wins visuais/de confiança (baixo risco):** T1.1 alinhar
  botões de Planos · T1.2 auditoria de arredondamento de notas (helper único;
  `7.9` não vira `8`; games 0–100; demais 0–10) · T1.3 ícones/cores canônicas
  por tipo · T1.4 matriz de mídias por plano · T1.5 gêneros reais na dashboard.
- **Onda 2 — conteúdo e metadados reais (depende da Onda 0):** elenco/créditos ·
  avaliações/notas de críticos · origem/prêmios/editoras/estúdios · títulos
  localizados (cobertura).
- **Onda 3 — descoberta e navegação avançada:** banner · TOP 10 determinístico ·
  lançamentos do ano corrente · páginas por editora/estúdio · por onde começar ·
  continuidade completa.
- **Onda 4 — personalização/conquistas/perfil:** recomendação por gosto ·
  conquistas/badges · perfil elaborado · notas por temporada/episódio/sequência.

---

## 3. Mapeamento para candidatos de tarefa (T140–T145)

1. **T140 — validação manual do login Google** (Operador): navegador em
   `https://mediarate.app/pt-BR/login`, console/network, erro sanitizado apenas
   (popup blocked, `invalid_origin`, `redirect_uri_mismatch`); sem expor
   token/cookie/secret. Critério: login funciona OU botão oculto com fallback
   e-mail/senha + erro registrado.
2. **T141 — concessão de admin ao Operador** (Operador): CLI interna
   `db:set-role` (runbook BETA-GAP-03); validar `/admin` (200 admin / 403 comum);
   registrar concessão sem PII em log público.
3. **T142 — alinhar botões de Planos** (Doer, código): fix visual UG-13 + E2E de
   bounding box alinhada nos 3 breakpoints.
4. **T143 — auditoria de arredondamento de notas** (Doer, código): helper único
   de formatação; testes `7.9`→`7.9`; games 0–100; demais 0–10; varredura
   `.toFixed(`/`Math.round(`/`parseInt(`.
5. **T144 — gêneros reais na dashboard** (Doer, código): diagnosticar origem do
   limite de 6; taxonomia por tipo; agregação sobre interações ativas apenas.
6. **T145 — decisão de provider/fonte** (Operador): destrava UG-05/06/08/11/20/21/22.

---

## 4. Decisões do Operador (Onda 0) — registradas em `PENDENCIAS_OPERADOR.md`

- T140 (validação Google) e T141 (concessão admin) foram **adicionadas** à fila.
- T0.3/T0.4/T0.5/T0.6 já estavam registradas (T130/T133/T136/T138) e foram
  **reafirmadas** na seção T139 — nenhuma duplicata criada.

## 5. Relação com o registry BETA-GAP existente

O mapa do usuário e o registry de BETA-GAP do repo
(`.claude/reports/beta-gap-remaining-spec-2026-09-29.md`: 12/18 DONE + 1 PARTIAL)
não se contradizem: os gaps marcados DONE lá continuam DONE aqui; este registro
adiciona a **visão do usuário** (o que falta para o produto parecer completo),
incluindo lacunas de dados/cobertura em itens tecnicamente fechados e os novos
requisitos 19–22, que **não têm BETA-GAP correspondente**.

## 6. Rastreabilidade

- Devolutiva do usuário recebida em 2026-09-29 (texto integral colado; sem
  segredos/PII — verificado antes de registrar).
- PRs reconfirmados ao vivo (2026-09-30, `gh pr view`): #324 MERGED
  (BETA-GAP-14), #325 MERGED (BETA-GAP-02), #327 MERGED (BETA-GAP-03).
- Relatórios relacionados: `beta-gap-remaining-spec-2026-09-29.md`,
  `google-auth-2026-09-28.md`, `home-truthfulness-2026-09-28.md`,
  `media-metadata-2026-09-28.md`, `media-related-sequences-2026-09-28.md`,
  `title-localization-2026-09-29.md`, `search-discover-2026-09-29.md`,
  `watchlist-crud-2026-09-29.md`, `vercel-window-revalidation-2026-09-30.md`,
  `security-debt-diagnosis-2026-09-30.md`.
