-- T285 (Addendum 4): reações, motivo de abandono e progresso na watchlist.
-- ADITIVA: não altera colunas/índices existentes; aplica em DB virgem.
-- Os enums "ReacaoConsumo" e "MotivoAbandono" JÁ existem (domínio de
-- interação, T200/Addendum 4) — esta migration só adiciona as colunas.

ALTER TABLE "watchlist_entry"
  ADD COLUMN "reacao" "ReacaoConsumo",
  ADD COLUMN "motivo_abandono" "MotivoAbandono",
  ADD COLUMN "progresso_detalhe" TEXT;
