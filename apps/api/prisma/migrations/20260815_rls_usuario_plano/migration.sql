-- T344: RLS FORCE em usuario_plano (owner-only + service-write + admin-read).
-- Aditiva. Sem DROP. Idempotente quando executada via migrate (nunca re-ran).
--
-- Contexto (comContextoRls):
--   - USER: app.current_user_id = usuario dono  (leitura/escrita do próprio plano)
--   - SERVICE: app.current_user_role = 'SERVICE' (webhook billing — metadata
--     validado por HMAC do Stripe; escrita em qualquer usuario_plano)
--   - ADMIN: app.current_user_role = 'ADMIN' (leitura agregada de stats)

ALTER TABLE "usuario_plano" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario_plano" FORCE ROW LEVEL SECURITY;

-- Owner: compara por TEXTO (não ::uuid) — contexto ausente ('') não quebra a
-- policy (mesmo padrão do z_rls/watchlist).
CREATE POLICY "usuario_plano_owner" ON "usuario_plano"
  FOR ALL
  USING ("usuario_id"::text = current_setting('app.current_user_id', true))
  WITH CHECK ("usuario_id"::text = current_setting('app.current_user_id', true));

-- Service: escrita interna (webhook) — não tem dono de sessão.
CREATE POLICY "usuario_plano_service" ON "usuario_plano"
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.current_user_role', true) = 'SERVICE');

-- Admin: leitura agregada (stats) E escrita (seed/provision). ADMIN já é role
-- de superusuário (mesmo padrão dos catálogos: midia_write_curator permite
-- ADMIN escrever) — não é bypass indiscriminado de aplicação.
CREATE POLICY "usuario_plano_admin" ON "usuario_plano"
  FOR ALL
  USING (current_setting('app.current_user_role', true) = 'ADMIN')
  WITH CHECK (current_setting('app.current_user_role', true) = 'ADMIN');
