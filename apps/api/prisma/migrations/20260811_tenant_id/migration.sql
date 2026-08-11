-- T289 (Arquitetura §4): tenant_id aditivo com default CONSTANTE.
-- NOT NULL com default constante NÃO reescreve a tabela no PG11+ (a coluna
-- metadata registra o default) — custo ~zero. Sem índice (1 tenant único →
-- seletividade inútil). RLS/filtros vêm na T290 (gated pelo Operador).
-- Aplica em DB virgem E existente (T234-compatível).

ALTER TABLE "midia"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "watchlist_entry"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "discovery_event"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "classificacao_regiao"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "premio"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE "temporada"
  ADD COLUMN "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
