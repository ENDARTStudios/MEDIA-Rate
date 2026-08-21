/**
 * seed-t383c.ts (D-353) — passada FINAL de dados:
 *  - LIVROS: sinopse+capa via Google Books, buscando pelo título EN
 *    (titulo_original quando já existe, senão mapa PT→EN commitado).
 *  - MANGÁS: retry AniList search para os restantes sem capa/sinopse.
 *
 * Idempotente (só campo vazio), best-effort. Sem segredo em log.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mapa PT→EN como auxílio de matching (D-351/D-353), nunca fonte de sinopse.
const PT_EN_LIVROS: Record<string, string> = {
  "O Senhor dos Anéis: A Sociedade do Anel": "The Lord of the Rings: The Fellowship of the Ring",
  "O Hobbit": "The Hobbit",
  "Harry Potter e a Pedra Filosofal": "Harry Potter and the Philosopher's Stone",
  "Cem Anos de Solidão": "One Hundred Years of Solitude",
  "O Grande Gatsby": "The Great Gatsby",
  "Orgulho e Preconceito": "Pride and Prejudice",
  "O Apanhador no Campo de Centeio": "The Catcher in the Rye",
  "A Revolução dos Bichos": "Animal Farm",
  "Fahrenheit 451": "Fahrenheit 451",
  "Admirável Mundo Novo": "Brave New World",
  "Neuromancer": "Neuromancer",
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
  "Lolita": "Lolita",
  "O Retrato de Dorian Gray": "The Picture of Dorian Gray",
  "Frankenstein": "Frankenstein",
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
  "Cosmos": "Cosmos",
  "O Poder do Hábito": "The Power of Habit",
  "Pai Rico, Pai Pobre": "Rich Dad Poor Dad",
  "A Sutil Arte de Ligar o F*da-se": "The Subtle Art of Not Giving a F*ck",
  "Como Fazer Amigos e Influenciar Pessoas": "How to Win Friends and Influence People",
  "O Monge e o Executivo": "The Servant",
  "A Coragem de Ser Imperfeito": "Daring Greatly",
  "Garota Exemplar": "Gone Girl",
};

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function googleBooksPorTitulo(en: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  try {
    const s = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(en)}&maxResults=1&key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!s.ok) return null;
    const sj = (await s.json()) as {
      items?: {
        id?: string;
        volumeInfo?: { imageLinks?: { thumbnail?: string }; description?: string };
      }[];
    };
    const item = sj.items?.[0];
    if (!item) return null;
    const vi = item.volumeInfo ?? {};
    let description = vi.description ?? null;
    if (!description && item.id) {
      await sleep(350);
      const d = await fetch(`https://www.googleapis.com/books/v1/volumes/${item.id}?key=${key}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (d.ok) {
        const dj = (await d.json()) as { volumeInfo?: { description?: string } };
        description = dj.volumeInfo?.description ?? null;
      }
    }
    return {
      capa: vi.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
      sinopse: description ? stripHtml(description) : null,
    };
  } catch {
    return null;
  }
}

async function anilistManga(titulo: string) {
  const query = `query ($q: String) { Media(search: $q, type: MANGA) { coverImage { extraLarge } description title { english romaji } } }`;
  try {
    const r = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { q: titulo } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: {
        Media?: {
          coverImage?: { extraLarge?: string };
          description?: string | null;
          title?: { english?: string | null; romaji?: string };
        };
      };
    };
    const m = j.data?.Media;
    if (!m) return null;
    return {
      capa: m.coverImage?.extraLarge ?? null,
      sinopse: m.description ? stripHtml(m.description) : null,
      tituloEn: m.title?.english ?? m.title?.romaji ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const alvos = await prisma.midia.findMany({
    where: { tipo: { in: ["LIVRO", "MANGA"] }, deleted_at: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      imagem_url: true,
      sinopse: true,
      titulo_original: true,
    },
  });

  let capaOk = 0;
  let sinopseOk = 0;
  let tituloOk = 0;

  for (const m of alvos) {
    if (m.imagem_url && m.sinopse) {
      continue;
    }
    let e: { capa: string | null; sinopse: string | null; tituloEn?: string | null } | null = null;
    if (m.tipo === "LIVRO") {
      const en = m.titulo_original ?? PT_EN_LIVROS[m.titulo];
      if (en) e = await googleBooksPorTitulo(en);
    } else {
      e = await anilistManga(m.titulo);
    }

    if (e) {
      const data: { imagem_url?: string; sinopse?: string; titulo_original?: string } = {};
      if (!m.imagem_url && e.capa) {
        data.imagem_url = e.capa;
        capaOk++;
      }
      if (!m.sinopse && e.sinopse) {
        data.sinopse = e.sinopse.slice(0, 2000);
        sinopseOk++;
      }
      if (!m.titulo_original && e.tituloEn && e.tituloEn !== m.titulo) {
        data.titulo_original = e.tituloEn;
        tituloOk++;
      }
      if (Object.keys(data).length > 0) {
        await prisma.midia.update({ where: { id: m.id }, data });
      }
    }
    await sleep(400);
  }

  console.log(
    `[t383c] total=${alvos.length} capa=${capaOk} sinopse=${sinopseOk} titulo_en=${tituloOk}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
