# SPRINT.md — MEDIA Rate

> Sprint gerado a partir da análise atual do projeto (pós-F15, 2026-08).
> **Issue vinculada: #17** — "perf: F16 — investigar e corrigir LCP da home".
> Escopo: **mínimo viável** — não implementar nada fora do listado aqui.
> Regra (PADROES_DESENVOLVIMENTO.md §7): só implementar após salvar este arquivo;
> PR menciona a Issue; teste antes de implementar.

---

## 1. Contexto e justificativa da escolha

O T405 fechou com PROPOSTA calibrada (D-402): perf 63, main-thread ~4,5 s,
`unused-javascript` 52 KiB — **o JS deixou de ser o gargalo** (lotes a+b
entregaram event delegation + seções server).

**Residual documentado (D-402):** o LCP da home é o **H1 do hero (TEXTO,
server-renderizado)** com LCP ~10 s enquanto o FCP pinta em ~1,25 s — lacuna de
~8,8 s sem correlação com TBT (441 ms), main-thread (4,5 s) ou imagem (o hero
não tem pôster).

**Hipótese principal:** o swap da fonte do título (`font-heading` /
Space_Grotesk via next/font) re-pinta o H1 tarde, e o Lighthouse contabiliza o
LCP nesse re-paint — ou há um quirk de medição.

**Escolha (maior impacto × menor complexidade):** investigar e corrigir o LCP.
- Impacto: destrava a meta de performance (perf ≥75) que o T405 não atingiu —
  LCP 10 s → ≤4 s muda o score de ~63 para próximo da meta, sem tocar em mais JS.
- Complexidade: mudança pontual (config de fonte/preload/CSS), sem dependência
  nova, sem migration, sem contrato de API.

## 2. Objetivo

Confirmar a causa do LCP ~10 s da home e reduzi-lo para **≤ 4 s** (mobile,
Lighthouse), com evidência antes/depois commitada e guards verdes.

## 3. Tarefas

### T1 — Reproduzir e medir a causa (investigação, não corrigir ainda)
- Roteiro Playwright (mobile 412×823): PerformanceObserver de LCP + entradas de
  recurso (`performance.getEntriesByType('resource')` filtrando woff2) para
  comparar o TIMESTAMP do LCP com o carregamento/swap da fonte.
- Registrar o resultado: causa confirmada (fonte) ou refutada (causa real), com
  evidência (timestamps) em `docs/lighthouse-reports/f16-diagnostico.md`.

### T2 — Corrigir apenas a causa raiz (se confirmada a fonte)
- Correção mínima candidata: pré-carregar a fonte crítica do H1, reduzir o subset
  (`next/font` `subsets`) e/ou garantir que o CSS da fonte não bloqueie o
  primeiro paint — SEM trocar o visual.
- Se a causa for outra, aplicar a correção correspondente e documentar.

### T3 — Medição antes/depois
- Lighthouse (mobile, performance) da home antes (já temos: perf 63, LCP 10,0 s)
  e depois → `docs/lighthouse-reports/lote-f16-home.json` + atualizar
  `T405-LIGHTHOUSE-TABELA.md`.

### T4 — Verificação completa
- Guards e2e em produção (8/8: contas-consistencia, status-menu, cross-prompt,
  home-ilha), unit 318/318, `tsc --noEmit`, lint e `next build` verdes.

## 4. Critérios de conclusão

- [ ] Causa do LCP confirmada com evidência de timestamps (ou refutada com a
      causa real documentada).
- [ ] LCP ≤ 4 s medido no Lighthouse pós-correção (ou, se a causa for externa ao
      código, PROPOSTA com residual documentado — nunca métrica de vaidade).
- [ ] Lighthouse antes/depois commitado + tabela cumulativa atualizada.
- [ ] Guards 8/8 + unit 318/318 + build verdes.
- [ ] PR referenciando a Issue #17.

## 5. Arquivos afetados (prováveis)

| Arquivo | Tipo de mudança |
|---|---|
| `apps/web/src/app/layout.tsx` | config de fonte (preload/subsets/display) |
| `apps/web/src/app/globals.css` | CSS se necessário (font-display/fallback) |
| `docs/lighthouse-reports/f16-diagnostico.md` | novo (evidência do diagnóstico) |
| `docs/lighthouse-reports/lote-f16-home.json` | novo (medição pós) |
| `docs/lighthouse-reports/T405-LIGHTHOUSE-TABELA.md` | atualização da tabela |

**Dependências afetadas:** nenhuma nova.

## 6. Testes necessários

1. **Diagnóstico (Playwright):** timestamps LCP × carregamento de fonte (woff2)
   na home mobile — roteiro reproduzível salvo em `apps/web/scripts/`.
2. **Lighthouse** antes/depois (performance, mobile).
3. **Guards e2e** existentes (8 testes) — nenhuma asserção afrouxada.
4. **Unit** 318/318 — nenhuma regressão.
