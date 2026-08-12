-- T299 (D-285): exceção de LEITURA para ADMIN nas interações — sem isso, as
-- policies de T290 esvaziam admin stats/recommendations em produção.
-- SOMENTE leitura (USING); o WITH CHECK de escrita permanece owner-only
-- (as policies watchlist_tenant_user/discovery_tenant_user seguem vigentes).

CREATE POLICY "watchlist_read_admin" ON "watchlist_entry"
  FOR SELECT
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND current_setting('app.current_user_role', true) = 'ADMIN'
  );

CREATE POLICY "discovery_read_admin" ON "discovery_event"
  FOR SELECT
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND current_setting('app.current_user_role', true) = 'ADMIN'
  );
