ALTER TABLE "midia" ADD COLUMN "score" DOUBLE PRECISION;
CREATE INDEX "midia_score_idx" ON "midia"("score");
UPDATE "midia" SET "score" = ms."score" FROM "media_score" ms WHERE ms."midia_id" = "midia"."id" AND ms."calculado_em" = (SELECT MAX("calculado_em") FROM "media_score" WHERE "midia_id" = "midia"."id");