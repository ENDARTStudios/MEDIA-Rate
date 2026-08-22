-- T397 (D-376): fallback de descobertas por gênero compartilhado.
-- Só ADD VALUE (sem INSERT na mesma migration — lição D-236/E55P04).
ALTER TYPE "TipoRelacao" ADD VALUE 'MESMO_GENERO';
