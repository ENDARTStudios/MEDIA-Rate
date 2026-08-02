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
  const SYNOPSIS_BY_ID: Record<string,{en:string;es:string}> = {
  "obsess-o":{en:"A gripping psychological thriller about a man whose infatuation spirals into a dangerous obsession, blurring the line between love and control.",es:"Un thriller psicológico sobre un hombre cuya fascinación se convierte en una peligrosa obsesión, difuminando la línea entre el amor y el control."},
  "supergirl":{en:"Kara Zor-El, Superman's cousin, balances her life as a young professional with her destiny as Earth's protector, facing threats from across the galaxy.",es:"Kara Zor-El, la prima de Superman, equilibra su vida como joven profesional con su destino como protectora de la Tierra, enfrentando amenazas de toda la galaxia."},
  "mestres-do-universo":{en:"On the planet Eternia, He-Man and his allies battle the evil Skeletor for control of Castle Grayskull and the fate of the universe.",es:"En el planeta Eternia, He-Man y sus aliados luchan contra el malvado Skeletor por el control del Castillo Grayskull y el destino del universo."},
  "desejo":{en:"A provocative exploration of human longing, where characters confront their deepest desires and the consequences of pursuing them to the extreme.",es:"Una exploración provocativa del anhelo humano, donde los personajes confrontan sus deseos más profundos y las consecuencias de perseguirlos al extremo."},
  "devoradores-de-estrelas":{en:"A cosmic horror saga where ancient entities feed on dying stars, and a ragtag crew of explorers must prevent the next extinction-level event.",es:"Una saga de horror cósmico donde entidades ancestrales se alimentan de estrellas moribundas, y una tripulación improvisada de exploradores debe prevenir el próximo evento de extinción."},
  "minions-monstros":{en:"The mischievous Minions accidentally unleash ancient monsters from a cursed artifact, turning a routine vacation into a globe-trotting monster-hunting adventure.",es:"Los traviesos Minions liberan accidentalmente monstruos ancestrales de un artefacto maldito, convirtiendo unas vacaciones rutinarias en una aventura global de caza de monstruos."},
  "borderline":{en:"A tense drama exploring the fragile boundaries of the human psyche, where a therapist and patient both confront their own psychological limits.",es:"Un drama tenso que explora los frágiles límites de la psique humana, donde un terapeuta y su paciente confrontan sus propios límites psicológicos."},
  "todo-mundo-em-p-nico":{en:"A chaotic comedy where an entire city descends into panic over a misunderstood rumor, following multiple interconnected stories of people losing their minds.",es:"Una comedia caótica donde una ciudad entera entra en pánico por un rumor malinterpretado, siguiendo múltiples historias interconectadas de personas perdiendo la cabeza."},
  "mortal-kombat-2":{en:"The iconic fighting tournament returns with new champions from Earthrealm and Outworld clashing in Mortal Kombat, where the fate of realms hangs in the balance.",es:"El icónico torneo de lucha regresa con nuevos campeones de la Tierra y el Mundo Exterior enfrentándose en Mortal Kombat, donde el destino de los reinos pende de un hilo."},

  "a-odisseia":{en:"Follow the saga of Odysseus, the legendary king of Ithaca, on his long and perilous journey home after the Trojan War, facing mythical creatures and divine challenges.",es:"Acompaña la saga de Odiseo, el legendario rey de Ítaca, en su largo y peligroso viaje de regreso tras la Guerra de Troya, enfrentando criaturas míticas y desafíos divinos."},
  "dia-d":{en:"The epic retelling of the Allied invasion of Normandy on June 6, 1944 — D-Day — the largest amphibious military operation in history that turned the tide of World War II.",es:"La épica recreación de la invasión aliada de Normandía el 6 de junio de 1944 — el Día D — la mayor operación militar anfibia de la historia que cambió el rumbo de la Segunda Guerra Mundial."},
  "interestelar":{en:"In a near future where Earth is becoming uninhabitable, a former NASA pilot travels through a wormhole near Saturn in search of a new home for humanity.",es:"En un futuro cercano donde la Tierra se vuelve inhabitable, un ex piloto de la NASA viaja a través de un agujero de gusano cerca de Saturno en busca de un nuevo hogar para la humanidad."},
  "um-sonho-de-liberdade":{en:"A banker wrongly convicted of murder forms an unlikely friendship with a fellow inmate and finds a way to survive — and hope — inside Shawshank prison over the course of two decades.",es:"Un banquero injustamente condenado por asesinato forma una amistad improbable con otro recluso y encuentra la manera de sobrevivir — y tener esperanza — dentro de la prisión de Shawshank a lo largo de dos décadas."},
  "frieren":{en:"Elf mage Frieren continues her journey to understand humanity decades after her adventuring party defeated the Demon King, accompanied by her late comrades' apprentice.",es:"La maga elfa Frieren continúa su viaje para comprender a la humanidad décadas después de que su grupo de aventureros derrotara al Rey Demonio, acompañada por la aprendiz de sus difuntos camaradas."},
  "rick-e-morty":{en:"A sociopathic genius scientist drags his inherently timid grandson on insanely dangerous adventures across the multiverse, dealing with family chaos and cosmic horrors.",es:"Un científico genio sociópata arrastra a su nieto inherentemente tímido a aventuras increíblemente peligrosas a través del multiverso, lidiando con el caos familiar y horrores cósmicos."},
  "supernatural":{en:"Two brothers follow their father's footsteps as hunters, fighting evil supernatural beings of many kinds — including monsters, demons, and gods — that roam the earth.",es:"Dos hermanos siguen los pasos de su padre como cazadores, luchando contra seres sobrenaturales malignos de muchos tipos — incluyendo monstruos, demonios y dioses — que vagan por la tierra."},
  "grey-s-anatomy":{en:"A drama centered on the personal and professional lives of surgical interns and their supervisors at a Seattle hospital, navigating medicine, relationships, and ambition.",es:"Un drama centrado en las vidas personales y profesionales de los internos quirúrgicos y sus supervisores en un hospital de Seattle, navegando la medicina, las relaciones y la ambición."},
  "a-casa-do-drag-o":{en:"Set 200 years before the events of Game of Thrones, this series tells the story of House Targaryen and the civil war — known as the Dance of the Dragons — that tore the dynasty apart.",es:"Ambientada 200 años antes de los eventos de Game of Thrones, esta serie cuenta la historia de la Casa Targaryen y la guerra civil — conocida como la Danza de los Dragones — que desgarró la dinastía."},
  "vingadores-doutor-destino":{en:"The Avengers face their greatest challenge yet as Doctor Doom emerges as a multiversal threat, forcing Earth's mightiest heroes to unite like never before.",es:"Los Vengadores enfrentan su mayor desafío cuando el Doctor Doom emerge como una amenaza multiversal, obligando a los héroes más poderosos de la Tierra a unirse como nunca antes."},
  "avatar-fogo-e-cinzas":{en:"The next chapter in the Avatar saga takes Jake Sully and Neytiri to a volcanic region of Pandora, where they encounter a new clan and face an unprecedented natural threat.",es:"El siguiente capítulo de la saga Avatar lleva a Jake Sully y Neytiri a una región volcánica de Pandora, donde encuentran un nuevo clan y enfrentan una amenaza natural sin precedentes."},
  "homem-aranha-sem-volta-para-casa":{en:"Peter Parker's identity as Spider-Man is exposed, forcing him to seek help from Doctor Strange — but a spell gone wrong pulls villains from across the multiverse into his world.",es:"La identidad de Peter Parker como Spider-Man queda expuesta, obligándolo a buscar ayuda del Doctor Strange — pero un hechizo fallido atrae villanos de todo el multiverso a su mundo."},
  "homem-aranha-um-novo-dia":{en:"A new chapter for Spider-Man begins as Peter Parker navigates life after the multiversal chaos, facing fresh threats and rediscovering what it truly means to be a hero.",es:"Un nuevo capítulo para Spider-Man comienza mientras Peter Parker navega la vida tras el caos multiversal, enfrentando nuevas amenazas y redescubriendo lo que realmente significa ser un héroe."},
  "demon-slayer-kimetsu-no-yaiba-castelo-infinito":{en:"Tanjiro and the Demon Slayer Corps enter the Infinite Castle for their final battle against Muzan Kibutsuji, the progenitor of all demons.",es:"Tanjiro y el Cuerpo de Cazadores de Demonios entran al Castillo Infinito para su batalla final contra Muzan Kibutsuji, el progenitor de todos los demonios."},
  "super-mario-galaxy-o-filme":{en:"Mario blasts off into space to rescue Princess Peach from Bowser's cosmic clutches, journeying across fantastical galaxies in his biggest adventure yet.",es:"Mario despega al espacio para rescatar a la Princesa Peach de las garras cósmicas de Bowser, viajando a través de galaxias fantásticas en su mayor aventura hasta ahora."},
  "star-wars-o-mandaloriano-e-grogu":{en:"The Mandalorian and Grogu embark on a new adventure across the galaxy, facing Imperial remnants, bounty hunters, and the deepening bond between warrior and foundling.",es:"El Mandaloriano y Grogu emprenden una nueva aventura a través de la galaxia, enfrentando remanentes imperiales, cazarrecompensas y el vínculo cada vez más profundo entre guerrero y expósito."}
};

const TRANSLATIONS_BY_ID: Record<string,{en:string;es:string}> = {
  "549":{en:"The Matrix",es:"Matrix"},
  "5920":{en:"Gladiator",es:"Gladiador"},
  "27181":{en:"Contact",es:"Contacto"},
  "79744":{en:"Blade Runner",es:"Blade Runner"},
  "454639":{en:"Fight Club",es:"El Club de la Lucha"},
  "1081003":{en:"Titanic",es:"Titanic"},
  "1084244":{en:"The Sixth Sense",es:"El Sexto Sentido"},
  "1108427":{en:"The Odyssey",es:"La Odisea"},
  "1275779":{en:"D-Day",es:"D-Day"},
  "1339713":{en:"The Silence of the Lambs",es:"El Silencio de los Corderos"},
  "minions-monstros":{en:"Minions Monsters",es:"Minions Monstruos"},
  "borderline":{en:"Borderline",es:"Borderline"},
  "obsess-o":{en:"Obsession",es:"Obsesion"},
  "supergirl":{en:"Supergirl",es:"Supergirl"},
  "mestres-do-universo":{en:"Masters of the Universe",es:"Amos del Universo"},
  "desejo":{en:"Desire",es:"Deseo"},
  "devoradores-de-estrelas":{en:"Star Devourers",es:"Devoradores de Estrellas"},
  "mortal-kombat-2":{en:"Mortal Kombat 2",es:"Mortal Kombat 2"},
  "homem-aranha-um-novo-dia":{en:"Spider-Man: Brand New Day",es:"Spider-Man: Un Nuevo Dia"},
  "homem-aranha-sem-volta-para-casa":{en:"Spider-Man: No Way Home",es:"Spider-Man: No Way Home"},
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
  "todo-mundo-em-p-nico":{en:"Everybody in Panic",es:"Todos en Panico"}
};
  const outPath = path.resolve(__dirname,"..","src","lib","seed-i18n.ts");
  const gMap = (ptBR as any).genres as Record<string,string>;
  const all = [...(SEED_MEDIA as any[]),...(MOCK_MEDIA as any[])];

  let total=0, w=0, empty=0, orphan=0, translated=0, identical=0, pending=0, pendingNoTranslation=0, pendingKeyMismatch=0;
  const pendingIds: string[] = [];
  const result: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[]; synopsis:{pt:string;en:string;es:string}}> = {};

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
    result[id] = { titleLocalized:{pt:ptTitle,en:enTitle,es:esTitle}, genreSlugs:slugs, synopsis:{pt:(e.synopsis||"") as string, en:SYNOPSIS_BY_ID[id]?.en||(e.synopsis||"") as string, es:SYNOPSIS_BY_ID[id]?.es||(e.synopsis||"") as string} };
    w++;
  }

  console.log("Universe(SEED+MOCK): "+all.length+" | Written: "+w+" | Total w/ id: "+total);
  console.log("Empty: "+empty+" | Orphan: "+orphan);
  let dedupTranslated = Object.keys(result).filter(function(k){var e=result[k];return e.titleLocalized.en!==e.titleLocalized.pt||e.titleLocalized.es!==e.titleLocalized.pt;}).length; console.log("Title translated (dedup): "+dedupTranslated+" | identical-whitelist: "+TITLE_IDENTICAL_WHITELIST.size+" | NOTRANSLATION: "+pendingNoTranslation+" | KEYMISMATCH: "+pendingKeyMismatch+" | PENDING: "+pending);
  if (pendingIds.length) console.log("PENDING ids: "+pendingIds.join(","));
  if (empty||orphan) { console.error("FAIL: asserts failed"); process.exit(1); }

  fs.writeFileSync(outPath, "export const SEED_I18N: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[];synopsis:{pt:string;en:string;es:string}}> = "+JSON.stringify(result,null,2)+";\n");
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
