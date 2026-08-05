/**
 * SVGs ilustrativos premium do Hero (T5a-hero-3d-fix-v3).
 *
 * Substituem os ícones Lucide por ilustrações vetoriais completas:
 * cada arte tem múltiplas camadas visíveis (base, texturas, sombras,
 * highlights, dobradiças, botões, detalhes) e `data-part` que a
 * coreografia Anime.js do HeroMediaIcon ataca.
 *
 * Inline (e não assets externos) porque as one-shots animam partes
 * internas ([data-part="mouth"], "[data-part^=dot-]" etc.) — um <img>
 * externo não permite isso.
 */
const FONT = "Arial, Helvetica, sans-serif";

/* ============================ FILME (claquete) ============================ */

export function FilmArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-film">
      <defs>
        <linearGradient id="mr-film-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8A5630" />
          <stop offset="55%" stopColor="#5E3A1C" />
          <stop offset="100%" stopColor="#3A2210" />
        </linearGradient>
        <linearGradient id="mr-film-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B7BCCF" />
          <stop offset="100%" stopColor="#5B6074" />
        </linearGradient>
        <radialGradient id="mr-film-sheen" cx="0.35" cy="0.25" r="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="106" rx="42" ry="7" fill="#000000" opacity="0.45" />

      {/* Flash de impacto (one-shot — só aparece no hover) */}
      <g data-part="flash">
        <path
          d="M60 8 L67 44 L103 51 L67 58 L60 94 L53 58 L17 51 L53 44 Z"
          fill="#FFFFFF"
          stroke="#FFD27D"
          strokeWidth="1.5"
        />
      </g>

      {/* Base de madeira */}
      <g>
        <rect
          x="18"
          y="58"
          width="84"
          height="44"
          rx="10"
          fill="url(#mr-film-wood)"
          stroke="#221105"
          strokeWidth="2"
        />
        {/* Textura: veios horizontais sutis */}
        <path
          d="M22 66 H98 M24 72 H96 M22 78 H98 M26 84 H94 M24 90 H96 M22 96 H98"
          stroke="#1E0F04"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M26 69 H94 M28 75 H92 M30 87 H90"
          stroke="#C98D5A"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.18"
        />
        <rect x="18" y="58" width="84" height="44" rx="10" fill="url(#mr-film-sheen)" />
        {/* Texto central */}
        <text
          x="60"
          y="86"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="12"
          fontWeight="800"
          letterSpacing="2.5"
          fill="#F5E6C8"
        >
          SCENE 1
        </text>
        <rect x="38" y="94" width="44" height="2" rx="1" fill="#F5E6C8" opacity="0.45" />
      </g>

      {/* Boca articulada (gira em torno da dobradiça no topo-esquerda) */}
      <g data-part="mouth" transform="translate(18, 56)">
        {/* barra superior */}
        <rect
          x="0"
          y="0"
          width="84"
          height="11"
          rx="4"
          fill="#171A26"
          stroke="#0A0B11"
          strokeWidth="1.5"
        />
        <rect x="2" y="2" width="80" height="3" rx="1.5" fill="#FFFFFF" opacity="0.22" />
        {/* quadro das listras */}
        <rect x="0" y="11" width="84" height="15" fill="#0C0E16" stroke="#0A0B11" strokeWidth="1" />
        {/* listras diagonais brancas/pretas */}
        <g clipPath="url(#mr-film-stripes)">
          <path
            d="M-6 30 L12 4 H26 L8 30 Z M16 30 L34 4 H48 L30 30 Z M38 30 L56 4 H70 L52 30 Z M60 30 L78 4 H92 L74 30 Z"
            fill="#F5F0E6"
          />
        </g>
        <clipPath id="mr-film-stripes">
          <rect x="0" y="11" width="84" height="15" rx="2" />
        </clipPath>
        {/* highlight da boca */}
        <rect x="1" y="11.5" width="82" height="1.5" fill="#FFFFFF" opacity="0.18" />
        <rect x="1" y="24.5" width="82" height="1.5" fill="#000000" opacity="0.4" />
      </g>

      {/* Dobradiças metálicas (sobre a junta) */}
      <circle
        cx="27"
        cy="56"
        r="4.5"
        fill="url(#mr-film-metal)"
        stroke="#0A0B11"
        strokeWidth="1.5"
      />
      <circle cx="27" cy="56" r="1.6" fill="#0A0B11" />
      <circle
        cx="36"
        cy="56"
        r="3.5"
        fill="url(#mr-film-metal)"
        stroke="#0A0B11"
        strokeWidth="1.5"
      />
      <circle cx="36" cy="56" r="1.3" fill="#0A0B11" />
    </svg>
  );
}

/* ============================= SÉRIE (televisão) ============================= */

export function TvArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-tv">
      <defs>
        <linearGradient id="mr-tv-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#565B73" />
          <stop offset="45%" stopColor="#2B2E40" />
          <stop offset="100%" stopColor="#171926" />
        </linearGradient>
        <linearGradient id="mr-tv-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#13172B" />
          <stop offset="100%" stopColor="#070912" />
        </linearGradient>
        <linearGradient id="mr-tv-reflection" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mr-tv-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#93C5FD" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="106" rx="40" ry="6" fill="#000000" opacity="0.45" />

      {/* Antenas */}
      <g strokeLinecap="round">
        <line x1="40" y1="36" x2="26" y2="14" stroke="#9AA0B8" strokeWidth="2.5" />
        <line x1="80" y1="36" x2="94" y2="14" stroke="#9AA0B8" strokeWidth="2.5" />
        <circle cx="26" cy="14" r="3.5" fill="#F87171" />
        <circle cx="94" cy="14" r="3.5" fill="#34D399" />
      </g>

      {/* Moldura grossa */}
      <rect
        x="16"
        y="30"
        width="88"
        height="60"
        rx="10"
        fill="url(#mr-tv-frame)"
        stroke="#0A0B11"
        strokeWidth="2"
      />
      <rect
        x="17.5"
        y="31.5"
        width="85"
        height="57"
        rx="8.5"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.14"
      />

      {/* Tela */}
      <rect
        x="24"
        y="38"
        width="60"
        height="40"
        rx="4"
        fill="url(#mr-tv-screen)"
        stroke="#0A0B11"
        strokeWidth="1.5"
      />
      {/* Reflexo diagonal */}
      <path d="M24 38 H84 V50 L24 50 Z" fill="url(#mr-tv-reflection)" />
      {/* Brilho da tela (accent) */}
      <rect
        x="24"
        y="38"
        width="60"
        height="40"
        rx="4"
        fill="none"
        stroke="#60A5FA"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />

      {/* Conteúdo da tela (one-shot: brilho) */}
      <g data-part="screen">
        <rect x="31" y="45" width="46" height="26" rx="3" fill="#0A0D1A" />
        <path d="M42 51 L56 58 L42 65 Z" fill="#60A5FA" opacity="0.95" />
        <rect x="61" y="51" width="3.5" height="14" rx="1.5" fill="#93C5FD" opacity="0.85" />
        <rect x="67" y="53" width="3.5" height="12" rx="1.5" fill="#A5B4FC" opacity="0.7" />
        <rect x="73" y="49" width="3.5" height="16" rx="1.5" fill="#818CF8" opacity="0.6" />
      </g>

      {/* Scanline (one-shot: varre a tela) */}
      <rect
        x="24"
        y="38"
        width="60"
        height="40"
        rx="4"
        fill="url(#mr-tv-scan)"
        data-part="scanline"
      />

      {/* Base com botões/dials */}
      <rect
        x="16"
        y="90"
        width="88"
        height="9"
        rx="4.5"
        fill="url(#mr-tv-frame)"
        stroke="#0A0B11"
        strokeWidth="2"
      />
      <rect x="62" y="92.5" width="16" height="4" rx="2" fill="#0E1017" />
      <circle cx="84" cy="94.5" r="2.6" fill="#F87171" stroke="#7F1D1D" strokeWidth="1" />
      <circle cx="91" cy="94.5" r="2.6" fill="#34D399" stroke="#064E3B" strokeWidth="1" />
      <circle cx="77" cy="94.5" r="1.8" fill="#FBBF24" opacity="0.9" />

      {/* Pernas */}
      <path d="M34 99 L27 105 H41 Z" fill="#1A1C28" stroke="#0A0B11" strokeWidth="1" />
      <path d="M86 99 L79 105 H93 Z" fill="#1A1C28" stroke="#0A0B11" strokeWidth="1" />
    </svg>
  );
}

/* ============================= GAME (controle) ============================= */

export function GameArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-game">
      <defs>
        <radialGradient id="mr-gp-body" cx="0.45" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#3A3D52" />
          <stop offset="45%" stopColor="#232533" />
          <stop offset="100%" stopColor="#101118" />
        </radialGradient>
        <linearGradient id="mr-gp-dpad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6A7087" />
          <stop offset="100%" stopColor="#2E3140" />
        </linearGradient>
        <radialGradient id="mr-gp-analog" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#4A4E64" />
          <stop offset="100%" stopColor="#191B26" />
        </radialGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="104" rx="44" ry="7" fill="#000000" opacity="0.5" />

      {/* Gatilhos superiores */}
      <rect
        x="29"
        y="24"
        width="23"
        height="15"
        rx="7.5"
        fill="#1C1E2A"
        stroke="#0A0B11"
        strokeWidth="1.5"
      />
      <rect
        x="68"
        y="24"
        width="23"
        height="15"
        rx="7.5"
        fill="#1C1E2A"
        stroke="#0A0B11"
        strokeWidth="1.5"
      />

      {/* Corpo ergonômico */}
      <path
        d="M26 40 C26 24 43 19 60 19 C77 19 94 24 94 40 L94 62 C94 85 81 97 60 97 C39 97 26 85 26 62 Z"
        fill="url(#mr-gp-body)"
        stroke="#0A0B11"
        strokeWidth="2.5"
      />
      {/* Textura de borracha (sombreamento nas grips) */}
      <path
        d="M26 62 C26 82 33 92 44 96 L43 90 C34 86 29 77 29 62 Z"
        fill="#000000"
        opacity="0.3"
      />
      <path
        d="M94 62 C94 82 87 92 76 96 L77 90 C86 86 91 77 91 62 Z"
        fill="#000000"
        opacity="0.3"
      />
      <path
        d="M32 32 C40 27 50 24 60 24 C70 24 80 27 88 32"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.1"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* D-pad (4 direções) */}
      <g>
        <rect
          x="34"
          y="40"
          width="13"
          height="30"
          rx="4"
          fill="url(#mr-gp-dpad)"
          stroke="#0A0B11"
          strokeWidth="1.5"
        />
        <rect
          x="28"
          y="46"
          width="25"
          height="13"
          rx="4"
          fill="url(#mr-gp-dpad)"
          stroke="#0A0B11"
          strokeWidth="1.5"
        />
        <circle cx="40.5" cy="52.5" r="3" fill="#0A0B11" opacity="0.55" />
        <path
          d="M40.5 43 V51 M36 47 H40.5 M40.5 54 V62 M44 47 H40.5"
          stroke="#0A0B11"
          strokeWidth="1"
          opacity="0.35"
        />
      </g>

      {/* Botões de face (Y/B/A/X — one-shot: combo acende) */}
      <g data-part="button-1">
        <circle cx="77" cy="41" r="7.5" fill="#F87171" stroke="#7F1D1D" strokeWidth="1.5" />
        <ellipse cx="75.5" cy="39" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.35" />
        <text
          x="77"
          y="44"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="7.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          Y
        </text>
      </g>
      <g data-part="button-2">
        <circle cx="92" cy="54" r="7.5" fill="#60A5FA" stroke="#1E3A8A" strokeWidth="1.5" />
        <ellipse cx="90.5" cy="52" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.35" />
        <text
          x="92"
          y="57"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="7.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          B
        </text>
      </g>
      <g data-part="button-3">
        <circle cx="77" cy="67" r="7.5" fill="#34D399" stroke="#064E3B" strokeWidth="1.5" />
        <ellipse cx="75.5" cy="65" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.35" />
        <text
          x="77"
          y="70"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="7.5"
          fontWeight="800"
          fill="#FFFFFF"
        >
          A
        </text>
      </g>
      <g data-part="button-4">
        <circle cx="62" cy="54" r="7.5" fill="#FBBF24" stroke="#92400E" strokeWidth="1.5" />
        <ellipse cx="60.5" cy="52" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.35" />
        <text
          x="62"
          y="57"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize="7.5"
          fontWeight="800"
          fill="#3F2400"
        >
          X
        </text>
      </g>

      {/* Analógicos (one-shot: giram 1 volta) */}
      <g data-part="analog">
        <circle
          cx="45"
          cy="72"
          r="11"
          fill="url(#mr-gp-analog)"
          stroke="#0A0B11"
          strokeWidth="1.5"
        />
        <circle
          cx="45"
          cy="72"
          r="7.5"
          fill="none"
          stroke="#5B6074"
          strokeWidth="1.5"
          opacity="0.8"
        />
        <path
          d="M45 63.5 V68.5 M45 75.5 V80.5 M36.5 72 H41.5 M48.5 72 H53.5"
          stroke="#5B6074"
          strokeWidth="1.3"
          opacity="0.8"
          strokeLinecap="round"
        />
      </g>
      <g data-part="analog">
        <circle
          cx="87"
          cy="77"
          r="11"
          fill="url(#mr-gp-analog)"
          stroke="#0A0B11"
          strokeWidth="1.5"
        />
        <circle
          cx="87"
          cy="77"
          r="7.5"
          fill="none"
          stroke="#5B6074"
          strokeWidth="1.5"
          opacity="0.8"
        />
        <path
          d="M87 68.5 V73.5 M87 80.5 V85.5 M78.5 77 H83.5 M90.5 77 H95.5"
          stroke="#5B6074"
          strokeWidth="1.3"
          opacity="0.8"
          strokeLinecap="round"
        />
      </g>

      {/* Botão central */}
      <circle cx="60" cy="54" r="5" fill="#0E1017" stroke="#3A3D52" strokeWidth="1.5" />
      <circle cx="60" cy="54" r="1.8" fill="#8B93A8" />
    </svg>
  );
}

/* ============================= LIVRO (aberto) ============================= */

export function BookArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" data-testid="hero-svg-book">
      <defs>
        <linearGradient id="mr-book-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="mr-book-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>

      {/* Sombra projetada */}
      <ellipse cx="60" cy="104" rx="40" ry="6" fill="#000000" opacity="0.45" />

      {/* Páginas (lado aberto) */}
      <g>
        <path
          d="M58 30 L100 26 L100 96 L58 99 Z"
          fill="#EFEAE0"
          stroke="#CFC8B6"
          strokeWidth="1.5"
        />
        <path d="M58 30 L100 26 L100 32 L58 36 Z" fill="#FBF8F1" />
        {/* Folhas finas (textura de páginas) */}
        <path d="M60 42 L98 38.5 V42 L60 45.5 Z" fill="#D9D2C1" opacity="0.85" />
        <path d="M60 50 L98 46.5 V50 L60 53.5 Z" fill="#E2DCCB" opacity="0.8" />
        <path d="M60 58 L98 54.5 V58 L60 61.5 Z" fill="#D9D2C1" opacity="0.85" />
        <path d="M60 66 L98 62.5 V66 L60 69.5 Z" fill="#E2DCCB" opacity="0.8" />
        <path d="M60 74 L98 70.5 V74 L60 77.5 Z" fill="#D9D2C1" opacity="0.85" />
        {/* Sulco da lombada */}
        <path d="M58 30 L60 30 L60 99 L58 99 Z" fill="#000000" opacity="0.28" />
        {/* Linhas de texto (one-shot: revelam o texto) */}
        <rect data-part="line-1" x="65" y="44" width="27" height="3.5" rx="1.75" fill="#A8A08C" />
        <rect data-part="line-2" x="65" y="52" width="22" height="3.5" rx="1.75" fill="#A8A08C" />
        <rect data-part="line-3" x="65" y="60" width="25" height="3.5" rx="1.75" fill="#A8A08C" />
        {/* Ilustração da página */}
        <rect
          x="65"
          y="69"
          width="26"
          height="20"
          rx="3"
          fill="#DDD6C4"
          stroke="#C4BBA6"
          strokeWidth="1.5"
        />
        <circle cx="75" cy="77" r="4" fill="#C9BFA8" />
        <path d="M69 86 L75 81 L80 86 Z" fill="#C9BFA8" />
      </g>

      {/* Marcador de página */}
      <path
        d="M55 20 L63 20 L61.5 42 L57.5 42 Z"
        fill="url(#mr-book-mark)"
        stroke="#9D174D"
        strokeWidth="1"
      />

      {/* Capa (one-shot: abre com rotateY) */}
      <g data-part="cover">
        <path
          d="M22 28 L56 26 L56 96 L22 98 Z"
          fill="url(#mr-book-cover)"
          stroke="#2E1065"
          strokeWidth="2"
        />
        {/* Lombada */}
        <path
          d="M22 28 L26 27.8 L26 97.9 L22 98 Z"
          fill="#3B0F70"
          stroke="#2E1065"
          strokeWidth="1"
        />
        {/* Borda decorativa */}
        <path
          d="M29 33.5 L52 32 L52 91 L29 92.5 Z"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="1.2"
          opacity="0.65"
        />
        {/* Título */}
        <text
          x="40"
          y="52"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="9.5"
          fontWeight="700"
          fill="#FDE68A"
          letterSpacing="1.5"
        >
          MEDIA
        </text>
        <text
          x="40"
          y="63"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="9.5"
          fontWeight="700"
          fill="#FDE68A"
          letterSpacing="1.5"
        >
          RATE
        </text>
        <rect x="33" y="70" width="14" height="2.5" rx="1.25" fill="#FDE68A" opacity="0.55" />
        <circle
          cx="40"
          cy="82"
          r="5"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="1.2"
          opacity="0.55"
        />
        {/* Highlight */}
        <path d="M24 30.5 L54 29 L54 35 L25 36.5 Z" fill="#FFFFFF" opacity="0.16" />
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
      <ellipse cx="60" cy="106" rx="42" ry="6" fill="#000000" opacity="0.4" />

      {/* Página */}
      <rect
        x="14"
        y="12"
        width="92"
        height="94"
        rx="8"
        fill="#FDF7EE"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      <rect
        x="16.5"
        y="14.5"
        width="87"
        height="89"
        rx="6"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
      />

      {/* Painel 1 — ação (gradiente vibrante) */}
      <rect
        x="22"
        y="20"
        width="38"
        height="30"
        rx="4"
        fill="url(#mr-hq-panel-a)"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      <path d="M22 20 H60 V24 L22 27 Z" fill="#FFFFFF" opacity="0.18" />
      {/* Linhas de velocidade */}
      <path
        d="M30 30 L46 30 M28 36 L48 36 M30 42 L44 42"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M50 26 L58 26 M50 44 L58 44"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Painel 2 — bolha de fala */}
      <rect
        x="64"
        y="20"
        width="34"
        height="30"
        rx="4"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      {/* Meio-tom (textura de pontos) */}
      <g fill="#F472B6" opacity="0.5">
        <circle cx="70" cy="25" r="1.4" />
        <circle cx="77" cy="25" r="1.4" />
        <circle cx="84" cy="25" r="1.4" />
        <circle cx="91" cy="25" r="1.4" />
        <circle cx="70" cy="31" r="1.4" />
        <circle cx="77" cy="31" r="1.4" />
        <circle cx="84" cy="31" r="1.4" />
        <circle cx="91" cy="31" r="1.4" />
      </g>
      {/* Bolha de fala */}
      <path
        d="M76 38 C76 33 90 33 90 38 C90 42.5 86 44.5 81 45 L83.5 50 L76.5 44.5 C72.5 43.5 76 38 76 38 Z"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="2.5"
      />
      <circle cx="78" cy="38.5" r="1.2" fill="#1F1F2E" />
      <circle cx="84" cy="38.5" r="1.2" fill="#1F1F2E" />

      {/* Painel 3 — explosão POW */}
      <rect
        x="22"
        y="54"
        width="38"
        height="42"
        rx="4"
        fill="#FFFFFF"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      <path
        d="M41 60 L43.5 67.5 L51 69 L45 73.5 L46.5 81 L41 76.5 L35.5 81 L37 73.5 L31 69 L38.5 67.5 Z"
        fill="url(#mr-hq-burst)"
        stroke="#1F1F2E"
        strokeWidth="2"
      />
      <text
        x="41"
        y="73.5"
        textAnchor="middle"
        fontFamily={FONT}
        fontSize="8"
        fontWeight="900"
        fill="#7C2D12"
      >
        POW!
      </text>
      <path
        d="M26 58 H32 M50 58 H56 M26 92 H33 M49 92 H55"
        stroke="#1F1F2E"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Painel 4 — fundo gradiente */}
      <rect
        x="64"
        y="54"
        width="34"
        height="42"
        rx="4"
        fill="url(#mr-hq-panel-b)"
        stroke="#1F1F2E"
        strokeWidth="3"
      />
      <path d="M68 58 H94 V62 L68 66 Z" fill="#FFFFFF" opacity="0.15" />
      {/* Raio */}
      <path
        d="M84 60 L78 74 L84 73 L80 86"
        fill="none"
        stroke="#FDE68A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M90 63 L86 72 L90 71.5 L88 80"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Partículas de impacto (one-shot: explodem) */}
      <circle
        data-part="dot-1"
        cx="46"
        cy="46"
        r="4"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <circle
        data-part="dot-2"
        cx="70"
        cy="47"
        r="3"
        fill="#A855F7"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <circle
        data-part="dot-3"
        cx="92"
        cy="52"
        r="3.5"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <circle
        data-part="dot-4"
        cx="52"
        cy="100"
        r="3.5"
        fill="#A855F7"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <circle
        data-part="dot-5"
        cx="34"
        cy="52"
        r="3"
        fill="#FBBF24"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <circle
        data-part="dot-6"
        cx="88"
        cy="101"
        r="4"
        fill="#F472B6"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
    </svg>
  );
}
