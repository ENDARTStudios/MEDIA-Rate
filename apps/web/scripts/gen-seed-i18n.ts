/**
 * gen-seed-i18n.ts — Gerador idempotente de src/lib/seed-i18n.ts (D-183/D-185/D-186)
 * Lê SEED_MEDIA + MOCK_MEDIA, calcula titleLocalized{pt,en,es}+genreSlugs.
 * Asserts: 0 vazio, 0 órfão. Classifica: traduzido/idêntico/pendente (D-185).
 * Uso: npx tsx scripts/gen-seed-i18n.ts
 */
import { SEED_MEDIA } from "../src/lib/seed-data";
import { MOCK_MEDIA } from "../src/lib/api";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { genreSlug } from "../src/lib/i18n-content";
import ptBR from "../src/messages/pt-BR.json";

// D-187.1: SOMENTE ids cujo title.pt JÁ É o nome internacional sem forma localizada
const TITLE_IDENTICAL_WHITELIST = new Set([
  "1917",
  "Dunkirk",
  "Matrix",
  "Elden Ring",
  "Minecraft",
  "Cyberpunk 2077",
  "Baldur's Gate 3",
  "Oppenheimer",
  "Avatar",
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
const T: Record<string, { en: string; es: string }> = {
  "O Poderoso Chefão": { en: "The Godfather", es: "El Padrino" },
  "O Senhor dos Anéis: A Sociedade do Anel": {
    en: "The Lord of the Rings: The Fellowship of the Ring",
    es: "El Señor de los Anillos: La Comunidad del Anillo",
  },
  "O Senhor dos Anéis: As Duas Torres": {
    en: "The Lord of the Rings: The Two Towers",
    es: "El Señor de los Anillos: Las Dos Torres",
  },
  "O Senhor dos Anéis: O Retorno do Rei": {
    en: "The Lord of the Rings: The Return of the King",
    es: "El Señor de los Anillos: El Retorno del Rey",
  },
  "Pulp Fiction: Tempo de Violência": { en: "Pulp Fiction", es: "Tiempos Violentos" },
  "O Resgate do Soldado Ryan": { en: "Saving Private Ryan", es: "Rescatando al Soldado Ryan" },
  "A Lista de Schindler": { en: "Schindler's List", es: "La Lista de Schindler" },
  "O Cavaleiro das Trevas": { en: "The Dark Knight", es: "El Caballero de la Noche" },
  "Interestelar": { en: "Interstellar", es: "Interestelar" },
  "A Origem": { en: "Inception", es: "El Origen" },
  "O Regresso": { en: "The Revenant", es: "El Renacido" },
  "Mad Max: Estrada da Fúria": { en: "Mad Max: Fury Road", es: "Mad Max: Furia en la Carretera" },
  "O Labirinto do Fauno": { en: "Pan's Labyrinth", es: "El Laberinto del Fauno" },
  "Bastardos Inglórios": { en: "Inglourious Basterds", es: "Bastardos sin Gloria" },
  "Forrest Gump: O Contador de Histórias": { en: "Forrest Gump", es: "Forrest Gump" },
  "O Grande Gatsby": { en: "The Great Gatsby", es: "El Gran Gatsby" },
  "O Lobo de Wall Street": { en: "The Wolf of Wall Street", es: "El Lobo de Wall Street" },
  "Clube da Luta": { en: "Fight Club", es: "El Club de la Lucha" },
  "O Iluminado": { en: "The Shining", es: "El Resplandor" },
  "O Exterminador do Futuro": { en: "The Terminator", es: "El Exterminador" },
  "De Volta para o Futuro": { en: "Back to the Future", es: "Volver al Futuro" },
  "Jurassic Park: O Parque dos Dinossauros": { en: "Jurassic Park", es: "Parque Jurásico" },
  "Os Bons Companheiros": { en: "Goodfellas", es: "Buenos Muchachos" },
  "O Sexto Sentido": { en: "The Sixth Sense", es: "El Sexto Sentido" },
  "O Silêncio dos Inocentes": { en: "The Silence of the Lambs", es: "El Silencio de los Corderos" },
  "Um Sonho de Liberdade": { en: "The Shawshank Redemption", es: "Cadena Perpetua" },
  "Seven: Os Sete Crimes Capitais": { en: "Se7en", es: "Seven" },
  "Gladiador": { en: "Gladiator", es: "Gladiador" },
  "O Rei Leão": { en: "The Lion King", es: "El Rey León" },
  "Toy Story": { en: "Toy Story", es: "Toy Story" },
  "Procurando Nemo": { en: "Finding Nemo", es: "Buscando a Nemo" },
  "Wall-E": { en: "WALL-E", es: "WALL-E" },
  "Up: Altas Aventuras": { en: "Up", es: "Up" },
  "Divertida Mente": { en: "Inside Out", es: "Intensa-Mente" },
  "Ratatouille": { en: "Ratatouille", es: "Ratatouille" },
  "Os Incríveis": { en: "The Incredibles", es: "Los Increíbles" },
  "Vingadores: Ultimato": { en: "Avengers: Endgame", es: "Vengadores: Endgame" },
  "Vingadores: Guerra Infinita": { en: "Avengers: Infinity War", es: "Vengadores: Infinity War" },
  "Pantera Negra": { en: "Black Panther", es: "Pantera Negra" },
  "Homem de Ferro": { en: "Iron Man", es: "Iron Man" },
  "Capitão América: O Soldado Invernal": {
    en: "Captain America: The Winter Soldier",
    es: "Capitán América: El Soldado de Invierno",
  },
  "Capitão América: Guerra Civil": {
    en: "Captain America: Civil War",
    es: "Capitán América: Civil War",
  },
  "Guardiões da Galáxia": { en: "Guardians of the Galaxy", es: "Guardianes de la Galaxia" },
  "Doutor Estranho": { en: "Doctor Strange", es: "Doctor Strange" },
  "Homem-Aranha: Sem Volta para Casa": {
    en: "Spider-Man: No Way Home",
    es: "Spider-Man: No Way Home",
  },
  "Homem-Aranha no Aranhaverso": {
    en: "Spider-Man: Into the Spider-Verse",
    es: "Spider-Man: Un Nuevo Universo",
  },
  "Star Wars: Episódio IV - Uma Nova Esperança": {
    en: "Star Wars: Episode IV - A New Hope",
    es: "Star Wars: Episodio IV - Una Nueva Esperanza",
  },
  "Star Wars: Episódio V - O Império Contra-Ataca": {
    en: "Star Wars: Episode V - The Empire Strikes Back",
    es: "Star Wars: Episodio V - El Imperio Contraataca",
  },
  "Star Wars: Episódio VI - O Retorno de Jedi": {
    en: "Star Wars: Episode VI - Return of the Jedi",
    es: "Star Wars: Episodio VI - El Retorno del Jedi",
  },
  "Frieren e a Jornada para o Além": {
    en: "Frieren: Beyond Journey's End",
    es: "Frieren: Más Allá del Final",
  },
  "A Viagem de Chihiro": { en: "Spirited Away", es: "El Viaje de Chihiro" },
  "Meu Amigo Totoro": { en: "My Neighbor Totoro", es: "Mi Vecino Totoro" },
  "Princesa Mononoke": { en: "Princess Mononoke", es: "La Princesa Mononoke" },
  "O Castelo Animado": { en: "Howl's Moving Castle", es: "El Castillo Ambulante" },
  "Your Name": { en: "Your Name", es: "Your Name" },
  "One Piece": { en: "One Piece", es: "One Piece" },
  "Naruto": { en: "Naruto", es: "Naruto" },
  "Attack on Titan": { en: "Attack on Titan", es: "Attack on Titan" },
  "Demon Slayer": { en: "Demon Slayer", es: "Demon Slayer" },
};

function canonicalKey(e: { id?: any; slug?: string }) {
  return (e.slug || String(e.id)) as string;
}

function main() {
  const SYNOPSIS_BY_ID: Record<string, { en: string; es: string }> = {
    "boulevard": {
      en: "A quiet drama unfolding over the course of a single day on a tree-lined boulevard, where a man confronts the choices that shaped his life and discovers unexpected redemption.",
      es: "Un drama tranquilo que se desarrolla a lo largo de un solo día en un bulevar arbolado, donde un hombre enfrenta las elecciones que moldearon su vida y descubre una redención inesperada.",
    },
    "as-ovelhas-detetives": {
      en: "When a flock of sheep on a peaceful farm starts disappearing, an unlikely team of woolly detectives must solve the mystery before there's no one left to bah.",
      es: "Cuando un rebaño de ovejas en una granja pacífica comienza a desaparecer, un equipo improbable de detectives lanudos debe resolver el misterio antes de que no quede nadie para balar.",
    },
    "mori-no-kuma-san-toumin-chuu": {
      en: "A gentle slice-of-life anime following a bear preparing for hibernation in a magical forest, making friends with the woodland creatures along the way.",
      es: "Un anime tranquilo que sigue a un oso preparándose para la hibernación en un bosque mágico, haciendo amigos con las criaturas del bosque en el camino.",
    },
    "rote-rosen": {
      en: "A German romantic drama set in a small town where a florist's red roses carry messages of love, loss, and secrets between the residents.",
      es: "Un drama romántico alemán ambientado en un pequeño pueblo donde las rosas rojas de una florista llevan mensajes de amor, pérdida y secretos entre los residentes.",
    },
    "lei-ordem-unidade-de-v-timas-especiais": {
      en: "An elite squad of NYPD detectives investigates sexually based offenses in this hard-hitting and emotional series that has defined the crime drama genre for over two decades.",
      es: "Un escuadrón de élite de detectives del NYPD investiga delitos sexuales en esta serie contundente y emotiva que ha definido el género de drama criminal durante más de dos décadas.",
    },
    "o-guia-do-mochileiro": {
      en: "Arthur Dent is whisked off Earth moments before its destruction and embarks on a hilarious journey through space with an alien researcher, discovering the answer to life, the universe, and everything.",
      es: "Arthur Dent es llevado de la Tierra momentos antes de su destrucción y emprende un viaje hilarante por el espacio con un investigador alienígena, descubriendo la respuesta a la vida, el universo y todo lo demás.",
    },

    "1984": {
      en: "In a totalitarian surveillance state, Winston Smith struggles to maintain his humanity and forbidden love under the watchful eye of Big Brother.",
      es: "En un estado totalitario de vigilancia, Winston Smith lucha por mantener su humanidad y un amor prohibido bajo la mirada vigilante del Gran Hermano.",
    },
    "237020": {
      en: "Stephen Colbert hosts a nightly comedy and talk show featuring celebrity interviews, political satire, and musical performances.",
      es: "Stephen Colbert presenta un programa nocturno de comedia y entrevistas con celebridades, sátira política y actuaciones musicales.",
    },
    "261639": {
      en: "The iconic fighting tournament returns with new champions from Earthrealm and Outworld clashing in brutal kombat, where the fate of all realms hangs in the balance.",
      es: "El icónico torneo de lucha regresa con nuevos campeones de la Tierra y el Mundo Exterior enfrentándose en kombate brutal, donde el destino de todos los reinos pende de un hilo.",
    },
    "1235877": {
      en: "Tanjiro and the Demon Slayer Corps enter the Infinity Castle for their final battle against Muzan Kibutsuji, the progenitor of all demons.",
      es: "Tanjiro y el Cuerpo de Cazadores de Demonios entran al Castillo Infinito para su batalla final contra Muzan Kibutsuji, el progenitor de todos los demonios.",
    },
    "1285366": {
      en: "Peter Parker's identity as Spider-Man is exposed, forcing him to seek help from Doctor Strange as villains from across the multiverse invade his world.",
      es: "La identidad de Peter Parker como Spider-Man queda expuesta, obligándolo a buscar ayuda del Doctor Strange mientras villanos de todo el multiverso invaden su mundo.",
    },
    "1491920": {
      en: "A quiet drama about a man confronting his past and the choices that shaped his life, unfolding over the course of a single day on a tree-lined boulevard.",
      es: "Un drama tranquilo sobre un hombre confrontando su pasado y las elecciones que moldearon su vida, desarrollándose a lo largo de un solo día en un bulevar arbolado.",
    },
    "o-diabo-veste-prada-2": {
      en: "Miranda Priestly returns to the cutthroat world of fashion publishing, facing a new generation of digital disruption while navigating the complexities of mentorship and legacy.",
      es: "Miranda Priestly regresa al implacable mundo de las publicaciones de moda, enfrentando una nueva generación de disrupción digital mientras navega las complejidades del mentorazgo y el legado.",
    },
    "descendentes-pa-s-das-maravilhas-malvado": {
      en: "The children of Disney's most iconic heroes and villains return for a new adventure where the boundaries between good and evil blur and a new generation must forge its own path.",
      es: "Los hijos de los héroes y villanos más icónicos de Disney regresan para una nueva aventura donde los límites entre el bien y el mal se difuminan y una nueva generación debe forjar su propio camino.",
    },
    "binnelanders": {
      en: "A long-running South African medical drama following the personal and professional lives of the staff at the Binneland Clinic, exploring love, betrayal and healing.",
      es: "Un drama médico sudafricano de larga duración que sigue las vidas personales y profesionales del personal de la Clínica Binneland, explorando el amor, la traición y la sanación.",
    },
    "kaatelal-sons": {
      en: "An Indian family drama following the Kaatelal brothers as they navigate generational conflicts, business rivalries, and the bonds that hold their family together.",
      es: "Un drama familiar indio que sigue a los hermanos Kaatelal mientras navegan conflictos generacionales, rivalidades empresariales y los lazos que mantienen unida a su familia.",
    },
    "siping": {
      en: "A Chinese historical epic set in the ancient city of Siping, weaving together political intrigue, forbidden romance, and the clash of empires.",
      es: "Una épica histórica china ambientada en la antigua ciudad de Siping, entrelazando intriga política, romance prohibido y el choque de imperios.",
    },
    "secret-mission-sennyuu-sousakan-wa-zettai-ni-makenai": {
      en: "A Japanese action-comedy about an undercover agent who must infiltrate a dangerous organization while maintaining his cover, blending espionage with unexpected humor.",
      es: "Una comedia de acción japonesa sobre un agente encubierto que debe infiltrarse en una organización peligrosa mientras mantiene su cobertura, mezclando espionaje con humor inesperado.",
    },
    "zelda-breath-of-the-wild": {
      en: "Link awakens from a hundred-year slumber to explore a vast open world, reclaim his memories, and defeat Calamity Ganon to save the kingdom of Hyrule.",
      es: "Link despierta de un sueño de cien años para explorar un vasto mundo abierto, recuperar sus recuerdos y derrotar a la Calamidad Ganon para salvar el reino de Hyrule.",
    },
    "mushoku-tensei": {
      en: "A jobless shut-in is reincarnated into a fantasy world, determined to live his new life to the fullest, mastering magic and forming bonds in his second chance at life.",
      es: "Un desempleado recluso es reencarnado en un mundo de fantasía, decidido a vivir su nueva vida al máximo, dominando la magia y formando vínculos en su segunda oportunidad.",
    },
    "detetive-conan": {
      en: "A brilliant high school detective is transformed into a child by a mysterious poison and continues to solve baffling cases while searching for the criminal syndicate responsible.",
      es: "Un brillante detective de secundaria es transformado en un niño por un veneno misterioso y continúa resolviendo casos desconcertantes mientras busca al sindicato criminal responsable.",
    },
    "sandman": {
      en: "Dream, the lord of the dream realm, escapes after decades of imprisonment and sets out to rebuild his kingdom while confronting gods, demons, and his own immortal family.",
      es: "Sueño, el señor del reino de los sueños, escapa tras décadas de prisión y se propone reconstruir su reino mientras confronta dioses, demonios y su propia familia inmortal.",
    },
    "o-mentalista": {
      en: "A former psychic medium uses his keen observational skills to help the California Bureau of Investigation solve complex murders while searching for the serial killer who murdered his family.",
      es: "Un ex médium psíquico usa sus agudas habilidades de observación para ayudar a la Oficina de Investigación de California a resolver asesinatos complejos mientras busca al asesino en serie que mató a su familia.",
    },
    "lei-ordem": {
      en: "A groundbreaking police procedural and legal drama that follows NYPD detectives investigating crimes and district attorneys prosecuting the offenders, exploring the complexities of the justice system.",
      es: "Un drama policial y legal innovador que sigue a los detectives del NYPD investigando crímenes y a los fiscales procesando a los delincuentes, explorando las complejidades del sistema judicial.",
    },
    "o-novato": {
      en: "A middle-aged man pursues his dream of becoming a police officer, joining the LAPD as its oldest rookie and proving that it is never too late to start over.",
      es: "Un hombre de mediana edad persigue su sueño de convertirse en oficial de policía, uniéndose al LAPD como su novato más viejo y demostrando que nunca es demasiado tarde para empezar de nuevo.",
    },
    "a-morte-de-robin-hood": {
      en: "An aging Robin Hood grapples with his legacy, past crimes, and a final battle that will define how history remembers the legendary outlaw of Sherwood Forest.",
      es: "Un Robin Hood envejecido lucha con su legado, sus crímenes pasados y una batalla final que definirá cómo la historia recuerda al legendario proscrito del Bosque de Sherwood.",
    },
    "o-cobrador-de-d-vidas": {
      en: "A mysterious debt collector discovers that the debts he collects are not financial but spiritual, forcing him to confront forces beyond the mortal realm.",
      es: "Un misterioso cobrador de deudas descubre que las deudas que cobra no son financieras sino espirituales, obligándolo a enfrentar fuerzas más allá del reino mortal.",
    },
    "o-limite-do-prazer": {
      en: "A provocative thriller exploring the boundaries of human desire, where the pursuit of ultimate pleasure leads to dangerous consequences and moral reckoning.",
      es: "Un thriller provocador que explora los límites del deseo humano, donde la búsqueda del placer máximo conduce a consecuencias peligrosas y un ajuste de cuentas moral.",
    },
    "cora-o-partido": {
      en: "A deeply emotional drama about love, loss, and the long road to healing after a devastating breakup, told through parallel timelines of a relationship's beginning and end.",
      es: "Un drama profundamente emotivo sobre el amor, la pérdida y el largo camino hacia la curación tras una ruptura devastadora, contado a través de líneas temporales paralelas del inicio y final de una relación.",
    },
    "guas-mortais": {
      en: "A survival thriller set in the open ocean, where a group of strangers must fight the elements — and each other — after their yacht capsizes in shark-infested waters.",
      es: "Un thriller de supervivencia en mar abierto, donde un grupo de extraños debe luchar contra los elementos — y entre ellos — después de que su yate naufraga en aguas infestadas de tiburones.",
    },
    "citizen-vigilante": {
      en: "An ordinary citizen takes justice into his own hands when the system fails, becoming an unlikely vigilante in a city drowning in corruption and crime.",
      es: "Un ciudadano común toma la justicia en sus propias manos cuando el sistema falla, convirtiéndose en un justiciero improbable en una ciudad ahogada por la corrupción y el crimen.",
    },
    "maldi-o-da-m-mia": {
      en: "An archaeological expedition awakens an ancient curse buried for millennia, unleashing a supernatural force that threatens to consume everyone in its path.",
      es: "Una expedición arqueológica despierta una maldición milenaria enterrada, desatando una fuerza sobrenatural que amenaza con consumir a todos a su paso.",
    },
    "forgive-us-all": {
      en: "A powerful drama about redemption, faith, and the human capacity for forgiveness, following a priest who must confront his own past sins while helping a community heal.",
      es: "Un drama poderoso sobre la redención, la fe y la capacidad humana de perdonar, siguiendo a un sacerdote que debe confrontar sus propios pecados pasados mientras ayuda a una comunidad a sanar.",
    },
    "il-frullo-del-passero": {
      en: "An Italian drama of quiet beauty, following an elderly man's daily routine and the small, profound moments that give life its meaning in a changing world.",
      es: "Un drama italiano de una belleza tranquila, siguiendo la rutina diaria de un anciano y los pequeños y profundos momentos que dan sentido a la vida en un mundo cambiante.",
    },
    "au-bonheur-des-dames": {
      en: "A sweeping period drama set in a Parisian department store, where ambition, love and commerce collide as a young woman rises through the ranks of retail society.",
      es: "Un drama de época ambientado en unos grandes almacenes parisinos, donde la ambición, el amor y el comercio colisionan mientras una joven asciende en la sociedad del comercio.",
    },
    "une-flamme-dans-mon-c-ur": {
      en: "An intimate French romance about a passionate but forbidden love affair between two people from different worlds, set against the backdrop of 1980s Paris.",
      es: "Un romance francés íntimo sobre un amor apasionado pero prohibido entre dos personas de mundos diferentes, ambientado en el París de los años 80.",
    },
    "jujutsu-kaisen": {
      en: "A high school student swallows a cursed finger and becomes entangled in the world of sorcerers and curses, training to protect the innocent from supernatural threats.",
      es: "Un estudiante traga un dedo maldito y se ve envuelto en el mundo de los hechiceros y las maldiciones, entrenando para proteger a los inocentes de amenazas sobrenaturales.",
    },
    "hunter-x-hunter": {
      en: "A young boy sets out to become a Hunter and find his missing father, making friends and facing deadly challenges in a world of extraordinary adventures.",
      es: "Un joven emprende el camino para convertirse en Cazador y encontrar a su padre desaparecido, haciendo amigos y enfrentando desafíos mortales en un mundo de aventuras extraordinarias.",
    },
    "bleach": {
      en: "A teenager gains the powers of a Soul Reaper and must protect the living world from evil spirits while navigating the complex politics of the Soul Society.",
      es: "Un adolescente obtiene los poderes de un Shinigami y debe proteger el mundo de los vivos de los espíritus malignos mientras navega por la compleja política de la Sociedad de Almas.",
    },
    "re-zero": {
      en: "A young man is transported to a fantasy world and discovers he has the ability to return to a save point upon death, forcing him to relive traumatic events to protect those he loves.",
      es: "Un joven es transportado a un mundo de fantasía y descubre que tiene la capacidad de volver a un punto de guardado al morir, obligándolo a revivir eventos traumáticos para proteger a quienes ama.",
    },
    "pokemon": {
      en: "A young trainer journeys across regions to catch, train, and battle creatures called Pokemon, aiming to become the greatest Pokemon Master in the world.",
      es: "Un joven entrenador viaja por regiones para capturar, entrenar y luchar con criaturas llamadas Pokemon, con el objetivo de convertirse en el mejor Maestro Pokemon del mundo.",
    },
    "doraemon": {
      en: "A robotic cat from the 22nd century travels back in time to help a young boy navigate the challenges of childhood using futuristic gadgets from his magical pocket.",
      es: "Un gato robótico del siglo XXII viaja al pasado para ayudar a un niño a navegar los desafíos de la infancia usando gadgets futuristas de su bolsillo mágico.",
    },
    "god-of-war-ragnarok": {
      en: "Kratos and his son Atreus journey through the Nine Realms as Ragnarok approaches, facing Norse gods and monsters in an epic conclusion to the Norse saga.",
      es: "Kratos y su hijo Atreus viajan por los Nueve Reinos mientras se acerca el Ragnarok, enfrentando dioses y monstruos nórdicos en una conclusión épica de la saga nórdica.",
    },
    "red-dead-redemption-2": {
      en: "Arthur Morgan and the Van der Linde gang are on the run from the law in America's fading Wild West, grappling with loyalty, survival, and the end of an era.",
      es: "Arthur Morgan y la banda Van der Linde huyen de la ley en el ocaso del Salvaje Oeste americano, lidiando con la lealtad, la supervivencia y el fin de una era.",
    },
    "the-witcher-3": {
      en: "Geralt of Rivia, a monster hunter for hire, searches for his adopted daughter while navigating a war-torn world and confronting an otherworldly threat.",
      es: "Geralt de Rivia, un cazador de monstruos a sueldo, busca a su hija adoptiva mientras navega por un mundo devastado por la guerra y enfrenta una amenaza sobrenatural.",
    },
    "duna": {
      en: "Paul Atreides travels to the desert planet Arrakis, where his family controls the universe's most valuable substance, and a destiny greater than he can imagine awaits.",
      es: "Paul Atreides viaja al planeta desértico Arrakis, donde su familia controla la sustancia más valiosa del universo, y le espera un destino más grande de lo que puede imaginar.",
    },
    "cem-anos-de-solidao": {
      en: "The multi-generational saga of the Buendia family in the mythical town of Macondo, weaving magical realism with the history of Latin America.",
      es: "La saga multigeneracional de la familia Buendía en el mítico pueblo de Macondo, entrelazando realismo mágico con la historia de América Latina.",
    },
    "o-hobbit": {
      en: "Bilbo Baggins is swept into an epic quest to reclaim the lost Dwarf kingdom of Erebor from the fearsome dragon Smaug, discovering courage he never knew he had.",
      es: "Bilbo Bolsón se ve arrastrado a una búsqueda épica para recuperar el reino enano perdido de Erebor del temible dragón Smaug, descubriendo un coraje que nunca supo que tenía.",
    },
    "watchmen": {
      en: "In an alternate 1985 where superheroes exist, a murder investigation unravels a conspiracy that forces retired heroes to confront their past and the nature of power.",
      es: "En un 1985 alternativo donde existen los superhéroes, una investigación de asesinato revela una conspiración que obliga a héroes retirados a confrontar su pasado y la naturaleza del poder.",
    },
    "the-boys": {
      en: "A group of vigilantes sets out to take down corrupt superheroes who abuse their powers, exposing the dark side of fame and corporate-controlled heroism.",
      es: "Un grupo de justicieros se propone derribar a superhéroes corruptos que abusan de sus poderes, exponiendo el lado oscuro de la fama y el heroísmo controlado por corporaciones.",
    },
    "invincible": {
      en: "A teenager inherits his father's superhuman powers and discovers that being a hero comes with brutal consequences and devastating family secrets.",
      es: "Un adolescente hereda los poderes sobrehumanos de su padre y descubre que ser un héroe conlleva consecuencias brutales y secretos familiares devastadores.",
    },
    "avatar-aang-o-ltimo-mestre-do-ar": {
      en: "Aang, the last Airbender and the Avatar, must master all four elements to end the Fire Nation's war and restore balance to the world.",
      es: "Aang, el último Maestro del Aire y el Avatar, debe dominar los cuatro elementos para detener la guerra de la Nación del Fuego y restaurar el equilibrio del mundo.",
    },
    "silo": {
      en: "In a dystopian future, the last ten thousand people on Earth live in a giant underground silo, where a sheriff investigates a murder and uncovers the truth about their confined world.",
      es: "En un futuro distópico, los últimos diez mil habitantes de la Tierra viven en un silo subterráneo gigante, donde un sheriff investiga un asesinato y descubre la verdad sobre su mundo confinado.",
    },
    "origem": {
      en: "A scientist makes a discovery that challenges the boundaries between science and faith, forcing humanity to reconsider its deepest beliefs about where we come from.",
      es: "Un científico hace un descubrimiento que desafía los límites entre ciencia y fe, obligando a la humanidad a reconsiderar sus creencias más profundas sobre nuestro origen.",
    },
    "backrooms-um-n-o-lugar": {
      en: "A group of explorers discovers an endless maze of empty yellow rooms existing beyond reality, where the laws of physics no longer apply and something lurks in the silence.",
      es: "Un grupo de exploradores descubre un laberinto interminable de habitaciones amarillas vacías que existen más allá de la realidad, donde las leyes de la física ya no se aplican y algo acecha en el silencio.",
    },
    "obsess-o": {
      en: "A gripping psychological thriller about a man whose infatuation spirals into a dangerous obsession, blurring the line between love and control.",
      es: "Un thriller psicológico sobre un hombre cuya fascinación se convierte en una peligrosa obsesión, difuminando la línea entre el amor y el control.",
    },
    "supergirl": {
      en: "Kara Zor-El, Superman's cousin, balances her life as a young professional with her destiny as Earth's protector, facing threats from across the galaxy.",
      es: "Kara Zor-El, la prima de Superman, equilibra su vida como joven profesional con su destino como protectora de la Tierra, enfrentando amenazas de toda la galaxia.",
    },
    "mestres-do-universo": {
      en: "On the planet Eternia, He-Man and his allies battle the evil Skeletor for control of Castle Grayskull and the fate of the universe.",
      es: "En el planeta Eternia, He-Man y sus aliados luchan contra el malvado Skeletor por el control del Castillo Grayskull y el destino del universo.",
    },
    "desejo": {
      en: "A provocative exploration of human longing, where characters confront their deepest desires and the consequences of pursuing them to the extreme.",
      es: "Una exploración provocativa del anhelo humano, donde los personajes confrontan sus deseos más profundos y las consecuencias de perseguirlos al extremo.",
    },
    "devoradores-de-estrelas": {
      en: "A cosmic horror saga where ancient entities feed on dying stars, and a ragtag crew of explorers must prevent the next extinction-level event.",
      es: "Una saga de horror cósmico donde entidades ancestrales se alimentan de estrellas moribundas, y una tripulación improvisada de exploradores debe prevenir el próximo evento de extinción.",
    },
    "minions-monstros": {
      en: "The mischievous Minions accidentally unleash ancient monsters from a cursed artifact, turning a routine vacation into a globe-trotting monster-hunting adventure.",
      es: "Los traviesos Minions liberan accidentalmente monstruos ancestrales de un artefacto maldito, convirtiendo unas vacaciones rutinarias en una aventura global de caza de monstruos.",
    },
    "borderline": {
      en: "A tense drama exploring the fragile boundaries of the human psyche, where a therapist and patient both confront their own psychological limits.",
      es: "Un drama tenso que explora los frágiles límites de la psique humana, donde un terapeuta y su paciente confrontan sus propios límites psicológicos.",
    },
    "todo-mundo-em-p-nico": {
      en: "A chaotic comedy where an entire city descends into panic over a misunderstood rumor, following multiple interconnected stories of people losing their minds.",
      es: "Una comedia caótica donde una ciudad entera entra en pánico por un rumor malinterpretado, siguiendo múltiples historias interconectadas de personas perdiendo la cabeza.",
    },
    "mortal-kombat-2": {
      en: "The iconic fighting tournament returns with new champions from Earthrealm and Outworld clashing in Mortal Kombat, where the fate of realms hangs in the balance.",
      es: "El icónico torneo de lucha regresa con nuevos campeones de la Tierra y el Mundo Exterior enfrentándose en Mortal Kombat, donde el destino de los reinos pende de un hilo.",
    },
    "a-odisseia": {
      en: "Follow the saga of Odysseus, the legendary king of Ithaca, on his long and perilous journey home after the Trojan War, facing mythical creatures and divine challenges.",
      es: "Acompaña la saga de Odiseo, el legendario rey de Ítaca, en su largo y peligroso viaje de regreso tras la Guerra de Troya, enfrentando criaturas míticas y desafíos divinos.",
    },
    "dia-d": {
      en: "The epic retelling of the Allied invasion of Normandy on June 6, 1944 — D-Day — the largest amphibious military operation in history that turned the tide of World War II.",
      es: "La épica recreación de la invasión aliada de Normandía el 6 de junio de 1944 — el Día D — la mayor operación militar anfibia de la historia que cambió el rumbo de la Segunda Guerra Mundial.",
    },
    "interestelar": {
      en: "In a near future where Earth is becoming uninhabitable, a former NASA pilot travels through a wormhole near Saturn in search of a new home for humanity.",
      es: "En un futuro cercano donde la Tierra se vuelve inhabitable, un ex piloto de la NASA viaja a través de un agujero de gusano cerca de Saturno en busca de un nuevo hogar para la humanidad.",
    },
    "um-sonho-de-liberdade": {
      en: "A banker wrongly convicted of murder forms an unlikely friendship with a fellow inmate and finds a way to survive — and hope — inside Shawshank prison over the course of two decades.",
      es: "Un banquero injustamente condenado por asesinato forma una amistad improbable con otro recluso y encuentra la manera de sobrevivir — y tener esperanza — dentro de la prisión de Shawshank a lo largo de dos décadas.",
    },
    "frieren": {
      en: "Elf mage Frieren continues her journey to understand humanity decades after her adventuring party defeated the Demon King, accompanied by her late comrades' apprentice.",
      es: "La maga elfa Frieren continúa su viaje para comprender a la humanidad décadas después de que su grupo de aventureros derrotara al Rey Demonio, acompañada por la aprendiz de sus difuntos camaradas.",
    },
    "rick-e-morty": {
      en: "A sociopathic genius scientist drags his inherently timid grandson on insanely dangerous adventures across the multiverse, dealing with family chaos and cosmic horrors.",
      es: "Un científico genio sociópata arrastra a su nieto inherentemente tímido a aventuras increíblemente peligrosas a través del multiverso, lidiando con el caos familiar y horrores cósmicos.",
    },
    "supernatural": {
      en: "Two brothers follow their father's footsteps as hunters, fighting evil supernatural beings of many kinds — including monsters, demons, and gods — that roam the earth.",
      es: "Dos hermanos siguen los pasos de su padre como cazadores, luchando contra seres sobrenaturales malignos de muchos tipos — incluyendo monstruos, demonios y dioses — que vagan por la tierra.",
    },
    "grey-s-anatomy": {
      en: "A drama centered on the personal and professional lives of surgical interns and their supervisors at a Seattle hospital, navigating medicine, relationships, and ambition.",
      es: "Un drama centrado en las vidas personales y profesionales de los internos quirúrgicos y sus supervisores en un hospital de Seattle, navegando la medicina, las relaciones y la ambición.",
    },
    "a-casa-do-drag-o": {
      en: "Set 200 years before the events of Game of Thrones, this series tells the story of House Targaryen and the civil war — known as the Dance of the Dragons — that tore the dynasty apart.",
      es: "Ambientada 200 años antes de los eventos de Game of Thrones, esta serie cuenta la historia de la Casa Targaryen y la guerra civil — conocida como la Danza de los Dragones — que desgarró la dinastía.",
    },
    "vingadores-doutor-destino": {
      en: "The Avengers face their greatest challenge yet as Doctor Doom emerges as a multiversal threat, forcing Earth's mightiest heroes to unite like never before.",
      es: "Los Vengadores enfrentan su mayor desafío cuando el Doctor Doom emerge como una amenaza multiversal, obligando a los héroes más poderosos de la Tierra a unirse como nunca antes.",
    },
    "avatar-fogo-e-cinzas": {
      en: "The next chapter in the Avatar saga takes Jake Sully and Neytiri to a volcanic region of Pandora, where they encounter a new clan and face an unprecedented natural threat.",
      es: "El siguiente capítulo de la saga Avatar lleva a Jake Sully y Neytiri a una región volcánica de Pandora, donde encuentran un nuevo clan y enfrentan una amenaza natural sin precedentes.",
    },
    "homem-aranha-sem-volta-para-casa": {
      en: "Peter Parker's identity as Spider-Man is exposed, forcing him to seek help from Doctor Strange — but a spell gone wrong pulls villains from across the multiverse into his world.",
      es: "La identidad de Peter Parker como Spider-Man queda expuesta, obligándolo a buscar ayuda del Doctor Strange — pero un hechizo fallido atrae villanos de todo el multiverso a su mundo.",
    },
    "homem-aranha-um-novo-dia": {
      en: "A new chapter for Spider-Man begins as Peter Parker navigates life after the multiversal chaos, facing fresh threats and rediscovering what it truly means to be a hero.",
      es: "Un nuevo capítulo para Spider-Man comienza mientras Peter Parker navega la vida tras el caos multiversal, enfrentando nuevas amenazas y redescubriendo lo que realmente significa ser un héroe.",
    },
    "demon-slayer-kimetsu-no-yaiba-castelo-infinito": {
      en: "Tanjiro and the Demon Slayer Corps enter the Infinite Castle for their final battle against Muzan Kibutsuji, the progenitor of all demons.",
      es: "Tanjiro y el Cuerpo de Cazadores de Demonios entran al Castillo Infinito para su batalla final contra Muzan Kibutsuji, el progenitor de todos los demonios.",
    },
    "super-mario-galaxy-o-filme": {
      en: "Mario blasts off into space to rescue Princess Peach from Bowser's cosmic clutches, journeying across fantastical galaxies in his biggest adventure yet.",
      es: "Mario despega al espacio para rescatar a la Princesa Peach de las garras cósmicas de Bowser, viajando a través de galaxias fantásticas en su mayor aventura hasta ahora.",
    },
    "star-wars-o-mandaloriano-e-grogu": {
      en: "The Mandalorian and Grogu embark on a new adventure across the galaxy, facing Imperial remnants, bounty hunters, and the deepening bond between warrior and foundling.",
      es: "El Mandaloriano y Grogu emprenden una nueva aventura a través de la galaxia, enfrentando remanentes imperiales, cazarrecompensas y el vínculo cada vez más profundo entre guerrero y expósito.",
    },
  };

  const TRANSLATIONS_BY_ID: Record<string, { en: string; es: string }> = {
    "549": { en: "The Matrix", es: "Matrix" },
    "1984": { en: "1984", es: "1984" },
    "5920": { en: "Gladiator", es: "Gladiador" },
    "27181": { en: "Contact", es: "Contacto" },
    "79744": { en: "Blade Runner", es: "Blade Runner" },
    "237020": { en: "The Late Show with Stephen Colbert", es: "El Late Show con Stephen Colbert" },
    "261639": { en: "Mortal Kombat 2", es: "Mortal Kombat 2" },
    "454639": { en: "Fight Club", es: "El Club de la Lucha" },
    "1081003": { en: "Titanic", es: "Titanic" },
    "1084244": { en: "The Sixth Sense", es: "El Sexto Sentido" },
    "1108427": { en: "The Odyssey", es: "La Odisea" },
    "1235877": { en: "Demon Slayer: Infinity Castle", es: "Demon Slayer: Castillo Infinito" },
    "1275779": { en: "D-Day", es: "D-Day" },
    "1285366": { en: "Homem-Aranha: Sem Volta Para Casa", es: "Spider-Man: No Way Home" },
    "1339713": { en: "The Silence of the Lambs", es: "El Silencio de los Corderos" },
    "1491920": { en: "Boulevard", es: "Boulevard" },
    "neuromancer": { en: "Neuromancer", es: "Neuromante" },
    "o-guia-do-mochileiro": {
      en: "The Hitchhiker's Guide to the Galaxy",
      es: "Guia del Autoestopista Galactico",
    },
    "saga": { en: "Saga", es: "Saga" },
    "maus": { en: "Maus", es: "Maus" },
    "boulevard": { en: "Boulevard", es: "Boulevard" },
    "as-ovelhas-detetives": { en: "The Detective Sheep", es: "Las Ovejas Detectives" },
    "mori-no-kuma-san-toumin-chuu": { en: "The Bear in the Forest", es: "El Oso del Bosque" },
    "rote-rosen": { en: "Red Roses", es: "Rosas Rojas" },
    "lei-ordem-unidade-de-v-timas-especiais": {
      en: "Law & Order: Special Victims Unit",
      es: "La Ley y el Orden: Unidad de Victimas Especiales",
    },
    "watch-what-happens-live-with-andy-cohen": {
      en: "Watch What Happens Live",
      es: "Mira lo que Pasa en Vivo",
    },
    "the-late-show-with-stephen-colbert": {
      en: "The Late Show with Stephen Colbert",
      es: "El Late Show con Stephen Colbert",
    },
    "o-diabo-veste-prada-2": { en: "The Devil Wears Prada 2", es: "El Diablo Viste de Prada 2" },
    "descendentes-pa-s-das-maravilhas-malvado": {
      en: "Descendants: Path of Wonders",
      es: "Descendientes: Camino de Maravillas",
    },
    "binnelanders": { en: "Binnelanders", es: "Binnelanders" },
    "kaatelal-sons": { en: "Kaatelal Sons", es: "Kaatelal Sons" },
    "siping": { en: "Siping", es: "Siping" },
    "secret-mission-sennyuu-sousakan-wa-zettai-ni-makenai": {
      en: "Secret Mission: The Undercover Agent Never Loses",
      es: "Mision Secreta: El Agente Encubierto Nunca Pierde",
    },
    "zelda-breath-of-the-wild": {
      en: "The Legend of Zelda: Breath of the Wild",
      es: "The Legend of Zelda: Aliento de lo Salvaje",
    },
    "mushoku-tensei": {
      en: "Mushoku Tensei: Jobless Reincarnation",
      es: "Mushoku Tensei: Reencarnacion Sin Empleo",
    },
    "detetive-conan": { en: "Detective Conan", es: "Detective Conan" },
    "sandman": { en: "The Sandman", es: "El Sandman" },
    "o-mentalista": { en: "The Mentalist", es: "El Mentalista" },
    "lei-ordem": { en: "Law & Order", es: "La Ley y el Orden" },
    "o-novato": { en: "The Rookie", es: "El Novato" },
    "a-morte-de-robin-hood": { en: "The Death of Robin Hood", es: "La Muerte de Robin Hood" },
    "o-cobrador-de-d-vidas": { en: "The Life Collector", es: "El Cobrador de Vidas" },
    "o-limite-do-prazer": { en: "The Limits of Pleasure", es: "Los Limites del Placer" },
    "cora-o-partido": { en: "Broken Heart", es: "Corazon Partido" },
    "guas-mortais": { en: "Deadly Waters", es: "Aguas Mortales" },
    "citizen-vigilante": { en: "Citizen Vigilante", es: "Ciudadano Vigilante" },
    "maldi-o-da-m-mia": { en: "Curse of the Mummy", es: "La Maldicion de la Momia" },
    "forgive-us-all": { en: "Forgive Us All", es: "Perdonanos a Todos" },
    "il-frullo-del-passero": { en: "The Sparrow's Flutter", es: "El Aleteo del Gorrion" },
    "au-bonheur-des-dames": { en: "The Ladies' Paradise", es: "El Paraiso de las Damas" },
    "une-flamme-dans-mon-c-ur": { en: "A Flame in My Heart", es: "Una Llama en Mi Corazon" },
    "jujutsu-kaisen": { en: "Jujutsu Kaisen", es: "Jujutsu Kaisen" },
    "hunter-x-hunter": { en: "Hunter x Hunter", es: "Hunter x Hunter" },
    "bleach": { en: "Bleach", es: "Bleach" },
    "re-zero": { en: "Re:Zero", es: "Re:Zero" },
    "pokemon": { en: "Pokemon", es: "Pokemon" },
    "doraemon": { en: "Doraemon", es: "Doraemon" },
    "god-of-war-ragnarok": { en: "God of War: Ragnarok", es: "God of War: Ragnarok" },
    "red-dead-redemption-2": { en: "Red Dead Redemption 2", es: "Red Dead Redemption 2" },
    "the-witcher-3": { en: "The Witcher 3: Wild Hunt", es: "The Witcher 3: Wild Hunt" },
    "duna": { en: "Dune", es: "Duna" },
    "cem-anos-de-solidao": { en: "One Hundred Years of Solitude", es: "Cien Anos de Soledad" },
    "o-hobbit": { en: "The Hobbit", es: "El Hobbit" },
    "watchmen": { en: "Watchmen", es: "Watchmen" },
    "the-boys": { en: "The Boys", es: "The Boys" },
    "invincible": { en: "Invincible", es: "Invencible" },
    "avatar-aang-o-ltimo-mestre-do-ar": {
      en: "Avatar Aang: The Last Airbender",
      es: "Avatar Aang: El Ultimo Maestro del Aire",
    },
    "silo": { en: "Silo", es: "Silo" },
    "origem": { en: "Origin", es: "Origen" },
    "backrooms-um-n-o-lugar": { en: "Backrooms: A Non-Place", es: "Backrooms: Un No-Lugar" },
    "minions-monstros": { en: "Minions Monsters", es: "Minions Monstruos" },
    "borderline": { en: "Borderline", es: "Borderline" },
    "obsess-o": { en: "Obsession", es: "Obsesion" },
    "supergirl": { en: "Supergirl", es: "Supergirl" },
    "mestres-do-universo": { en: "Masters of the Universe", es: "Amos del Universo" },
    "desejo": { en: "Desire", es: "Deseo" },
    "devoradores-de-estrelas": { en: "Star Devourers", es: "Devoradores de Estrellas" },
    "mortal-kombat-2": { en: "Mortal Kombat 2", es: "Mortal Kombat 2" },
    "homem-aranha-um-novo-dia": { en: "Spider-Man: Brand New Day", es: "Spider-Man: Un Nuevo Dia" },
    "homem-aranha-sem-volta-para-casa": {
      en: "Spider-Man: No Way Home",
      es: "Spider-Man: No Way Home",
    },
    "vingadores-doutor-destino": { en: "Avengers: Doomsday", es: "Vengadores: Doomsday" },
    "super-mario-galaxy-o-filme": { en: "Super Mario Galaxy", es: "Super Mario Galaxy" },
    "avatar-fogo-e-cinzas": { en: "Avatar: Fire and Ashes", es: "Avatar: Fuego y Cenizas" },
    "rick-e-morty": { en: "Rick and Morty", es: "Rick y Morty" },
    "supernatural": { en: "Supernatural", es: "Sobrenatural" },
    "grey-s-anatomy": { en: "Grey's Anatomy", es: "Anatomia de Grey" },
    "demon-slayer-kimetsu-no-yaiba-castelo-infinito": {
      en: "Demon Slayer: Infinity Castle",
      es: "Demon Slayer: Castillo Infinito",
    },
    "moana": { en: "Moana", es: "Moana" },
    "toy-story-5": { en: "Toy Story 5", es: "Toy Story 5" },
    "star-wars-o-mandaloriano-e-grogu": {
      en: "Star Wars: The Mandalorian and Grogu",
      es: "Star Wars: El Mandaloriano y Grogu",
    },
    "kraken": { en: "Kraken", es: "Kraken" },
    "black-box": { en: "Black Box", es: "Black Box" },
    "a-casa-do-drag-o": { en: "House of the Dragon", es: "La Casa del Dragon" },
    "michael": { en: "Michael", es: "Michael" },
    "passageiro-do-mal": { en: "Evil Passenger", es: "Pasajero del Mal" },
    "the-furious": { en: "The Furious", es: "The Furious" },
    "vixen": { en: "Vixen", es: "Vixen" },
    "tagesschau": { en: "Tagesschau", es: "Tagesschau" },
    "paradise-hotel": { en: "Paradise Hotel", es: "Hotel Paraiso" },
    "a-odisseia": { en: "The Odyssey", es: "La Odisea" },
    "dia-d": { en: "D-Day", es: "D-Day" },
    "contato": { en: "Contact", es: "Contacto" },
    "gladiador": { en: "Gladiator", es: "Gladiador" },
    "matrix": { en: "The Matrix", es: "Matrix" },
    "clube-da-luta": { en: "Fight Club", es: "El Club de la Lucha" },
    "o-sexto-sentido": { en: "The Sixth Sense", es: "El Sexto Sentido" },
    "o-silencio-dos-inocentes": {
      en: "The Silence of the Lambs",
      es: "El Silencio de los Corderos",
    },
    "um-sonho-de-liberdade": { en: "The Shawshank Redemption", es: "Cadena Perpetua" },
    "forrest-gump": { en: "Forrest Gump", es: "Forrest Gump" },
    "a-lista-de-schindler": { en: "Schindler's List", es: "La Lista de Schindler" },
    "o-cavaleiro-das-trevas": { en: "The Dark Knight", es: "El Caballero de la Noche" },
    "interestelar": { en: "Interstellar", es: "Interestelar" },
    "a-origem": { en: "Inception", es: "El Origen" },
    "o-regresso": { en: "The Revenant", es: "El Renacido" },
    "bastardos-inglorios": { en: "Inglourious Basterds", es: "Bastardos sin Gloria" },
    "o-rei-leao": { en: "The Lion King", es: "El Rey Leon" },
    "toy-story": { en: "Toy Story", es: "Toy Story" },
    "procurando-nemo": { en: "Finding Nemo", es: "Buscando a Nemo" },
    "os-incriveis": { en: "The Incredibles", es: "Los Increibles" },
    "vingadores-ultimato": { en: "Avengers: Endgame", es: "Vengadores: Endgame" },
    "pantera-negra": { en: "Black Panther", es: "Pantera Negra" },
    "homem-de-ferro": { en: "Iron Man", es: "Iron Man" },
    "jurassic-park": { en: "Jurassic Park", es: "Parque Jurásico" },
    "titanic": { en: "Titanic", es: "Titanic" },
    "o-exterminador-do-futuro": { en: "The Terminator", es: "El Exterminador" },
    "de-volta-para-o-futuro": { en: "Back to the Future", es: "Volver al Futuro" },
    "blade-runner": { en: "Blade Runner", es: "Blade Runner" },
    "frieren": { en: "Frieren: Beyond Journey's End", es: "Frieren: Más Allá del Final" },
    "o-poderoso-chefao": { en: "The Godfather", es: "El Padrino" },
    "pulp-fiction": { en: "Pulp Fiction", es: "Tiempos Violentos" },
    "star-wars": { en: "Star Wars: A New Hope", es: "Star Wars: Una Nueva Esperanza" },
    "harry-potter": {
      en: "Harry Potter and the Sorcerer's Stone",
      es: "Harry Potter y la Piedra Filosofal",
    },
    "todo-mundo-em-p-nico": { en: "Everybody in Panic", es: "Todos en Panico" },
  };
  const outPath = path.resolve(__dirname, "..", "src", "lib", "seed-i18n.ts");
  const gMap = (ptBR as any).genres as Record<string, string>;
  const all = [...(SEED_MEDIA as any[]), ...(MOCK_MEDIA as any[])];

  let total = 0,
    w = 0,
    empty = 0,
    orphan = 0,
    translated = 0,
    identical = 0,
    pending = 0,
    pendingNoTranslation = 0,
    pendingKeyMismatch = 0;
  const pendingIds: string[] = [];
  const result: Record<
    string,
    {
      titleLocalized: { pt: string; en: string; es: string };
      genreSlugs: string[];
      synopsis: { pt: string; en: string; es: string };
    }
  > = {};

  for (const e of all) {
    const id = canonicalKey(e);
    if (!id) continue;
    total++;
    const ptTitle = (e.title as string) || "";
    const slugKey2 = (e.slug || String(e.id || "")) as string;
    const cached = TRANSLATIONS_BY_ID[slugKey2];
    const tr = T[ptTitle] || (cached as any);
    const enTitle = tr?.en || (TITLE_IDENTICAL_WHITELIST.has(id) ? ptTitle : ptTitle);
    const esTitle =
      tr?.es || (TITLE_IDENTICAL_WHITELIST.has(ptTitle) ? ptTitle : tr?.en || ptTitle);
    if (!ptTitle || !enTitle || !esTitle) {
      empty++;
      continue;
    }

    // Classify (D-185)
    if (
      TITLE_IDENTICAL_WHITELIST.has(ptTitle) ||
      (tr && enTitle === esTitle && enTitle === ptTitle)
    ) {
      identical++;
    } else if (enTitle !== ptTitle || esTitle !== ptTitle) {
      translated++;
    } else if (cached || tr) {
      pending++;
      pendingKeyMismatch++;
      pendingIds.push(id);
    } else {
      pending++;
      pendingNoTranslation++;
      pendingIds.push(id);
    }

    const slugs: string[] = [];
    for (const g of e.genres || []) {
      const s = genreSlug(g as string);
      slugs.push(s);
      if (!gMap[s]) {
        console.error("ORPHAN: " + s + " from " + g + " in " + id);
        orphan++;
      }
    }
    result[id] = {
      titleLocalized: { pt: ptTitle, en: enTitle, es: esTitle },
      genreSlugs: slugs,
      synopsis: {
        pt: (e.synopsis || "") as string,
        en: SYNOPSIS_BY_ID[id]?.en || ((e.synopsis || "") as string),
        es: SYNOPSIS_BY_ID[id]?.es || ((e.synopsis || "") as string),
      },
    };
    w++;
  }

  console.log(
    "Universe(SEED+MOCK): " + all.length + " | Written: " + w + " | Total w/ id: " + total,
  );
  console.log("Empty: " + empty + " | Orphan: " + orphan);
  const dedupTranslated = Object.keys(result).filter(function (k) {
    const e = result[k];
    return (
      e.titleLocalized.en !== e.titleLocalized.pt || e.titleLocalized.es !== e.titleLocalized.pt
    );
  }).length;
  const dedupSynopses = Object.keys(result).filter(function (k) {
    const e = result[k];
    return e.synopsis.en !== e.synopsis.pt || e.synopsis.es !== e.synopsis.pt;
  }).length;
  console.log(
    "Title translated (dedup): " +
      dedupTranslated +
      " | synopses: " +
      dedupSynopses +
      " | identical-whitelist: " +
      TITLE_IDENTICAL_WHITELIST.size +
      " | NOTRANSLATION: " +
      pendingNoTranslation +
      " | KEYMISMATCH: " +
      pendingKeyMismatch +
      " | PENDING: " +
      pending,
  );
  if (pendingIds.length) console.log("PENDING ids: " + pendingIds.join(","));
  if (empty || orphan) {
    console.error("FAIL: asserts failed");
    process.exit(1);
  }

  fs.writeFileSync(
    outPath,
    "export const SEED_I18N: Record<string,{titleLocalized:{pt:string;en:string;es:string};genreSlugs:string[];synopsis:{pt:string;en:string;es:string}}> = " +
      JSON.stringify(result, null, 2) +
      ";\n",
  );
  console.log("Written: " + outPath + " (" + w + " entries)");
  const dedup: [string, string, string, string][] = [];
  for (const k in result) {
    const e = result[k];
    if (
      e.titleLocalized.en !== e.titleLocalized.pt ||
      e.titleLocalized.es !== e.titleLocalized.pt
    ) {
      dedup.push([k, e.titleLocalized.pt, e.titleLocalized.en, e.titleLocalized.es]);
    }
  }
  dedup.sort((a, b) => a[0].localeCompare(b[0]));
  console.log("DEDUP translated list: " + dedup.length + " distinct canonicalKeys");
  dedup.forEach((r) => console.log("  " + r[0] + " | " + r[1] + " | " + r[2] + " | " + r[3]));
  if (pending > 0) {
    console.log(
      "INCOMPLETE — NOTRANSLATION=" + pendingNoTranslation + " KEYMISMATCH=" + pendingKeyMismatch,
    );
  } else {
    console.log("PASS (0 pending)");
  }
}
main();
