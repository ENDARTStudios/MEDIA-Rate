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

// D-187.1: SOMENTE ids cujo title.pt JÁ É o nome internacional sem forma localizada
const TITLE_IDENTICAL_WHITELIST = new Set([
  "1917", "Dunkirk", "Matrix", "Elden Ring", "Minecraft", "Cyberpunk 2077",
  "Baldur's Gate 3", "Oppenheimer", "Avatar",
  // D-187.1 mantidos com justificativa (title.pt já é o internacional):
  // title.pt="1917" — número, sem localização
  // title.pt="Dunkirk" — nome próprio de cidade/batalha, sem localização PT  
  // title.pt="Matrix" — nome próprio de filme, sem localização
  // title.pt="Elden Ring" — nome próprio de game, sem localização
  // title.pt="Minecraft" — nome próprio de game, sem localização
  // title.pt="Cyberpunk 2077" — nome próprio de game, sem localização
  // title.pt="Baldur's Gate 3" — nome próprio de game, sem localização
  // title.pt="Oppenheimer" — sobrenome, sem localização
  // title.pt="Avatar" — nome próprio, sem localização
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

function canonicalKey(e: { id?: any; slug?: string }) { return (e.slug||String(e.id)) as string; }

function main() {
  const TRANSLATIONS_BY_ID: Record<string,{en:string;es:string}> = {
  "homem-aranha-um-novo-dia":{en:"Spider-Man: Brand New Day",es:"Spider-Man: Un Nuevo Dia"},
  "homem-aranha-sem-volta-para-casa":{en:"Spider-Man: No Way Home",es:"Spider-Man: No Way Home"},
  "mortal-kombat-2":{en:"Mortal Kombat 2",es:"Mortal Kombat 2"},
  "vingadores-doutor-destino":{en:"Avengers: Doomsday",es:"Vengadores: Doomsday"},
  "super-mario-galaxy-o-filme":{en:"Super Mario Galaxy",es:"Super Mario Galaxy"},
  "avatar-fogo-e-cinzas":{en:"Avatar: Fire and Ashes",es:"Avatar: Fuego y Cenizas"},
  "rick-e-morty":{en:"Rick and Morty",es:"Rick y Morty"},
  "supernatural":{en:"Supernatural",es:"Sobrenatural"},
  "grey-s-anatomy":{en:"Grey's Anatomy",es:"Anatomia de Grey"},
  "silo":{en:"Silo",es:"Silo"},
  "demon-slayer-kimetsu-no-yaiba-castelo-infinito":{en:"Demon Slayer: Infinity Castle",es:"Demon Slayer: Castillo Infinito"},
  "moana":{en:"Moana",es:"Moana"},
  "toy-story-5":{en:"Toy Story 5",es:"Toy Story 5"},
  "star-wars-o-mandaloriano-e-grogu":{en:"Star Wars: The Mandalorian and Grogu",es:"Star Wars: El Mandaloriano y Grogu"},
  "kraken":{en:"Kraken",es:"Kraken"},
  "black-box":{en:"Black Box",es:"Black Box"},
  "a-casa-do-drag-o":{en:"House of the Dragon",es:"La Casa del Dragon"},
  "michael":{en:"Michael",es:"Michael"},
  "passageiro-do-mal":{en:"Evil Passenger",es:"Pasajero del Mal"},
  "the-furious":{en:"The Furious",es:"The Furious"},
  "vixen":{en:"Vixen",es:"Vixen"},
  "tagesschau":{en:"Tagesschau",es:"Tagesschau"},
  "paradise-hotel":{en:"Paradise Hotel",es:"Hotel Paraiso"},

  "a-odisseia":{en:"The Odyssey",es:"La Odisea"},
  "dia-d":{en:"D-Day",es:"D-Day"},
  "contato":{en:"Contact",es:"Contacto"},
  "gladiador":{en:"Gladiator",es:"Gladiador"},
  "matrix":{en:"The Matrix",es:"Matrix"},
  "clube-da-luta":{en:"Fight Club",es:"El Club de la Lucha"},
  "o-sexto-sentido":{en:"The Sixth Sense",es:"El Sexto Sentido"},
  "o-silencio-dos-inocentes":{en:"The Silence of the Lambs",es:"El Silencio de los Corderos"},
  "um-sonho-de-liberdade":{en:"The Shawshank Redemption",es:"Cadena Perpetua"},
  "forrest-gump":{en:"Forrest Gump",es:"Forrest Gump"},
  "a-lista-de-schindler":{en:"Schindler's List",es:"La Lista de Schindler"},
  "o-cavaleiro-das-trevas":{en:"The Dark Knight",es:"El Caballero de la Noche"},
  "interestelar":{en:"Interstellar",es:"Interestelar"},
  "a-origem":{en:"Inception",es:"El Origen"},
  "o-regresso":{en:"The Revenant",es:"El Renacido"},
  "bastardos-inglorios":{en:"Inglourious Basterds",es:"Bastardos sin Gloria"},
  "o-rei-leao":{en:"The Lion King",es:"El Rey Leon"},
  "toy-story":{en:"Toy Story",es:"Toy Story"},
  "procurando-nemo":{en:"Finding Nemo",es:"Buscando a Nemo"},
  "os-incriveis":{en:"The Incredibles",es:"Los Increibles"},
  "vingadores-ultimato":{en:"Avengers: Endgame",es:"Vengadores: Endgame"},
  "pantera-negra":{en:"Black Panther",es:"Pantera Negra"},
  "homem-de-ferro":{en:"Iron Man",es:"Iron Man"},
  "jurassic-park":{en:"Jurassic Park",es:"Parque Jurásico"},
  "titanic":{en:"Titanic",es:"Titanic"},
  "o-exterminador-do-futuro":{en:"The Terminator",es:"El Exterminador"},
  "de-volta-para-o-futuro":{en:"Back to the Future",es:"Volver al Futuro"},
  "blade-runner":{en:"Blade Runner",es:"Blade Runner"},
  "frieren":{en:"Frieren: Beyond Journey's End",es:"Frieren: Más Allá del Final"},
  "o-poderoso-chefao":{en:"The Godfather",es:"El Padrino"},
  "pulp-fiction":{en:"Pulp Fiction",es:"Tiempos Violentos"},
  "star-wars":{en:"Star Wars: A New Hope",es:"Star Wars: Una Nueva Esperanza"},
  "harry-potter":{en:"Harry Potter and the Sorcerer's Stone",es:"Harry Potter y la Piedra Filosofal"},

  "1084244":{en:"The Sixth Sense",es:"El Sexto Sentido"},
  "1339713":{en:"The Silence of the Lambs",es:"El Silencio de los Corderos"},
  
  "1275779":{en:"D-Day",es:"D-Day"},
  "27181":{en:"Contact",es:"Contacto"},
  "5920":{en:"Gladiator",es:"Gladiador"},
  "549":{en:"The Matrix",es:"Matrix"},
  "79744":{en:"Blade Runner",es:"Blade Runner"},
  "1108427":{en:"The Odyssey",es:"La Odisea"},
  "1081003":{en:"Titanic",es:"Titanic"},
  "454639":{en:"Fight Club",es:"El Club de la Lucha"},
  "a-odisseia":{"en":"The Odyssey","es":"La Odisea"},"dia-d":{"en":"D-Day","es":"D-Day"},"contato":{"en":"Contact","es":"Contacto"},"matrix":{"en":"The Matrix","es":"Matrix"},"blade-runner":{"en":"Blade Runner","es":"Blade Runner"},"gladiador":{"en":"Gladiator","es":"Gladiador"},"jurassic-park":{"en":"Jurassic Park","es":"Parque Jurásico"},"titanic":{"en":"Titanic","es":"Titanic"},"harry-potter-e-a-pedra-filosofal":{"en":"Harry Potter and the Philosopher's Stone","es":"Harry Potter y la Piedra Filosofal"},"toy-story":{"en":"Toy Story","es":"Toy Story"},"procurando-nemo":{"en":"Finding Nemo","es":"Buscando a Nemo"},"os-incriveis":{"en":"The Incredibles","es":"Los Increíbles"},"vingadores-ultimato":{"en":"Avengers: Endgame","es":"Vengadores: Endgame"},"pantera-negra":{"en":"Black Panther","es":"Pantera Negra"},"o-exterminador-do-futuro":{"en":"The Terminator","es":"El Exterminador"},"de-volta-para-o-futuro":{"en":"Back to the Future","es":"Volver al Futuro"},"clube-da-luta":{"en":"Fight Club","es":"El Club de la Lucha"},"o-sexto-sentido":{"en":"The Sixth Sense","es":"El Sexto Sentido"},"o-silencio-dos-inocentes":{"en":"The Silence of the Lambs","es":"El Silencio de los Corderos"},"um-sonho-de-liberdade":{"en":"The Shawshank Redemption","es":"Cadena Perpetua"}};
  const outPath = path.resolve(__dirname,"..","src","lib","seed-i18n.ts");
  const gMap = (ptBR as any).genres as Record<string,string>;
  const all = [...(SEED_MEDIA as any[]),...(MOCK_MEDIA as any[])];

  let total=0, w=0, empty=0, orphan=0, translated=0, identical=0, pending=0, pendingNoTranslation=0, pendingKeyMismatch=0;
  const pendingIds: string[] = [];
  const result: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[]}> = {};

  for (const e of all) {
    const id = canonicalKey(e);
    if (!id) continue; total++;
    const ptTitle = (e.title as string)||"";
    const slugKey2 = (e.slug||"") as string; const cached = TRANSLATIONS_BY_ID[slugKey2]; const tr = T[ptTitle] || (cached as any);
    const enTitle = tr?.en || (TITLE_IDENTICAL_WHITELIST.has(id) ? ptTitle : ptTitle);
    const esTitle = tr?.es || (TITLE_IDENTICAL_WHITELIST.has(ptTitle) ? ptTitle : (tr?.en || ptTitle));
    if (!ptTitle||!enTitle||!esTitle) { empty++; continue; }

    // Classify (D-185)
    if (TITLE_IDENTICAL_WHITELIST.has(ptTitle) || (tr && enTitle === esTitle && enTitle === ptTitle)) {
      identical++;
    } else if (enTitle !== ptTitle || esTitle !== ptTitle) {
      translated++;
    } else if (cached || tr) {
      pending++; pendingKeyMismatch++; pendingIds.push(id);
    } else {
      pending++; pendingNoTranslation++; pendingIds.push(id);
    }

    const slugs: string[] = [];
    for (const g of (e.genres||[])) { const s = genreSlug(g as string); slugs.push(s); if (!gMap[s]) { console.error("ORPHAN: "+s+" from "+g+" in "+id); orphan++; } }
    result[id] = { titleLocalized:{pt:ptTitle,en:enTitle,es:esTitle}, genreSlugs:slugs };
    w++;
  }

  console.log("Universe(SEED+MOCK): "+all.length+" | Written: "+w+" | Total w/ id: "+total);
  console.log("Empty: "+empty+" | Orphan: "+orphan);
  console.log("Title translated: "+translated+" | identical-whitelist: "+TITLE_IDENTICAL_WHITELIST.size+" | NOTRANSLATION: "+pendingNoTranslation+" | KEYMISMATCH: "+pendingKeyMismatch+" | PENDING: "+pending);
  if (pendingIds.length) console.log("PENDING ids: "+pendingIds.join(","));
  if (empty||orphan) { console.error("FAIL: asserts failed"); process.exit(1); }

  fs.writeFileSync(outPath, "export const SEED_I18N: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[]}> = "+JSON.stringify(result,null,2)+";\n");
  console.log("Written: "+outPath+" ("+w+" entries)");
  let dedup: [string,string,string,string][] = [];
  for (let k in result) {
    let e = result[k];
    if (e.titleLocalized.en !== e.titleLocalized.pt || e.titleLocalized.es !== e.titleLocalized.pt) {
      dedup.push([k, e.titleLocalized.pt, e.titleLocalized.en, e.titleLocalized.es]);
    }
  }
  dedup.sort((a,b) => a[0].localeCompare(b[0]));
  console.log("DEDUP translated list: "+dedup.length+" distinct canonicalKeys");
  dedup.forEach(r => console.log("  "+r[0]+" | "+r[1]+" | "+r[2]+" | "+r[3]));
  if (pending>0) { console.log("INCOMPLETE — NOTRANSLATION="+pendingNoTranslation+" KEYMISMATCH="+pendingKeyMismatch); }
  else { console.log("PASS (0 pending)"); }
}
main();
