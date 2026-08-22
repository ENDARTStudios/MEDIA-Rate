/**
 * seed-localizacao-mapa-comics.ts (T409+T410, D-369) — corrige titulo_en e
 * titulo_original de HQs via mapa curado PT→EN (ComicVine name como referência).
 *
 * SOBRESCREVE quando o valor atual difere do mapa. Motivo: seed-localizacao.ts
 * e seed-fase-c-enrich2.ts deixaram matches FUZZY errados (ex.: "Maus"→
 * "Micky Maus", "V de Vingança"→"Vingança") tanto em titulo_en quanto em
 * titulo_original. Para HQs, o "título original" é o próprio nome em inglês
 * (ComicVine name), igual ao titulo_en.
 *
 * Idempotente: re-rodar não altera nada. Rodar APÓS db:seed:localizacao.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Mapa determinístico {titulo_pt: titulo_en} — cobre todo o catálogo de HQs
 *  (seed-fase-c.ts HQS + seed-novas-midias.ts "Watchmen"). */
const MAPA: Record<string, string> = {
  "Sandman": "The Sandman",
  "Maus": "Maus",
  "Batman: O Cavaleiro das Trevas": "Batman: The Dark Knight Returns",
  "V de Vingança": "V for Vendetta",
  "Persépolis": "Persepolis",
  "Saga": "Saga",
  "Y: O Último Homem": "Y: The Last Man",
  "Preacher": "Preacher",
  "The Boys": "The Boys",
  "Invincible": "Invincible",
  "The Walking Dead": "The Walking Dead",
  "Fábulas": "Fables",
  "Hellboy: Semente da Destruição": "Hellboy: Seed of Destruction",
  "Sin City": "Sin City",
  "Scott Pilgrim": "Scott Pilgrim",
  "Bone": "Bone",
  "Asterios Polyp": "Asterios Polyp",
  "Fun Home": "Fun Home",
  "Blankets": "Blankets",
  "O Reino do Amanhã": "Kingdom Come",
  "Crise nas Infinitas Terras": "Crisis on Infinite Earths",
  "Batman: A Piada Mortal": "Batman: The Killing Joke",
  "Marvels": "Marvels",
  "Homem-Aranha: Azul": "Spider-Man: Blue",
  "Demolidor: O Homem sem Medo": "Daredevil: The Man Without Fear",
  "Superman: Grandes Astros": "All-Star Superman",
  "All-Star Superman": "All-Star Superman",
  "Flashpoint": "Flashpoint",
  "Esquadrão Suicida": "Suicide Squad",
  "Preacher: Até o Fim": "Preacher: Until the End of the World",
  "Watchmen": "Watchmen",
};

async function main() {
  const total = await prisma.midia.count({ where: { tipo: "COMIC", deleted_at: null } });
  const alvos = await prisma.midia.findMany({
    where: { tipo: "COMIC", deleted_at: null },
    select: { id: true, titulo: true, titulo_en: true, titulo_original: true },
  });

  let corrigidosEn = 0;
  let corrigidosOriginal = 0;
  let jaCorretos = 0;
  for (const m of alvos) {
    const en = MAPA[m.titulo];
    if (!en) continue;
    const data: { titulo_en?: string; titulo_original?: string } = {};
    if (m.titulo_en !== en) {
      data.titulo_en = en;
      corrigidosEn++;
    }
    if (m.titulo_original !== en) {
      data.titulo_original = en;
      corrigidosOriginal++;
    }
    if (Object.keys(data).length === 0) {
      jaCorretos++;
      continue;
    }
    await prisma.midia.update({ where: { id: m.id }, data });
  }

  const semMapa = alvos.filter((m) => !MAPA[m.titulo]).map((m) => m.titulo);
  console.log(
    `[localizacao-mapa-comics] total=${total} corrigidosEn=${corrigidosEn} corrigidosOriginal=${corrigidosOriginal} jaCorretos=${jaCorretos} semMapa=${semMapa.length}`,
  );
  if (semMapa.length) console.log(`  sem mapa: ${semMapa.join(" | ")}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
