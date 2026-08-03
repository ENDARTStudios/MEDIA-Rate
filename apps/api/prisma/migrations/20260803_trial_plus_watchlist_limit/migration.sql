-- AlterTable
-- D-132: trial de 7 dias no plano Plus (Stripe trial_period_days).
ALTER TABLE "usuario_plano" ADD COLUMN     "trial_ends_at" TIMESTAMP(3),
ADD COLUMN     "trial_notified_at" TIMESTAMP(3);
