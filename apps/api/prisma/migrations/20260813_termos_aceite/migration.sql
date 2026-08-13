-- T306 (D-295): coluna de aceite dos Termos e Condições (v1.0).
-- Migração ADITIVA e idempotente (gate D-236: sem ALTER TYPE + DML no mesmo
-- arquivo; só DDL). Write-once no register; base LGPD art. 7º I / RGPD 6(1)(a).

ALTER TABLE "usuario"
  ADD COLUMN IF NOT EXISTS "termos_aceitos_em" TIMESTAMP(3);
