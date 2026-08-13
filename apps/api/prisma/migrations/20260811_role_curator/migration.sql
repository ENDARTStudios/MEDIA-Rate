-- T291 (Arquitetura §3): role CURATOR. ADD VALUE em migration própria
-- (D-236 — PG12+ proíbe usar novo valor de enum na MESMA transação, E55P04).
-- O INSERT na tabela papel vai na migration IRMÃ 20260811_role_curator_seed.

ALTER TYPE "PapelNome" ADD VALUE IF NOT EXISTS 'CURATOR';
