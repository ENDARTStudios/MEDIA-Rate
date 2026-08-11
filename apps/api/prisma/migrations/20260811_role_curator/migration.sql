-- T291 (Arquitetura §3): role CURATOR — curadoria de conteúdo separada de
-- ADMIN (sem acesso a usuários/billing/flags). ADD VALUE em migrations
-- irmãs (D-236) + INSERT do papel (tabela papel, não enum).

ALTER TYPE "PapelNome" ADD VALUE IF NOT EXISTS 'CURATOR';

INSERT INTO "papel" ("nome") VALUES ('CURATOR')
ON CONFLICT ("nome") DO NOTHING;
