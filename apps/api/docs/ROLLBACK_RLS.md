# ROLLBACK_RLS.md — rollback do RLS (T290, D-284)

Se o RLS causar problema em produção, reverta SEM downtime de escrita:

```sql
-- 1) Interações
DROP POLICY IF EXISTS "watchlist_tenant_user" ON "watchlist_entry";
DROP POLICY IF EXISTS "discovery_tenant_user" ON "discovery_event";
ALTER TABLE "watchlist_entry" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "watchlist_entry" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "discovery_event" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "discovery_event" NO FORCE ROW LEVEL SECURITY;

-- 2) Catálogo
DROP POLICY IF EXISTS "midia_select" ON "midia";
DROP POLICY IF EXISTS "midia_write_curator" ON "midia";
DROP POLICY IF EXISTS "midia_update_curator" ON "midia";
DROP POLICY IF EXISTS "midia_delete_curator" ON "midia";
ALTER TABLE "midia" DISABLE ROW LEVEL SECURITY;

-- 3) Curadoria
DROP POLICY IF EXISTS "classificacao_select" ON "classificacao_regiao";
DROP POLICY IF EXISTS "classificacao_write_curator" ON "classificacao_regiao";
DROP POLICY IF EXISTS "classificacao_update_curator" ON "classificacao_regiao";
DROP POLICY IF EXISTS "premio_select" ON "premio";
DROP POLICY IF EXISTS "premio_write_curator" ON "premio";
DROP POLICY IF EXISTS "premio_update_curator" ON "premio";
DROP POLICY IF EXISTS "temporada_select" ON "temporada";
DROP POLICY IF EXISTS "temporada_write_curator" ON "temporada";
DROP POLICY IF EXISTS "temporada_update_curator" ON "temporada";
ALTER TABLE "classificacao_regiao" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "premio" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "temporada" DISABLE ROW LEVEL SECURITY;
```

**Drill (2026-08-11, docker postgres:16):** habilita → isolamento A≠B verde (B lê 0 / atualiza 0; A lê 1) → midia USER negado / CURATOR ok → rollback (DROP POLICY + DISABLE) → acesso totalmente restaurado (app vê todas as linhas; USER insere midia). Exit code de cada passo verificado.

-- 4) T299: exce��o de leitura ADMIN (nova migration 20260811_rls_leitura_admin)
DROP POLICY IF EXISTS "watchlist_read_admin" ON "watchlist_entry";
DROP POLICY IF EXISTS "discovery_read_admin" ON "discovery_event";
