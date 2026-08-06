-- T185: tabela de leads de categorias futuras (captura pública de e-mail).
-- Idempotente para re-execução segura.

CREATE TABLE IF NOT EXISTS "waitlist_notify" (
  "id" SERIAL NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waitlist_notify_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_notify_email_category_key"
  ON "waitlist_notify"("email", "category");
