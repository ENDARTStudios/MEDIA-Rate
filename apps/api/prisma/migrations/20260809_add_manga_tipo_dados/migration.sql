-- T231 (D-233/D-236): reclassificação dos dados — manga (quadrinho
-- japonês) vira MANGA; animação japonesa (anime) vira SERIE.
--
-- D-236: esta migration roda em transação SEPARADA da que adicionou o
-- valor MANGA (20260809_add_manga_tipo) — o Postgres só permite USAR o
-- novo valor do enum depois que o ADD VALUE foi commitado (E55P04).
--
-- No catálogo atual, 'ANIME' só tem Berserk (jikan/berserk, mangá).
-- Se existir animação japonesa classificada ANIME, vira SERIE (regra).
UPDATE "midia" SET "tipo" = 'MANGA' WHERE "tipo" = 'ANIME' AND "fonte" = 'jikan';
UPDATE "midia" SET "tipo" = 'SERIE' WHERE "tipo" = 'ANIME' AND "fonte" <> 'jikan';
