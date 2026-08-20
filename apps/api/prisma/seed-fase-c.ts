/**
 * seed-fase-c.ts (T367/T368/T369, Fase C) — expande o catálogo de
 * LIVRO / COMIC / MANGA com títulos reais e notas realistas das fontes
 * gratuitas (OpenLibrary/GoogleBooks, ComicVine/ComicBookRoundup,
 * Jikan/AniList), no mesmo formato do seed-novas-midias.ts (T181).
 *
 * Escalas por tipo (espelho do seed existente):
 *  - LIVRO: openlibrary (0-5) + googlebooks (0-5)
 *  - COMIC: comicvine (0-5) + comicbookroundup (0-10)
 *  - MANGA: jikan (0-10) + anilist (0-100)
 *
 * Idempotente: skip por IDENTIDADE (fonte + fonte_id), não por título.
 */
import { PrismaClient } from "@prisma/client";
import { recalcularScoreSeed } from "./seed-lib.js";

const prisma = new PrismaClient();

type Item = [slug: string, titulo: string, ano: number, rating: number];

// ---------- 50 livros (rating primário 0-5) ----------
const LIVROS: Item[] = [
  ["o-senhor-dos-aneis-a-sociedade-do-anel", "O Senhor dos Anéis: A Sociedade do Anel", 1954, 4.6],
  ["o-hobbit", "O Hobbit", 1937, 4.4],
  ["harry-potter-e-a-pedra-filosofal", "Harry Potter e a Pedra Filosofal", 1997, 4.5],
  ["cem-anos-de-solidao", "Cem Anos de Solidão", 1967, 4.4],
  ["o-grande-gatsby", "O Grande Gatsby", 1925, 4.0],
  ["orgulho-e-preconceito", "Orgulho e Preconceito", 1813, 4.4],
  ["o-apanhador-no-campo-de-centeio", "O Apanhador no Campo de Centeio", 1951, 3.9],
  ["a-revolucao-dos-bichos", "A Revolução dos Bichos", 1945, 4.3],
  ["fahrenheit-451", "Fahrenheit 451", 1953, 4.3],
  ["admiravel-mundo-novo", "Admirável Mundo Novo", 1932, 4.2],
  ["neuromancer", "Neuromancer", 1984, 4.0],
  ["fundacao", "Fundação", 1951, 4.2],
  ["eu-robo", "Eu, Robô", 1950, 4.1],
  ["o-nome-do-vento", "O Nome do Vento", 2007, 4.5],
  ["o-codigo-da-vinci", "O Código Da Vinci", 2003, 3.8],
  ["jogos-vorazes", "Jogos Vorazes", 2008, 4.2],
  ["o-sol-e-para-todos", "O Sol é Para Todos", 1960, 4.4],
  ["crime-e-castigo", "Crime e Castigo", 1866, 4.3],
  ["dom-quixote", "Dom Quixote", 1605, 4.0],
  ["guerra-e-paz", "Guerra e Paz", 1869, 4.1],
  ["os-miseraveis", "Os Miseráveis", 1862, 4.3],
  ["moby-dick", "Moby Dick", 1851, 3.9],
  ["a-metamorfose", "A Metamorfose", 1915, 4.1],
  ["o-processo", "O Processo", 1925, 4.1],
  ["lolita", "Lolita", 1955, 4.0],
  ["o-retrato-de-dorian-gray", "O Retrato de Dorian Gray", 1890, 4.2],
  ["frankenstein", "Frankenstein", 1818, 3.9],
  ["dracula", "Drácula", 1897, 4.0],
  ["o-medico-e-o-monstro", "O Médico e o Monstro", 1886, 3.9],
  ["narnia-o-leao-a-feiticeira-e-o-guarda-roupa", "As Crônicas de Nárnia: O Leão, a Feiticeira e o Guarda-Roupa", 1950, 4.3],
  ["o-alquimista", "O Alquimista", 1988, 3.8],
  ["a-menina-que-roubava-livros", "A Menina que Roubava Livros", 2005, 4.3],
  ["a-culpa-e-das-estrelas", "A Culpa é das Estrelas", 2012, 4.2],
  ["extraordinario", "Extraordinário", 2012, 4.3],
  ["o-pequeno-principe", "O Pequeno Príncipe", 1943, 4.5],
  ["a-arte-da-guerra", "A Arte da Guerra", 1520, 4.0],
  ["o-principe", "O Príncipe", 1532, 3.9],
  ["a-republica", "A República", 1560, 4.0],
  ["a-origem-das-especies", "A Origem das Espécies", 1859, 4.1],
  ["sapiens", "Sapiens: Uma Breve História da Humanidade", 2011, 4.3],
  ["breves-respostas-para-grandes-questoes", "Breves Respostas para Grandes Questões", 2018, 4.2],
  ["uma-breve-historia-do-tempo", "Uma Breve História do Tempo", 1988, 4.2],
  ["cosmos", "Cosmos", 1980, 4.4],
  ["o-poder-do-habito", "O Poder do Hábito", 2012, 4.0],
  ["pai-rico-pai-pobre", "Pai Rico, Pai Pobre", 1997, 4.0],
  ["a-sutil-arte-de-ligar-o-fdase", "A Sutil Arte de Ligar o F*da-se", 2016, 3.9],
  ["como-fazer-amigos-e-influenciar-pessoas", "Como Fazer Amigos e Influenciar Pessoas", 1936, 4.1],
  ["o-monge-e-o-executivo", "O Monge e o Executivo", 1998, 3.9],
  ["a-coragem-de-ser-imperfeito", "A Coragem de Ser Imperfeito", 2012, 4.0],
  ["garota-exemplar", "Garota Exemplar", 2012, 4.0],
];

// ---------- 30 HQs (rating primário 0-5) ----------
const HQS: Item[] = [
  ["sandman", "Sandman", 1989, 4.5],
  ["maus", "Maus", 1980, 4.5],
  ["batman-o-cavaleiro-das-trevas", "Batman: O Cavaleiro das Trevas", 1986, 4.6],
  ["v-de-vinganca", "V de Vingança", 1988, 4.4],
  ["persepolis", "Persépolis", 2000, 4.3],
  ["saga", "Saga", 2012, 4.4],
  ["y-o-ultimo-homem", "Y: O Último Homem", 2002, 4.3],
  ["preacher", "Preacher", 1995, 4.2],
  ["the-boys", "The Boys", 2006, 4.0],
  ["invincible", "Invincible", 2003, 4.4],
  ["the-walking-dead", "The Walking Dead", 2003, 4.3],
  ["fabulas", "Fábulas", 2002, 4.2],
  ["hellboy-semente-da-destruicao", "Hellboy: Semente da Destruição", 1994, 4.1],
  ["sin-city", "Sin City", 1991, 4.2],
  ["scott-pilgrim", "Scott Pilgrim", 2004, 4.2],
  ["bone", "Bone", 1991, 4.4],
  ["asterios-polyp", "Asterios Polyp", 2009, 4.1],
  ["fun-home", "Fun Home", 2006, 4.2],
  ["blankets", "Blankets", 2003, 4.2],
  ["o-reino-do-amanha", "O Reino do Amanhã", 1996, 4.4],
  ["crise-nas-infinitas-terras", "Crise nas Infinitas Terras", 1985, 4.1],
  ["a-piada-mortal", "Batman: A Piada Mortal", 1988, 4.4],
  ["marvels", "Marvels", 1994, 4.2],
  ["homem-aranha-azul", "Homem-Aranha: Azul", 2002, 4.3],
  ["demolidor-o-homem-sem-medo", "Demolidor: O Homem sem Medo", 1993, 4.3],
  ["superman-grandes-astros", "Superman: Grandes Astros", 2005, 4.4],
  ["all-star-superman", "All-Star Superman", 2005, 4.5],
  ["flashpoint", "Flashpoint", 2011, 4.1],
  ["esquadrao-suicida", "Esquadrão Suicida", 1987, 3.9],
  ["preacher-ate-o-fim", "Preacher: Até o Fim", 1995, 4.1],
];

// ---------- 40 mangás (rating primário 0-10) ----------
const MANGAS: Item[] = [
  ["one-piece", "One Piece", 1997, 8.7],
  ["naruto", "Naruto", 1999, 8.0],
  ["dragon-ball", "Dragon Ball", 1984, 8.2],
  ["death-note", "Death Note", 2003, 8.7],
  ["fullmetal-alchemist", "Fullmetal Alchemist", 2001, 9.0],
  ["attack-on-titan", "Attack on Titan", 2009, 8.6],
  ["my-hero-academia", "My Hero Academia", 2014, 8.1],
  ["demon-slayer", "Demon Slayer: Kimetsu no Yaiba", 2016, 8.3],
  ["jujutsu-kaisen", "Jujutsu Kaisen", 2018, 8.4],
  ["chainsaw-man", "Chainsaw Man", 2018, 8.5],
  ["tokyo-ghoul", "Tokyo Ghoul", 2011, 8.0],
  ["hunter-x-hunter", "Hunter x Hunter", 1998, 8.8],
  ["vagabond", "Vagabond", 1998, 9.1],
  ["vinland-saga", "Vinland Saga", 2005, 8.9],
  ["monster", "Monster", 1994, 8.9],
  ["20th-century-boys", "20th Century Boys", 1999, 8.8],
  ["pluto", "Pluto", 2003, 8.7],
  ["jojos-bizarre-adventure", "JoJo's Bizarre Adventure", 1987, 8.3],
  ["bleach", "Bleach", 2001, 7.9],
  ["slam-dunk", "Slam Dunk", 1990, 8.8],
  ["rurouni-kenshin", "Rurouni Kenshin", 1994, 8.3],
  ["yu-yu-hakusho", "Yu Yu Hakusho", 1990, 8.3],
  ["fairy-tail", "Fairy Tail", 2006, 7.7],
  ["black-clover", "Black Clover", 2015, 7.9],
  ["spy-x-family", "Spy x Family", 2019, 8.4],
  ["one-punch-man", "One Punch Man", 2009, 8.6],
  ["mob-psycho-100", "Mob Psycho 100", 2012, 8.2],
  ["made-in-abyss", "Made in Abyss", 2012, 8.6],
  ["the-promised-neverland", "The Promised Neverland", 2016, 8.3],
  ["dr-stone", "Dr. Stone", 2017, 8.0],
  ["fire-force", "Fire Force", 2015, 7.8],
  ["blue-lock", "Blue Lock", 2018, 8.1],
  ["haikyuu", "Haikyuu!!", 2012, 8.8],
  ["kingdom", "Kingdom", 2006, 8.6],
  ["golden-kamuy", "Golden Kamuy", 2014, 8.5],
  ["dorohedoro", "Dorohedoro", 2000, 8.4],
  ["uzumaki", "Uzumaki", 1998, 8.1],
  ["goodnight-punpun", "Goodnight Punpun", 2007, 8.8],
  ["frieren", "Frieren: Beyond Journey's End", 2020, 9.0],
  ["gantz", "Gantz", 2000, 7.9],
];

function fontesLivro(r: number) {
  return [
    { fonte: "openlibrary", rating: r, media_fonte: 3.8, desvio_fonte: 0.9, votos: 18000 },
    { fonte: "googlebooks", rating: Math.min(5, r + 0.1), media_fonte: 4.0, desvio_fonte: 0.8, votos: 4200 },
  ];
}

function fontesHq(r: number) {
  return [
    { fonte: "comicvine", rating: r, media_fonte: 3.7, desvio_fonte: 0.9, votos: 2200 },
    { fonte: "comicbookroundup", rating: Math.round(r * 2 * 10) / 10, media_fonte: 7.6, desvio_fonte: 1.2, votos: 3400 },
  ];
}

function fontesManga(r: number) {
  return [
    { fonte: "jikan", rating: r, media_fonte: 7.4, desvio_fonte: 1.4, votos: 220000 },
    { fonte: "anilist", rating: Math.round(r * 10), media_fonte: 71, desvio_fonte: 16, votos: 180000 },
  ];
}

async function seedItem(
  slug: string,
  titulo: string,
  tipo: "LIVRO" | "COMIC" | "MANGA",
  ano: number,
  fontes: { fonte: string; rating: number; media_fonte: number; desvio_fonte: number; votos: number }[],
): Promise<"criado" | "skip"> {
  const fonte = fontes[0]?.fonte ?? "openlibrary";
  const existente = await prisma.midia.findFirst({
    where: { fonte, fonte_id: slug },
    select: { id: true },
  });
  if (existente) return "skip";

  const midia = await prisma.midia.create({
    data: {
      id: crypto.randomUUID(),
      fonte,
      fonte_id: slug,
      titulo,
      tipo,
      ano_lancamento: ano,
      imagem_url: null,
    },
  });
  for (const f of fontes) {
    await prisma.avaliacaoFonte.create({
      data: {
        midia_id: midia.id,
        fonte: f.fonte,
        rating: f.rating,
        media_fonte: f.media_fonte,
        desvio_fonte: f.desvio_fonte,
        votos: f.votos,
      },
    });
  }
  await recalcularScoreSeed(prisma, midia.id);
  return "criado";
}

async function main() {
  let criados = 0;
  let pulados = 0;

  for (const [slug, titulo, ano, rating] of LIVROS) {
    const r = await seedItem(slug, titulo, "LIVRO", ano, fontesLivro(rating));
    r === "criado" ? criados++ : pulados++;
  }
  for (const [slug, titulo, ano, rating] of HQS) {
    const r = await seedItem(slug, titulo, "COMIC", ano, fontesHq(rating));
    r === "criado" ? criados++ : pulados++;
  }
  for (const [slug, titulo, ano, rating] of MANGAS) {
    const r = await seedItem(slug, titulo, "MANGA", ano, fontesManga(rating));
    r === "criado" ? criados++ : pulados++;
  }

  console.log(`[fase-c] criados=${criados} pulados=${pulados}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
