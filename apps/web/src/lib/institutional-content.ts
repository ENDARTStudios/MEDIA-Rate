interface FaqItem {
  question: string;
  answer: string;
}

interface InstitutionalContent {
  about: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    lead: string;
    missionTitle: string;
    missionBody: string;
    productTitle: string;
    productBody: string;
    teamTitle: string;
    teamBody: string;
  };
  methodology: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    lead: string;
    scoreTitle: string;
    scoreBody: string;
    calculationTitle: string;
    calculationLead: string;
    calculationItems: { label: string; body: string }[];
    confidenceTitle: string;
    confidenceBody: string;
    sourceTitle: string;
    sourceBody: string;
    scopeTitle: string;
    scopeBody: string;
    faqTitle: string;
    faqs: FaqItem[];
  };
  sources: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    lead: string;
    coverageTitle: string;
    coverageBody: string;
    sourceTitle: string;
    sourceItems: { name: string; description: string }[];
    coveragematrix: string;
    covered: string;
    inPreparation: string;
    licensingTitle: string;
    licensingBody: string;
    transparencyTitle: string;
    transparencyBody: string;
  };
}

const content: Record<string, InstitutionalContent> = {
  "pt-BR": {
    about: {
      metaTitle: "Sobre o MEDIA Rate",
      metaDescription:
        "Conheça o MEDIA Rate, uma plataforma para descobrir filmes, séries e games com contexto de score. Animes são cobertos como gênero dentro de Séries. Livros e quadrinhos estão no roadmap e chegarão em atualização futura.",
      title: "Sobre o MEDIA Rate",
      lead: "Uma plataforma para tornar a descoberta de entretenimento mais clara, comparável e contextualizada.",
      missionTitle: "Nossa missão",
      missionBody:
        "Escolher o que assistir, jogar ou ler deveria exigir menos busca e mais contexto. O MEDIA Rate reúne informações de obras e apresenta um score consolidado para ajudar cada pessoa a começar sua decisão com sinais comparáveis.",
      productTitle: "O que fazemos",
      productBody:
        "Organizamos títulos de diferentes formatos de mídia, seus dados de contexto e as avaliações disponíveis por fonte. O MEDIA Score™ resume esses sinais, enquanto a página de cada obra mantém a sinopse, os gêneros, o ano e as fontes relevantes à descoberta.",
      teamTitle: "Responsabilidade editorial",
      teamBody:
        "O MEDIA Rate é desenvolvido pela END ART Studios. A plataforma busca deixar claras as fontes e os limites dos dados exibidos. Quando uma informação estiver incompleta ou indisponível, ela não deve ser apresentada como uma conclusão definitiva.",
    },
    methodology: {
      metaTitle: "Como o MEDIA Score é calculado",
      metaDescription:
        "Entenda como o MEDIA Rate normaliza avaliações, combina crítica, público e consenso e indica o nível de confiança do MEDIA Score.",
      title: "Como o MEDIA Score é calculado",
      lead: "O MEDIA Score™ organiza sinais de avaliação em uma referência única para facilitar a descoberta — sem substituir a sua opinião.",
      scoreTitle: "O que o score representa",
      scoreBody:
        "O score consolidado resume as avaliações disponíveis de uma obra depois de normalizar a escala de cada fonte. Ele é uma ferramenta de contexto: uma nota não substitui uma crítica, não prevê a experiência individual e deve ser lida ao lado das fontes exibidas na ficha da obra.",
      calculationTitle: "Como o cálculo é composto (v3)",
      calculationLead:
        "O MEDIA Score™ v3 combina crítica, público e consenso com pesos específicos por tipo de mídia (filmes e séries: 40/40/20; games: 55/35/10) e aplica um estimador Bayesiano que puxa obras com poucos votos para a média do catálogo. O consenso realimenta a nota: sinais divergentes entre crítica e público ajustam o score.",
      calculationItems: [
        {
          label: "Crítica (peso por tipo)",
          body: "Média normalizada das fontes de crítica especializada — 40% em filmes e séries, 55% em games, quando disponível.",
        },
        {
          label: "Público (peso por tipo)",
          body: "Média normalizada das fontes de audiência — 40% em filmes e séries, 35% em games.",
        },
        {
          label: "Consenso (realimenta)",
          body: "Mede a concordância entre crítica e público e REALIMENTA o score (20% em filmes e séries, 10% em games). Obras com sinais divergentes são corrigidas, evitando notas infladas por discordância.",
        },
      ],
      confidenceTitle: "Nível de confiança",
      confidenceBody:
        "Além da nota, o sistema calcula um indicador de confiança (Alta ≥ 70, Média ≥ 40, Baixa < 40) a partir do volume de votos, do número de fontes, da dispersão das notas e da idade dos dados. Scores com baixa confiança são sinalizados com alerta — nunca ocultados.",
      sourceTitle: "Fontes ativas",
      sourceBody:
        "A lista abaixo é gerada diretamente do registro de fontes do produto (uma única fonte de verdade) — toda fonte ativa aparece aqui, incluindo Trakt.tv.",
      scopeTitle: "Escopo e limitações",
      scopeBody:
        "A disponibilidade de fontes varia por tipo de mídia e por obra. O MEDIA Rate só pode consolidar o que está disponível em suas fontes integradas; por isso, páginas diferentes podem ter escopos de dados distintos. Sempre que possível, a ficha da obra deve exibir o contexto que sustenta a nota.",
      faqTitle: "Perguntas frequentes",
      faqs: [
        {
          question: "O MEDIA Score é uma crítica?",
          answer:
            "Não. Ele é um indicador consolidado de sinais de avaliação e deve ser usado como ponto de partida, não como substituto de uma análise crítica individual.",
        },
        {
          question: "Por que duas obras podem ter níveis de confiança diferentes?",
          answer:
            "Porque a cobertura, o volume e a concordância entre fontes podem variar de uma obra para outra.",
        },
        {
          question: "As fontes usam a mesma escala?",
          answer:
            "Não. O motor normaliza a escala de cada fonte antes de combinar os sinais disponíveis.",
        },
        {
          question: "A plataforma é gratuita?",
          answer:
            "Sim. O catálogo, busca e MEDIA Score™ são gratuitos. Recomendações ilimitadas e funcionalidades avançadas exigem um plano Plus ou Premium.",
        },
      ],
    },
    sources: {
      metaTitle: "Fontes e cobertura do MEDIA Score",
      metaDescription:
        "Veja os tipos de fontes que podem compor o MEDIA Score e entenda como a cobertura varia por obra e por mídia.",
      title: "Fontes e cobertura",
      lead: "A qualidade de um score depende da clareza sobre os dados que o sustentam. Por isso, o MEDIA Rate trata fontes e cobertura como parte do contexto da obra.",
      coverageTitle: "A cobertura varia por obra",
      coverageBody:
        "Nem toda fonte contém dados para toda mídia. A composição do score depende da disponibilidade de sinais integrados para cada obra; a ausência de uma fonte não significa um julgamento negativo sobre ela ou sobre o título.",
      sourceTitle: "Fontes suportadas pela plataforma",
      sourceItems: [
        {
          name: "TMDB",
          description: "Metadados e sinais de avaliação para filmes e séries.",
        },
        {
          name: "IMDb",
          description: "Dados de avaliação e contexto para títulos audiovisuais.",
        },
        {
          name: "Rotten Tomatoes",
          description: "Sinais de crítica especializada para filmes e séries.",
        },
        {
          name: "Metacritic",
          description: "Sinais de crítica e público para filmes, séries e games.",
        },
        {
          name: "TVMaze",
          description: "Metadados e avaliações para séries.",
        },
        {
          name: "Letterboxd",
          description: "Avaliações de público para filmes.",
        },
        {
          name: "Trakt",
          description: "Avaliações de público para filmes e séries.",
        },
        {
          name: "IGDB",
          description: "Dados e avaliações para games.",
        },
        {
          name: "OpenCritic",
          description: "Crítica agregada para games.",
        },
        {
          name: "Steam",
          description: "Avaliações de público para games (Steam Store).",
        },
        {
          name: "SteamSpy",
          description: "Sinais de engajamento para games.",
        },
      ],
      transparencyTitle: "Transparência antes de precisão aparente",
      transparencyBody:
        "Uma nota sem escopo pode parecer mais precisa do que realmente é. O MEDIA Rate busca associar a nota às fontes, à cobertura e ao nível de confiança aplicável a cada obra.",
      coveragematrix: "Cobertura por categoria",
      covered: "Coberto",
      inPreparation: "Em preparação",
      licensingTitle: "Atribuição e licenciamento de dados",
      licensingBody:
        "O MEDIA Score consolida notas numéricas e metadados obtidos de fontes de terceiros (TMDB, IMDb, Rotten Tomatoes, Metacritic, TVMaze, Letterboxd, Trakt, IGDB, OpenCritic, Steam e outras), conforme os termos das respectivas APIs e políticas de uso. Nomes, logotipos, notas, sinopses e imagens pertencem aos seus respectivos proprietários; sua presença não implica endosso, parceria ou afiliação. O MEDIA Rate não transmite nem distribui as obras. Notas numéricas são tratadas como fatos estatísticos; atribuição, cache e demais obrigações seguem os termos de cada fonte. Consulte a política de cada fornecedor para os detalhes completos.",
    },
  },
  "en-US": {
    about: {
      metaTitle: "About MEDIA Rate",
      metaDescription:
        "Learn about MEDIA Rate, a platform for discovering movies, series and games with score context. Anime is covered as a genre within Series. Books and comics are on the roadmap and coming in a future update.",
      title: "About MEDIA Rate",
      lead: "A platform that makes entertainment discovery clearer, more comparable and more contextual.",
      missionTitle: "Our mission",
      missionBody:
        "Choosing what to watch, play or read should require less searching and more context. MEDIA Rate brings together title information and a consolidated score to help people start their decisions with comparable signals.",
      productTitle: "What we do",
      productBody:
        "We organize titles across media formats, their contextual data and the ratings available by source. MEDIA Score™ summarizes those signals, while each title page keeps the synopsis, genres, year and source context relevant to discovery.",
      teamTitle: "Editorial responsibility",
      teamBody:
        "MEDIA Rate is developed by END ART Studios. The platform seeks to make the sources and limitations of the displayed data clear. When information is incomplete or unavailable, it should not be presented as a definitive conclusion.",
    },
    methodology: {
      metaTitle: "How MEDIA Score is calculated",
      metaDescription:
        "Learn how MEDIA Rate normalizes ratings, combines critics, audience and consensus signals, and indicates MEDIA Score confidence.",
      title: "How MEDIA Score is calculated",
      lead: "MEDIA Score™ organizes rating signals into one reference to make discovery easier — without replacing your own opinion.",
      scoreTitle: "What the score represents",
      scoreBody:
        "The consolidated score summarizes the ratings available for a title after normalizing each source scale. It is a context tool: a score does not replace a review, does not predict an individual experience and should be read alongside the sources shown on the title page.",
      calculationTitle: "How the Calculation Works (v3)",
      calculationLead:
        "MEDIA Score™ v3 combines critics, audience and consensus with media-type weights (movies and series: 40/40/20; games: 55/35/10) and applies a Bayesian estimator that pulls titles with few votes toward the catalog average. Consensus feeds back into the score: divergent critic–audience signals adjust the score downward.",
      calculationItems: [
        {
          label: "Critics (weight per type)",
          body: "Normalized average of professional criticism sources — 40% for movies and series, 55% for games, when available.",
        },
        {
          label: "Audience (weight per type)",
          body: "Normalized average of audience rating sources — 40% for movies and series, 35% for games.",
        },
        {
          label: "Consensus (feeds back)",
          body: "Measures critic–audience agreement and FEEDS BACK into the score (20% for movies and series, 10% for games). Titles with divergent signals are corrected, avoiding inflated scores.",
        },
      ],
      confidenceTitle: "Confidence level",
      confidenceBody:
        "Alongside the score, the system calculates a confidence indicator (High ≥ 70, Medium ≥ 40, Low < 40) from vote volume, number of sources, rating dispersion and data age. Low-confidence scores are flagged with a warning — never hidden.",
      sourceTitle: "Active sources",
      sourceBody:
        "The list below is generated directly from the product's source registry (a single source of truth) — every active source appears here, including Trakt.tv.",
      scopeTitle: "Scope and limitations",
      scopeBody:
        "Source availability varies by media type and title. MEDIA Rate can only consolidate information available through its integrated sources, so pages can have different data coverage. Whenever possible, the title page should show the context supporting the score.",
      faqTitle: "Frequently asked questions",
      faqs: [
        {
          question: "Is MEDIA Score a review?",
          answer:
            "No. It is a consolidated indicator of rating signals and should be used as a starting point, not as a replacement for an individual critical analysis.",
        },
        {
          question: "Why can two titles have different confidence levels?",
          answer:
            "Because source coverage, volume and agreement may vary from one title to another.",
        },
        {
          question: "Do sources use the same scale?",
          answer:
            "No. The engine normalizes each source scale before combining the available signals.",
        },
        {
          question: "Is the platform free?",
          answer:
            "Yes. The catalog, search and MEDIA Score™ are free. Unlimited recommendations and advanced features require a Plus or Premium plan.",
        },
      ],
    },
    sources: {
      metaTitle: "MEDIA Score sources and coverage",
      metaDescription:
        "See the types of sources that can inform MEDIA Score and how coverage varies by title and media type.",
      title: "Sources and coverage",
      lead: "The value of a score depends on clarity about the data behind it. For that reason, MEDIA Rate treats sources and coverage as part of a title's context.",
      coverageTitle: "Coverage varies by title",
      coverageBody:
        "Not every source has data for every media item. Score composition depends on the integrated signals available for each title; a missing source is not a negative judgment about the source or the title.",
      sourceTitle: "Sources supported by the platform",
      sourceItems: [
        {
          name: "TMDB",
          description: "Metadata and rating signals for movies and series.",
        },
        {
          name: "IMDb",
          description: "Rating and context data for audiovisual titles.",
        },
        {
          name: "Rotten Tomatoes",
          description: "Professional criticism signals for movies and series.",
        },
        {
          name: "Metacritic",
          description: "Critic and audience signals for movies, series and games.",
        },
        {
          name: "TVMaze",
          description: "Metadata and ratings for series.",
        },
        {
          name: "Letterboxd",
          description: "Audience ratings for movies.",
        },
        {
          name: "Trakt",
          description: "Audience ratings for movies and series.",
        },
        {
          name: "IGDB",
          description: "Data and ratings for games.",
        },
        {
          name: "OpenCritic",
          description: "Aggregated criticism for games.",
        },
        {
          name: "Steam",
          description: "Audience ratings for games (Steam Store).",
        },
        {
          name: "SteamSpy",
          description: "Engagement signals for games.",
        },
      ],
      transparencyTitle: "Transparency over apparent precision",
      transparencyBody:
        "A score without scope may look more precise than it is. MEDIA Rate aims to associate each score with the sources, coverage and confidence level applicable to that title.",
      coveragematrix: "Coverage by category",
      covered: "Covered",
      inPreparation: "In preparation",
      licensingTitle: "Attribution and data licensing",
      licensingBody:
        "The MEDIA Score consolidates numeric ratings and metadata obtained from third-party sources (TMDB, IMDb, Rotten Tomatoes, Metacritic, TVMaze, Letterboxd, Trakt, IGDB, OpenCritic, Steam and others), per the terms of their respective APIs and usage policies. Names, logos, ratings, synopses and images belong to their respective owners; their presence does not imply endorsement, partnership or affiliation. MEDIA Rate does not distribute the works themselves. Numeric ratings are treated as statistical facts; attribution, cache and other obligations follow each source's terms. See each provider's policy for details.",
    },
  },
  "es-ES": {
    about: {
      metaTitle: "Acerca de MEDIA Rate",
      metaDescription:
        "Conoce MEDIA Rate, una plataforma para descubrir películas, series y juegos con contexto de puntuación. El anime está cubierto como género dentro de Series. Libros y cómics están en la hoja de ruta y llegarán en una actualización futura.",
      title: "Acerca de MEDIA Rate",
      lead: "Una plataforma que hace que descubrir entretenimiento sea más claro, comparable y contextualizado.",
      missionTitle: "Nuestra misión",
      missionBody:
        "Elegir qué ver, jugar o leer debería requerir menos búsqueda y más contexto. MEDIA Rate reúne información de obras y una puntuación consolidada para ayudar a las personas a empezar sus decisiones con señales comparables.",
      productTitle: "Qué hacemos",
      productBody:
        "Organizamos títulos de distintos formatos, sus datos contextuales y las valoraciones disponibles por fuente. MEDIA Score™ resume esas señales, mientras que cada ficha mantiene la sinopsis, los géneros, el año y el contexto de fuentes relevantes para descubrir una obra.",
      teamTitle: "Responsabilidad editorial",
      teamBody:
        "MEDIA Rate está desarrollado por END ART Studios. La plataforma busca dejar claras las fuentes y las limitaciones de los datos mostrados. Cuando una información es incompleta o no está disponible, no debe presentarse como una conclusión definitiva.",
    },
    methodology: {
      metaTitle: "Cómo se calcula el MEDIA Score",
      metaDescription:
        "Descubre cómo MEDIA Rate normaliza valoraciones, combina crítica, público y consenso, e indica el nivel de confianza del MEDIA Score.",
      title: "Cómo se calcula el MEDIA Score",
      lead: "MEDIA Score™ organiza señales de valoración en una única referencia para facilitar el descubrimiento, sin sustituir tu propia opinión.",
      scoreTitle: "Qué representa la puntuación",
      scoreBody:
        "La puntuación consolidada resume las valoraciones disponibles de una obra tras normalizar la escala de cada fuente. Es una herramienta de contexto: una nota no sustituye una crítica, no predice la experiencia individual y debe leerse junto con las fuentes mostradas en la ficha.",
      calculationTitle: "Cómo Funciona el Cálculo (v3)",
      calculationLead:
        "El MEDIA Score™ v3 combina crítica, público y consenso con pesos específicos por tipo de medio (películas y series: 40/40/20; juegos: 55/35/10) y aplica un estimador bayesiano que acerca las obras con pocos votos a la media del catálogo. El consenso realimenta la nota: las señales divergentes entre crítica y público ajustan la puntuación.",
      calculationItems: [
        {
          label: "Crítica (peso por tipo)",
          body: "Promedio normalizado de fuentes de crítica especializada — 40% en películas y series, 55% en juegos, cuando está disponible.",
        },
        {
          label: "Público (peso por tipo)",
          body: "Promedio normalizado de fuentes de audiencia — 40% en películas y series, 35% en juegos.",
        },
        {
          label: "Consenso (realimenta)",
          body: "Mide la concordancia entre crítica y público y REALIMENTA la puntuación (20% en películas y series, 10% en juegos). Las obras con señales divergentes se corrigen, evitando notas infladas.",
        },
      ],
      confidenceTitle: "Nivel de confianza",
      confidenceBody:
        "Además de la nota, el sistema calcula un indicador de confianza (Alta ≥ 70, Media ≥ 40, Baja < 40) a partir del volumen de votos, el número de fuentes, la dispersión de las notas y la antigüedad de los datos. Las puntuaciones de baja confianza se señalan con alerta — nunca se ocultan.",
      sourceTitle: "Fuentes activas",
      sourceBody:
        "La lista siguiente se genera directamente del registro de fuentes del producto (una única fuente de verdad) — toda fuente activa aparece aquí, incluida Trakt.tv.",
      scopeTitle: "Alcance y limitaciones",
      scopeBody:
        "La disponibilidad de fuentes varía por tipo de media y por obra. MEDIA Rate solo puede consolidar la información disponible en sus fuentes integradas, por lo que las fichas pueden tener coberturas de datos distintas. Siempre que sea posible, la ficha debe mostrar el contexto que respalda la puntuación.",
      faqTitle: "Preguntas frecuentes",
      faqs: [
        {
          question: "¿MEDIA Score es una crítica?",
          answer:
            "No. Es un indicador consolidado de señales de valoración y debe usarse como punto de partida, no como sustituto de un análisis crítico individual.",
        },
        {
          question: "¿Por qué dos obras pueden tener niveles de confianza diferentes?",
          answer:
            "Porque la cobertura, el volumen y la concordancia entre las fuentes pueden variar de una obra a otra.",
        },
        {
          question: "¿Las fuentes usan la misma escala?",
          answer:
            "No. El motor normaliza la escala de cada fuente antes de combinar las señales disponibles.",
        },
        {
          question: "¿La plataforma es gratuita?",
          answer:
            "Sí. El catálogo, la búsqueda y el MEDIA Score™ son gratuitos. Las recomendaciones ilimitadas y funcionalidades avanzadas requieren un plan Plus o Premium.",
        },
      ],
    },
    sources: {
      metaTitle: "Fuentes y cobertura del MEDIA Score",
      metaDescription:
        "Consulta los tipos de fuentes que pueden componer el MEDIA Score y cómo la cobertura varía por obra y tipo de media.",
      title: "Fuentes y cobertura",
      lead: "El valor de una puntuación depende de la claridad sobre los datos que la sustentan. Por eso MEDIA Rate trata las fuentes y la cobertura como parte del contexto de cada obra.",
      coverageTitle: "La cobertura varía por obra",
      coverageBody:
        "No todas las fuentes tienen datos para cada obra. La composición de la puntuación depende de las señales integradas disponibles para cada título; la ausencia de una fuente no es un juicio negativo sobre la fuente o la obra.",
      sourceTitle: "Fuentes compatibles con la plataforma",
      sourceItems: [
        {
          name: "TMDB",
          description: "Metadatos y señales de valoración para películas y series.",
        },
        {
          name: "IMDb",
          description: "Datos de valoración y contexto para títulos audiovisuales.",
        },
        {
          name: "Rotten Tomatoes",
          description: "Señales de crítica especializada para películas y series.",
        },
        {
          name: "Metacritic",
          description: "Señales de crítica y público para películas, series y juegos.",
        },
        {
          name: "TVMaze",
          description: "Metadatos y valoraciones para series.",
        },
        {
          name: "Letterboxd",
          description: "Valoraciones de público para películas.",
        },
        {
          name: "Trakt",
          description: "Valoraciones de público para películas y series.",
        },
        {
          name: "IGDB",
          description: "Datos y valoraciones para juegos.",
        },
        {
          name: "OpenCritic",
          description: "Crítica agregada para juegos.",
        },
        {
          name: "Steam",
          description: "Valoraciones de público para juegos (Steam Store).",
        },
        {
          name: "SteamSpy",
          description: "Señales de engagement para juegos.",
        },
      ],
      transparencyTitle: "Transparencia antes que precisión aparente",
      transparencyBody:
        "Una puntuación sin alcance puede parecer más precisa de lo que realmente es. MEDIA Rate busca asociar cada nota con las fuentes, la cobertura y el nivel de confianza aplicables a esa obra.",
      coveragematrix: "Cobertura por categoría",
      covered: "Cubierto",
      inPreparation: "En preparación",
      licensingTitle: "Atribución y licencia de datos",
      licensingBody:
        "El MEDIA Score consolida calificaciones numéricas y metadatos obtenidos de fuentes de terceros (TMDB, IMDb, Rotten Tomatoes, Metacritic, TVMaze, Letterboxd, Trakt, IGDB, OpenCritic, Steam y otras), según los términos de sus respectivas API y políticas de uso. Nombres, logotipos, notas, sinopsis e imágenes pertenecen a sus respectivos propietarios; su presencia no implica respaldo, afiliación ni sociedad. MEDIA Rate no distribuye las obras. Las notas numéricas se tratan como hechos estadísticos; la atribución, caché y demás obligaciones siguen los términos de cada fuente. Consulte la política de cada proveedor para los detalles.",
    },
  },
};

export function getInstitutionalContent(locale: string): InstitutionalContent {
  return content[locale] || content["pt-BR"];
}
