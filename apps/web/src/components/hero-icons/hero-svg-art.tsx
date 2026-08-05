/**
 * SVGs ilustrativos premium do Hero (T5a-hero-3d-fix-v3.1).
 *
 * Correções da v3:
 * - NENHUM elemento animado ([data-part]) tem atributo `transform`:
 *   o Anime.js substitui o atributo por CSS e a peça voa para a origem
 *   do viewport. Agora o posicionamento vive em um <g> wrapper ESTÁTICO
 *   e a geometria animada começa no próprio pivô (0,0 local).
 * - Artes redesenhadas em estilo bold: traços grossos, formas grandes,
 *   gradientes de alto contraste, sem sobreposições geométricas.
 */
const FONT = "Arial, Helvetica, sans-serif";

/* ============================ FILME (claquete) ============================ */

export function FilmArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-film">
      <defs>
        <linearGradient id="mr-film-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93592F" />
          <stop offset="55%" stopColor="#5E3A1C" />
          <stop offset="100%" stopColor="#33200F" />
        </linearGradient>
        <linearGradient id="mr-film-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4C9DC" />
          <stop offset="100%" stopColor="#5B6074" />
        </linearGradient>
        <radialGradient id="mr-film-sheen" cx="0.35" cy="0.2" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id="mr-film-stripes">
          <rect x="0" y="12" width="76" height="17" rx="2" />
        </clipPath>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="107" rx="44" ry="7" fill="#000000" opacity="0.5" />

      {/* Flash de impacto (one-shot — atributo opacity 0 até o hover) */}
      <g data-part="flash" opacity="0">
        <path
          d="M60 6 L68 45 L107 52 L68 59 L60 98 L52 59 L13 52 L52 45 Z"
          fill="#FFFFFF"
          stroke="#FFD27D"
          strokeWidth="2"
        />
      </g>

      {/* Base de madeira */}
      <g>
        <rect
          x="20"
          y="58"
          width="80"
          height="46"
          rx="11"
          fill="url(#mr-film-wood)"
          stroke="#1E0E04"
          strokeWidth="3"
        />
        <path
          d="M25 67 H95 M25 76 H95 M25 85 H95 M25 94 H95"
          stroke="#241206"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M30 71 H90 M30 80 H90 M30 89 H90"
          stroke="#D99B62"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.22"
        />
        <rect x="20" y="58" width="80" height="46" rx="11" fill="url(#mr-film-sheen)" />
        <text
          x="60"
          y="84"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="14"
          fontWeight="800"
          letterSpacing="3"
          fill="#F7E9CB"
        >
          SCENE 1
        </text>
        <rect x="34" y="93" width="52" height="3" rx="1.5" fill="#F7E9CB" opacity="0.5" />
      </g>

      {/* Boca articulada — pivô na dobradiça (22,54). O wrapper carrega o
          translate; a geometria animada começa em (0,0) local. */}
      <g transform="translate(22, 54)">
        <g data-part="mouth">
          {/* barra superior */}
          <rect
            x="0"
            y="0"
            width="76"
            height="12"
            rx="5"
            fill="#171A26"
            stroke="#0A0B11"
            strokeWidth="2.5"
          />
          <rect x="3" y="2.5" width="70" height="3" rx="1.5" fill="#FFFFFF" opacity="0.25" />
          {/* quadro das listras */}
          <rect
            x="0"
            y="12"
            width="76"
            height="17"
            fill="#0C0E16"
            stroke="#0A0B11"
            strokeWidth="2"
          />
          <g clipPath="url(#mr-film-stripes)">
            <path
              d="M-8 31 L12 3 H28 L8 31 Z M18 31 L38 3 H54 L34 31 Z M44 31 L64 3 H80 L60 31 Z M70 31 L90 3 H106 L86 31 Z"
              fill="#F5F0E6"
            />
          </g>
          <rect x="0" y="12" width="76" height="2" fill="#FFFFFF" opacity="0.2" />
          <rect x="0" y="27" width="76" height="2" fill="#000000" opacity="0.45" />
        </g>
      </g>

      {/* Dobradiças metálicas (estáticas, sobre a junta) */}
      <circle cx="28" cy="54" r="5" fill="url(#mr-film-metal)" stroke="#0A0B11" strokeWidth="2" />
      <circle cx="28" cy="54" r="1.8" fill="#0A0B11" />
      <circle
        cx="38"
        cy="54"
        r="3.8"
        fill="url(#mr-film-metal)"
        stroke="#0A0B11"
        strokeWidth="1.8"
      />
      <circle cx="38" cy="54" r="1.4" fill="#0A0B11" />
    </svg>
  );
}

/* ============================= SÉRIE (televisão) ============================= */

export function TvArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-tv">
      <defs>
        <linearGradient id="mr-tv-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5E6480" />
          <stop offset="45%" stopColor="#2E3146" />
          <stop offset="100%" stopColor="#171926" />
        </linearGradient>
        <linearGradient id="mr-tv-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#151A33" />
          <stop offset="100%" stopColor="#070912" />
        </linearGradient>
        <linearGradient id="mr-tv-reflect" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="107" rx="42" ry="6.5" fill="#000000" opacity="0.5" />

      {/* Antenas */}
      <g strokeLinecap="round">
        <line x1="40" y1="34" x2="25" y2="12" stroke="#9AA0B8" strokeWidth="3" />
        <line x1="80" y1="34" x2="95" y2="12" stroke="#9AA0B8" strokeWidth="3" />
        <circle cx="25" cy="12" r="4" fill="#F87171" stroke="#0A0B11" strokeWidth="1.5" />
        <circle cx="95" cy="12" r="4" fill="#34D399" stroke="#0A0B11" strokeWidth="1.5" />
      </g>

      {/* Moldura grossa */}
      <rect
        x="14"
        y="28"
        width="92"
        height="64"
        rx="12"
        fill="url(#mr-tv-frame)"
        stroke="#0A0B11"
        strokeWidth="3"
      />
      <rect
        x="16"
        y="30"
        width="88"
        height="60"
        rx="10"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.15"
        strokeWidth="1.5"
      />

      {/* Tela */}
      <rect
        x="22"
        y="36"
        width="64"
        height="46"
        rx="6"
        fill="url(#mr-tv-screen)"
        stroke="#0A0B11"
        strokeWidth="2.5"
      />
      <path d="M22 36 H86 V47 L22 47 Z" fill="url(#mr-tv-reflect)" />

      {/* Conteúdo (one-shot: acende) */}
      <g data-part="screen">
        <rect x="29" y="43" width="50" height="32" rx="4" fill="#0A0D1D" />
        <path d="M41 50 L58 59 L41 68 Z" fill="#60A5FA" />
        <rect x="63" y="50" width="4.5" height="18" rx="2" fill="#93C5FD" />
        <rect x="70" y="53" width="4.5" height="15" rx="2" fill="#A5B4FC" />
        <rect x="77" y="47" width="4.5" height="21" rx="2" fill="#818CF8" />
      </g>

      {/* Scanline (one-shot: varre a tela — barra fina no topo da tela) */}
      <rect
        x="22"
        y="36"
        width="64"
        height="5"
        rx="2.5"
        fill="#FFFFFF"
        opacity="0.35"
        data-part="scanline"
      />

      {/* Base com botões */}
      <rect
        x="14"
        y="92"
        width="92"
        height="10"
        rx="5"
        fill="url(#mr-tv-frame)"
        stroke="#0A0B11"
        strokeWidth="3"
      />
      <rect x="58" y="95" width="20" height="4.5" rx="2.25" fill="#0E1017" />
      <circle cx="86" cy="97" r="3" fill="#F87171" stroke="#7F1D1D" strokeWidth="1.5" />
      <circle cx="94" cy="97" r="3" fill="#34D399" stroke="#064E3B" strokeWidth="1.5" />

      {/* Pernas */}
      <path
        d="M36 102 L27 109 H45 Z"
        fill="#1C1E2C"
        stroke="#0A0B11"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M84 102 L75 109 H93 Z"
        fill="#1C1E2C"
        stroke="#0A0B11"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================= GAME (controle) ============================= */

export function GameArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-game">
      <defs>
        <radialGradient id="mr-gp-body" cx="0.45" cy="0.28" r="0.95">
          <stop offset="0%" stopColor="#41455C" />
          <stop offset="45%" stopColor="#262834" />
          <stop offset="100%" stopColor="#101118" />
        </radialGradient>
        <linearGradient id="mr-gp-dpad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#767C95" />
          <stop offset="100%" stopColor="#2E3140" />
        </linearGradient>
        <radialGradient id="mr-gp-analog" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#50546C" />
          <stop offset="100%" stopColor="#191B26" />
        </radialGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="105" rx="46" ry="7" fill="#000000" opacity="0.55" />

      {/* Gatilhos */}
      <rect
        x="27"
        y="22"
        width="24"
        height="16"
        rx="8"
        fill="#1C1E2A"
        stroke="#0A0B11"
        strokeWidth="2"
      />
      <rect
        x="69"
        y="22"
        width="24"
        height="16"
        rx="8"
        fill="#1C1E2A"
        stroke="#0A0B11"
        strokeWidth="2"
      />

      {/* Corpo */}
      <path
        d="M24 40 C24 23 42 18 60 18 C78 18 96 23 96 40 L96 62 C96 86 82 98 60 98 C38 98 24 86 24 62 Z"
        fill="url(#mr-gp-body)"
        stroke="#0A0B11"
        strokeWidth="3"
      />
      <path
        d="M24 62 C24 83 32 93 44 97 L43 90 C34 86 28 77 28 62 Z"
        fill="#000000"
        opacity="0.35"
      />
      <path
        d="M96 62 C96 83 88 93 76 97 L77 90 C86 86 92 77 92 62 Z"
        fill="#000000"
        opacity="0.35"
      />
      <path
        d="M32 30 C40 25 50 22 60 22 C70 22 80 25 88 30"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.14"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* D-pad */}
      <g>
        <rect
          x="33"
          y="41"
          width="8"
          height="26"
          rx="3"
          fill="url(#mr-gp-dpad)"
          stroke="#0A0B11"
          strokeWidth="2"
        />
        <rect
          x="29"
          y="49"
          width="16"
          height="8"
          rx="3"
          fill="url(#mr-gp-dpad)"
          stroke="#0A0B11"
          strokeWidth="2"
        />
        <circle cx="37" cy="54" r="2.6" fill="#0A0B11" opacity="0.6" />
      </g>

      {/* Botões Y/B/A/X (one-shot: combo acende em elastic stagger) */}
      <g data-part="button-1">
        <circle cx="74" cy="39" r="8.5" fill="#F87171" stroke="#7F1D1D" strokeWidth="2.2" />
        <ellipse cx="72" cy="36.5" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.4" />
        <text
          x="74"
          y="43"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="8.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          Y
        </text>
      </g>
      <g data-part="button-2">
        <circle cx="88" cy="54" r="8.5" fill="#60A5FA" stroke="#1E3A8A" strokeWidth="2.2" />
        <ellipse cx="86" cy="51.5" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.4" />
        <text
          x="88"
          y="58"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="8.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          B
        </text>
      </g>
      <g data-part="button-3">
        <circle cx="74" cy="69" r="8.5" fill="#34D399" stroke="#064E3B" strokeWidth="2.2" />
        <ellipse cx="72" cy="66.5" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.4" />
        <text
          x="74"
          y="73"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="8.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          A
        </text>
      </g>
      <g data-part="button-4">
        <circle cx="60" cy="54" r="8.5" fill="#FBBF24" stroke="#92400E" strokeWidth="2.2" />
        <ellipse cx="58" cy="51.5" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.4" />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="8.5"
          fontWeight="800"
          fill="#3F2400"
        >
          X
        </text>
      </g>

      {/* Analógicos (one-shot: giram 1 turn) */}
      <g data-part="analog">
        <circle
          cx="46"
          cy="78"
          r="9.5"
          fill="url(#mr-gp-analog)"
          stroke="#0A0B11"
          strokeWidth="2"
        />
        <circle
          cx="46"
          cy="78"
          r="6.5"
          fill="none"
          stroke="#5B6074"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M46 70 V73.5 M46 82.5 V86 M38 78 H41.5 M50.5 78 H54"
          stroke="#5B6074"
          strokeWidth="1.8"
          opacity="0.9"
          strokeLinecap="round"
        />
      </g>
      <g data-part="analog">
        <circle
          cx="85"
          cy="80"
          r="9.5"
          fill="url(#mr-gp-analog)"
          stroke="#0A0B11"
          strokeWidth="2"
        />
        <circle
          cx="85"
          cy="80"
          r="6.5"
          fill="none"
          stroke="#5B6074"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M85 72 V75.5 M85 84.5 V88 M77 80 H80.5 M89.5 80 H93"
          stroke="#5B6074"
          strokeWidth="1.8"
          opacity="0.9"
          strokeLinecap="round"
        />
      </g>

      {/* Botão central */}
      <circle cx="60" cy="54" r="5.5" fill="#0E1017" stroke="#41455C" strokeWidth="2" />
      <circle cx="60" cy="54" r="2" fill="#8B93A8" />
    </svg>
  );
}

/* ============================= LIVRO (aberto) ============================= */

export function BookArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-book">
      <defs>
        <linearGradient id="mr-book-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B79DFB" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="mr-book-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="105" rx="42" ry="6.5" fill="#000000" opacity="0.5" />

      {/* Páginas (lado aberto) */}
      <g>
        <path
          d="M56 30 L102 26 L102 96 L56 100 Z"
          fill="#F2EDE3"
          stroke="#CFC8B6"
          strokeWidth="2.5"
        />
        <path d="M56 30 L102 26 L102 33 L56 37 Z" fill="#FBF8F1" />
        <path d="M58 44 L100 40.5 V44.5 L58 48 Z" fill="#D9D2C1" />
        <path d="M58 53 L100 49.5 V53.5 L58 57 Z" fill="#E2DCCB" />
        <path d="M58 62 L100 58.5 V62.5 L58 66 Z" fill="#D9D2C1" />
        <path d="M58 71 L100 67.5 V71.5 L58 75 Z" fill="#E2DCCB" />
        <path d="M58 80 L100 76.5 V80.5 L58 84 Z" fill="#D9D2C1" />
        <path d="M56 30 L58 30 L58 100 L56 100 Z" fill="#000000" opacity="0.3" />

        {/* Linhas de texto (one-shot: revelam o conteúdo em stagger) */}
        <rect
          data-part="line-1"
          x="64"
          y="44"
          width="30"
          height="4"
          rx="2"
          fill="#A8A08C"
          opacity="0"
        />
        <rect
          data-part="line-2"
          x="64"
          y="53"
          width="24"
          height="4"
          rx="2"
          fill="#A8A08C"
          opacity="0"
        />
        <rect
          data-part="line-3"
          x="64"
          y="62"
          width="27"
          height="4"
          rx="2"
          fill="#A8A08C"
          opacity="0"
        />
        <rect
          x="64"
          y="72"
          width="30"
          height="22"
          rx="3"
          fill="#E3DCCB"
          stroke="#CFC8B6"
          strokeWidth="2"
        />
        <circle cx="75" cy="81" r="4.5" fill="#CFC7B2" />
        <path d="M69 90 L76 85 L82 90 Z" fill="#CFC7B2" />
      </g>

      {/* Marcador de página */}
      <path
        d="M55 17 L63 17 L61.5 44 L57.5 44 Z"
        fill="url(#mr-book-mark)"
        stroke="#9D174D"
        strokeWidth="1.5"
      />

      {/* Capa — pivô na lombada (0,0 local). Wrapper estático carrega o
          translate(22,30); a geometria animada começa na lombada. */}
      <g transform="translate(22, 30)">
        <g data-part="cover">
          <path d="M0 0 L5 0 L5 68 L0 68 Z" fill="#3B0F70" stroke="#2E1065" strokeWidth="1.5" />
          <path
            d="M5 0 L34 0 L34 68 L5 68 Z"
            fill="url(#mr-book-cover)"
            stroke="#2E1065"
            strokeWidth="2.5"
          />
          <path
            d="M9 5 L30 5 L30 63 L9 63 Z"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="1.6"
            opacity="0.7"
          />
          <text
            x="19.5"
            y="24"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="9"
            fontWeight="700"
            fill="#FDE68A"
            letterSpacing="1.5"
          >
            MEDIA
          </text>
          <text
            x="19.5"
            y="35"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="9"
            fontWeight="700"
            fill="#FDE68A"
            letterSpacing="1.5"
          >
            RATE
          </text>
          <rect x="12" y="43" width="15" height="3" rx="1.5" fill="#FDE68A" opacity="0.6" />
          <circle
            cx="19.5"
            cy="54"
            r="5.5"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="1.6"
            opacity="0.6"
          />
          <path d="M5 2 L34 1 L34 6 L6 7 Z" fill="#FFFFFF" opacity="0.18" />
        </g>
      </g>
    </svg>
  );
}

/* ========================= HQ & MANGÁ (página de quadrinhos) ========================= */

export function MagazineArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-part="icon" data-testid="hero-svg-hq">
      <defs>
        <linearGradient id="mr-hq-panel-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="mr-hq-panel-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <radialGradient id="mr-hq-burst" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="106" rx="44" ry="6.5" fill="#000000" opacity="0.45" />

      {/* Página */}
      <rect
        x="12"
        y="12"
        width="96"
        height="94"
        rx="9"
        fill="#FDF7EE"
        stroke="#1F1F2E"
        strokeWidth="4"
      />
      <rect
        x="15"
        y="15"
        width="90"
        height="88"
        rx="6"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />

      {/* Painel 1 — ação */}
      <rect
        x="20"
        y="20"
        width="36"
        height="30"
        rx="4"
        fill="url(#mr-hq-panel-a)"
        stroke="#1F1F2E"
        strokeWidth="4"
      />
      <path
        d="M26 28 L44 28 M24 35 L46 35 M26 42 L42 42"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Painel 2 — bolha */}
      <rect
        x="60"
        y="20"
        width="36"
        height="30"
        rx="4"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="4"
      />
      <g fill="#F472B6" opacity="0.55">
        <circle cx="66" cy="26" r="1.6" />
        <circle cx="74" cy="26" r="1.6" />
        <circle cx="82" cy="26" r="1.6" />
        <circle cx="90" cy="26" r="1.6" />
        <circle cx="66" cy="33" r="1.6" />
        <circle cx="74" cy="33" r="1.6" />
        <circle cx="82" cy="33" r="1.6" />
        <circle cx="90" cy="33" r="1.6" />
      </g>
      <path
        d="M73 39 C73 33 89 33 89 38 C89 43 85 45.5 80 46 L82.5 51.5 L75 45.5 C71 44.5 73 39 73 39 Z"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      <circle cx="75.5" cy="39.5" r="1.4" fill="#1F1F2E" />
      <circle cx="82.5" cy="39.5" r="1.4" fill="#1F1F2E" />

      {/* Painel 3 — raio */}
      <rect
        x="20"
        y="54"
        width="36"
        height="42"
        rx="4"
        fill="url(#mr-hq-panel-b)"
        stroke="#1F1F2E"
        strokeWidth="4"
      />
      <path
        d="M42 60 L33 78 L42 77 L36 92"
        fill="none"
        stroke="#FDE68A"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 64 L44 76 L49 75.5 L46 84"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Painel 4 — POW */}
      <rect
        x="60"
        y="54"
        width="36"
        height="42"
        rx="4"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="4"
      />
      <path
        d="M78 62 L80.5 70 L88.5 71.5 L82.5 76 L83.5 84 L78 79.5 L72.5 84 L73.5 76 L67.5 71.5 L75.5 70 Z"
        fill="url(#mr-hq-burst)"
        stroke="#1F1F2E"
        strokeWidth="2.5"
      />
      <text
        x="78"
        y="79"
        textAnchor="middle"
        fontFamily={FONT}
        fontSize="10"
        fontWeight="900"
        fill="#7C2D12"
      >
        POW!
      </text>

      {/* Partículas (one-shot: explodem; pivô no próprio centro via fill-box) */}
      <circle
        data-part="dot-1"
        cx="48"
        cy="42"
        r="5"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <circle
        data-part="dot-2"
        cx="80"
        cy="38"
        r="4"
        fill="#A855F7"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <circle
        data-part="dot-3"
        cx="96"
        cy="52"
        r="4.5"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <circle
        data-part="dot-4"
        cx="40"
        cy="98"
        r="4.5"
        fill="#A855F7"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <circle
        data-part="dot-5"
        cx="56"
        cy="101"
        r="4"
        fill="#FBBF24"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <circle
        data-part="dot-6"
        cx="90"
        cy="99"
        r="5"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
    </svg>
  );
}
