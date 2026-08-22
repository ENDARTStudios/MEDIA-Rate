/**
 * seed-localizacao-mapa-manga.ts (T409+T410, D-369) — corrige titulo_en e
 * titulo_original de mangás via mapa curado (AniList title.english / title.romaji).
 *
 * SOBRESCREVE quando o valor atual difere do mapa. Motivo: seed-localizacao.ts
 * deixou matches FUZZY errados (ex.: "My Hero Academia"→"…School Briefs",
 * "Uzumaki"→"…Spiral into Horror"). titulo_en = título em inglês; titulo_original
 * = título original romaji (AniList title.romaji), com fallback ao inglês quando
 * romaji == inglês (Naruto, One Piece, Bleach, ...).
 *
 * Idempotente: re-rodar não altera nada. Rodar APÓS db:seed:localizacao.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Mapa determinístico {titulo_pt: titulo_en} — cobre todo o catálogo de
 *  mangás (seed-fase-c.ts MANGAS + seed-novas-midias.ts "Berserk"). */
const MAPA: Record<string, string> = {
  "One Piece": "One Piece",
  "Naruto": "Naruto",
  "Dragon Ball": "Dragon Ball",
  "Death Note": "Death Note",
  "Fullmetal Alchemist": "Fullmetal Alchemist",
  "Attack on Titan": "Attack on Titan",
  "My Hero Academia": "My Hero Academia",
  "Demon Slayer: Kimetsu no Yaiba": "Demon Slayer: Kimetsu no Yaiba",
  "Jujutsu Kaisen": "Jujutsu Kaisen",
  "Chainsaw Man": "Chainsaw Man",
  "Tokyo Ghoul": "Tokyo Ghoul",
  "Hunter x Hunter": "Hunter x Hunter",
  "Vagabond": "Vagabond",
  "Vinland Saga": "Vinland Saga",
  "Monster": "Monster",
  "20th Century Boys": "20th Century Boys",
  "Pluto": "Pluto",
  "JoJo's Bizarre Adventure": "JoJo's Bizarre Adventure",
  "Bleach": "Bleach",
  "Slam Dunk": "Slam Dunk",
  "Rurouni Kenshin": "Rurouni Kenshin",
  "Yu Yu Hakusho": "Yu Yu Hakusho",
  "Fairy Tail": "Fairy Tail",
  "Black Clover": "Black Clover",
  "Spy x Family": "Spy x Family",
  "One Punch Man": "One Punch Man",
  "Mob Psycho 100": "Mob Psycho 100",
  "Made in Abyss": "Made in Abyss",
  "The Promised Neverland": "The Promised Neverland",
  "Dr. Stone": "Dr. Stone",
  "Fire Force": "Fire Force",
  "Blue Lock": "Blue Lock",
  "Haikyuu!!": "Haikyuu!!",
  "Kingdom": "Kingdom",
  "Golden Kamuy": "Golden Kamuy",
  "Dorohedoro": "Dorohedoro",
  "Uzumaki": "Uzumaki",
  "Goodnight Punpun": "Goodnight Punpun",
  "Frieren: Beyond Journey's End": "Frieren: Beyond Journey's End",
  "Gantz": "Gantz",
  "Berserk": "Berserk",
};

/** Título original romaji (AniList title.romaji) apenas para os mangás cujo
 *  romaji difere do inglês. Demais: romaji == inglês (fallback ao MAPA). */
const ROMAJI: Record<string, string> = {
  "Fullmetal Alchemist": "Hagane no Renkinjutsushi",
  "Attack on Titan": "Shingeki no Kyojin",
  "My Hero Academia": "Boku no Hero Academia",
  "Demon Slayer: Kimetsu no Yaiba": "Kimetsu no Yaiba",
  "20th Century Boys": "20 Seiki Shounen",
  "JoJo's Bizarre Adventure": "JoJo no Kimyou na Bouken",
  "Yu Yu Hakusho": "Yuu Yuu Hakusho",
  "The Promised Neverland": "Yakusoku no Neverland",
  "Fire Force": "Enen no Shouboutai",
  "Goodnight Punpun": "Oyasumi Punpun",
  "Frieren: Beyond Journey's End": "Sousou no Frieren",
};

async function main() {
  const total = await prisma.midia.count({ where: { tipo: "MANGA", deleted_at: null } });
  const alvos = await prisma.midia.findMany({
    where: { tipo: "MANGA", deleted_at: null },
    select: { id: true, titulo: true, titulo_en: true, titulo_original: true },
  });

  let corrigidosEn = 0;
  let corrigidosOriginal = 0;
  let jaCorretos = 0;
  for (const m of alvos) {
    const en = MAPA[m.titulo];
    if (!en) continue;
    const romaji = ROMAJI[m.titulo] ?? en;
    const data: { titulo_en?: string; titulo_original?: string } = {};
    if (m.titulo_en !== en) {
      data.titulo_en = en;
      corrigidosEn++;
    }
    if (m.titulo_original !== romaji) {
      data.titulo_original = romaji;
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
    `[localizacao-mapa-manga] total=${total} corrigidosEn=${corrigidosEn} corrigidosOriginal=${corrigidosOriginal} jaCorretos=${jaCorretos} semMapa=${semMapa.length}`,
  );
  if (semMapa.length) console.log(`  sem mapa: ${semMapa.join(" | ")}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
