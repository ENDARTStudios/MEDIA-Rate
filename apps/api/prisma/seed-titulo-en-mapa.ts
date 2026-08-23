/** seed-titulo-en-mapa.ts (T393 + T411) — corrige titulo_en E titulo_original
 *  de livros usando o mapa PT→EN (D-351/D-369).
 *
 *  T411 (D-387): o seed-localizacao.ts (Google Books) deixou titulo_en LIXO
 *  (ex.: "Pai Rico, Pai Pobre - Edição de 20 anos...", "Sumário de Sapiens...",
 *  "Garota exemplar" minúsculo). Como a cadeia D-369 prioriza titulo_en sobre
 *  titulo_original, o EN ficava errado. Agora SOBRESCREVE ambos com o valor
 *  curado do mapa (idempotente: re-rodar não altera). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAPA: Record<string, string> = {
  "O Senhor dos Anéis: A Sociedade do Anel": "The Lord of the Rings: The Fellowship of the Ring",
  "O Hobbit": "The Hobbit",
  "Harry Potter e a Pedra Filosofal": "Harry Potter and the Philosopher's Stone",
  "Cem Anos de Solidão": "One Hundred Years of Solitude",
  "O Grande Gatsby": "The Great Gatsby",
  "Orgulho e Preconceito": "Pride and Prejudice",
  "O Apanhador no Campo de Centeio": "The Catcher in the Rye",
  "A Revolução dos Bichos": "Animal Farm",
  "Admirável Mundo Novo": "Brave New World",
  "Fundação": "Foundation",
  "Eu, Robô": "I, Robot",
  "O Nome do Vento": "The Name of the Wind",
  "O Código Da Vinci": "The Da Vinci Code",
  "Jogos Vorazes": "The Hunger Games",
  "O Sol é Para Todos": "To Kill a Mockingbird",
  "Crime e Castigo": "Crime and Punishment",
  "Dom Quixote": "Don Quixote",
  "Guerra e Paz": "War and Peace",
  "Os Miseráveis": "Les Misérables",
  "Moby Dick": "Moby-Dick",
  "A Metamorfose": "The Metamorphosis",
  "O Processo": "The Trial",
  "O Retrato de Dorian Gray": "The Picture of Dorian Gray",
  "Drácula": "Dracula",
  "O Médico e o Monstro": "The Strange Case of Dr Jekyll and Mr Hyde",
  "As Crônicas de Nárnia: O Leão, a Feiticeira e o Guarda-Roupa":
    "The Lion, the Witch and the Wardrobe",
  "O Alquimista": "The Alchemist",
  "A Menina que Roubava Livros": "The Book Thief",
  "A Culpa é das Estrelas": "The Fault in Our Stars",
  "Extraordinário": "Wonder",
  "O Pequeno Príncipe": "The Little Prince",
  "A Arte da Guerra": "The Art of War",
  "O Príncipe": "The Prince",
  "A República": "The Republic",
  "A Origem das Espécies": "On the Origin of Species",
  "Sapiens: Uma Breve História da Humanidade": "Sapiens: A Brief History of Humankind",
  "Breves Respostas para Grandes Questões": "Brief Answers to the Big Questions",
  "Uma Breve História do Tempo": "A Brief History of Time",
  "O Poder do Hábito": "The Power of Habit",
  "Pai Rico, Pai Pobre": "Rich Dad Poor Dad",
  "A Sutil Arte de Ligar o F*da-se": "The Subtle Art of Not Giving a F*ck",
  "Como Fazer Amigos e Influenciar Pessoas": "How to Win Friends and Influence People",
  "O Monge e o Executivo": "The Servant",
  "A Coragem de Ser Imperfeito": "Daring Greatly",
  "Garota Exemplar": "Gone Girl",
};

async function main() {
  const livros = await prisma.midia.findMany({
    where: { tipo: "LIVRO", deleted_at: null },
    select: { id: true, titulo: true, titulo_en: true, titulo_original: true },
  });

  let corrigidosEn = 0;
  let corrigidosOriginal = 0;
  let jaCorretos = 0;
  for (const l of livros) {
    const en = MAPA[l.titulo];
    if (!en) continue;
    const data: { titulo_en?: string; titulo_original?: string } = {};
    if (l.titulo_en !== en) {
      data.titulo_en = en;
      corrigidosEn++;
    }
    if (l.titulo_original !== en) {
      data.titulo_original = en;
      corrigidosOriginal++;
    }
    if (Object.keys(data).length === 0) {
      jaCorretos++;
      continue;
    }
    await prisma.midia.update({ where: { id: l.id }, data });
  }

  const semMapa = livros.filter((l) => !MAPA[l.titulo]).map((l) => l.titulo);
  console.log(
    `[titulo-en-mapa] total=${livros.length} corrigidosEn=${corrigidosEn} corrigidosOriginal=${corrigidosOriginal} jaCorretos=${jaCorretos} semMapa=${semMapa.length}`,
  );
  if (semMapa.length) console.log(`  sem mapa: ${semMapa.join(" | ")}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
