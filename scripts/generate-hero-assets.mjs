import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const OUT = "D:\\PROJETOS\\MEDIA Rate\\MEDIA Rate\\apps\\web\\public\\assets\\hero";
fs.mkdirSync(OUT, { recursive: true });

/* ---------- helpers SVG (estilo claymorphism glossy) ---------- */

const GRAD = (id, stops, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%") =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</linearGradient>`;

const RGRAD = (id, stops, cx = "50%", cy = "50%", r = "50%") =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</radialGradient>`;

const FILTER_SHADOW = `<filter id="sd" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="34"/><feOffset dy="40"/><feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

const FILTER_SOFT = `<filter id="sf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>`;

const CLAY_RIM = (rx, c = "rgba(0,0,0,0.30)") => `stroke="${c}" stroke-width="12"`;
const GLOSS = (cx, cy, rx, ry) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gloss)"/>`;

const SPEC = (cx, cy, r, o = 0.85) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="${o}"/>`;

const body = (grad) => `
  ${GRAD("v", [["0%", "#ffffff", 0.22], ["45%", "#ffffff", 0.05], ["100%", "#000000", 0.28]])}
  ${GLOSS_OVL(grad)}
`;

function GLOSS_OVL(grad) {
  return `
  <rect x="-1" y="-1" width="1202" height="1202" rx="120" fill="${grad}" ${CLAY_RIM(120)}/>
  <rect x="-1" y="-1" width="1202" height="1202" rx="120" fill="url(#v)" opacity="0.7"/>
  `;
}

/* ================================ FILME ================================ */
function filmScene() {
  const wood = GRAD("w", [["0%", "#E8B57D"], ["45%", "#C07A45"], ["78%", "#8A4E24"], ["100%", "#5E3013"]]);
  const woodDark = GRAD("wd", [["0%", "#B9814E"], ["50%", "#7C4218"], ["100%", "#4A2409"]]);
  const dark = GRAD("dk", [["0%", "#3A3F52"], ["100%", "#14161F"]]);
  const red = GRAD("rd", [["0%", "#F87171"], ["55%", "#C53030"], ["100%", "#7F1D1D"]]);
  const hinge = GRAD("hg", [["0%", "#F4F6FB"], ["100%", "#9AA0B8"]]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${RGRAD("glow", [["0%", "#818CF8", 0.55], ["55%", "#818CF8", 0.18], ["100%", "#818CF8", 0]], "50%", "58%", "62%")}
    ${GRAD("gloss", [["0%", "#ffffff", 0.5], ["100%", "#ffffff", 0]], "0%", "0%", "100%", "100%")}
    ${wood}${woodDark}${dark}${red}${hinge}
    ${FILTER_SHADOW}${FILTER_SOFT}
    <clipPath id="cp"><rect x="150" y="300" width="900" height="520" rx="110"/></clipPath>
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>

  <!-- sombra de contato -->
  <ellipse cx="600" cy="1000" rx="430" ry="80" fill="#000" opacity="0.5" filter="url(#sf)"/>

  <!-- CORPO (clay madeira) -->
  <g filter="url(#sd)">
    <rect x="150" y="300" width="900" height="520" rx="110" fill="url(#w)"/>
    <rect x="150" y="300" width="900" height="520" rx="110" fill="url(#v)" opacity="0.55"/>
    <rect x="150" y="300" width="900" height="520" rx="110" fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="14"/>
    <!-- veios -->
    <path d="M190 380 H1010 M190 470 H1010 M190 560 H1010 M190 650 H1010 M190 740 H1010" stroke="#5E3013" stroke-width="8" stroke-linecap="round" opacity="0.28" filter="url(#sf)"/>
    <path d="M220 420 H980 M220 600 H980 M220 690 H980" stroke="#FFD9A8" stroke-width="6" stroke-linecap="round" opacity="0.22" filter="url(#sf)"/>
  </g>
  <!-- moldura do corpo -->
  <rect x="150" y="300" width="900" height="520" rx="110" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="10" opacity="0.5"/>

  <!-- BOCA (board superior aberta, perspectiva 3D) -->
  <g filter="url(#sd)" transform="rotate(-16 600 300)">
    <!-- barra vermelha -->
    <rect x="190" y="92" width="820" height="150" rx="70" fill="url(#rd)"/>
    <rect x="190" y="92" width="820" height="150" rx="70" fill="url(#gloss)" opacity="0.5"/>
    <rect x="190" y="92" width="820" height="150" rx="70" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="12"/>
    <rect x="190" y="120" width="820" height="22" rx="11" fill="#fff" opacity="0.5"/>
    <!-- quadro listrado -->
    <rect x="190" y="242" width="820" height="200" rx="60" fill="url(#dk)"/>
    <g clip-path="url(#cp2)">
      <g transform="skewX(-18)">
        <rect x="80" y="242" width="190" height="200" fill="#F5F0E6"/>
        <rect x="360" y="242" width="190" height="200" fill="#F5F0E6"/>
        <rect x="640" y="242" width="190" height="200" fill="#F5F0E6"/>
        <rect x="920" y="242" width="190" height="200" fill="#F5F0E6"/>
      </g>
    </g>
    <rect x="190" y="242" width="820" height="200" rx="60" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="12"/>
    <rect x="190" y="268" width="820" height="14" rx="7" fill="#fff" opacity="0.35"/>
  </g>
  <clipPath id="cp2"><rect x="190" y="242" width="820" height="200" rx="50"/></clipPath>

  <!-- dobradicas -->
  <circle cx="300" cy="316" r="44" fill="url(#hg)" stroke="#14161F" stroke-width="10"/>
  <circle cx="300" cy="316" r="16" fill="#14161F"/>
  <circle cx="420" cy="316" r="32" fill="url(#hg)" stroke="#14161F" stroke-width="8"/>
  <circle cx="420" cy="316" r="12" fill="#14161F"/>

  <!-- texto SCENE 1 -->
  <text x="600" y="650" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="150" font-weight="900" letter-spacing="26" fill="#FFEBCB">SCENE 1</text>
  <rect x="360" y="712" width="480" height="14" rx="7" fill="#FFEBCB" opacity="0.5"/>

  <!-- brilho especular -->
  <ellipse cx="330" cy="380" rx="230" ry="150" fill="url(#gloss)" opacity="0.6" transform="rotate(-18 330 380)"/>
  ${SPEC(280, 360, 34, 0.9)}
</svg>`;
}

/* ================================ SÉRIE ================================ */
function serieScene() {
  const frame = GRAD("fr", [["0%", "#7C8298"], ["40%", "#3E4254"], ["100%", "#191B26"]]);
  const screen = GRAD("sc", [["0%", "#1E2A5C"], ["60%", "#10173A"], ["100%", "#070B1C"]]);
  const bar = GRAD("br", [["0%", "#93C5FD"], ["100%", "#60A5FA"]]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${RGRAD("glow", [["0%", "#38BDF8", 0.5], ["55%", "#38BDF8", 0.16], ["100%", "#38BDF8", 0]], "50%", "55%", "62%")}
    ${GRAD("gloss", [["0%", "#ffffff", 0.42], ["100%", "#ffffff", 0]], "0%", "0%", "100%", "100%")}
    ${frame}${screen}${bar}
    ${FILTER_SHADOW}${FILTER_SOFT}
    <clipPath id="tsc"><rect x="215" y="250" width="770" height="560" rx="70"/></clipPath>
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <ellipse cx="600" cy="1010" rx="440" ry="82" fill="#000" opacity="0.5" filter="url(#sf)"/>

  <!-- antenas -->
  <g filter="url(#sd)" stroke-linecap="round">
    <line x1="420" y1="300" x2="255" y2="90" stroke="#7C8298" stroke-width="26"/>
    <line x1="780" y1="300" x2="945" y2="90" stroke="#7C8298" stroke-width="26"/>
    <circle cx="255" cy="90" r="36" fill="#F87171"/>
    <circle cx="945" cy="90" r="36" fill="#34D399"/>
  </g>

  <!-- corpo -->
  <g filter="url(#sd)">
    <rect x="140" y="230" width="920" height="650" rx="130" fill="url(#fr)"/>
    <rect x="140" y="230" width="920" height="650" rx="130" fill="url(#v)" opacity="0.5"/>
    <rect x="140" y="230" width="920" height="650" rx="130" fill="none" stroke="rgba(0,0,0,0.32)" stroke-width="14"/>
  </g>

  <!-- tela -->
  <g filter="url(#sd)">
    <rect x="215" y="250" width="770" height="560" rx="70" fill="url(#sc)"/>
    <rect x="215" y="250" width="770" height="560" rx="70" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="14"/>
  </g>
  <g clip-path="url(#tsc)">
    <!-- reflexo -->
    <path d="M215 250 H985 V420 L215 420 Z" fill="#fff" opacity="0.10"/>
    <!-- conteudo vivo -->
    <path d="M420 420 L640 530 L420 640 Z" fill="#38BDF8"/>
    <rect x="690" y="400" width="60" height="220" rx="26" fill="#93C5FD"/>
    <rect x="790" y="450" width="60" height="170" rx="26" fill="#A5B4FC"/>
    <rect x="890" y="370" width="60" height="250" rx="26" fill="#818CF8"/>
    <circle cx="360" cy="700" r="46" fill="#34D399" opacity="0.9"/>
    <circle cx="500" cy="720" r="30" fill="#FBBF24" opacity="0.9"/>
  </g>
  <!-- vidro -->
  <rect x="215" y="250" width="770" height="560" rx="70" fill="url(#gloss)" opacity="0.35"/>
  <rect x="240" y="276" width="300" height="70" rx="35" fill="#fff" opacity="0.22" filter="url(#sf)"/>

  <!-- base com botões -->
  <rect x="140" y="880" width="920" height="110" rx="55" fill="url(#fr)"/>
  <rect x="140" y="880" width="920" height="110" rx="55" fill="url(#v)" opacity="0.5"/>
  <rect x="140" y="880" width="920" height="110" rx="55" fill="none" stroke="rgba(0,0,0,0.32)" stroke-width="12"/>
  <rect x="500" y="918" width="200" height="38" rx="19" fill="#10141F"/>
  <circle cx="820" cy="937" r="30" fill="#F87171"/>
  <circle cx="930" cy="937" r="30" fill="#34D399"/>

  <!-- pernas -->
  <g filter="url(#sd)">
    <path d="M340 990 L250 1100 H440 Z" fill="#2A2D3D" stroke="rgba(0,0,0,0.4)" stroke-width="12" stroke-linejoin="round"/>
    <path d="M860 990 L760 1100 H950 Z" fill="#2A2D3D" stroke="rgba(0,0,0,0.4)" stroke-width="12" stroke-linejoin="round"/>
  </g>
  ${SPEC(270, 300, 34, 0.85)}
</svg>`;
}

/* ================================ GAME ================================ */
function gameScene() {
  const bodyG = RGRAD("bg", [["0%", "#5A6078"], ["45%", "#33364A"], ["100%", "#181A26"]], "42%", "28%", "95%");
  const dpad = GRAD("dp", [["0%", "#8E94AC"], ["100%", "#41455C"]]);
  const stick = RGRAD("st", [["0%", "#6E7490"], ["100%", "#23252F"]], "38%", "32%", "90%");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${RGRAD("glow", [["0%", "#34D399", 0.5], ["55%", "#34D399", 0.16], ["100%", "#34D399", 0]], "50%", "55%", "62%")}
    ${GRAD("gloss", [["0%", "#ffffff", 0.4], ["100%", "#ffffff", 0]], "0%", "0%", "100%", "100%")}
    ${bodyG}${dpad}${stick}
    ${FILTER_SHADOW}${FILTER_SOFT}
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <ellipse cx="600" cy="1020" rx="470" ry="85" fill="#000" opacity="0.55" filter="url(#sf)"/>

  <!-- gatilhos -->
  <g filter="url(#sd)">
    <rect x="240" y="170" width="260" height="150" rx="70" fill="#232530"/>
    <rect x="700" y="170" width="260" height="150" rx="70" fill="#232530"/>
  </g>

  <!-- corpo -->
  <g filter="url(#sd)">
    <path d="M210 380 C210 170 380 110 600 110 C820 110 990 170 990 380 L990 650 C990 890 850 1010 600 1010 C350 1010 210 890 210 650 Z" fill="url(#bg)"/>
    <path d="M210 650 C210 870 310 970 470 1005 L460 940 C360 900 295 800 295 650 Z" fill="#000" opacity="0.28"/>
    <path d="M990 650 C990 870 890 970 730 1005 L740 940 C840 900 905 800 905 650 Z" fill="#000" opacity="0.28"/>
    <path d="M210 380 C210 170 380 110 600 110 C820 110 990 170 990 380 L990 650 C990 890 850 1010 600 1010 C350 1010 210 890 210 650 Z" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="16"/>
    <path d="M300 240 C390 180 480 160 600 160 C720 160 810 180 900 240" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" opacity="0.14"/>
  </g>

  <!-- d-pad -->
  <g filter="url(#sd)">
    <rect x="330" y="420" width="120" height="300" rx="46" fill="url(#dp)"/>
    <rect x="270" y="490" width="240" height="120" rx="46" fill="url(#dp)"/>
    <rect x="330" y="420" width="120" height="300" rx="46" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="12"/>
    <rect x="270" y="490" width="240" height="120" rx="46" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="12"/>
    <circle cx="385" cy="545" r="26" fill="#10141F" opacity="0.55"/>
  </g>

  <!-- botões -->
  <g filter="url(#sd)">
    <g><circle cx="720" cy="380" r="86" fill="#F87171"/><ellipse cx="690" cy="350" rx="38" ry="24" fill="#fff" opacity="0.45"/><text x="720" y="408" text-anchor="middle" font-family="Arial Black, Arial" font-size="80" font-weight="900" fill="#fff">Y</text></g>
    <g><circle cx="920" cy="560" r="86" fill="#60A5FA"/><ellipse cx="890" cy="530" rx="38" ry="24" fill="#fff" opacity="0.45"/><text x="920" y="588" text-anchor="middle" font-family="Arial Black, Arial" font-size="80" font-weight="900" fill="#fff">B</text></g>
    <g><circle cx="720" cy="740" r="86" fill="#34D399"/><ellipse cx="690" cy="710" rx="38" ry="24" fill="#fff" opacity="0.45"/><text x="720" y="768" text-anchor="middle" font-family="Arial Black, Arial" font-size="80" font-weight="900" fill="#fff">A</text></g>
    <g><circle cx="520" cy="560" r="86" fill="#FBBF24"/><ellipse cx="490" cy="530" rx="38" ry="24" fill="#fff" opacity="0.45"/><text x="520" y="588" text-anchor="middle" font-family="Arial Black, Arial" font-size="80" font-weight="900" fill="#3F2400">X</text></g>
  </g>

  <!-- analógicos -->
  <g filter="url(#sd)">
    <circle cx="460" cy="830" r="110" fill="url(#st)"/>
    <circle cx="460" cy="830" r="72" fill="none" stroke="#6E7490" stroke-width="16" opacity="0.9"/>
    <path d="M460 760 V795 M460 865 V900 M390 830 H425 M495 830 H530" stroke="#6E7490" stroke-width="14" stroke-linecap="round" opacity="0.9"/>
    <circle cx="880" cy="860" r="110" fill="url(#st)"/>
    <circle cx="880" cy="860" r="72" fill="none" stroke="#6E7490" stroke-width="16" opacity="0.9"/>
    <path d="M880 790 V825 M880 895 V930 M810 860 H845 M915 860 H950" stroke="#6E7490" stroke-width="14" stroke-linecap="round" opacity="0.9"/>
  </g>

  <!-- home -->
  <circle cx="600" cy="560" r="56" fill="#10141F" stroke="#5A6078" stroke-width="14"/>
  <circle cx="600" cy="560" r="20" fill="#8E94AC"/>
  ${SPEC(320, 300, 36, 0.9)}
</svg>`;
}

/* ================================ LIVRO ================================ */
function livroScene() {
  const cover = GRAD("cv", [["0%", "#B79DFB"], ["50%", "#7C3AED"], ["100%", "#4C1D95"]]);
  const page = GRAD("pg", [["0%", "#FFFDF6"], ["100%", "#EAE2CF"]]);
  const ribbon = GRAD("rb", [["0%", "#F9A8D4"], ["100%", "#DB2777"]]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${RGRAD("glow", [["0%", "#FBBF24", 0.5], ["55%", "#FBBF24", 0.16], ["100%", "#FBBF24", 0]], "50%", "55%", "62%")}
    ${GRAD("gloss", [["0%", "#ffffff", 0.4], ["100%", "#ffffff", 0]], "0%", "0%", "100%", "100%")}
    ${cover}${page}${ribbon}
    ${FILTER_SHADOW}${FILTER_SOFT}
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <ellipse cx="600" cy="1000" rx="440" ry="80" fill="#000" opacity="0.5" filter="url(#sf)"/>

  <!-- PÁGINAS (direita) -->
  <g filter="url(#sd)">
    <path d="M600 240 L1090 190 L1090 950 L600 1000 Z" fill="url(#pg)"/>
    <path d="M600 240 L1090 190 L1090 270 L600 320 Z" fill="#FFFFFF"/>
    <!-- folhas -->
    <path d="M620 380 L1070 334 L1070 356 L620 402 Z" fill="#D9D2C1"/>
    <path d="M620 470 L1070 424 L1070 446 L620 492 Z" fill="#E2DCCB"/>
    <path d="M620 560 L1070 514 L1070 536 L620 582 Z" fill="#D9D2C1"/>
    <path d="M620 650 L1070 604 L1070 626 L620 672 Z" fill="#E2DCCB"/>
    <path d="M620 740 L1070 694 L1070 716 L620 762 Z" fill="#D9D2C1"/>
    <!-- texto grande -->
    <text x="845" y="460" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="700" fill="#4A4234" transform="rotate(2.2 845 460)">MEDIA</text>
    <text x="845" y="600" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="700" fill="#4A4234" transform="rotate(2.2 845 600)">RATE</text>
    <rect x="690" y="660" width="310" height="16" rx="8" fill="#A8A08C" transform="rotate(2.2 690 668)"/>
    <rect x="740" y="720" width="260" height="16" rx="8" fill="#B8B09C" transform="rotate(2.2 740 728)"/>
    <!-- ilustração -->
    <rect x="660" y="770" width="370" height="140" rx="24" fill="#E3DCCB" stroke="#CFC8B6" stroke-width="10" transform="rotate(2.2 660 770)"/>
    <circle cx="780" cy="835" r="34" fill="#CFC7B2"/>
    <path d="M730 895 L800 870 L860 895 Z" fill="#CFC7B2"/>
  </g>

  <!-- CAPA (esquerda, com profundidade) -->
  <g filter="url(#sd)">
    <path d="M600 240 L140 290 L140 1050 L600 1000 Z" fill="url(#cv)"/>
    <path d="M600 240 L540 246 L540 1056 L600 1000 Z" fill="#3B0F70"/>
    <path d="M600 240 L140 290 L140 1050 L600 1000 Z" fill="none" stroke="#2E1065" stroke-width="14"/>
    <path d="M240 350 L520 322 L520 880 L240 908 Z" fill="none" stroke="#FDE68A" stroke-width="14" opacity="0.75"/>
    <text x="380" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#FDE68A" transform="rotate(2.4 380 560)">MEDIA</text>
    <text x="380" y="680" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#FDE68A" transform="rotate(2.4 380 680)">RATE</text>
    <rect x="280" y="760" width="200" height="18" rx="9" fill="#FDE68A" opacity="0.6" transform="rotate(2.4 280 760)"/>
    <circle cx="380" cy="850" r="52" fill="none" stroke="#FDE68A" stroke-width="12" opacity="0.6"/>
    <path d="M600 240 L140 290 L140 330 L600 280 Z" fill="#fff" opacity="0.18"/>
  </g>

  <!-- marcador -->
  <g filter="url(#sd)">
    <path d="M540 130 L650 122 L620 470 L560 476 Z" fill="url(#rb)"/>
    <path d="M540 130 L650 122 L650 150 L540 158 Z" fill="#fff" opacity="0.25"/>
  </g>
  ${SPEC(280, 360, 34, 0.85)}
</svg>`;
}

/* ================================ HQ ================================ */
function hqScene() {
  const panelA = GRAD("pa", [["0%", "#F472B6"], ["100%", "#A855F7"]]);
  const panelB = GRAD("pb", [["0%", "#A855F7"], ["100%", "#6366F1"]]);
  const burst = RGRAD("bs", [["0%", "#FDE68A"], ["100%", "#F59E0B"]], "50%", "50%", "70%");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${RGRAD("glow", [["0%", "#F472B6", 0.5], ["55%", "#F472B6", 0.16], ["100%", "#F472B6", 0]], "50%", "55%", "62%")}
    ${GRAD("gloss", [["0%", "#ffffff", 0.35], ["100%", "#ffffff", 0]], "0%", "0%", "100%", "100%")}
    ${panelA}${panelB}${burst}
    ${FILTER_SHADOW}${FILTER_SOFT}
  </defs>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <ellipse cx="600" cy="1000" rx="440" ry="80" fill="#000" opacity="0.5" filter="url(#sf)"/>

  <!-- PÁGINA com profundidade (pilha de folhas) -->
  <g filter="url(#sd)">
    <!-- pilha lateral -->
    <path d="M170 880 L1030 880 L1030 950 L170 950 Z" fill="#E8D9C0"/>
    <path d="M160 930 L1040 930 L1040 1000 L160 1000 Z" fill="#DCC9A8"/>
    <path d="M150 980 L1050 980 L1050 1050 L150 1050 Z" fill="#D0B990"/>
    <!-- pagina principal -->
    <rect x="140" y="140" width="920" height="860" rx="70" fill="#FDF7EE" stroke="#1F1F2E" stroke-width="26"/>
    <rect x="140" y="140" width="920" height="860" rx="70" fill="url(#gloss)" opacity="0.25"/>
  </g>

  <!-- PAINEL 1 -->
  <g filter="url(#sd)">
    <rect x="220" y="230" width="350" height="280" rx="40" fill="url(#pa)" stroke="#1F1F2E" stroke-width="30"/>
    <path d="M280 330 L500 330 M270 400 L510 400 M280 470 L480 470" stroke="#fff" stroke-width="26" stroke-linecap="round" opacity="0.65"/>
  </g>

  <!-- PAINEL 2 (bolha) -->
  <g filter="url(#sd)">
    <rect x="620" y="230" width="340" height="280" rx="40" fill="#fff" stroke="#1F1F2E" stroke-width="30"/>
    <g fill="#F472B6" opacity="0.5">
      <circle cx="680" cy="290" r="14"/><circle cx="760" cy="290" r="14"/><circle cx="840" cy="290" r="14"/><circle cx="920" cy="290" r="14"/>
      <circle cx="680" cy="350" r="14"/><circle cx="760" cy="350" r="14"/><circle cx="840" cy="350" r="14"/><circle cx="920" cy="350" r="14"/>
    </g>
  </g>
  <!-- bolha de fala flutuando (com sombra = profundidade) -->
  <g filter="url(#sd)">
    <path d="M700 520 C700 440 880 440 880 520 C880 580 830 620 770 630 L810 710 L690 620 C630 600 700 520 700 520 Z" fill="#fff" stroke="#1F1F2E" stroke-width="26"/>
    <circle cx="735" cy="535" r="13" fill="#1F1F2E"/>
    <circle cx="815" cy="535" r="13" fill="#1F1F2E"/>
  </g>

  <!-- PAINEL 3 (raio) -->
  <g filter="url(#sd)">
    <rect x="220" y="570" width="350" height="360" rx="40" fill="url(#pb)" stroke="#1F1F2E" stroke-width="30"/>
    <path d="M420 640 L310 850 L420 830 L360 990" fill="none" stroke="#FDE68A" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- PAINEL 4 (POW com dupla camada = profundidade) -->
  <g filter="url(#sd)">
    <rect x="620" y="570" width="340" height="360" rx="40" fill="#fff" stroke="#1F1F2E" stroke-width="30"/>
    <path d="M790 640 L820 730 L910 745 L840 780 L855 870 L790 825 L725 870 L740 780 L670 745 L760 730 Z" fill="#B45309"/>
    <path d="M790 660 L815 735 L890 748 L830 778 L842 850 L790 812 L738 850 L750 778 L690 748 L765 735 Z" fill="url(#bs)" stroke="#1F1F2E" stroke-width="22"/>
    <text x="790" y="815" text-anchor="middle" font-family="Arial Black, Arial" font-size="110" font-weight="900" fill="#7C2D12">POW!</text>
  </g>

  ${SPEC(300, 300, 36, 0.9)}
</svg>`;
}

/* ---------- render ---------- */
const scenes = { film: filmScene, serie: serieScene, game: gameScene, livro: livroScene, hq: hqScene };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });

for (const [name, scene] of Object.entries(scenes)) {
  const svg = scene();
  const b64 = Buffer.from(svg).toString("base64");
  await page.setContent(
    `<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${b64}" width="1200" height="1200" style="display:block"/></body>`,
    { waitUntil: "load" },
  );
  await page.waitForTimeout(400);
  const png = await page.screenshot({ type: "png" });
  const webp = await sharp(png).webp({ quality: 80 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name}.webp -> ${(webp.size / 1024).toFixed(1)} KB`);
}

await browser.close();
