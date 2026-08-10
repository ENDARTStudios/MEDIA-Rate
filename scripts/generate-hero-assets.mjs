/* global Buffer, console */
/**
 * Gera os 5 renders do Hero no padrão PBR polido (T5a-hero-3d-fix-v5):
 * plástico glossy com specular cortante, metal escovado, vidro com reflexo,
 * couro envernizado, reflexo de piso + rim light. ZERO claymorphism.
 *
 * Pipeline: cena SVG (Chromium renderiza com filtros/máscaras) → PNG 1200² →
 * WebP q80 → public/assets/hero/.
 */
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const OUT = "D:\\PROJETOS\\MEDIA Rate\\MEDIA Rate\\apps\\web\\public\\assets\\hero";
fs.mkdirSync(OUT, { recursive: true });

/* ============================== helpers ============================== */

const L = (id, stops, x1 = "0%", y1 = "0%", x2 = "100%", y2 = "100%") =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</linearGradient>`;

const R = (id, stops, cx = "50%", cy = "50%", r = "50%") =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join("")}</radialGradient>`;

const BLUR = (id, std) =>
  `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}"/></filter>`;

const SHADOW = `<filter id="sd" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="26"/><feOffset dy="34"/><feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/** Specular cortante (brilho de material polido, falloff rápido). */
const SPEC = (cx, cy, rx, ry, o = 0.85, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="${o}" transform="rotate(${rot} ${cx} ${cy})" filter="url(#specBlur)"/>`;

/** Reflexo de ambiente: faixa diagonal nítida (janela/estúdio). */
const ENV = (x, y, w, h, rot, o = 0.35) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" opacity="${o}" transform="rotate(${rot} ${x} ${y})" filter="url(#envBlur)"/>`;

/** Bevel de plástico: luz no topo-esquerda, sombra embaixo-direita. */
const BEVEL = (d, _rx, _base) =>
  `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round" transform="translate(-4,-4)"/><path d="${d}" fill="none" stroke="#000000" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round" transform="translate(4,4)"/>`;

/** Reflexo especular do piso (objeto espelhado + fade). */
function REFLECT(objId, mirrorY, cx, cy, rx, ry, accent, _blurStd = 14) {
  return `
  <mask id="refmask"><rect x="0" y="${cy - ry}" width="1200" height="${ry * 2}" fill="url(#refFade)"/></mask>
  <g clip-path="url(#refClip)" mask="url(#refmask)" filter="url(#refBlur)">
    <g transform="matrix(1 0 0 -1 0 ${mirrorY * 2})"><use href="#${objId}" opacity="0.42"/></g>
  </g>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${accent}" opacity="0.14" filter="url(#refBlur2)"/>
  <clipPath id="refClip"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`;
}

const DEFS_CORE = `
  ${R(
    "refFade",
    [
      ["0%", "#ffffff", 0.95],
      ["55%", "#ffffff", 0.35],
      ["100%", "#ffffff", 0],
    ],
    "50%",
    "0%",
    "100%",
  )}
  ${BLUR("refBlur", 12)}${BLUR("refBlur2", 40)}
  ${BLUR("specBlur", 2.5)}${BLUR("envBlur", 3)}${BLUR("rimBlur", 26)}
  ${SHADOW}
`;

/** Rim light (luz de contorno na borda superior-direita). */
const RIM = (cx, cy, r, accent) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r}" fill="${accent}" opacity="0.4" filter="url(#rimBlur)"/>`;

/* ================================ FILME ================================ */

function filmScene() {
  const mirrorY = 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${DEFS_CORE}
    ${R(
      "glowPool",
      [
        ["0%", "#818CF8", 0.5],
        ["60%", "#818CF8", 0.12],
        ["100%", "#818CF8", 0],
      ],
      "50%",
      "78%",
      "48%",
    )}
    ${L(
      "plasticBody",
      [
        ["0%", "#7C6CF0"],
        ["35%", "#4F46E5"],
        ["72%", "#3730A3"],
        ["100%", "#1E1B4B"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "plasticDark",
      [
        ["0%", "#312E81"],
        ["100%", "#17143A"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "chrome",
      [
        ["0%", "#E8EBF5"],
        ["22%", "#9AA0B8"],
        ["50%", "#F4F6FB"],
        ["78%", "#6B7286"],
        ["100%", "#C7CCDF"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    <clipPath id="stripes"><rect x="0" y="0" width="600" height="210" rx="18"/></clipPath>
  </defs>
  <rect width="1200" height="1200" fill="url(#glowPool)"/>
  ${RIM(920, 240, 260, "#818CF8")}

  <!-- sombra de contato -->
  <ellipse cx="600" cy="${mirrorY + 26}" rx="400" ry="34" fill="#000" opacity="0.55" filter="url(#refBlur2)"/>

  <g id="obj">
    <!-- corpo de plástico índigo polido -->
    <g filter="url(#sd)">
      <rect x="260" y="380" width="680" height="430" rx="76" fill="url(#plasticBody)"/>
      ${BEVEL("M316 404 H884 Q916 404 916 436 V754 Q916 786 884 786 H316 Q284 786 284 754 V436 Q284 404 316 404 Z", 76)}
    </g>
    <!-- borda metálica -->
    <rect x="260" y="380" width="680" height="430" rx="76" fill="none" stroke="url(#chrome)" stroke-width="10"/>
    <rect x="260" y="380" width="680" height="430" rx="76" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="4" transform="translate(0,6)"/>

    <!-- boca articulada (listras diagonais, plástico preto glossy) -->
    <g filter="url(#sd)" transform="rotate(-14 600 380)">
      <rect x="300" y="150" width="600" height="210" rx="22" fill="url(#plasticDark)"/>
      <g clip-path="url(#stripes)">
        <g transform="skewX(-20)">
          <rect x="-60" y="-20" width="150" height="260" fill="#F5F6FA"/>
          <rect x="140" y="-20" width="150" height="260" fill="#F5F6FA"/>
          <rect x="340" y="-20" width="150" height="260" fill="#F5F6FA"/>
          <rect x="540" y="-20" width="150" height="260" fill="#F5F6FA"/>
        </g>
      </g>
      ${ENV(330, 165, 560, 34, -12, 0.28)}
      <rect x="300" y="150" width="600" height="210" rx="22" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="8"/>
      <rect x="300" y="150" width="600" height="210" rx="22" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="5" transform="translate(-4,-4)"/>
    </g>

    <!-- placa de cromo com 3 parafusos -->
    <g filter="url(#sd)">
      <rect x="310" y="392" width="330" height="64" rx="32" fill="url(#chrome)"/>
      <path d="M318 408 H632 M318 424 H632 M318 440 H632" stroke="#5B6074" stroke-width="3" opacity="0.45"/>
      <circle cx="360" cy="424" r="13" fill="#6B7286" stroke="#2E3140" stroke-width="3"/>
      <path d="M360 418 L360 430 M354 424 L366 424" stroke="#D9DEEF" stroke-width="3"/>
      <circle cx="475" cy="424" r="13" fill="#6B7286" stroke="#2E3140" stroke-width="3"/>
      <path d="M475 418 L475 430 M469 424 L481 424" stroke="#D9DEEF" stroke-width="3"/>
      <circle cx="590" cy="424" r="13" fill="#6B7286" stroke="#2E3140" stroke-width="3"/>
      <path d="M590 418 L590 430 M584 424 L596 424" stroke="#D9DEEF" stroke-width="3"/>
    </g>

    <!-- especulares cortantes -->
    ${SPEC(430, 450, 150, 54, 0.5, -18)}
    ${SPEC(360, 430, 46, 22, 0.85, -18)}

    <!-- texto SCENE 1 -->
    <text x="600" y="700" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="118" font-weight="900" letter-spacing="18" fill="#E0E7FF">SCENE 1</text>
    <rect x="430" y="742" width="340" height="10" rx="5" fill="#E0E7FF" opacity="0.6"/>
  </g>

  <!-- reflexo especular do piso -->
  ${REFLECT("obj", mirrorY, 600, 782, 430, 70, "#818CF8")}
</svg>`;
}

/* ================================ SÉRIE ================================ */

function serieScene() {
  const mirrorY = 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${DEFS_CORE}
    ${R(
      "glowPool",
      [
        ["0%", "#38BDF8", 0.5],
        ["60%", "#38BDF8", 0.12],
        ["100%", "#38BDF8", 0],
      ],
      "50%",
      "78%",
      "48%",
    )}
    ${L(
      "graphite",
      [
        ["0%", "#4A4E5C"],
        ["30%", "#23252F"],
        ["75%", "#141519"],
        ["100%", "#0A0B0D"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "metalEdge",
      [
        ["0%", "#9AA0B8"],
        ["40%", "#3E4254"],
        ["60%", "#7C8298"],
        ["100%", "#22242F"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "screenGlass",
      [
        ["0%", "#0E2A52"],
        ["45%", "#08204B"],
        ["100%", "#030A1E"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "chromeKnob",
      [
        ["0%", "#D9DEEF"],
        ["35%", "#7C8298"],
        ["55%", "#E8EBF5"],
        ["100%", "#4A4E5C"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${R(
      "screenGlow",
      [
        ["0%", "#38BDF8", 0.7],
        ["100%", "#38BDF8", 0],
      ],
      "50%",
      "50%",
      "60%",
    )}
  </defs>
  <rect width="1200" height="1200" fill="url(#glowPool)"/>
  ${RIM(930, 230, 250, "#38BDF8")}
  <ellipse cx="600" cy="${mirrorY + 26}" rx="400" ry="34" fill="#000" opacity="0.55" filter="url(#refBlur2)"/>

  <g id="obj">
    <!-- antena em V de cromo -->
    <g filter="url(#sd)" stroke-linecap="round">
      <line x1="430" y1="300" x2="240" y2="80" stroke="url(#chromeKnob)" stroke-width="20"/>
      <line x1="770" y1="300" x2="960" y2="80" stroke="url(#chromeKnob)" stroke-width="20"/>
      <circle cx="240" cy="80" r="30" fill="url(#chromeKnob)"/>
      <circle cx="960" cy="80" r="30" fill="url(#chromeKnob)"/>
    </g>

    <!-- corpo grafite glossy -->
    <g filter="url(#sd)">
      <rect x="150" y="270" width="900" height="620" rx="90" fill="url(#graphite)"/>
      ${BEVEL("M216 306 H984 Q1020 306 1020 342 V818 Q1020 854 984 854 H216 Q180 854 180 818 V342 Q180 306 216 306 Z", 90)}
    </g>
    <!-- borda metálica polida -->
    <rect x="150" y="270" width="900" height="620" rx="90" fill="none" stroke="url(#metalEdge)" stroke-width="12"/>

    <!-- tela de vidro com brilho ciano -->
    <g filter="url(#sd)">
      <rect x="220" y="330" width="660" height="440" rx="54" fill="url(#screenGlass)"/>
    </g>
    <rect x="220" y="330" width="660" height="440" rx="54" fill="url(#screenGlow)" opacity="0.5"/>
    <!-- triângulo de play branco -->
    <path d="M430 470 L650 550 L430 630 Z" fill="#F8FAFC"/>
    <!-- reflexo de vidro (faixa diagonal nítida) -->
    <path d="M240 340 H860 V470 L240 470 Z" fill="#ffffff" opacity="0.1"/>
    ${ENV(260, 360, 300, 60, -14, 0.22)}
    <rect x="220" y="330" width="660" height="440" rx="54" fill="none" stroke="#0A0B0D" stroke-width="8"/>

    <!-- knobs de cromo à direita -->
    <g filter="url(#sd)">
      <circle cx="930" cy="430" r="52" fill="url(#chromeKnob)"/>
      <circle cx="930" cy="430" r="34" fill="none" stroke="#4A4E5C" stroke-width="6"/>
      <path d="M930 406 V428 M930 432 V454 M904 430 H926 M934 430 H956" stroke="#2E3140" stroke-width="7" opacity="0.7"/>
      <circle cx="930" cy="570" r="42" fill="url(#chromeKnob)"/>
      <circle cx="930" cy="570" r="26" fill="none" stroke="#4A4E5C" stroke-width="5"/>
      <path d="M930 548 V568 M930 572 V592 M910 570 H928 M932 570 H950" stroke="#2E3140" stroke-width="6" opacity="0.7"/>
    </g>

    <!-- base com luzes -->
    <rect x="150" y="890" width="900" height="90" rx="45" fill="url(#graphite)"/>
    <rect x="150" y="890" width="900" height="90" rx="45" fill="none" stroke="url(#metalEdge)" stroke-width="10"/>
    <circle cx="940" cy="935" r="20" fill="#F87171"/>
    <circle cx="990" cy="935" r="20" fill="#34D399"/>

    <!-- especulares -->
    ${SPEC(320, 350, 110, 40, 0.5, -16)}
    ${SPEC(280, 330, 40, 20, 0.8, -16)}
  </g>

  ${REFLECT("obj", mirrorY, 600, 782, 430, 70, "#38BDF8")}
</svg>`;
}

/* ================================ GAME ================================ */

function gameScene() {
  const mirrorY = 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${DEFS_CORE}
    ${R(
      "glowPool",
      [
        ["0%", "#34D399", 0.5],
        ["60%", "#34D399", 0.12],
        ["100%", "#34D399", 0],
      ],
      "50%",
      "78%",
      "48%",
    )}
    ${R(
      "softTouch",
      [
        ["0%", "#4A4E5C"],
        ["38%", "#232530"],
        ["100%", "#0C0D12"],
      ],
      "42%",
      "26%",
      "95%",
    )}
    ${L(
      "emeraldGrip",
      [
        ["0%", "#6EE7B7"],
        ["30%", "#10B981"],
        ["70%", "#047857"],
        ["100%", "#022C22"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "stick",
      [
        ["0%", "#8E94AC"],
        ["100%", "#2E3140"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "metalTrig",
      [
        ["0%", "#C7CCDF"],
        ["40%", "#6B7286"],
        ["60%", "#9AA0B8"],
        ["100%", "#3E4254"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
  </defs>
  <rect width="1200" height="1200" fill="url(#glowPool)"/>
  ${RIM(930, 240, 250, "#34D399")}
  <ellipse cx="600" cy="${mirrorY + 26}" rx="440" ry="36" fill="#000" opacity="0.6" filter="url(#refBlur2)"/>

  <g id="obj">
    <!-- gatilhos metálicos -->
    <g filter="url(#sd)">
      <rect x="235" y="150" width="250" height="130" rx="58" fill="url(#metalTrig)"/>
      <rect x="715" y="150" width="250" height="130" rx="58" fill="url(#metalTrig)"/>
    </g>

    <!-- corpo: soft-touch preto + grips esmeralda glossy -->
    <g filter="url(#sd)">
      <path d="M200 380 C200 160 380 100 600 100 C820 100 1000 160 1000 380 L1000 640 C1000 890 860 1020 600 1020 C340 1020 200 890 200 640 Z" fill="url(#softTouch)"/>
      ${BEVEL("M240 380 C240 195 390 140 600 140 C810 140 960 195 960 380 L960 640 C960 870 830 985 600 985 C370 985 240 870 240 640 Z", 60)}
      <!-- grips esmeralda -->
      <path d="M200 640 C200 880 330 990 480 1010 L470 930 C360 890 285 790 285 640 Z" fill="url(#emeraldGrip)"/>
      <path d="M1000 640 C1000 880 870 990 720 1010 L730 930 C840 890 915 790 915 640 Z" fill="url(#emeraldGrip)"/>
      ${SPEC(360, 850, 90, 40, 0.4, -20)}
      ${SPEC(840, 850, 90, 40, 0.4, 20)}
    </g>

    <!-- d-pad (plástico cinza) -->
    <g filter="url(#sd)">
      <rect x="330" y="420" width="110" height="280" rx="40" fill="url(#stick)"/>
      <rect x="265" y="480" width="240" height="110" rx="40" fill="url(#stick)"/>
      ${ENV(285, 495, 200, 26, -10, 0.3)}
    </g>

    <!-- botões polidos Y/B/A/X -->
    <g filter="url(#sd)">
      <g><circle cx="700" cy="360" r="80" fill="#F87171"/><ellipse cx="672" cy="330" rx="30" ry="18" fill="#fff" opacity="0.5"/><text x="700" y="392" text-anchor="middle" font-family="Arial Black, Arial" font-size="72" font-weight="900" fill="#fff">Y</text></g>
      <g><circle cx="900" cy="560" r="80" fill="#60A5FA"/><ellipse cx="872" cy="530" rx="30" ry="18" fill="#fff" opacity="0.5"/><text x="900" y="592" text-anchor="middle" font-family="Arial Black, Arial" font-size="72" font-weight="900" fill="#fff">B</text></g>
      <g><circle cx="700" cy="760" r="80" fill="#34D399"/><ellipse cx="672" cy="730" rx="30" ry="18" fill="#fff" opacity="0.5"/><text x="700" y="792" text-anchor="middle" font-family="Arial Black, Arial" font-size="72" font-weight="900" fill="#fff">A</text></g>
      <g><circle cx="500" cy="560" r="80" fill="#FBBF24"/><ellipse cx="472" cy="530" rx="30" ry="18" fill="#fff" opacity="0.5"/><text x="500" y="592" text-anchor="middle" font-family="Arial Black, Arial" font-size="72" font-weight="900" fill="#3F2400">X</text></g>
    </g>

    <!-- analógicos texturizados -->
    <g filter="url(#sd)">
      <circle cx="450" cy="860" r="100" fill="url(#stick)"/>
      <circle cx="450" cy="860" r="62" fill="none" stroke="#5B6074" stroke-width="14"/>
      <circle cx="450" cy="860" r="40" fill="none" stroke="#5B6074" stroke-width="6" opacity="0.7"/>
      <circle cx="880" cy="870" r="100" fill="url(#stick)"/>
      <circle cx="880" cy="870" r="62" fill="none" stroke="#5B6074" stroke-width="14"/>
      <circle cx="880" cy="870" r="40" fill="none" stroke="#5B6074" stroke-width="6" opacity="0.7"/>
    </g>

    <!-- home -->
    <circle cx="600" cy="560" r="48" fill="#0C0D12" stroke="#4A4E5C" stroke-width="12"/>
    <circle cx="600" cy="560" r="18" fill="#8E94AC"/>
  </g>

  ${REFLECT("obj", mirrorY, 600, 782, 440, 70, "#34D399")}
</svg>`;
}

/* ================================ LIVRO ================================ */

function livroScene() {
  const mirrorY = 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${DEFS_CORE}
    ${R(
      "glowPool",
      [
        ["0%", "#FBBF24", 0.5],
        ["60%", "#FBBF24", 0.12],
        ["100%", "#FBBF24", 0],
      ],
      "50%",
      "78%",
      "48%",
    )}
    ${L(
      "leather",
      [
        ["0%", "#E8A05C"],
        ["30%", "#B45309"],
        ["70%", "#7C2D12"],
        ["100%", "#451A03"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "leatherSheen",
      [
        ["0%", "#ffffff", 0.5],
        ["45%", "#ffffff", 0.08],
        ["100%", "#ffffff", 0],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "ivory",
      [
        ["0%", "#FEFBF2"],
        ["100%", "#E8E0CC"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "satin",
      [
        ["0%", "#F9A8D4"],
        ["45%", "#DB2777"],
        ["100%", "#9D174D"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${R(
      "pageGlow",
      [
        ["0%", "#FDE68A", 0.85],
        ["100%", "#FDE68A", 0],
      ],
      "50%",
      "50%",
      "55%",
    )}
  </defs>
  <rect width="1200" height="1200" fill="url(#glowPool)"/>
  ${RIM(930, 250, 250, "#FBBF24")}
  <ellipse cx="600" cy="${mirrorY + 26}" rx="400" ry="32" fill="#000" opacity="0.55" filter="url(#refBlur2)"/>

  <g id="obj">
    <!-- luz quente vazando das páginas -->
    <ellipse cx="610" cy="520" rx="330" ry="240" fill="url(#pageGlow)" opacity="0.5"/>

    <!-- páginas de marfim (bloco nítido) -->
    <g filter="url(#sd)">
      <path d="M600 300 L1080 270 L1080 940 L600 970 Z" fill="url(#ivory)"/>
      <path d="M600 300 L1080 270 L1080 330 L600 360 Z" fill="#FFFFFF"/>
      <path d="M620 420 L1060 394 V410 L620 436 Z" fill="#D8D0BC"/>
      <path d="M620 510 L1060 484 V500 L620 526 Z" fill="#E2DCCB"/>
      <path d="M620 600 L1060 574 V590 L620 616 Z" fill="#D8D0BC"/>
      <path d="M620 690 L1060 664 V680 L620 706 Z" fill="#E2DCCB"/>
      <path d="M620 780 L1060 754 V770 L620 796 Z" fill="#D8D0BC"/>
      <!-- linhas de texto -->
      <path d="M680 440 L1010 420" stroke="#A8A08C" stroke-width="8" stroke-linecap="round"/>
      <path d="M720 500 L1010 482" stroke="#B8B09C" stroke-width="8" stroke-linecap="round"/>
      <path d="M700 560 L1010 542" stroke="#A8A08C" stroke-width="8" stroke-linecap="round"/>
    </g>

    <!-- capa de couro envernizado -->
    <g filter="url(#sd)">
      <path d="M600 300 L120 350 L120 1020 L600 970 Z" fill="url(#leather)"/>
      <path d="M600 300 L560 304 L560 1024 L600 970 Z" fill="#451A03"/>
      <path d="M600 300 L120 350 L120 1020 L600 970 Z" fill="url(#leatherSheen)"/>
      <path d="M600 300 L120 350 L120 1020 L600 970 Z" fill="none" stroke="#2D1204" stroke-width="12"/>
      <!-- moldura em relevo dourado -->
      <path d="M220 420 L520 394 L520 870 L220 896 Z" fill="none" stroke="#FDE68A" stroke-width="10" opacity="0.85"/>
      <path d="M240 436 L500 412 L500 854 L240 878 Z" fill="none" stroke="#451A03" stroke-width="4" opacity="0.6"/>
      <text x="372" y="580" text-anchor="middle" font-family="Georgia, serif" font-size="86" font-weight="700" fill="#FDE68A" transform="rotate(2.6 372 580)">MEDIA</text>
      <text x="372" y="680" text-anchor="middle" font-family="Georgia, serif" font-size="86" font-weight="700" fill="#FDE68A" transform="rotate(2.6 372 680)">RATE</text>
      <circle cx="372" cy="800" r="44" fill="none" stroke="#FDE68A" stroke-width="8" opacity="0.75"/>
      ${SPEC(240, 420, 120, 40, 0.35, -14)}
    </g>

    <!-- fita de cetim vermelha -->
    <g filter="url(#sd)">
      <path d="M560 130 L660 120 L640 470 L570 478 Z" fill="url(#satin)"/>
      <path d="M560 130 L660 120 L660 148 L560 158 Z" fill="#fff" opacity="0.3"/>
      <path d="M570 478 L640 470 L638 500 L568 508 Z" fill="#9D174D"/>
    </g>
  </g>

  ${REFLECT("obj", mirrorY, 600, 782, 420, 68, "#FBBF24")}
</svg>`;
}

/* ================================ HQ (revista BRASIL) ================================ */

function hqScene() {
  const mirrorY = 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    ${DEFS_CORE}
    ${R(
      "glowPool",
      [
        ["0%", "#F472B6", 0.5],
        ["60%", "#F472B6", 0.12],
        ["100%", "#F472B6", 0],
      ],
      "50%",
      "78%",
      "48%",
    )}
    ${L(
      "magCover",
      [
        ["0%", "#F472B6"],
        ["45%", "#C026D3"],
        ["80%", "#7E22CE"],
        ["100%", "#581C87"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "panelA",
      [
        ["0%", "#F472B6"],
        ["100%", "#A855F7"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${L(
      "panelB",
      [
        ["0%", "#A855F7"],
        ["100%", "#6366F1"],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
    ${R(
      "burst",
      [
        ["0%", "#FDE68A"],
        ["100%", "#F59E0B"],
      ],
      "50%",
      "50%",
      "70%",
    )}
    ${L(
      "paperGloss",
      [
        ["0%", "#ffffff", 0.4],
        ["50%", "#ffffff", 0.05],
        ["100%", "#ffffff", 0],
      ],
      "0%",
      "0%",
      "100%",
      "100%",
    )}
  </defs>
  <rect width="1200" height="1200" fill="url(#glowPool)"/>
  ${RIM(930, 250, 250, "#F472B6")}
  <ellipse cx="600" cy="${mirrorY + 26}" rx="400" ry="32" fill="#000" opacity="0.55" filter="url(#refBlur2)"/>

  <g id="obj" transform="rotate(6 600 600)">
    <!-- revista fina (floppy), leve dobra na capa -->
    <g filter="url(#sd)">
      <!-- pagina fina inclinada (perspectiva) -->
      <path d="M330 140 L950 100 L950 1060 L330 1100 Z" fill="url(#magCover)"/>
      <!-- lombada dobrada (borda esquerda) -->
      <path d="M330 140 L380 136 L380 1096 L330 1100 Z" fill="#581C87"/>
      <path d="M330 140 L380 136 L380 152 L330 156 Z" fill="#fff" opacity="0.18"/>
      <!-- canto inferior direito dobrado -->
      <path d="M950 1000 L950 1060 L890 1052 Z" fill="#6D28D9"/>
      <path d="M950 1000 L950 1060 L930 1058 L930 998 Z" fill="#fff" opacity="0.15"/>
      <!-- vinco vertical sutil -->
      <path d="M420 150 L420 1090" stroke="#000" stroke-width="8" opacity="0.2"/>
    </g>
    <!-- gloss de impressão -->
    <path d="M330 140 L950 100 L950 1060 L330 1100 Z" fill="url(#paperGloss)"/>
    ${ENV(360, 170, 560, 36, -8, 0.22)}

    <!-- masthead BRASIL + caixa #01 (texto exato em SVG) -->
    <text x="640" y="230" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="900" letter-spacing="10" fill="#FFFFFF" stroke="#1F1F2E" stroke-width="6" paint-order="stroke">BRASIL</text>
    <rect x="850" y="175" width="86" height="44" rx="6" fill="#fff" stroke="#1F1F2E" stroke-width="5"/>
    <text x="893" y="208" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" font-weight="900" fill="#1F1F2E">#01</text>

    <!-- painéis impressos -->
    <g filter="url(#sd)">
      <rect x="370" y="290" width="270" height="210" rx="10" fill="url(#panelA)" stroke="#1F1F2E" stroke-width="14"/>
      <path d="M400 350 L600 340 M390 400 L610 390 M400 450 L580 440" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="0.6"/>
      <rect x="670" y="290" width="260" height="210" rx="10" fill="#fff" stroke="#1F1F2E" stroke-width="14"/>
      <g fill="#F472B6" opacity="0.5">
        <circle cx="720" cy="340" r="11"/><circle cx="790" cy="340" r="11"/><circle cx="860" cy="340" r="11"/><circle cx="890" cy="340" r="11"/>
        <circle cx="720" cy="400" r="11"/><circle cx="790" cy="400" r="11"/><circle cx="860" cy="400" r="11"/>
      </g>
    </g>
    <!-- bolha de fala 3D -->
    <g filter="url(#sd)">
      <path d="M690 540 C690 450 880 450 880 540 C880 610 830 650 760 660 L810 750 L680 640 C610 620 690 540 690 540 Z" fill="#fff" stroke="#1F1F2E" stroke-width="14"/>
      <circle cx="735" cy="555" r="10" fill="#1F1F2E"/>
      <circle cx="815" cy="555" r="10" fill="#1F1F2E"/>
    </g>
    <g filter="url(#sd)">
      <rect x="370" y="620" width="270" height="330" rx="10" fill="url(#panelB)" stroke="#1F1F2E" stroke-width="14"/>
      <path d="M540 680 L430 890 L540 870 L480 1020" fill="none" stroke="#FDE68A" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g filter="url(#sd)">
      <rect x="670" y="620" width="260" height="330" rx="10" fill="#fff" stroke="#1F1F2E" stroke-width="14"/>
      <path d="M800 680 L830 770 L920 785 L850 820 L865 910 L800 865 L735 910 L750 820 L680 785 L770 770 Z" fill="url(#burst)" stroke="#1F1F2E" stroke-width="12"/>
      <text x="800" y="845" text-anchor="middle" font-family="Arial Black, Arial" font-size="86" font-weight="900" fill="#7C2D12">POW!</text>
    </g>
  </g>

  ${REFLECT("obj", mirrorY, 600, 782, 420, 68, "#F472B6")}
</svg>`;
}

/* ================================ render ================================ */

const scenes = {
  film: filmScene,
  serie: serieScene,
  game: gameScene,
  livro: livroScene,
  hq: hqScene,
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 1200 },
  deviceScaleFactor: 1,
});

for (const [name, scene] of Object.entries(scenes)) {
  const svg = scene();
  const b64 = Buffer.from(svg).toString("base64");
  await page.setContent(
    `<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${b64}" width="1200" height="1200" style="display:block"/></body>`,
    { waitUntil: "load" },
  );
  await page.waitForTimeout(450);
  const png = await page.screenshot({ type: "png" });
  const webp = await sharp(png).webp({ quality: 80 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name}.webp -> ${(webp.size / 1024).toFixed(1)} KB`);
}

await browser.close();
