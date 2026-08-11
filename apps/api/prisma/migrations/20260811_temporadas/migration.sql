-- T288: temporadas/episódios reais (TMDB) com notas. ADITIVA; DB virgem ok.

CREATE TABLE "temporada" (
  "id" UUID NOT NULL,
  "midia_id" UUID NOT NULL,
  "numero" INTEGER NOT NULL,
  "titulo" TEXT,
  "ano" INTEGER,
  "poster_url" TEXT,
  CONSTRAINT "temporada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "temporada_midia_id_numero_key" ON "temporada"("midia_id", "numero");
CREATE INDEX "temporada_midia_id_idx" ON "temporada"("midia_id");

CREATE TABLE "episodio" (
  "id" UUID NOT NULL,
  "temporada_id" UUID NOT NULL,
  "numero" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "data_exibicao" TIMESTAMP(3),
  "nota_publico" DOUBLE PRECISION,
  "nota_critica" DOUBLE PRECISION,
  CONSTRAINT "episodio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "episodio_temporada_id_numero_key" ON "episodio"("temporada_id", "numero");
CREATE INDEX "episodio_temporada_id_idx" ON "episodio"("temporada_id");

ALTER TABLE "temporada"
  ADD CONSTRAINT "temporada_midia_id_fkey"
    FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "episodio"
  ADD CONSTRAINT "episodio_temporada_id_fkey"
    FOREIGN KEY ("temporada_id") REFERENCES "temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
