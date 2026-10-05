-- Onda 1 admin: ban de usuário + origem do plano (manual até cancelamento)
ALTER TABLE "usuario" ADD COLUMN "banido_em" TIMESTAMP(3);

ALTER TABLE "usuario_plano" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'STRIPE';
