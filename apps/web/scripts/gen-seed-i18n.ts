/**
 * gen-seed-i18n.ts — Gerador idempotente de src/lib/seed-i18n.ts (D-183/D-185/D-186)
 * Lê SEED_MEDIA + MOCK_MEDIA, calcula titleLocalized{pt,en,es}+genreSlugs.
 * Asserts: 0 vazio, 0 órfão. Classifica: traduzido/idêntico/pendente (D-185).
 * Uso: npx tsx scripts/gen-seed-i18n.ts
 */
import { SEED_MEDIA } from "../src/lib/seed-data"; import { MOCK_MEDIA } from "../src/lib/api";
import * as fs from "fs"; import * as path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { genreSlug } from "../src/lib/i18n-content";
import ptBR from "../src/messages/pt-BR.json";

// Nomes próprios SEM forma localizada (D-185: en=es=pt justificado)
const TITLE_IDENTICAL_WHITELIST = new Set([
  "1917", "Dunkirk", "Matrix", "Elden Ring", "Minecraft", "Cyberpunk 2077",
  "Baldur's Gate 3", "Zelda: Tears", "Succession", "Breaking Bad",
  "Stranger Things", "The Last of Us", "Oppenheimer", "Dune: Parte 2",
  "Inception", "Avatar", "Cidade de Deus"
]);

// Traduções manuais (en = título original/internacional; es = oficial quando conhecido)
const T: Record<string,{en:string;es:string}> = {
  "O Poderoso Chefão":{en:"The Godfather",es:"El Padrino"},
  "O Senhor dos Anéis: A Sociedade do Anel":{en:"The Lord of the Rings: The Fellowship of the Ring",es:"El Señor de los Anillos: La Comunidad del Anillo"},
  "O Senhor dos Anéis: As Duas Torres":{en:"The Lord of the Rings: The Two Towers",es:"El Señor de los Anillos: Las Dos Torres"},
  "O Senhor dos Anéis: O Retorno do Rei":{en:"The Lord of the Rings: The Return of the King",es:"El Señor de los Anillos: El Retorno del Rey"},
  "Pulp Fiction: Tempo de Violência":{en:"Pulp Fiction",es:"Tiempos Violentos"},
  "O Resgate do Soldado Ryan":{en:"Saving Private Ryan",es:"Rescatando al Soldado Ryan"},
  "A Lista de Schindler":{en:"Schindler's List",es:"La Lista de Schindler"},
  "O Cavaleiro das Trevas":{en:"The Dark Knight",es:"El Caballero de la Noche"},
  "Interestelar":{en:"Interstellar",es:"Interestelar"},
  "A Origem":{en:"Inception",es:"El Origen"},
  "O Regresso":{en:"The Revenant",es:"El Renacido"},
  "Mad Max: Estrada da Fúria":{en:"Mad Max: Fury Road",es:"Mad Max: Furia en la Carretera"},
  "O Labirinto do Fauno":{en:"Pan's Labyrinth",es:"El Laberinto del Fauno"},
  "Bastardos Inglórios":{en:"Inglourious Basterds",es:"Bastardos sin Gloria"},
  "Forrest Gump: O Contador de Histórias":{en:"Forrest Gump",es:"Forrest Gump"},
  "O Grande Gatsby":{en:"The Great Gatsby",es:"El Gran Gatsby"},
  "O Lobo de Wall Street":{en:"The Wolf of Wall Street",es:"El Lobo de Wall Street"},
  "Clube da Luta":{en:"Fight Club",es:"El Club de la Lucha"},
  "O Iluminado":{en:"The Shining",es:"El Resplandor"},
  "O Exterminador do Futuro":{en:"The Terminator",es:"El Exterminador"},
  "De Volta para o Futuro":{en:"Back to the Future",es:"Volver al Futuro"},
  "Jurassic Park: O Parque dos Dinossauros":{en:"Jurassic Park",es:"Parque Jurásico"},
  "Os Bons Companheiros":{en:"Goodfellas",es:"Buenos Muchachos"},
  "O Sexto Sentido":{en:"The Sixth Sense",es:"El Sexto Sentido"},
  "O Silêncio dos Inocentes":{en:"The Silence of the Lambs",es:"El Silencio de los Corderos"},
  "Um Sonho de Liberdade":{en:"The Shawshank Redemption",es:"Cadena Perpetua"},
  "Seven: Os Sete Crimes Capitais":{en:"Se7en",es:"Seven"},
  "Gladiador":{en:"Gladiator",es:"Gladiador"},
  "O Rei Leão":{en:"The Lion King",es:"El Rey León"},
  "Toy Story":{en:"Toy Story",es:"Toy Story"},
  "Procurando Nemo":{en:"Finding Nemo",es:"Buscando a Nemo"},
  "Wall-E":{en:"WALL-E",es:"WALL-E"},
  "Up: Altas Aventuras":{en:"Up",es:"Up"},
  "Divertida Mente":{en:"Inside Out",es:"Intensa-Mente"},
  "Ratatouille":{en:"Ratatouille",es:"Ratatouille"},
  "Os Incríveis":{en:"The Incredibles",es:"Los Increíbles"},
  "Vingadores: Ultimato":{en:"Avengers: Endgame",es:"Vengadores: Endgame"},
  "Vingadores: Guerra Infinita":{en:"Avengers: Infinity War",es:"Vengadores: Infinity War"},
  "Pantera Negra":{en:"Black Panther",es:"Pantera Negra"},
  "Homem de Ferro":{en:"Iron Man",es:"Iron Man"},
  "Capitão América: O Soldado Invernal":{en:"Captain America: The Winter Soldier",es:"Capitán América: El Soldado de Invierno"},
  "Capitão América: Guerra Civil":{en:"Captain America: Civil War",es:"Capitán América: Civil War"},
  "Guardiões da Galáxia":{en:"Guardians of the Galaxy",es:"Guardianes de la Galaxia"},
  "Doutor Estranho":{en:"Doctor Strange",es:"Doctor Strange"},
  "Homem-Aranha: Sem Volta para Casa":{en:"Spider-Man: No Way Home",es:"Spider-Man: No Way Home"},
  "Homem-Aranha no Aranhaverso":{en:"Spider-Man: Into the Spider-Verse",es:"Spider-Man: Un Nuevo Universo"},
  "Star Wars: Episódio IV - Uma Nova Esperança":{en:"Star Wars: Episode IV - A New Hope",es:"Star Wars: Episodio IV - Una Nueva Esperanza"},
  "Star Wars: Episódio V - O Império Contra-Ataca":{en:"Star Wars: Episode V - The Empire Strikes Back",es:"Star Wars: Episodio V - El Imperio Contraataca"},
  "Star Wars: Episódio VI - O Retorno de Jedi":{en:"Star Wars: Episode VI - Return of the Jedi",es:"Star Wars: Episodio VI - El Retorno del Jedi"},
  "Frieren e a Jornada para o Além":{en:"Frieren: Beyond Journey's End",es:"Frieren: Más Allá del Final"},
  "A Viagem de Chihiro":{en:"Spirited Away",es:"El Viaje de Chihiro"},
  "Meu Amigo Totoro":{en:"My Neighbor Totoro",es:"Mi Vecino Totoro"},
  "Princesa Mononoke":{en:"Princess Mononoke",es:"La Princesa Mononoke"},
  "O Castelo Animado":{en:"Howl's Moving Castle",es:"El Castillo Ambulante"},
  "Your Name":{en:"Your Name",es:"Your Name"},
  "One Piece":{en:"One Piece",es:"One Piece"},
  "Naruto":{en:"Naruto",es:"Naruto"},
  "Attack on Titan":{en:"Attack on Titan",es:"Attack on Titan"},
  "Demon Slayer":{en:"Demon Slayer",es:"Demon Slayer"},
};

function main() {
  const outPath = path.resolve(__dirname,"..","src","lib","seed-i18n.ts");
  const gMap = (ptBR as any).genres as Record<string,string>;
  const all = [...(SEED_MEDIA as any[]),...(MOCK_MEDIA as any[])];

  let total=0, w=0, empty=0, orphan=0, translated=0, identical=0, pending=0;
  const pendingIds: string[] = [];
  const result: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[]}> = {};

  for (const e of all) {
    const id = (e.id??e.slug) as string;
    if (!id) continue; total++;
    const ptTitle = (e.title as string)||"";
    const tr = T[ptTitle];
    const enTitle = tr?.en || (TITLE_IDENTICAL_WHITELIST.has(ptTitle) ? ptTitle : ptTitle);
    const esTitle = tr?.es || (TITLE_IDENTICAL_WHITELIST.has(ptTitle) ? ptTitle : (tr?.en || ptTitle));
    if (!ptTitle||!enTitle||!esTitle) { empty++; continue; }

    // Classify (D-185)
    if (TITLE_IDENTICAL_WHITELIST.has(ptTitle) || (tr && enTitle === esTitle && enTitle === ptTitle)) {
      identical++;
    } else if (enTitle !== ptTitle || esTitle !== ptTitle) {
      translated++;
    } else {
      pending++; pendingIds.push(id);
    }

    const slugs: string[] = [];
    for (const g of (e.genres||[])) { const s = genreSlug(g as string); slugs.push(s); if (!gMap[s]) { console.error("ORPHAN: "+s+" from "+g+" in "+id); orphan++; } }
    result[id] = { titleLocalized:{pt:ptTitle,en:enTitle,es:esTitle}, genreSlugs:slugs };
    w++;
  }

  console.log("Universe(SEED+MOCK): "+all.length+" | Written: "+w+" | Total w/ id: "+total);
  console.log("Empty: "+empty+" | Orphan: "+orphan);
  console.log("Title translated: "+translated+" | identical-whitelist: "+identical+" | PENDING: "+pending);
  if (pendingIds.length) console.log("PENDING ids: "+pendingIds.join(","));
  if (empty||orphan) { console.error("FAIL: asserts failed"); process.exit(1); }

  fs.writeFileSync(outPath, "export const SEED_I18N: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[]}> = "+JSON.stringify(result,null,2)+";\n");
  console.log("Written: "+outPath+" ("+w+" entries)");
  if (pending>0) { console.log("PASS (with "+pending+" pending — translation in progress)"); } else { console.log("PASS (0 pending)"); }
}
main();
