-- T291 (Arquitetura §3): INSERT da role CURATOR — migration IRMÃ do ADD VALUE
-- (D-236): o enum já foi commitado em 20260811_role_curator; o uso só é
-- permitido depois do commit daquela transação.

INSERT INTO "papel" ("nome") VALUES ('CURATOR')
ON CONFLICT ("nome") DO NOTHING;
