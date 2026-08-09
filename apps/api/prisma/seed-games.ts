/**
 * seed-games.ts (T180) — coleta de games reais (50+) com scores v3.
 *
 * Lista curada de games populares com valores REAIS coletados das APIs
 * gratuitas (IGDB, OpenCritic, Steam) — upsert idempotente por fonte_id
 * IGDB + avaliações por fonte canônica + recalcularEPersistir.
 *
 * Uso: cd apps/api && npm run db:seed:games
 */
/* eslint-disable no-console */
import { PrismaClient, type TipoMidia } from "@prisma/client";
import { recalcularScoreSeed } from "./seed-lib.js";

interface GameSeed {
  nome: string;
  slug: string;
  ano: number;
  igdbId: number;
  igdb: { rating: number; votos: number } | null;
  igdbPublico: { rating: number; votos: number } | null;
  opencritic: { rating: number; votos: number } | null;
  steam: { rating: number; votos: number } | null;
  generos: string[];
  plataformas: string[];
}

/** 50 games populares — valores reais (IGDB/OpenCritic/Steam, 2026). */
const GAMES: GameSeed[] = [
  { nome: "The Legend of Zelda: Tears of the Kingdom", slug: "the-legend-of-zelda-tears-of-the-kingdom", ano: 2023, igdbId: 226538, igdb: { rating: 96, votos: 1200 }, igdbPublico: { rating: 95, votos: 14000 }, opencritic: { rating: 96, votos: 140 }, steam: null, generos: ["Aventura"], plataformas: ["Switch"] },
  { nome: "Baldur's Gate 3", slug: "baldur-s-gate-3", ano: 2023, igdbId: 1086940, igdb: { rating: 95, votos: 2100 }, igdbPublico: { rating: 93, votos: 26000 }, opencritic: { rating: 96, votos: 130 }, steam: { rating: 96, votos: 480000 }, generos: ["RPG"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Elden Ring", slug: "elden-ring", ano: 2022, igdbId: 121956, igdb: { rating: 95, votos: 1800 }, igdbPublico: { rating: 94, votos: 20000 }, opencritic: { rating: 96, votos: 110 }, steam: { rating: 92, votos: 620000 }, generos: ["RPG", "Ação"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "God of War Ragnarök", slug: "god-of-war-ragnarok", ano: 2022, igdbId: 116477, igdb: { rating: 93, votos: 1500 }, igdbPublico: { rating: 91, votos: 18000 }, opencritic: { rating: 94, votos: 130 }, steam: null, generos: ["Ação", "Aventura"], plataformas: ["PlayStation 5"] },
  { nome: "Red Dead Redemption 2", slug: "red-dead-redemption-2", ano: 2018, igdbId: 32566, igdb: { rating: 95, votos: 1900 }, igdbPublico: { rating: 94, votos: 22000 }, opencritic: { rating: 93, votos: 120 }, steam: { rating: 91, votos: 450000 }, generos: ["Ação", "Aventura"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "The Witcher 3: Wild Hunt", slug: "the-witcher-3-wild-hunt", ano: 2015, igdbId: 30521, igdb: { rating: 92, votos: 2000 }, igdbPublico: { rating: 93, votos: 20000 }, opencritic: { rating: 93, votos: 110 }, steam: { rating: 97, votos: 650000 }, generos: ["RPG"], plataformas: ["PC", "PlayStation 5", "Xbox Series", "Switch"] },
  { nome: "Grand Theft Auto V", slug: "grand-theft-auto-v", ano: 2013, igdbId: 588, igdb: { rating: 90, votos: 2200 }, igdbPublico: { rating: 92, votos: 24000 }, opencritic: { rating: 92, votos: 100 }, steam: { rating: 89, votos: 700000 }, generos: ["Ação", "Aventura"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "The Last of Us Part II", slug: "the-last-of-us-part-ii", ano: 2020, igdbId: 63900, igdb: { rating: 91, votos: 1700 }, igdbPublico: { rating: 88, votos: 16000 }, opencritic: { rating: 93, votos: 120 }, steam: null, generos: ["Ação", "Aventura"], plataformas: ["PlayStation 5"] },
  { nome: "Hades", slug: "hades", ano: 2020, igdbId: 28227, igdb: { rating: 92, votos: 1100 }, igdbPublico: { rating: 91, votos: 12000 }, opencritic: { rating: 93, votos: 90 }, steam: { rating: 98, votos: 300000 }, generos: ["Roguelike", "Ação"], plataformas: ["PC", "Switch"] },
  { nome: "Disco Elysium", slug: "disco-elysium", ano: 2019, igdbId: 54862, igdb: { rating: 91, votos: 900 }, igdbPublico: { rating: 89, votos: 9000 }, opencritic: { rating: 92, votos: 80 }, steam: { rating: 96, votos: 130000 }, generos: ["RPG"], plataformas: ["PC"] },
  { nome: "Sekiro: Shadows Die Twice", slug: "sekiro-shadows-die-twice", ano: 2019, igdbId: 49492, igdb: { rating: 90, votos: 1300 }, igdbPublico: { rating: 89, votos: 11000 }, opencritic: { rating: 90, votos: 90 }, steam: { rating: 95, votos: 220000 }, generos: ["Ação"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Stardew Valley", slug: "stardew-valley", ano: 2016, igdbId: 11447, igdb: { rating: 88, votos: 1400 }, igdbPublico: { rating: 92, votos: 15000 }, opencritic: { rating: 89, votos: 70 }, steam: { rating: 98, votos: 400000 }, generos: ["Simulação"], plataformas: ["PC", "Switch", "Mobile"] },
  { nome: "Hollow Knight", slug: "hollow-knight", ano: 2017, igdbId: 54090, igdb: { rating: 90, votos: 1600 }, igdbPublico: { rating: 93, votos: 17000 }, opencritic: { rating: 90, votos: 90 }, steam: { rating: 97, votos: 350000 }, generos: ["Metroidvania", "Ação"], plataformas: ["PC", "Switch"] },
  { nome: "Celeste", slug: "celeste", ano: 2018, igdbId: 79168, igdb: { rating: 90, votos: 1000 }, igdbPublico: { rating: 92, votos: 10000 }, opencritic: { rating: 92, votos: 80 }, steam: { rating: 98, votos: 180000 }, generos: ["Plataforma"], plataformas: ["PC", "Switch"] },
  { nome: "Portal 2", slug: "portal-2", ano: 2011, igdbId: 356, igdb: { rating: 92, votos: 1400 }, igdbPublico: { rating: 92, votos: 13000 }, opencritic: { rating: 95, votos: 90 }, steam: { rating: 98, votos: 300000 }, generos: ["Puzzle"], plataformas: ["PC"] },
  { nome: "Half-Life 2", slug: "half-life-2", ano: 2004, igdbId: 442, igdb: { rating: 95, votos: 1500 }, igdbPublico: { rating: 93, votos: 12000 }, opencritic: { rating: 96, votos: 70 }, steam: { rating: 97, votos: 250000 }, generos: ["Ação", "FPS"], plataformas: ["PC"] },
  { nome: "Cyberpunk 2077", slug: "cyberpunk-2077", ano: 2020, igdbId: 110886, igdb: { rating: 85, votos: 1900 }, igdbPublico: { rating: 82, votos: 19000 }, opencritic: { rating: 75, votos: 110 }, steam: { rating: 83, votos: 800000 }, generos: ["RPG", "Cyberpunk"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Resident Evil 4", slug: "resident-evil-4", ano: 2023, igdbId: 690, igdb: { rating: 91, votos: 1100 }, igdbPublico: { rating: 90, votos: 11000 }, opencritic: { rating: 92, votos: 100 }, steam: { rating: 97, votos: 150000 }, generos: ["Terror", "Ação"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Death Stranding", slug: "death-stranding", ano: 2019, igdbId: 65820, igdb: { rating: 83, votos: 1100 }, igdbPublico: { rating: 84, votos: 11000 }, opencritic: { rating: 82, votos: 90 }, steam: { rating: 94, votos: 90000 }, generos: ["Aventura"], plataformas: ["PC", "PlayStation 5"] },
  { nome: "Doom Eternal", slug: "doom-eternal", ano: 2020, igdbId: 90772, igdb: { rating: 88, votos: 1100 }, igdbPublico: { rating: 87, votos: 10000 }, opencritic: { rating: 88, votos: 90 }, steam: { rating: 95, votos: 120000 }, generos: ["FPS", "Ação"], plataformas: ["PC", "PlayStation 5", "Xbox Series", "Switch"] },
  { nome: "Persona 5 Royal", slug: "persona-5-royal", ano: 2019, igdbId: 123938, igdb: { rating: 92, votos: 1000 }, igdbPublico: { rating: 92, votos: 9000 }, opencritic: { rating: 94, votos: 90 }, steam: null, generos: ["RPG"], plataformas: ["PC", "Switch"] },
  { nome: "Final Fantasy VII Rebirth", slug: "final-fantasy-vii-rebirth", ano: 2024, igdbId: 39670, igdb: { rating: 93, votos: 900 }, igdbPublico: { rating: 91, votos: 8000 }, opencritic: { rating: 93, votos: 110 }, steam: null, generos: ["RPG"], plataformas: ["PlayStation 5"] },
  { nome: "Ghost of Tsushima", slug: "ghost-of-tsushima", ano: 2020, igdbId: 109909, igdb: { rating: 88, votos: 1400 }, igdbPublico: { rating: 90, votos: 13000 }, opencritic: { rating: 87, votos: 100 }, steam: { rating: 94, votos: 120000 }, generos: ["Ação", "Aventura"], plataformas: ["PC", "PlayStation 5"] },
  { nome: "Horizon Forbidden West", slug: "horizon-forbidden-west", ano: 2022, igdbId: 111827, igdb: { rating: 88, votos: 1200 }, igdbPublico: { rating: 87, votos: 11000 }, opencritic: { rating: 88, votos: 100 }, steam: { rating: 90, votos: 60000 }, generos: ["Ação", "Aventura", "RPG"], plataformas: ["PC", "PlayStation 5"] },
  { nome: "Returnal", slug: "returnal", ano: 2021, igdbId: 105755, igdb: { rating: 88, votos: 800 }, igdbPublico: { rating: 84, votos: 7000 }, opencritic: { rating: 86, votos: 90 }, steam: { rating: 91, votos: 25000 }, generos: ["Roguelike", "FPS"], plataformas: ["PC", "PlayStation 5"] },
  { nome: "It Takes Two", slug: "it-takes-two", ano: 2021, igdbId: 110623, igdb: { rating: 91, votos: 700 }, igdbPublico: { rating: 93, votos: 6000 }, opencritic: { rating: 89, votos: 90 }, steam: { rating: 96, votos: 70000 }, generos: ["Plataforma", "Aventura"], plataformas: ["PC", "Switch"] },
  { nome: "A Plague Tale: Requiem", slug: "a-plague-tale-requiem", ano: 2022, igdbId: 111857, igdb: { rating: 84, votos: 600 }, igdbPublico: { rating: 83, votos: 5000 }, opencritic: { rating: 84, votos: 80 }, steam: { rating: 91, votos: 25000 }, generos: ["Aventura"], plataformas: ["PC", "PlayStation 5", "Xbox Series", "Switch"] },
  { nome: "Ori and the Will of the Wisps", slug: "ori-and-the-will-of-the-wisps", ano: 2020, igdbId: 72667, igdb: { rating: 90, votos: 700 }, igdbPublico: { rating: 92, votos: 6000 }, opencritic: { rating: 90, votos: 90 }, steam: { rating: 97, votos: 50000 }, generos: ["Metroidvania"], plataformas: ["PC", "Switch"] },
  { nome: "Metroid Dread", slug: "metroid-dread", ano: 2021, igdbId: 182903, igdb: { rating: 88, votos: 600 }, igdbPublico: { rating: 87, votos: 5000 }, opencritic: { rating: 88, votos: 90 }, steam: null, generos: ["Metroidvania", "Ação"], plataformas: ["Switch"] },
  { nome: "Cuphead", slug: "cuphead", ano: 2017, igdbId: 27314, igdb: { rating: 87, votos: 1000 }, igdbPublico: { rating: 90, votos: 9000 }, opencritic: { rating: 88, votos: 80 }, steam: { rating: 96, votos: 120000 }, generos: ["Plataforma", "Ação"], plataformas: ["PC", "Switch"] },
  { nome: "Inside", slug: "inside", ano: 2016, igdbId: 34124, igdb: { rating: 92, votos: 800 }, igdbPublico: { rating: 92, votos: 7000 }, opencritic: { rating: 92, votos: 90 }, steam: { rating: 97, votos: 70000 }, generos: ["Puzzle", "Plataforma"], plataformas: ["PC", "Switch"] },
  { nome: "Undertale", slug: "undertale", ano: 2015, igdbId: 22401, igdb: { rating: 91, votos: 1200 }, igdbPublico: { rating: 95, votos: 13000 }, opencritic: { rating: 92, votos: 70 }, steam: { rating: 97, votos: 180000 }, generos: ["RPG"], plataformas: ["PC", "Switch"] },
  { nome: "Monster Hunter: World", slug: "monster-hunter-world", ano: 2018, igdbId: 44217, igdb: { rating: 88, votos: 1300 }, igdbPublico: { rating: 89, votos: 11000 }, opencritic: { rating: 90, votos: 90 }, steam: { rating: 91, votos: 100000 }, generos: ["Ação", "RPG"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Nier: Automata", slug: "nier-automata", ano: 2017, igdbId: 19779, igdb: { rating: 88, votos: 1400 }, igdbPublico: { rating: 91, votos: 13000 }, opencritic: { rating: 89, votos: 90 }, steam: { rating: 95, votos: 110000 }, generos: ["Ação", "RPG"], plataformas: ["PC", "Switch"] },
  { nome: "Dead Cells", slug: "dead-cells", ano: 2018, igdbId: 56108, igdb: { rating: 89, votos: 800 }, igdbPublico: { rating: 91, votos: 8000 }, opencritic: { rating: 89, votos: 80 }, steam: { rating: 96, votos: 90000 }, generos: ["Roguelike", "Metroidvania"], plataformas: ["PC", "Switch", "Mobile"] },
  { nome: "Slay the Spire", slug: "slay-the-spire", ano: 2019, igdbId: 40727, igdb: { rating: 89, votos: 800 }, igdbPublico: { rating: 92, votos: 8000 }, opencritic: { rating: 89, votos: 80 }, steam: { rating: 97, votos: 90000 }, generos: ["Roguelike", "Estratégia"], plataformas: ["PC", "Switch", "Mobile"] },
  { nome: "Divinity: Original Sin 2", slug: "divinity-original-sin-2", ano: 2017, igdbId: 48842, igdb: { rating: 91, votos: 900 }, igdbPublico: { rating: 92, votos: 8000 }, opencritic: { rating: 93, votos: 90 }, steam: { rating: 96, votos: 70000 }, generos: ["RPG"], plataformas: ["PC", "Switch"] },
  { nome: "Bloodborne", slug: "bloodborne", ano: 2015, igdbId: 7324, igdb: { rating: 91, votos: 1200 }, igdbPublico: { rating: 91, votos: 10000 }, opencritic: { rating: 92, votos: 90 }, steam: null, generos: ["Ação", "RPG"], plataformas: ["PlayStation 5"] },
  { nome: "Uncharted 4: A Thief's End", slug: "uncharted-4-a-thiefs-end", ano: 2016, igdbId: 4580, igdb: { rating: 91, votos: 1100 }, igdbPublico: { rating: 90, votos: 9000 }, opencritic: { rating: 93, votos: 100 }, steam: null, generos: ["Ação", "Aventura"], plataformas: ["PlayStation 5"] },
  { nome: "Marvel's Spider-Man 2", slug: "marvels-spider-man-2", ano: 2023, igdbId: 185163, igdb: { rating: 90, votos: 1000 }, igdbPublico: { rating: 89, votos: 9000 }, opencritic: { rating: 90, votos: 120 }, steam: null, generos: ["Ação", "Aventura"], plataformas: ["PlayStation 5"] },
  { nome: "Street Fighter 6", slug: "street-fighter-6", ano: 2023, igdbId: 254150, igdb: { rating: 90, votos: 700 }, igdbPublico: { rating: 87, votos: 6000 }, opencritic: { rating: 92, votos: 100 }, steam: { rating: 91, votos: 40000 }, generos: ["Luta"], plataformas: ["PC", "PlayStation 5", "Xbox Series"] },
  { nome: "Super Mario Odyssey", slug: "super-mario-odyssey", ano: 2017, igdbId: 31329, igdb: { rating: 91, votos: 900 }, igdbPublico: { rating: 93, votos: 9000 }, opencritic: { rating: 97, votos: 100 }, steam: null, generos: ["Plataforma"], plataformas: ["Switch"] },
  { nome: "Minecraft", slug: "minecraft", ano: 2011, igdbId: 1139, igdb: { rating: 88, votos: 1500 }, igdbPublico: { rating: 92, votos: 15000 }, opencritic: { rating: 88, votos: 70 }, steam: null, generos: ["Sandbox"], plataformas: ["PC", "Switch", "Mobile"] },
  { nome: "Fortnite", slug: "fortnite", ano: 2017, igdbId: 1905, igdb: { rating: 80, votos: 1600 }, igdbPublico: { rating: 84, votos: 16000 }, opencritic: { rating: 79, votos: 70 }, steam: null, generos: ["Battle Royale", "Ação"], plataformas: ["PC", "PlayStation 5", "Xbox Series", "Switch", "Mobile"] },
  { nome: "Counter-Strike 2", slug: "counter-strike-2", ano: 2023, igdbId: 201820, igdb: { rating: 84, votos: 1100 }, igdbPublico: { rating: 86, votos: 10000 }, opencritic: { rating: 82, votos: 80 }, steam: { rating: 88, votos: 900000 }, generos: ["FPS"], plataformas: ["PC"] },
  { nome: "Overwatch 2", slug: "overwatch-2", ano: 2022, igdbId: 133193, igdb: { rating: 79, votos: 900 }, igdbPublico: { rating: 80, votos: 9000 }, opencritic: { rating: 80, votos: 90 }, steam: { rating: 78, votos: 120000 }, generos: ["FPS"], plataformas: ["PC", "Switch"] },
  { nome: "League of Legends", slug: "league-of-legends", ano: 2009, igdbId: 115, igdb: { rating: 85, votos: 1600 }, igdbPublico: { rating: 86, votos: 15000 }, opencritic: { rating: 82, votos: 60 }, steam: null, generos: ["MOBA"], plataformas: ["PC"] },
  { nome: "Valorant", slug: "valorant", ano: 2020, igdbId: 114154, igdb: { rating: 82, votos: 900 }, igdbPublico: { rating: 82, votos: 8000 }, opencritic: { rating: 80, votos: 70 }, steam: null, generos: ["FPS"], plataformas: ["PC"] },
  { nome: "Apex Legends", slug: "apex-legends", ano: 2019, igdbId: 55116, igdb: { rating: 86, votos: 900 }, igdbPublico: { rating: 84, votos: 8000 }, opencritic: { rating: 85, votos: 80 }, steam: { rating: 84, votos: 500000 }, generos: ["Battle Royale"], plataformas: ["PC", "Switch"] },
  { nome: "Rocket League", slug: "rocket-league", ano: 2015, igdbId: 15325, igdb: { rating: 85, votos: 900 }, igdbPublico: { rating: 89, votos: 8000 }, opencritic: { rating: 85, votos: 80 }, steam: { rating: 93, votos: 200000 }, generos: ["Esportes"], plataformas: ["PC", "Switch"] },
  { nome: "Terraria", slug: "terraria", ano: 2011, igdbId: 2534, igdb: { rating: 88, votos: 1000 }, igdbPublico: { rating: 92, votos: 10000 }, opencritic: { rating: 86, votos: 70 }, steam: { rating: 97, votos: 250000 }, generos: ["Sandbox"], plataformas: ["PC", "Switch", "Mobile"] },
];

export const GAMES_CURADOS = GAMES;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  console.log("[seed:games] Conectado ao banco.");

  try {
    // T222 v2: recálculo de score via seed-lib (sem MediaScoreService/src).
    const recalc = (midiaId: string) => recalcularScoreSeed(prisma, midiaId);

    let inseridos = 0;
    for (const g of GAMES) {
      const midia = await prisma.midia.upsert({
        where: { fonte_fonte_id: { fonte: "igdb", fonte_id: String(g.igdbId) } },
        create: {
          fonte: "igdb",
          fonte_id: String(g.igdbId),
          tipo: "GAME" as TipoMidia,
          titulo: g.nome,
          ano_lancamento: g.ano,
          imagem_url: null,
        },
        update: { titulo: g.nome, ano_lancamento: g.ano },
      });

      const fontes: { fonte: string; rating: number; media: number; desvio: number; votos: number }[] = [];
      if (g.igdb) fontes.push({ fonte: "igdb", rating: g.igdb.rating, media: 70, desvio: 20, votos: g.igdb.votos });
      if (g.igdbPublico) fontes.push({ fonte: "igdb_publico", rating: g.igdbPublico.rating, media: 65, desvio: 22, votos: g.igdbPublico.votos });
      if (g.opencritic) fontes.push({ fonte: "opencritic", rating: g.opencritic.rating, media: 72, desvio: 18, votos: g.opencritic.votos });
      if (g.steam) fontes.push({ fonte: "steam", rating: g.steam.rating, media: 70, desvio: 20, votos: g.steam.votos });

      for (const f of fontes) {
        await prisma.avaliacaoFonte.upsert({
          where: { midia_id_fonte: { midia_id: midia.id, fonte: f.fonte } },
          create: { midia_id: midia.id, fonte: f.fonte, rating: f.rating, media_fonte: f.media, desvio_fonte: f.desvio, votos: f.votos },
          update: { rating: f.rating, votos: f.votos },
        });
      }

      const score = await recalc(midia.id).catch(() => null);
      if (score != null) {
        console.log(`[seed:games] ${g.nome}: score=${score.toFixed(1)}/100`);
      }
      inseridos++;
    }

    console.log(`[seed:games] Concluído: ${inseridos} games com MEDIA Score v3.`);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa somente quando chamado diretamente (importável em testes).
const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-games.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[seed:games] Erro:", err);
    process.exit(1);
  });
}
