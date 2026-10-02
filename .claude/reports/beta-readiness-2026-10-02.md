# Beta readiness — snapshot 2026-10-02

**Base:** origin/main @ 49292ab4 · **Cadeia recente:** #383 (D-558 rate limiting) →
#386 (D-559 guards B1) → #387 (D-556 observabilidade) → #388 (D-559b allowlist) →
#390/#392 (T097-T099, D-557/D-561/Gov-01) → #393 (T152/T153) → #394/#396 (T154 UG-16).

## GO técnico para Beta Fechada: **MANTIDO**

Gates técnicos verdes e provados em produção:
- Busca global funcional (títulos EN/original indexados — migration 20261001).
- Rate limiting completo (D-558: sessão+hash, sliding window, register 5/min, 429 envelope+Retry-After).
- Guardas de deploy/migration (Migration Safety required + expand/contract + reconciliador).
- LGPD: consentimento granular, export/delete, PII masking, AuditLog sanitizado.
- Observabilidade: uptime sintético live, Sentry, /metrics+alertas, logs estruturados sem PII.
- i18n ×3 sem vazamentos conhecidos; acessibilidade radar/desc.

## Bloqueios restantes (todos exigem Operador ou decisão — nenhum executável por agente)

| # | Bloqueio | Tipo | Onde |
|---|---|---|---|
| 1 | **Gov-01**: ruleset `protect-main` sem `require pull request` + bypass admin always | Ação no GitHub (5 min) | PENDENCIAS nº 18 / D-561 |
| 2 | **B1**: deletar "R2 Upload Test" + dedupe All-Star Superman | ADMIN de produção | #148 |
| 3 | **UG-01**: validar Google Login em navegador real | Manual (Operador) | PENDENCIAS T140 |
| 4 | **Comics sem scores** | Decisão de produto (fontes p/ o tipo) | auditoria site |
| 5 | **UptimeRobot externo** (opcional; sintético interno live) | Diversificação | 9.5.4 |
| 6 | **Detalhe rico** (cast/plataformas/temporadas) | Frente de dados pós-Beta | FAQ promete |

## Após os itens 1-3: **Beta Fechada liberável** (convites controlados).

## Residuais aceitos (documentados)
- Flaky E2E fontes Google (runbook em `docs/06-devops-deployment/E2E.md`; mitigação estrutural opcional).
- Monitor de uptime interno (mesmo provedor do repo); audit dev-deps allowlistado (revisão 2026-12).
- Detalhe enxuto e metadata de comics: pós-Beta.
