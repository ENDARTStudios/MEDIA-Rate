# UI-UX — MEDIA Score (`/methodology` + módulo na ficha)

> Sessão **4 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-media-score/{1440,375}.png`.

## 1. Identidade da sessão

O MEDIA Score é **transversal**: não tem rota própria. Ele aparece como (a) **explicação pública** em
`/methodology`, (b) **módulo de score** na ficha da obra (`/media/[slug]`), (c) **badge/anel** em cards
de catálogo, rankings, watchlist, biblioteca, dashboard, comparação e perfil.

- **Objetivo do usuário:** entender **de onde vem** a nota (transparência) e conferir a nota de uma obra.
- **Persona/estado de conta:** público (a metodologia é pública e indexável).
- **Rotas/arquivos:** `/methodology` (`methodology/page.tsx`), `/sources` (as fontes), o módulo
  `MediaScoreModule.tsx` usado na ficha e os dials/aneis dos cards.
- **Entradas:** link "Metodologia" no rodapé, "Ver metodologia" dentro do módulo de score, FAQ.
- **Saídas:** `/sources` (detalhe por fonte), ficha da obra, FAQ.
- **Fora de escopo:** a nota de cada fonte (sessão 19/Metodologia legal).

## 2. Arquitetura de informação

**`/methodology` (server):** `getInstitutionalContent(locale).methodology` — **fonte única** de conteúdo
(`methodology/page.tsx:30,60`), compartilhada com `/faq` e a home (D-603). Usa `ScrollReveal` (L6) para
entrada das seções e `StructuredData` (L3) para JSON-LD.

**Módulo na ficha** (`apps/web/src/components/MediaScoreModule.tsx`):
`data-testid="score-module"` (L109) → `<h2>MEDIA Score</h2>` (L162) → badge de confiança
(`ConfidenceBadge`, L9) → anel + número (`ScoreDial`) → frase "consolidado a partir de N fontes"
(`scoreConsolidado`/`scoreSemFontes`, L102-104) → barras crítica × público
(`CriticsVsAudienceBar`) → lista de fontes (`SourceMiniCard`, deduplicadas por id em L81-82, rótulos do
registro `FONTES_WEB`, L19) → nota de método.

## 3. Layout, grid e densidade

- `/methodology`: coluna única de leitura com cabeçalho institucional padronizado (D-603) e parágrafos
  com medida limitada.
- Módulo da ficha: painel de largura da coluna de conteúdo, com o anel à esquerda e os números à direita;
  lista de fontes em grade de 1–2 colunas.
- Densidade: o módulo é o bloco mais denso da ficha — 4 tipos de informação (nota, confiança, fontes,
  divergência) no mesmo painel; é o que a §11 propõe organizar em níveis.

## 4. Tokens em uso

| Papel | Token/regra | Onde |
|---|---|---|
| Cor do número | `scoreColor(valor, escala)` | anel, badge, barras |
| Formato do número | `formatarScoreLocale(normalizeDisplayScore(v,tipo), locale)` | todos os dials |
| Escala nativa | `escalaPorTipo(tipo)` → **game 0–100; demais 0–10** | `score-utils.ts:14-25` |
| Texto | `text.primary`/`text.secondary`/`text.muted` | rótulos do módulo |
| Confiança | `ConfidenceBadge` (verde/âmbar) | topo do módulo |
| Superfície | `bg-surface-card` + `border-surface-border` | painel |

**Regra dura desta sessão:** `score-utils.ts` é o **pipeline único** (o comentário do próprio arquivo diz
"mangá NUNCA 0-100", BETA-GAP-09/T147). Qualquer tela que formate score fora dele é pendência — e o
**DOM já foi corrigido** para vírgula em pt-BR (D-602), então a regra está de pé.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | skeleton do card/módulo | `CatalogSkeleton`, `StaticScoreDial` (SSR) | — |
| 2. Vazio | **existe** — `data-testid="score-empty"` (L51) e `scoreSemFontes` (L104) | `MediaScoreModule.tsx` | — |
| 3. Erro de rede | herda o estado da tela hospedeira (ficha/catálogo) | — | — |
| 4. Não encontrado | **não se aplica** (é parte de outra página) | — | — |
| 5. Sem permissão | **existe parcialmente** — `score-coming-soon` (L166) + `LockedComingSoonCard` para tipos sem cobertura | `media-rate-ui/LockedComingSoonCard.tsx` | distinguir "sem dados" de "plano insuficiente" |
| 6. Dados parciais/desatualizados | **existe** — badge de confiança + "pode estar desatualizado" com data de atualização | `MediaScoreModule.tsx` | — |
| 7. Offline | **AUSENTE** | — | **P2** |

## 6. Micro-interações e movimento

- `/methodology`: entrada das seções por `ScrollReveal` (CSS/transform, respeita reduced motion).
- Módulo: barras de crítica × público animam largura/valor na entrada (`CriticsVsAudienceBar`, ajustado
  no D-601 para usar o helper de número); contagem animada onde houver `CountUpValue`.
- Nada aqui decide markup por `prefers-reduced-motion` (gate `test/reduced-motion.spec.tsx` verde).
- **A CRIAR (P2):** ao abrir a ficha, o anel poderia preencher progressivamente (hoje é estático no SSR).

## 7. Acessibilidade AA

- `/methodology`: `h1` institucional → `h2` por seção, sem pular nível (D-603 aplicou o padrão).
- Módulo: `aria-label={t("scoreAriaLabel", {…})}` no anel (`MediaScoreModule.tsx:117`) ✓ — a nota é
  anunciada em texto, não só desenhada ✓ (essencial: o anel é decorativo para leitor de tela).
- `h2` "MEDIA Score" (L162) — corrigido no D-601/D-603 (antes era `h3` sob `h1`, pulando nível) ✓.
- Contraste: o número do score usa `scoreColor()`; as faixas foram validadas no gate de contraste
  (221/221) para texto grande (3:1) — número grande é o caso, mas **vermelho/âmbar sobre card** devem
  continuar sob vigilância (é o par que reprovou no admin, D-605).
- **P1:** as barras crítica × público usam cor + rótulo ✓, mas a **divergência** (gap) é comunicada por
  número e por texto — conferir que a cor não seja o único canal.

## 8. Copy e i18n

- Namespaces: `methodology` (via `institutional-content.ts` — **fonte única**, D-603) e `catalog`
  (`scoreConsolidado`, `scoreSemFontes`, `scoreAriaLabel`, `scoreComingSoon`, `criticsBar`,
  `audienceBar`, `semCritica`, `highConsensus`, `lowConsensus`).
- Regra de veracidade (BETA-GAP-05): a metodologia não pode prometer escala que o produto não usa — a
  escala real é **game 0–100, demais 0–10** (`score-utils.ts:14`), e o texto tem teste de guarda.
- **A CRIAR:** frase padrão para "sem fontes suficientes" reaproveitada em todas as telas (§5.2).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | anel e números empilham; barras ocupam a largura; lista de fontes em 1 coluna |
| 768 | lista de fontes em 2 colunas |
| 1024+ | módulo ao lado do pôster na ficha |

## 10. Métricas de sucesso

- **Abertura de `/methodology`** e tempo de leitura.
- **Cliques em "ver metodologia"** a partir do módulo (mede desconfiança/curiosidade).
- **Distribuição de confiança** das obras mais vistas (se muitas são "baixa", a percepção de score cai).
- **Divergência média crítica × público** por tipo (indicador de produto, não só de UI).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **4 implementações de dial/anel** de score coexistem: `media-rate-ui/ScoreDial.tsx`, `media-rate-ui/StaticScoreDial.tsx`, `ui/score-dial.tsx` e `landing/ScoreRing.tsx` — mesma função, desenhos/comportamentos diferentes | os 4 arquivos; 14 consumidores do pipeline de score | eu | A4 da auditoria |
| P1 | Garantir que cor não seja o único canal da divergência crítica × público | `CriticsVsAudienceBar.tsx` | eu | AA |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | Anel estático no SSR (sem preenchimento progressivo) | `StaticScoreDial.tsx` vs `ScoreDial.tsx` | eu | D-580 |
| P2 | Consolidar as telas para **um** componente de dial com `variant` (grande/card/mini) | os 4 arquivos | eu | A4 |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- media-score=/methodology
grep -rn "escalaPorTipo\|normalizeDisplayScore\|formatarScoreLocale" apps/web/src --include=*.tsx -l   # 14 arquivos
ls apps/web/src/components/media-rate-ui/ScoreDial.tsx apps/web/src/components/media-rate-ui/StaticScoreDial.tsx apps/web/src/components/ui/score-dial.tsx apps/web/src/components/landing/ScoreRing.tsx
npm run design:contrast; npm test --workspace apps/web -- score
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-media-score/1440.png` · `375.png`.
