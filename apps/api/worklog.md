
## [2026-10-03] fix/user-feedback-batch — 5 correções do feedback do Operador (PR em curso)

1. UG-01 Google Login: botão GSI oficial renderButton em vez de prompt() One Tap (suprimido pelo browser); container gsi-button com data-testid.
2. Pricing: seção Mídias desbloqueadas removida (bolinhas idênticas em todos os planos — sem informação).
3. Biblioteca: grid teto 5 colunas (era 7 — cards espremidos).
4. API: DELETE watchlist entry também remove usuarioMidiaInteracao no tx RLS — dashboard para de computar gêneros de títulos excluídos. TDD: spec e2e vermelho→verde (mock deleteMany flat + interacoes exposto no ctx).
5. WatchlistCard: botão Remover visível no card órfão (o ⋮ escondido não era descoberto).

Suítes: API 992/992 (132 arq); web 479/479. Docs: worklog + exchange.