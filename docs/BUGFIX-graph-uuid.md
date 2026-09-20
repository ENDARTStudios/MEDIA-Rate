# BUGFIX — UUID truncado no /premium/graph (T469/T466, D-530)

**Data:** 2026-09-20 · **Autorização:** D-530 (Runbook B — escopo exato: DELETE
das linhas `watchlist_entry` com `midia_id` não-UUID do usuário
`90a1c50a…`; nenhuma outra mutação)

## Causa raiz

`watchlist_entry.midia_id` é `VarChar(255)` **por design** (aceita ids
externos de fontes). A produção continha **11 linhas legadas** (jul–ago/2026,
1 único usuário) cujos `midia_id` eram **ids externos, não UUIDs**: ids TMDB
(`1083381` = o "found 7" exato do erro, `969681`, `94997`, `278`), slugs de
gênero (`g1`–`g7`) — vazamento da era de ingestão por fonte externa.

O `/premium/graph` lê a watchlist e faz `midia.findMany({ where: { id: { in:
idsDaLista } } })` sobre a coluna `midia.id` (tipo Uuid). O Prisma valida cada
id do `in` como UUID → o valor de 7 chars (`1083381`) lança
`"Error creating UUID, invalid length: expected length 32 for simple format,
found 7"` → 500 (issue Sentry MEDIA-RATE-3).

## Evidência antes/depois (saída mascarada — D-425)

- **ANTES (SELECT):** 11 linhas, todas do mesmo `usuario_id`
  (`90a1c50a…`), colunas WANT/WATCHING/COMPLETED, criadas 2026-07-30 →
  2026-08-04. IDs completos na trilha do túnel (execução registrada).
- **DELETE (dentro de BEGIN/COMMIT implícito por comando):** `DELETE 11`
- **DEPOIS (count com o mesmo filtro):** `{"n": 0}`

## Guard aplicado (código)

`apps/api/src/modules/recommendations/uuid-guard.ts` — `soUuids()` filtra a
entrada para UUIDs canônicos antes de qualquer `id: { in: [...] }` (4 pontos
no recommendations.service: PLUS lista/interagidos; GRAFO
watchlist/interagidos). O endpoint fica resiliente mesmo se novos dados
legados entrarem.

## Relacionado

- **D-519:** lesson learned (a mesma classe — identificador truncado —
  derrubou o endpoint R2 S3 por 4+ horas; o MEDIA-RATE-3 é o corolário no
  banco).
- **T470 (P0):** consentimento granular — o P0 do parecer que usa o mesmo
  mecanismo de registro auditável.

## Validação pendente

O usuário afetado (dono da watchlist limpa) deve logar e confirmar o
`/premium/graph` 200. O Operador marca a issue MEDIA-RATE-3 como Resolved no
Sentry após 24h sem novos eventos.
