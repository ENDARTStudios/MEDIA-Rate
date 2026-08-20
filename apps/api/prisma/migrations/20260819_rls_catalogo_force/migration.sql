-- T328 (D-326): FORCE RLS nas tabelas de catálogo/curadoria.
-- Antes: ENABLE sem FORCE → o owner da tabela (role da app) burlava as policies.
-- Leitura: midia_select usa fallback para o tenant default; classificacao/premio/
-- temporada usam SELECT USING(true) → leituras não são afetadas.
-- Escrita: exige current_user_role IN ('CURATOR','ADMIN') — media.service refatorado
-- para comContextoRls(role ADMIN); seeds usam bootstrapRlsSeed (session ADMIN).
ALTER TABLE "midia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "classificacao_regiao" FORCE ROW LEVEL SECURITY;
ALTER TABLE "premio" FORCE ROW LEVEL SECURITY;
ALTER TABLE "temporada" FORCE ROW LEVEL SECURITY;
