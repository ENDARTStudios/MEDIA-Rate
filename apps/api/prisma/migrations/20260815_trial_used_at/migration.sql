-- T327: trial único por usuário (D-132 abuso).
-- Adiciona `trial_used_at` (data da primeira ativação de trial) em
-- usuario_plano. Aditiva e backward-compatible — valor NULL seguro para
-- registros existentes (usuários antigos que já usaram trial serão marcados
-- retroativamente por um reparo opcional; o gate passa a valer para novos).
ALTER TABLE "usuario_plano" ADD COLUMN "trial_used_at" TIMESTAMP(3);
