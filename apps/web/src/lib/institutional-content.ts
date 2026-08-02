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
      calculationTitle: "Como o cálculo é composto (v2)",
      calculationLead:
        "O MEDIA Score™ v2 calcula a nota global como a média simples entre crítica e público quando ambos os dados estão disponíveis. Quando apenas uma das fontes existe — como em filmes e séries — o score reflete essa fonte. O consenso entre crítica e público é um indicador separado e informativo: NÃO entra no cálculo da nota.",
      calculationItems: [
        {
          label: "Crítica (50%)",
          body: "Média normalizada das fontes classificadas como crítica especializada. Quando disponível.",
        },
        {
          label: "Público (50%)",
          body: "Média normalizada das fontes classificadas como avaliações de audiência.",
        },
        {
          label: "Consenso (informativo)",
          body: "Indicador separado que mede a concordância entre crítica e público (0–10). NÃO realimenta o cálculo do score global — serve apenas para contextualizar a divergência.",
        },
      ],
      confidenceTitle: "Nível de confiança",
      confidenceBody:
        "Além da nota, o sistema calcula um indicador de confiança a partir da cobertura de fontes, do volume de sinais disponíveis, da concordância entre crítica e público e da existência de dados. Uma confiança menor indica que a leitura do score deve ser mais cautelosa.",
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
          name: "IMDb",
          description:
            "Dados de avaliação e contexto para títulos audiovisuais, quando disponíveis.",
        },
        {
          name: "TMDB",
          description: "Metadados e sinais de avaliação para filmes e séries, quando disponíveis.",
        },
        {
          name: "Rotten Tomatoes e TMDB",
          description:
            "Sinais de crítica especializada, quando disponibilizados na integração da obra.",
        },
        {
          name: "IGDB e RAWG",
          description: "Dados de contexto e avaliação para jogos, quando disponíveis.",
        },
        {
          name: "Open Library",
          description: "Categorias adicionais (livros/quadrinhos) planejadas para o futuro.",
        },
      ],
      transparencyTitle: "Transparência antes de precisão aparente",
      transparencyBody:
        "Uma nota sem escopo pode parecer mais precisa do que realmente é. O MEDIA Rate busca associar a nota às fontes, à cobertura e ao nível de confiança aplicável a cada obra.",
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
      calculationTitle: "How the Calculation Works (v2)",
      calculationLead:
        "The MEDIA Score™ v2 calculates the global score as the simple average of critics and audience when both are available. When only one source exists — as in movies and series — the score reflects that source. Consensus between critics and audience is a separate, informative indicator: it does NOT factor into the score calculation.",
      calculationItems: [
        {
          label: "Critics (50%)",
          body: "Normalized average of sources classified as professional criticism. When available.",
        },
        {
          label: "Audience (50%)",
          body: "Normalized average of sources classified as audience ratings.",
        },
        {
          label: "Consensus (informative)",
          body: "Separate indicator measuring agreement between critics and audience (0–10). Does NOT feed back into the global score — only provides context on divergence.",
        },
      ],
      confidenceTitle: "Confidence level",
      confidenceBody:
        "Alongside the score, the system calculates a confidence indicator from source coverage, signal volume, critic–audience agreement and data availability. Lower confidence means the score should be interpreted more cautiously.",
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
          name: "IMDb",
          description: "Rating and context data for audiovisual titles, when available.",
        },
        {
          name: "TMDB",
          description: "Metadata and rating signals for movies and series, when available.",
        },
        {
          name: "Rotten Tomatoes and TMDB",
          description:
            "Professional criticism signals, when available through the title integration.",
        },
        {
          name: "IGDB and RAWG",
          description: "Context and rating data for games, when available.",
        },
        {
          name: "Open Library",
          description: "Additional categories (books/comics) planned for the future.",
        },
      ],
      transparencyTitle: "Transparency over apparent precision",
      transparencyBody:
        "A score without scope may look more precise than it is. MEDIA Rate aims to associate each score with the sources, coverage and confidence level applicable to that title.",
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
      calculationTitle: "Cómo Funciona el Cálculo (v2)",
      calculationLead:
        "El MEDIA Score™ v2 calcula la nota global como el promedio simple entre crítica y público cuando ambos están disponibles. Cuando solo una fuente existe — como en películas y series — la nota refleja esa fuente. El consenso entre crítica y público es un indicador separado e informativo: NO entra en el cálculo de la nota.",
      calculationItems: [
        {
          label: "Crítica (50%)",
          body: "Promedio normalizado de fuentes clasificadas como crítica especializada. Cuando está disponible.",
        },
        {
          label: "Público (50%)",
          body: "Promedio normalizado de fuentes clasificadas como valoraciones de audiencia.",
        },
        {
          label: "Consenso (informativo)",
          body: "Indicador separado que mide la concordancia entre crítica y público (0–10). NO realimenta el cálculo del score global — solo proporciona contexto sobre la divergencia.",
        },
      ],
      confidenceTitle: "Nivel de confianza",
      confidenceBody:
        "Además de la nota, el sistema calcula un indicador de confianza a partir de la cobertura de fuentes, el volumen de señales disponibles, la concordancia entre crítica y público y la disponibilidad de datos. Una confianza menor exige una lectura más cautelosa.",
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
          name: "IMDb",
          description:
            "Datos de valoración y contexto para títulos audiovisuales, cuando están disponibles.",
        },
        {
          name: "TMDB",
          description:
            "Metadatos y señales de valoración para películas y series, cuando están disponibles.",
        },
        {
          name: "Rotten Tomatoes y TMDB",
          description:
            "Señales de crítica especializada, cuando están disponibles en la integración de la obra.",
        },
        {
          name: "IGDB y RAWG",
          description: "Datos de contexto y valoración para juegos, cuando están disponibles.",
        },
        {
          name: "Open Library",
          description: "Categorías adicionales (libros/cómics) planeadas para el futuro.",
        },
      ],
      transparencyTitle: "Transparencia antes que precisión aparente",
      transparencyBody:
        "Una puntuación sin alcance puede parecer más precisa de lo que realmente es. MEDIA Rate busca asociar cada nota con las fuentes, la cobertura y el nivel de confianza aplicables a esa obra.",
    },
  },
};

export function getInstitutionalContent(locale: string): InstitutionalContent {
  return content[locale] || content["pt-BR"];
}
