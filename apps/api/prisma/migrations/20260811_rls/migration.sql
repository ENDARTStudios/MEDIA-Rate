-- T290 (D-284, aprovação do Operador 2026-08-11) — RLS no Postgres.
-- Isolamento por tenant+usuário nas interações; catálogo: SELECT público por
-- tenant, escrita só CURATOR/ADMIN. Contexto via current_setting (SET LOCAL
-- transacional pela API). Sem BYPASSRLS. Aplica em DB virgem E existente.
--
-- Rollback: docs/ROLLBACK_RLS.md (DROP POLICY + DISABLE ROW LEVEL SECURITY).

-- Aplicação da aplicação (sem superuser) precisa do privilégio para as
-- policies — concedido pelo dono da tabela automaticamente; nada adicional
-- requerido para a app (as policies não exigem privilégio extra).

-- ---------- interações: isolamento tenant + usuário ----------
ALTER TABLE "watchlist_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watchlist_entry" FORCE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_tenant_user" ON "watchlist_entry"
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WITH CHECK (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE "discovery_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discovery_event" FORCE ROW LEVEL SECURITY;

CREATE POLICY "discovery_tenant_user" ON "discovery_event"
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WITH CHECK (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ---------- catálogo: SELECT público por tenant; escrita CURATOR/ADMIN ----------
ALTER TABLE "midia" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "midia_select" ON "midia" FOR SELECT
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
  );

CREATE POLICY "midia_write_curator" ON "midia"
  FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));

CREATE POLICY "midia_update_curator" ON "midia"
  FOR UPDATE USING (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'))
  WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));

CREATE POLICY "midia_delete_curator" ON "midia"
  FOR DELETE USING (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));

-- ---------- tabelas de curadoria: escrita CURATOR/ADMIN (SELECT público) ----------
ALTER TABLE "classificacao_regiao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classificacao_select" ON "classificacao_regiao" FOR SELECT
  USING (true);
CREATE POLICY "classificacao_write_curator" ON "classificacao_regiao"
  FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));
CREATE POLICY "classificacao_update_curator" ON "classificacao_regiao"
  FOR UPDATE USING (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'))
  WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));

ALTER TABLE "premio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "premio_select" ON "premio" FOR SELECT USING (true);
CREATE POLICY "premio_write_curator" ON "premio"
  FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));
CREATE POLICY "premio_update_curator" ON "premio"
  FOR UPDATE USING (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'))
  WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));

ALTER TABLE "temporada" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temporada_select" ON "temporada" FOR SELECT USING (true);
CREATE POLICY "temporada_write_curator" ON "temporada"
  FOR INSERT WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));
CREATE POLICY "temporada_update_curator" ON "temporada"
  FOR UPDATE USING (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'))
  WITH CHECK (current_setting('app.current_user_role', true) IN ('CURATOR', 'ADMIN'));
