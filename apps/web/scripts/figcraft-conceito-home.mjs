#!/usr/bin/env node
/**
 * Conceito **v9** do MEDIA Rate — home. Cinco pedidos do Operador, todos ancorados no que o projeto já tem:
 *
 *   1. **CTA**: "Descubra o que vale o seu tempo para assistir, ler e jogar." — vira o H1 do hero.
 *   2. **Alinhamentos corrigidos**: tudo passa a nascer de um sistema de colunas (margem 64, conteúdo 1312,
 *      grade de 3 colunas de 416 com 32 de vão, grade de 6 faixas para a régua, direita em 1376). Antes eu
 *      posicionava números soltos e a página ficava torta.
 *   3. **Seletor de idioma**: reproduz `LocaleSwitcher.tsx` — globo de 14 px (círculo + elipse + linha),
 *      sigla, chevron de 12 px, `rounded-md`, hover accent, dropdown com borda `#1C1C2E` e item ativo em
 *      `rgba(129,140,248,.08)`. No produto ele vive na `Navbar`.
 *   4. **Carrosséis por tipo de mídia**: reproduz `MediaCarousel.tsx` — tile de ícone `h-8 w-8 rounded-lg`
 *      com o ícone `h-4 w-4`, `h2` uppercase `tracking-wider`, total em `tabular-nums`, trilha
 *      `snap-x snap-mandatory` com cards de 180 px e setas. O "animado" é: avanço suave por snap, seta por
 *      card, e auto-avanço de 5 s **que pausa em hover/focus** e desliga em reduced-motion (WCAG 2.2.2).
 *   5. **Rodapé completo**: reproduz `MotionFooter.tsx` — Produto (6 links), Legal (7), Social (Telegram),
 *      Contato, a linha de copyright com a identificação da END ART Studios e a **atribuição obrigatória**
 *      de TMDB/IGDB (`text-[11px]`).
 *
 * Tiles dos 6 tipos: reproduzem o `.iconBox` original (raio 22, borda a 26% da cor, fundo a 9% sobre
 * `#101018`, realce interno, glow) com o símbolo em 62 px e `stroke-width="1.6"` gravado no SVG.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RAIZ = "D:/PROJETOS/MEDIA Rate/MEDIA Rate";
const OUT = `${RAIZ}/docs/02-architecture-design/figcraft/conceito-home`;
const ICONES = `${RAIZ}/node_modules/lucide-static/icons`;
const TMP = join(tmpdir(), "media-rate-figcraft");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const C = {
  bg: "#05050A",
  card: "#12121C",
  elev: "#1B1B2C",
  border: "#2A2A3D",
  dropdownBorder: "#1C1C2E",
  accent: "#818CF8",
  accentSoft: "#15162B",
  fg: "#F5F5F7",
  fg2: "#A0A0B8",
  muted: "#85859F",
  brand: "#E11D48",
  onBrand: "#FFFFFF",
  s9: "#34D399",
  s8: "#38BDF8",
  s7: "#818CF8",
  s6: "#F59E0B",
  s5: "#F97316",
  low: "#F87171",
};
const HEAD = "Space Grotesk";
const BODY = "Inter";

// ── sistema de alinhamento (a correção do pedido 2) ──────────────────────────
// A grade é a do produto, não uma escolha minha: o rodapé e os carrosséis usam
// `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (MotionFooter.tsx:27, MediaCarousel.tsx:108).
// max-w-7xl = 1280 → margem 80 na tela de 1440; lg:px-8 = 32 → conteúdo de 112 a 1328.
const M = 112;
const CONTEUDO = 1216;
const DIREITA = 1328;
const VAO3 = 32;
const COL3 = Math.floor((CONTEUDO - VAO3 * 2) / 3); // 416
const col3 = (i) => M + i * (COL3 + VAO3); // 64 · 512 · 960
const VAO6 = 16;
const COL6 = Math.floor((CONTEUDO - VAO6 * 5) / 6); // 218
const col6 = (i) => M + i * (COL6 + VAO6); // 64 · 298 · 532 · 766 · 1000 · 1234

function misturar(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return (
    "#" +
    m
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

const TIPOS = [
  { id: "movie", rotulo: "Filmes", icone: "clapperboard", cor: "#818CF8" },
  { id: "series", rotulo: "Séries", icone: "tv", cor: "#38BDF8" },
  { id: "game", rotulo: "Games", icone: "gamepad-2", cor: "#34D399" },
  { id: "book", rotulo: "Livros", icone: "book-open", cor: "#FBBF24" },
  { id: "comic", rotulo: "Quadrinhos", icone: "book-image", cor: "#F472B6" },
  { id: "manga", rotulo: "Mangás", icone: "book-marked", cor: "#A78BFA" },
];
const FAIXAS = [
  { rot: "9 a 10", nome: "Excepcional", cor: C.s9, nota: "9,4" },
  { rot: "8", nome: "Muito bom", cor: C.s8, nota: "8,7" },
  { rot: "7", nome: "Bom", cor: C.s7, nota: "7,3" },
  { rot: "6", nome: "Razoável", cor: C.s6, nota: "6,4" },
  { rot: "5", nome: "Fraco", cor: C.s5, nota: "5,2" },
  { rot: "abaixo", nome: "Evite", cor: C.low, nota: "4,1" },
];

const passos = [];
const cmd = (id, params) => passos.push({ command: id, params });

function rect(name, x, y, w, h, cor, pai, raio = 0, extra = {}) {
  cmd("shape.rectangle", { x, y, width: w, height: h, parent: pai, props: { name } });
  const props = { fill: cor, ...extra };
  if (raio) props.cornerRadius = raio;
  cmd("node.set", { name, ...props });
}
function texto(name, txt, x, y, tamanho, cor, pai, opts = {}) {
  cmd("text.create", {
    text: txt,
    x,
    y,
    parent: pai,
    width: opts.largura,
    props: {
      name,
      fontSize: tamanho,
      fontFamily: opts.fonte ?? BODY,
      ...(opts.peso ? { fontWeight: opts.peso } : {}),
    },
  });
  cmd("node.set", { name, fill: cor });
}
/** Símbolo Lucide real, com tamanho intrínseco e traço resolvidos NO SVG (ver D-638). */
function icone(nome, arquivo, cor, cx, cy, tamanho, traco = 1.6) {
  const bruto = readFileSync(`${ICONES}/${arquivo}.svg`, "utf8")
    .replace(/currentColor/g, cor)
    .replace(/\swidth="24"/, ` width="${tamanho}"`)
    .replace(/\sheight="24"/, ` height="${tamanho}"`)
    .replace(/stroke-width="2"/, `stroke-width="${traco}"`);
  const caminho = `${TMP}/_icone-${nome.replace(/\//g, "-")}.svg`;
  writeFileSync(caminho, bruto, "utf8");
  cmd("file.import", { path: caminho, x: cx, y: cy, center: true });
  cmd("node.set", { name: `${arquivo}.svg`, width: tamanho, height: tamanho });
}
/** `.iconBox` do original, reproduzido: glow + tile raio 22 + realce interno. */
function tileIcone(pref, t, x, y, lado, escala = 1, destaque = false, pai = T) {
  rect(
    `${pref}/glow`,
    x - 6,
    y - 6,
    lado + 12,
    lado + 12,
    misturar(C.bg, t.cor, destaque ? 0.22 : 0.16),
    pai,
    26,
  );
  rect(
    `${pref}/tile`,
    x,
    y,
    lado,
    lado,
    misturar("#101018", t.cor, destaque ? 0.18 : 0.09),
    pai,
    22,
    {
      strokes: [misturar(C.bg, t.cor, destaque ? 0.7 : 0.26)],
      strokeWeight: 1,
    },
  );
  rect(`${pref}/realce`, x + 1, y + 1, lado - 2, 1, misturar(C.bg, C.fg, 0.06), pai);
  icone(`${pref}/icone`, t.icone, t.cor, x + lado / 2, y + lado / 2, Math.round(62 * escala));
}

// ═══════════════════════════ PÁGINA 1 — a home ═══════════════════════════
cmd("page.add", { name: "Home — conceito v9" });
cmd("page.setBackground", { color: C.bg });
cmd("frame.create", { x: 0, y: 0, width: 1440, height: 4900, name: "Home v9 / 1440" });
const T = "Home v9 / 1440";
cmd("node.set", { name: T, fill: C.bg });

// ── navegação (tudo alinhado: logo em M, CTA na direita de 1376) ─────────────
rect("nav/linha", 0, 71, 1440, 1, C.border, T);
rect("logo/marca", M, 20, 30, 30, C.accent, T, 8);
texto("logo/nome", "MEDIA Rate", M + 40, 26, 17, C.fg, T, { fonte: HEAD, peso: 700 });
["Catálogo", "Rankings", "Descobertas", "Planos"].forEach((l, i) =>
  texto(`nav/${l}`, l, 350 + i * 116, 28, 14, C.fg2, T),
);
// bloco da direita: busca · idioma · CTA (mesmo topo, alinhados à direita em 1376)
const ctaW = 152;
const swW = 78;
const buscaW = 264;
const buscaX = DIREITA - ctaW - 12 - swW - 12 - buscaW;
rect("nav/busca", buscaX, 18, buscaW, 36, C.card, T, 8, { strokes: [C.border], strokeWeight: 1 });
texto("nav/busca/hint", "Buscar mídia…", buscaX + 14, 28, 13, C.muted, T);
texto("nav/busca/kbd", "⌘K", buscaX + buscaW - 30, 28, 12, C.accent, T);
// seletor de idioma (LocaleSwitcher: globo 14 + sigla + chevron 12)
const swX = buscaX + buscaW + 12;
rect("nav/idioma/bg", swX, 18, swW, 36, C.card, T, 8, { strokes: [C.border], strokeWeight: 1 });
icone("nav/idioma/globo", "globe", C.fg2, swX + 18, 36, 14, 2);
texto("nav/idioma/sigla", "PT", swX + 30, 28, 12, C.fg2, T, { peso: 700 });
icone("nav/idioma/chevron", "chevron-down", C.fg2, swX + 58, 36, 12, 2);
// Seletor FECHADO: com o dropdown aberto ele cobria o H1 (é um overlay). O estado aberto está
// detalhado no documento, com as cores do componente.
rect("nav/cta", DIREITA - ctaW, 18, ctaW, 36, C.brand, T, 8);
texto("nav/cta/txt", "Criar conta grátis", DIREITA - ctaW + 16, 28, 13, C.onBrand, T, {
  peso: 700,
});

// ── hero: o CTA pedido como H1 · texto à esquerda, selo à direita ────────────
// três linhas explícitas com 54px de altura de linha: em uma linha só, a 46px, o texto
// quebrava sozinho e uma linha caía sobre a outra.
texto("hero/h1a", "Descubra o que vale", M, 124, 42, C.fg, T, {
  fonte: HEAD,
  peso: 700,
  largura: 640,
});
texto("hero/h1b", "o seu tempo para assistir,", M, 178, 42, C.fg, T, {
  fonte: HEAD,
  peso: 700,
  largura: 640,
});
texto("hero/h1c", "ler e jogar.", M, 232, 42, C.fg, T, { fonte: HEAD, peso: 700, largura: 640 });
texto(
  "hero/sub",
  "Um score por título, a partir de crítico e público de fontes que você pode conferir — sem caixa-preta.",
  M,
  300,
  17,
  C.fg2,
  T,
  { largura: 620 },
);
rect("hero/busca", M, 366, 700, 56, C.card, T, 12, { strokes: [C.border], strokeWeight: 1 });
texto("hero/busca/hint", "Digite um filme, série, game, livro…", M + 24, 386, 15, C.muted, T);
rect("hero/busca/btn", M + 600, 374, 90, 40, C.brand, T, 8);
texto("hero/busca/btn/txt", "Buscar", M + 624, 386, 14, C.onBrand, T, { peso: 700 });
texto("hero/micro", "Sem cartão para começar · cancele quando quiser", M, 436, 12, C.muted, T);
// selo do score: ancorado à DIREITA da grade, não a um número solto
const SX = DIREITA - 300;
rect("selo/anel", SX, 128, 300, 300, C.s8, T, 150);
rect("selo/miolo", SX + 30, 158, 240, 240, C.bg, T, 120);
texto("selo/num", "8,7", SX + 66, 214, 76, C.s8, T, { fonte: HEAD, peso: 700 });
texto("selo/max", "/10", SX + 200, 266, 20, C.muted, T);
texto("selo/faixa", "Muito bom", SX + 102, 314, 16, C.fg2, T);
texto("selo/escala", "a régua em movimento · exemplo da escala", SX - 12, 448, 11, C.muted, T);
["TMDB", "IMDb", "Metacritic"].forEach((f, i) => {
  const x = SX + i * 100;
  rect(`selo/fonte/${f}`, x, 470, 88, 28, C.card, T, 8, { strokes: [C.border], strokeWeight: 1 });
  texto(`selo/fonte/${f}/t`, f, x + 16, 477, 12, C.fg2, T);
});

// ── os 6 ícones: elemento primário, centrados na largura de conteúdo ─────────
const SYM = 86;
const VAOIC = 62;
const TOTAL = TIPOS.length * SYM + (TIPOS.length - 1) * VAOIC;
const X0 = Math.round((1440 - TOTAL) / 2);
const Y = 556;
texto("tipos/rotulo", "seis tipos de obra, uma régua só", 614, Y - 40, 13, C.muted, T);
TIPOS.forEach((t, i) => {
  const x = X0 + i * (SYM + VAOIC);
  tileIcone(`tipo/${t.id}`, t, x, Y, SYM);
  texto(
    `tipo/${t.id}/rotulo`,
    t.rotulo,
    Math.round(x + SYM / 2 - t.rotulo.length * 3.4),
    Y + SYM + 12,
    12,
    t.cor,
    T,
  );
});

// ── A régua (6 faixas na grade de 6 colunas) ─────────────────────────────────
const YR = 740;
rect("regua/linha", M, YR, CONTEUDO, 1, C.border, T);
texto("regua/titulo", "A régua", M, YR + 32, 28, C.fg, T, { fonte: HEAD, peso: 700 });
texto(
  "regua/sub",
  "A mesma escala para tudo. A faixa acesa é a do selo.",
  M,
  YR + 74,
  15,
  C.fg2,
  T,
  { largura: 700 },
);
FAIXAS.forEach((f, i) => {
  const x = col6(i);
  const ativa = i === 1;
  rect(`regua/${i}/trilha`, x, YR + 128, COL6, ativa ? 18 : 10, C.elev, T, ativa ? 9 : 5);
  rect(`regua/${i}/barra`, x, YR + 128, COL6, ativa ? 18 : 10, f.cor, T, ativa ? 9 : 5);
  texto(`regua/${i}/nota`, f.nota, x, YR + 158, 20, ativa ? f.cor : C.muted, T, {
    fonte: HEAD,
    peso: 700,
  });
  texto(`regua/${i}/nome`, f.faixa, x, YR + 188, 12, ativa ? C.fg2 : C.muted, T);
});
texto(
  "regua/aviso",
  "O selo percorre as seis faixas e acende a barra correspondente — 2,6 s por estado, pausa no ponteiro, desligado em reduced-motion.",
  M,
  YR + 224,
  12,
  C.muted,
  T,
  { largura: 1100 },
);

// ── Carrosséis por tipo de mídia (MediaCarousel) ─────────────────────────────
// as SEIS mídias têm carrossel próprio: Quadrinhos e Mangás são tipos distintos, não um só.
const CARROSSEIS = TIPOS;
const ALTURA_CAR = 396;
const YC0 = 1044;
CARROSSEIS.forEach((t, ci) => {
  const y = YC0 + ci * ALTURA_CAR;
  rect(`car${ci}/icone/bg`, M, y, 32, 32, misturar("#101018", t.cor, 0.12), T, 8, {
    strokes: [misturar(C.bg, t.cor, 0.3)],
    strokeWeight: 1,
  });
  icone(`car${ci}/icone`, t.icone, t.cor, M + 16, y + 16, 16, 2);
  texto(`car${ci}/titulo`, t.rotulo.toUpperCase(), M + 44, y + 6, 17, C.fg, T, {
    fonte: HEAD,
    peso: 700,
  });
  // sem número fixo: no produto o total vem da API (ver `MediaCarousel`), então aqui não se digita
  texto(`car${ci}/total`, "títulos no catálogo", M + 44, y + 30, 11, C.muted, T);
  [0, 1].forEach((k) => {
    const bx = DIREITA - 32 - k * 44;
    rect(`car${ci}/seta${k}`, bx, y, 32, 32, C.card, T, 8, {
      strokes: [C.border],
      strokeWeight: 1,
    });
    icone(
      `car${ci}/seta${k}/icone`,
      k === 0 ? "chevron-left" : "chevron-right",
      C.fg2,
      bx + 16,
      y + 16,
      14,
      2,
    );
  });
  // trilha: cards de 180 px com snap; o último é cortado pela margem (convite a arrastar)
  const CARD = 180;
  const VAOC = 16;
  const quantos = Math.ceil((CONTEUDO + VAOC) / (CARD + VAOC));
  for (let i = 0; i < quantos; i++) {
    const x = M + i * (CARD + VAOC);
    const largura = Math.min(CARD, DIREITA - x);
    if (largura < 60) break;
    rect(`car${ci}/card${i}`, x, y + 52, largura, 292, C.card, T, 12, {
      strokes: [C.border],
      strokeWeight: 1,
    });
    rect(`car${ci}/card${i}/poster`, x + 12, y + 64, largura - 24, 176, C.elev, T, 10);
    rect(`car${ci}/card${i}/l1`, x + 26, y + 104, 92, 8, C.border, T, 4);
    rect(`car${ci}/card${i}/l2`, x + 26, y + 122, 60, 8, C.border, T, 4);
    texto(`car${ci}/card${i}/nota`, "pôster", x + (largura - 24) / 2 - 6, y + 214, 11, C.muted, T);
    const faixa = FAIXAS[(i + ci) % 6];
    rect(`car${ci}/card${i}/chip`, x + 12, y + 252, 74, 22, C.elev, T, 8, {
      strokes: [faixa.cor],
      strokeWeight: 1,
    });
    texto(`car${ci}/card${i}/chip/t`, faixa.rot, x + 22, y + 257, 10, faixa.cor, T);
    texto(`car${ci}/card${i}/nome`, "título do catálogo", x + 12, y + 284, 11, C.muted, T);
  }
});
texto(
  "car/nota",
  "Os carrosséis avançam um card por vez com scroll-snap suave; o auto-avanço de 5 s pausa em hover/focus e desliga em reduced-motion.",
  M,
  YC0 + CARROSSEIS.length * ALTURA_CAR,
  12,
  C.muted,
  T,
  { largura: 1200 },
);

// ── Por decisão, não por prateleira (grade de 3 colunas exata) ───────────────
const YD = YC0 + CARROSSEIS.length * ALTURA_CAR + 52;
texto("dec/titulo", "Por decisão, não por prateleira", M, YD, 30, C.fg, T, {
  fonte: HEAD,
  peso: 700,
});
texto(
  "dec/sub",
  "Você não quer navegar — quer saber se vale a pena. Cada bloco responde a uma pergunta.",
  M,
  YD + 44,
  15,
  C.fg2,
  T,
  { largura: 760 },
);
const BLOCOS = [
  { t: "Vale seu tempo", faixa: "9+", cor: C.s9, nota: "o que não sai da cabeça depois" },
  { t: "Boa pedida", faixa: "8", cor: C.s8, nota: "acerta sem exigir contexto" },
  { t: "Se você gosta de…", faixa: "afinidade", cor: C.accent, nota: "porque você consumiu" },
];
BLOCOS.forEach((b, i) => {
  const x = col3(i);
  const y = YD + 104;
  rect(`card/${i}`, x, y, COL3, 288, C.card, T, 12, { strokes: [C.border], strokeWeight: 1 });
  rect(`card/${i}/poster`, x + 24, y + 24, 116, 168, C.elev, T, 10);
  rect(`card/${i}/poster/l1`, x + 40, y + 60, 84, 8, C.border, T, 4);
  rect(`card/${i}/poster/l2`, x + 40, y + 78, 52, 8, C.border, T, 4);
  texto(`card/${i}/poster/nota`, "pôster", x + 54, y + 158, 11, C.muted, T);
  rect(`card/${i}/faixa`, x + COL3 - 24 - 108, y + 24, 108, 28, C.elev, T, 8, {
    strokes: [b.cor],
    strokeWeight: 1,
  });
  texto(`card/${i}/faixa/t`, b.faixa, x + COL3 - 24 - 90, y + 31, 12, b.cor, T, { peso: 700 });
  texto(`card/${i}/t`, b.t, x + 24, y + 214, 20, C.fg, T, { fonte: HEAD, peso: 700, largura: 360 });
  texto(`card/${i}/nota`, b.nota, x + 24, y + 246, 13, C.fg2, T, { largura: 360 });
  texto(`card/${i}/acao`, "ver seleção →", x + 24, y + 266, 13, C.accent, T);
});

// ── Como o score nasce (mesma grade de 3) ────────────────────────────────────
const YM = YD + 104 + 288 + 72;
texto("metodo/titulo", "Como o score nasce", M, YM, 30, C.fg, T, { fonte: HEAD, peso: 700 });
const ETAPAS = [
  {
    n: "1",
    t: "Fontes públicas",
    d: "TMDB, IMDb e Metacritic por título, com a nota de cada uma.",
  },
  { n: "2", t: "Normalização", d: "Escalas diferentes viram uma só: 0 a 10 (games, 0 a 100)." },
  {
    n: "3",
    t: "Faixa e confiança",
    d: "O número ganha faixa, e a confiança diz o quanto ele se sustenta.",
  },
];
ETAPAS.forEach((e, i) => {
  const x = col3(i);
  rect(`etapa/${i}/num`, x, YM + 58, 32, 32, C.elev, T, 8);
  texto(`etapa/${i}/n`, e.n, x + 12, YM + 66, 15, C.accent, T, { peso: 700 });
  texto(`etapa/${i}/t`, e.t, x + 46, YM + 64, 17, C.fg, T, {
    fonte: HEAD,
    peso: 700,
    largura: 340,
  });
  texto(`etapa/${i}/d`, e.d, x, YM + 108, 14, C.fg2, T, { largura: 380 });
});

// ── fecho ────────────────────────────────────────────────────────────────────
const YF = YM + 176;
rect("fecho", M, YF, CONTEUDO, 112, C.card, T, 12, { strokes: [C.border], strokeWeight: 1 });
texto("fecho/t", "Sem nota de marketing.", M + 32, YF + 32, 24, C.fg, T, {
  fonte: HEAD,
  peso: 700,
});
texto(
  "fecho/d",
  "Nenhum número nesta página é fixo no código: todo valor vem do cálculo, com a fonte ao lado.",
  M + 32,
  YF + 72,
  15,
  C.fg2,
  T,
  { largura: 900 },
);

// ── Rodapé completo (MotionFooter) ───────────────────────────────────────────
const YROD = YF + 176;
// grade do rodapé declarada ANTES do primeiro uso (o original é `grid-cols-4 gap-8`)
const COLROD = Math.floor((CONTEUDO - 32 * 3) / 4); // 280
const colRod = (i) => M + i * (COLROD + 32); // 112 · 424 · 736 · 1048
rect("rodape/linha", 0, YROD, 1440, 1, C.border, T);
texto("rodape/marca", "MEDIA Rate", colRod(0), YROD + 40, 18, C.fg, T, { fonte: HEAD, peso: 700 });
texto(
  "rodape/tagline",
  "Um score por título, reunindo crítico e público de fontes que você pode conferir.",
  colRod(0),
  YROD + 72,
  13,
  C.fg2,
  T,
  { largura: COLROD },
);
const COLUNAS = [
  { titulo: "PRODUTO", itens: ["Catálogo", "Preços", "Sobre", "Metodologia", "FAQ", "Fontes"] },
  {
    titulo: "LEGAL",
    itens: [
      "Privacidade",
      "Termos",
      "Meus dados (LGPD)",
      "Cookies",
      "Gerenciar cookies",
      "Segurança",
      "Direitos do titular",
    ],
  },
  { titulo: "SOCIAL · CONTATO", itens: ["Telegram", "Contato"] },
];
COLUNAS.forEach((col, i) => {
  const x = colRod(i + 1);
  texto(`rodape/col${i}/t`, col.titulo, x, YROD + 40, 11, C.fg, T, { fonte: HEAD, peso: 700 });
  col.itens.forEach((it, k) =>
    texto(`rodape/col${i}/${k}`, it, x, YROD + 66 + k * 22, 13, C.fg2, T, { largura: 270 }),
  );
});
const YLEGAL = YROD + 262;
rect("rodape/legal/linha", M, YLEGAL, CONTEUDO, 1, misturar(C.bg, C.accent, 0.08), T);
texto("rodape/legal/a", "MEDIA Rate. Todos os direitos reservados.", M, YLEGAL + 20, 11, C.fg2, T);
texto("rodape/legal/b", "Copyright © 2026 END ART Studios", colRod(2), YLEGAL + 20, 11, C.fg2, T);
texto(
  "rodape/legal/c",
  "END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, São Paulo — Brasil · endart.studios+contato@gmail.com",
  998,
  YLEGAL + 40,
  11,
  C.fg2,
  T,
  { largura: 330 },
);
texto(
  "rodape/atribuicao",
  "Dados de filmes e séries por TMDB e OMDb; de games por IGDB. Este produto usa as APIs do TMDB e da IGDB, mas não é endossado nem certificado por elas.",
  469,
  YLEGAL + 72,
  11,
  C.muted,
  T,
  { largura: 900 },
);

// ═══════════ PÁGINA 2 — storyboard do ciclo do selo ═══════════
cmd("page.add", { name: "Selo — estados do ciclo" });
cmd("page.setBackground", { color: C.bg });
cmd("frame.create", { x: 0, y: 0, width: 1440, height: 720, name: "Selo / 6 estados" });
const S = "Selo / 6 estados";
cmd("node.set", { name: S, fill: C.bg });
texto("sb/titulo", "O selo percorre a escala", M, 56, 30, C.fg, S, { fonte: HEAD, peso: 700 });
texto(
  "sb/sub",
  "Seis estados, um por faixa. Em cada um: o número, a cor da faixa e o rótulo — e a régua acende a barra correspondente no mesmo instante.",
  M,
  104,
  15,
  C.fg2,
  S,
  { largura: 1100 },
);
FAIXAS.forEach((e, i) => {
  const x = M + i * 216;
  const cx = x + 90;
  rect(`sb/${i}/anel`, x, 180, 180, 180, e.cor, S, 90);
  rect(`sb/${i}/miolo`, x + 18, 198, 144, 144, C.bg, S, 72);
  texto(`sb/${i}/nota`, e.nota, cx - 34, 232, 40, e.cor, S, { fonte: HEAD, peso: 700 });
  texto(`sb/${i}/faixa`, e.nome, cx - Math.round(e.nome.length * 3.6), 380, 13, C.fg2, S);
  rect(`sb/${i}/barra`, x, 410, 180, 14, e.cor, S, 7);
  texto(`sb/${i}/rot`, e.rot, x, 436, 13, C.muted, S);
});
texto(
  "sb/tempo",
  "2,6 s por estado · 400 ms de transição do número e da cor · pausa no hover/focus · ciclo só com a seção visível · desligado em prefers-reduced-motion (fica no estado da faixa do topo).",
  M,
  520,
  13,
  C.muted,
  S,
  { largura: 1300 },
);
texto(
  "sb/verdade",
  "No produto, cada estado é uma obra real: o selo mostra o título e a nota que vieram do cálculo. O ciclo existe para ensinar a escala, não para parecer movimento.",
  M,
  560,
  13,
  C.fg2,
  S,
  { largura: 1300 },
);

// ═══════════ PÁGINA 3 — efeito Dock nos ícones ═══════════
const DOCK_MAX = 1.32;
const DOCK_ALCANCE = 2.2;
function dock(i, ponteiro) {
  const d = Math.abs(i - ponteiro);
  const x = Math.min(d / DOCK_ALCANCE, 1);
  const queda = Math.cos((x * Math.PI) / 2) ** 2;
  return { escala: 1 + (DOCK_MAX - 1) * queda, sobe: queda * 10 };
}
cmd("page.add", { name: "Ícones — efeito Dock" });
cmd("page.setBackground", { color: C.bg });
cmd("frame.create", { x: 0, y: 0, width: 1440, height: 980, name: "Ícones / efeito Dock" });
const DK = "Ícones / efeito Dock";
cmd("node.set", { name: DK, fill: C.bg });
texto("dk/titulo", "Os ícones crescem sob o ponteiro — como o Dock", M, 52, 30, C.fg, DK, {
  fonte: HEAD,
  peso: 700,
});
texto(
  "dk/sub",
  "A peça sob o ponteiro cresce 32%, os vizinhos crescem menos e a fileira sobe junto, em queda progressiva por distância. Nada se move de lugar: só transform, então o layout não é afetado.",
  M,
  100,
  15,
  C.fg2,
  DK,
  { largura: 1200 },
);
[0, 2, 4].forEach((ponteiro, linha) => {
  const baseY = 244 + linha * 208;
  texto(`dk/${linha}/rotulo`, `ponteiro no ${ponteiro + 1}º ícone`, M, baseY - 78, 13, C.muted, DK);
  TIPOS.forEach((t, i) => {
    const { escala, sobe } = dock(i, ponteiro);
    const lado = Math.round(SYM * escala);
    const x = M + i * (SYM + VAOIC) + Math.round((SYM - lado) / 2);
    const y = baseY + SYM - lado - Math.round(sobe);
    tileIcone(`dk/${linha}/${t.id}`, t, x, y, lado, escala, i === ponteiro, DK);
    texto(
      `dk/${linha}/${t.id}/rotulo`,
      t.rotulo,
      Math.round(x + lado / 2 - t.rotulo.length * 3.4),
      baseY + SYM + 16,
      12,
      i === ponteiro ? t.cor : C.fg2,
      DK,
    );
  });
  const alvo = dock(ponteiro, ponteiro);
  const ladoAlvo = Math.round(SYM * alvo.escala);
  const xAlvo = M + ponteiro * (SYM + VAOIC) + Math.round((SYM - ladoAlvo) / 2) + ladoAlvo / 2;
  rect(`dk/${linha}/ponteiro`, Math.round(xAlvo) - 3, baseY + SYM + 2, 6, 6, C.accent, DK, 3);
  texto(
    `dk/${linha}/valores`,
    `sob o ponteiro ${DOCK_MAX.toFixed(2).replace(".", ",")}  ·  vizinho ${dock(
      ponteiro + 1,
      ponteiro,
    )
      .escala.toFixed(2)
      .replace(".", ",")}  ·  seguinte ${dock(ponteiro + 2, ponteiro)
      .escala.toFixed(2)
      .replace(".", ",")}`,
    M + 6 * (SYM + VAOIC) + 40,
    baseY + Math.round(SYM / 2) - 8,
    13,
    C.fg2,
    DK,
  );
});
texto(
  "dk/regras",
  "Só com ponteiro fino e a partir de 1024 px (toque não magnifica). Origem da transformação embaixo ao centro, para a peça crescer para cima como no Dock. Foco por teclado dá o mesmo realce em uma peça, sem empurrar as vizinhas. Em prefers-reduced-motion o crescimento é desligado e fica só o realce de borda e cor.",
  M,
  900,
  12,
  C.muted,
  DK,
  { largura: 1300 },
);

writeFileSync(
  `${OUT}/conceito-home.jsonl`,
  passos.map((p) => JSON.stringify(p)).join("\n") + "\n",
  "utf8",
);
console.log(`comandos: ${passos.length}`);
