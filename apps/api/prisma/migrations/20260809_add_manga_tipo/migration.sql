-- T231 (D-233): regra de domínio — anime NÃO é categoria.
--   • Animação japonesa (anime) = SERIE;
--   • Quadrinho japonês (mangá) = MANGA (categoria própria).
--   • Valor ANIME do enum fica DEPRECATED no banco (ADD VALUE é seguro;
--     REMOVE VALUE seria destrutivo/difícil em Postgres) — nunca exposto.

-- 1) Novo valor MANGA no enum (idempotente, mesmo padrão de 20260725).
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'MANGA';

-- 2) Reclassificação dos dados: obras de quadrinho japonês → MANGA.
--    No catálogo atual, 'ANIME' só tem Berserk (jikan/berserk, mangá).
--    Se existir animação japonesa classificada ANIME, vira SERIE (regra).
UPDATE "midia" SET "tipo" = 'MANGA' WHERE "tipo" = 'ANIME' AND "fonte" = 'jikan';
UPDATE "midia" SET "tipo" = 'SERIE' WHERE "tipo" = 'ANIME' AND "fonte" <> 'jikan';
