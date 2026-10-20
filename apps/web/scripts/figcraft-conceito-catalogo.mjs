#!/usr/bin/env node
/**
 * Conceito do **Catálogo** (`/catalog`) — primeiro desenho da sessão, feito com FigCraft.
 *
 * Regra desta rodada (a lição das anteriores): desenhar só o que a fonte de verdade
 * permite. Tudo abaixo tem origem declarada em
 * `docs/02-architecture-design/ui-ux/10-catalogo.md` e no código:
 *
 *   - **grade do produto**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` → em 1440 o
 *     conteúdo vai de **112 a 1328** (M=112, CONTEUDO=1216). Não existe margem inventada.
 *   - **sidebar de filtros**: `w-60` (240 px) sticky `top-20`, ao lado do conteúdo
 *     (`CatalogPageClient.tsx:415`).
 *   - **grade de cards**: 2 colunas em 375 e **5 em 1440** (medido nas capturas da spec).
 *   - **6 seções por tipo**, cada uma com `h2` + "Ver todos" (`CatalogTypeSections.tsx:64-88`).
 *   - **tokens**: `surface-card` #12121C, `surface-border` #2A2A3D, `fg-primary` #F5F5F7,
 *     `fg-secondary` #A0A0B8, `fg-muted` #85859F, `accent-indigo` #818CF8 e as cores
 *     canônicas de `CATEGORY_TOKENS`.
 *   - **contagens**: aparecem como "N" de propósito. Número de títulos vem da API; digitar
 *     "1.234" num mockup é a violação do D-583.4 que já aconteceu duas vezes aqui.
 *
 * O desenho resolve cinco pendências medidas na spec (§11): parágrafo do topo sem medida de
 * leitura (D-603), alvo de toque < 44 px nos chips no 375, estado do chip ativo para leitor
 * de tela, ausência de estado offline, e a ordem "controles → chips → conteúdo" que fazia o
 * usuário rolar antes de filtrar.
 *
 * Saída: `docs/02-architecture-design/figcraft/conceito-catalogo/conceito-catalogo.jsonl`.
 * Render:
 *   figcraft-cli run conceito-catalogo.jsonl --out conceito-catalogo.figcraft
 *   figcraft-cli render conceito-catalogo.figcraft -o catalogo-1440.png --scale 1 --page "Catálogo — 1440"
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Clapperboard,
  Tv,
  Gamepad2,
  BookOpen,
  BookImage,
  BookMarked,
  Search,
  Menu,
  Image as ImageIcon,
  ChevronDown,
  X,
  Check,
  SlidersHorizontal,
  LayoutGrid,
  SearchX,
  WifiOff,
} from "lucide-react";

const RAIZ = "D:/PROJETOS/MEDIA Rate/MEDIA Rate";
const OUT = `${RAIZ}/docs/02-architecture-design/figcraft/conceito-catalogo`;
const TMP = join(tmpdir(), "media-rate-figcraft-catalogo");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const C = {
  bg: "#05050A",
  card: "#12121C",
  elev: "#1B1B2C",
  border: "#2A2A3D",
  accent: "#818CF8",
  fg: "#F5F5F7",
  fg2: "#A0A0B8",
  muted: "#85859F",
  brand: "#E11D48",
  onBrand: "#FFFFFF",
  s9: "#34D399",
  s8: "#38BDF8",
  s7: "#818CF8",
  s6: "#F59E0B",
  low: "#F87171",
  danger: "#F87171",
};
const HEAD = "Space Grotesk";
const BODY = "Inter";

// ── grade do produto (medida, não escolhida) ────────────────────────────────
const M = 112;
const CONTEUDO = 1216;
const DIREITA = 1328;
const VAO = 16;
const SIDEBAR = 240; // w-60
const COL_CONTEUDO = DIREITA - (M + SIDEBAR + 32); // 944
const CARDS_POR_LINHA = 5;
const CARD_W = Math.floor((COL_CONTEUDO - VAO * (CARDS_POR_LINHA - 1)) / CARDS_POR_LINHA); // 176
const CARD_H = Math.round(CARD_W * 1.5); // pôster 2:3

const TIPOS = [
  { id: "movie", rotulo: "Filmes", icone: "clapperboard", cor: "#818CF8" },
  { id: "series", rotulo: "Séries", icone: "tv", cor: "#38BDF8" },
  { id: "game", rotulo: "Games", icone: "gamepad-2", cor: "#34D399" },
  { id: "book", rotulo: "Livros", icone: "book-open", cor: "#FBBF24" },
  { id: "comic", rotulo: "Quadrinhos", icone: "book-image", cor: "#F472B6" },
  { id: "manga", rotulo: "Mangás", icone: "book-marked", cor: "#A78BFA" },
];

const passos = [];
const cmd = (id, params) => passos.push({ command: id, params });

function rect(name, x, y, w, h, cor, pai, raio = 0, extra = {}) {
  cmd("shape.rectangle", { x, y, width: w, height: h, props: { name } });
  const props = { fill: cor, ...extra };
  if (raio) props.cornerRadius = raio;
  cmd("node.set", { name, ...props });
}
function texto(name, txt, x, y, tamanho, cor, pai, opts = {}) {
  cmd("text.create", {
    text: txt,
    x,
    y,
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
/**
 * Ícones: `lucide-react` (já é dependência do app) renderizado para SVG estático.
 *
 * O gerador do conceito da home lê `node_modules/lucide-static/icons/*.svg`, um pacote que
 * **nunca foi declarado** no package.json — na instalação limpa ele não existe e aquele
 * script quebra. Aqui não dependo dele: o mesmo conjunto canônico de ícones, sem
 * dependência nova.
 */
const ICONE_COMP = {
  "clapperboard": Clapperboard,
  "tv": Tv,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  "book-image": BookImage,
  "book-marked": BookMarked,
  "search": Search,
  "menu": Menu,
  "image": ImageIcon,
  "layout-grid": LayoutGrid,
  "chevron-down": ChevronDown,
  "x": X,
  "check": Check,
  "sliders-horizontal": SlidersHorizontal,
  "search-x": SearchX,
  "wifi-off": WifiOff,
};

function icone(nome, arquivo, cor, cx, cy, tamanho, traco = 1.8) {
  const Componente = ICONE_COMP[arquivo];
  if (!Componente) throw new Error(`ícone não mapeado: ${arquivo}`);
  const bruto = renderToStaticMarkup(
    createElement(Componente, { size: tamanho, strokeWidth: traco, color: cor }),
  )
    .replace(/currentColor/g, cor)
    .replace(/stroke-width="[\d.]+"/, `stroke-width="${traco}"`);
  const caminho = `${TMP}/_i-${nome.replace(/[^a-z0-9]/gi, "-")}.svg`;
  writeFileSync(caminho, bruto, "utf8");
  cmd("file.import", { path: caminho, x: cx, y: cy, center: true });
  cmd("node.set", { name: `${arquivo}.svg`, width: tamanho, height: tamanho });
}
const misturar = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) =>
        Math.round(v + (pb[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
};

// ── peças reaproveitadas ────────────────────────────────────────────────────
function nav(pai, { compacto = false } = {}) {
  rect(`${pai}/nav/linha`, 0, 71, compacto ? 375 : 1440, 1, C.border, pai ?? undefined);
  rect(`${pai}/nav/logo`, M === 112 && compacto ? 16 : M, 20, 30, 30, C.accent, pai, 8);
  texto(`${pai}/nav/nome`, "MEDIA Rate", (compacto ? 16 : M) + 40, 26, 17, C.fg, pai, {
    fonte: HEAD,
    peso: 700,
  });
  if (!compacto) {
    ["Catálogo", "Rankings", "Descobertas", "Planos"].forEach((l, i) =>
      texto(`${pai}/nav/${l}`, l, 350 + i * 116, 28, 14, i === 0 ? C.fg : C.fg2, pai, {
        peso: i === 0 ? 700 : undefined,
      }),
    );
    const ctaW = 152;
    rect(`${pai}/nav/cta`, DIREITA - ctaW, 18, ctaW, 36, C.brand, pai, 8);
    texto(`${pai}/nav/cta/t`, "Criar conta grátis", DIREITA - ctaW + 16, 28, 13, C.onBrand, pai, {
      peso: 700,
    });
  } else {
    icone(`${pai}/nav/menu`, "menu", C.fg2, 340, 36, 20, 2);
  }
}

/** Chip de categoria — 44 px de altura (pendência P1 de toque no 375). */
function chip(pai, nome, rotulo, x, y, cor, ativo, iconeNome) {
  const largura = 34 + rotulo.length * 7.2 + (iconeNome ? 20 : 0);
  rect(
    `${pai}/chip/${nome}`,
    x,
    y,
    largura,
    44,
    ativo ? misturar(C.bg, cor, 0.16) : C.card,
    pai,
    22,
    {
      strokes: [ativo ? misturar(C.bg, cor, 0.7) : C.border],
      strokeWeight: ativo ? 1.5 : 1,
    },
  );
  if (iconeNome)
    icone(`${pai}/chip/${nome}/i`, iconeNome, ativo ? cor : C.fg2, x + 18, y + 22, 13, 2);
  texto(
    `${pai}/chip/${nome}/t`,
    rotulo,
    iconeNome ? x + 32 : x + 16,
    y + 14,
    13,
    ativo ? cor : C.fg2,
    pai,
    {
      peso: ativo ? 700 : undefined,
    },
  );
}

/** Grupo de filtro na sidebar/drawer. */
function grupoFiltro(pai, nome, titulo, x, y, largura, opcoes, { radios = false } = {}) {
  texto(`${pai}/grupo/${nome}/t`, titulo.toUpperCase(), x, y, 11, C.muted, pai, { peso: 700 });
  let cy = y + 24;
  opcoes.forEach((op, i) => {
    const marcado = !!op.marcado;
    if (radios) {
      rect(`${pai}/grupo/${nome}/r${i}`, x, cy, 16, 16, marcado ? C.accent : C.card, pai, 8, {
        strokes: [marcado ? C.accent : C.border],
        strokeWeight: 1.5,
      });
      if (marcado) rect(`${pai}/grupo/${nome}/r${i}/pt`, x + 5, cy + 5, 6, 6, C.bg, pai, 3);
    } else {
      rect(`${pai}/grupo/${nome}/c${i}`, x, cy, 16, 16, marcado ? C.accent : C.card, pai, 4, {
        strokes: [marcado ? C.accent : C.border],
        strokeWeight: 1.5,
      });
      if (marcado) icone(`${pai}/grupo/${nome}/c${i}/ok`, "check", C.bg, x + 8, cy + 8, 11, 3);
    }
    texto(`${pai}/grupo/${nome}/l${i}`, op.rotulo, x + 26, cy + 1, 13, marcado ? C.fg : C.fg2, pai);
    if (op.n != null) {
      texto(`${pai}/grupo/${nome}/n${i}`, op.n, x + largura - 22, cy + 1, 11, C.muted, pai);
    }
    cy += 30;
  });
  return cy;
}

/** Card de obra — pôster 2:3, selo de nota e rótulo neutro (sem dado inventado). */
function card(pai, nome, x, y, cor, { nota = null, vazio = false } = {}) {
  rect(`${pai}/${nome}`, x, y, CARD_W, CARD_H, C.elev, pai, 10, {
    strokes: [C.border],
    strokeWeight: 1,
  });
  if (!vazio) {
    rect(
      `${pai}/${nome}/poster`,
      x + 1,
      y + 1,
      CARD_W - 2,
      CARD_H - 2,
      misturar(C.elev, cor, 0.1),
      pai,
      9,
    );
    icone(
      `${pai}/${nome}/ph`,
      "image",
      misturar(C.elev, C.muted, 0.5),
      x + CARD_W / 2,
      y + CARD_H / 2 - 10,
      22,
      1.4,
    );
    texto(
      `${pai}/${nome}/phT`,
      "pôster",
      x + CARD_W / 2 - 20,
      y + CARD_H / 2 + 6,
      11,
      C.muted,
      pai,
    );
  } else {
    texto(`${pai}/${nome}/phT`, "pôster", x + CARD_W / 2 - 20, y + CARD_H / 2, 11, C.muted, pai);
  }
  if (nota) {
    const raio = 17;
    const cx = x + CARD_W - raio - 8;
    const cy = y + raio + 8;
    rect(
      `${pai}/${nome}/selo`,
      cx - raio,
      cy - raio,
      raio * 2,
      raio * 2,
      misturar(C.bg, cor, 0.55),
      pai,
      raio,
      {
        strokes: [cor],
        strokeWeight: 1.5,
      },
    );
    texto(`${pai}/${nome}/selo/t`, nota, cx - nota.length * 3.6, cy - 6, 12, cor, pai, {
      peso: 700,
    });
  }
  texto(`${pai}/${nome}/titulo`, "título no catálogo", x + 2, y + CARD_H + 8, 12, C.fg, pai);
  texto(`${pai}/${nome}/meta`, "tipo · ano", x + 2, y + CARD_H + 24, 11, C.muted, pai);
  return y + CARD_H + 40;
}

// ═══════════════════════ PÁGINA 1 — Catálogo 1440 ═══════════════════════
cmd("page.add", { name: "Catálogo — 1440" });
cmd("page.setBackground", { color: C.bg });
const F1 = "Catálogo / 1440";
nav(F1);

// Título + parágrafo com medida de leitura (D-603: hoje herda a coluna inteira)
texto("h1", "Catálogo", M, 124, 42, C.fg, F1, { fonte: HEAD, peso: 700, largura: 600 });
texto(
  "lead",
  "Tudo o que já foi avaliado, por tipo de obra. Filtre por gênero, ano e nota — e leve o recorte por link.",
  M,
  182,
  16,
  C.fg2,
  F1,
  { largura: 544 }, // max-w-[34rem]
);
texto("lead/nota", "medida de leitura: max-w-[34rem]", M, 232, 10, C.muted, F1);

// Controles: busca + ordenação (à direita da coluna de conteúdo, alinhados à direita)
rect("busca", M, 262, 560, 48, C.card, F1, 10, { strokes: [C.border], strokeWeight: 1 });
icone("busca/lupa", "search", C.muted, M + 26, 286, 16, 2);
texto("busca/hint", "Buscar título, gênero, ano…", M + 46, 276, 14, C.muted, F1);
rect("ordem", DIREITA - 200, 262, 200, 48, C.card, F1, 10, {
  strokes: [C.border],
  strokeWeight: 1,
});
texto("ordem/rot", "Ordenar: ", DIREITA - 184, 276, 12, C.muted, F1);
texto("ordem/val", "Nota ↓", DIREITA - 126, 275, 13, C.fg, F1, { peso: 700 });
icone("ordem/chev", "chevron-down", C.fg2, DIREITA - 26, 286, 14, 2);

// Chips: 44 px de altura, estado ativo com aria-current no DOM (P1 da spec)
texto("chips/rot", "TIPO DE OBRA", M, 336, 11, C.muted, F1, { peso: 700 });
let cx = M;
chip(F1, "todos", "Todos", cx, 356, C.accent, true, "layout-grid");
cx += 34 + 4 * 7.2 + 20 + 12;
TIPOS.forEach((t) => {
  chip(F1, t.id, t.rotulo, cx, 356, t.cor, false, t.icone);
  cx += 34 + t.rotulo.length * 7.2 + 20 + 12;
});

// ── sidebar de filtros (w-60 sticky) ───────────────────────────────────────
const SY = 428;
const SH = 880; // sticky com altura de viewport, não a página inteira
rect("side", M, SY, SIDEBAR, SH, C.card, F1, 12, { strokes: [C.border], strokeWeight: 1 });
texto("side/t", "FILTROS", M + 16, SY + 18, 11, C.fg, F1, { peso: 700 });
texto("side/n", "3 ativos", M + SIDEBAR - 62, SY + 18, 11, C.accent, F1, { peso: 700 });
rect("side/div", M + 16, SY + 42, SIDEBAR - 32, 1, C.border, F1);

let cy = SY + 62;
cy = grupoFiltro(
  F1,
  "tipo",
  "Tipo",
  M + 16,
  cy,
  SIDEBAR - 32,
  TIPOS.map((t, i) => ({ rotulo: t.rotulo, marcado: i === 0 || i === 3, n: "N" })),
);
cy += 12;
rect("side/div2", M + 16, cy, SIDEBAR - 32, 1, C.border, F1);
cy += 16;
cy = grupoFiltro(
  F1,
  "genero",
  "Gênero",
  M + 16,
  cy,
  SIDEBAR - 32,
  [
    { rotulo: "Drama", marcado: true, n: "N" },
    { rotulo: "Ficção científica", n: "N" },
    { rotulo: "Comédia", n: "N" },
    { rotulo: "Documentário", n: "N" },
    { rotulo: "ver todos os 24", n: null },
  ],
  { radios: false },
);
cy += 12;
rect("side/div3", M + 16, cy, SIDEBAR - 32, 1, C.border, F1);
cy += 16;
texto("side/ano/t", "ANO", M + 16, cy, 11, C.muted, F1, { peso: 700 });
rect("side/ano/min", M + 16, cy + 22, 96, 40, C.elev, F1, 8, {
  strokes: [C.border],
  strokeWeight: 1,
});
texto("side/ano/min/t", "de", M + 28, cy + 33, 12, C.muted, F1);
rect("side/ano/max", M + 128, cy + 22, 96, 40, C.elev, F1, 8, {
  strokes: [C.border],
  strokeWeight: 1,
});
texto("side/ano/max/t", "até", M + 140, cy + 33, 12, C.muted, F1);
cy += 78;
texto("side/score/t", "NOTA MÍNIMA", M + 16, cy, 11, C.muted, F1, { peso: 700 });
rect("side/score/trilho", M + 16, cy + 32, SIDEBAR - 32, 4, C.border, F1, 2);
rect("side/score/preenchido", M + 16, cy + 32, 120, 4, C.accent, F1, 2);
rect("side/score/pino", M + 16 + 120 - 8, cy + 24, 16, 16, C.accent, F1, 8);
texto("side/score/val", "7,0", M + SIDEBAR - 44, cy + 20, 11, C.fg, F1, { peso: 700 });
cy += 62;
rect("side/div4", M + 16, cy, SIDEBAR - 32, 1, C.border, F1);
cy += 16;
texto("side/crit/t", "SÓ COM CRÍTICA", M + 16, cy + 4, 11, C.muted, F1, { peso: 700 });
rect("side/crit/trilho", M + SIDEBAR - 74, cy, 44, 24, C.accent, F1, 12);
rect("side/crit/pino", M + SIDEBAR - 44, cy + 2, 20, 20, C.fg, F1, 10);
cy += 44;
rect("side/limpar", M + 16, SY + SH - 96, SIDEBAR - 32, 34, C.card, F1, 8, {
  strokes: [C.border],
  strokeWeight: 1,
});
texto("side/limpar/t", "Limpar filtros", M + 44, SY + SH - 84, 12, C.fg2, F1);
// Desktop filtra AO VIVO: o rodapé da sidebar é leitura, não ação de aplicar.
texto("side/contagem", "N títulos no recorte", M + 16, SY + SH - 56, 11, C.fg2, F1);
rect("side/contagem/barra", M + 16, SY + SH - 38, SIDEBAR - 32, 4, C.border, F1, 2);
rect(
  "side/contagem/barra/on",
  M + 16,
  SY + SH - 38,
  Math.round((SIDEBAR - 32) * 0.42),
  4,
  C.accent,
  F1,
  2,
);
texto(
  "side/contagem/regra",
  "filtro ao vivo · sem botão aplicar",
  M + 16,
  SY + SH - 24,
  10,
  C.muted,
  F1,
);

// ── coluna de conteúdo: seções por tipo ────────────────────────────────────
const CX = M + SIDEBAR + 32;
const y = SY;
texto("conteudo/recorte", "N títulos no recorte · 3 filtros ativos", CX, y - 22, 12, C.fg2, F1);

const PITCH = 360; // 48 (cabeçalho) + CARD_H (264) + 40 (rótulos) + 8 de respiro
TIPOS.forEach((t, i) => {
  const ySec = y + i * PITCH;
  rect(`sec/${t.id}/tile`, CX, ySec, 32, 32, misturar(C.bg, t.cor, 0.18), F1, 8);
  icone(`sec/${t.id}/icon`, t.icone, t.cor, CX + 16, ySec + 16, 17, 2);
  texto(`sec/${t.id}/h2`, t.rotulo.toUpperCase(), CX + 44, ySec + 6, 18, C.fg, F1, {
    fonte: HEAD,
    peso: 700,
  });
  texto(`sec/${t.id}/n`, "N títulos", CX + 52 + t.rotulo.length * 13, ySec + 12, 11, C.muted, F1);
  texto(`sec/${t.id}/ver`, "Ver todos →", DIREITA - 92, ySec + 8, 12, C.accent, F1, { peso: 700 });
  for (let j = 0; j < CARDS_POR_LINHA; j++) {
    card(F1, `sec/${t.id}/c${j}`, CX + j * (CARD_W + VAO), ySec + 48, t.cor, {
      nota: j % 3 === 0 ? "8,7" : null,
    });
  }
  if (i < TIPOS.length - 1)
    rect(`sec/${t.id}/div`, CX, ySec + PITCH - 20, COL_CONTEUDO, 1, C.border, F1);
});

// Carregar mais (cursor) + nota de honestidade dos números do mockup
rect("mais", CX + Math.round(COL_CONTEUDO / 2 - 90), y + 6 * PITCH + 16, 180, 44, C.card, F1, 10, {
  strokes: [C.border],
  strokeWeight: 1,
});
texto(
  "mais/t",
  "Carregar mais",
  CX + Math.round(COL_CONTEUDO / 2 - 48),
  y + 6 * PITCH + 30,
  13,
  C.fg2,
  F1,
);
texto(
  "rodape/nota",
  "Contagens aparecem como N nestе desenho: o número vem da API. Grade de 5 colunas na coluna de conteúdo, sidebar w-60 sticky.",
  M,
  y + 6 * PITCH + 92,
  11,
  C.muted,
  F1,
  { largura: CONTEUDO },
);

// ═══════════════════════ PÁGINA 2 — Catálogo 375 ═══════════════════════
cmd("page.add", { name: "Catálogo — 375" });
cmd("page.setBackground", { color: C.bg });
const F2 = "Catálogo / 375";
nav(F2, { compacto: true });

const M2 = 16;
const W2 = 343;
texto("h1/375", "Catálogo", M2, 96, 30, C.fg, F2, { fonte: HEAD, peso: 700 });
texto("lead/375", "Filtre por gênero, ano e nota.", M2, 138, 14, C.fg2, F2, { largura: W2 });

// busca + botão de filtros (44 px) na mesma linha
rect("busca/375", M2, 176, 236, 44, C.card, F2, 10, { strokes: [C.border], strokeWeight: 1 });
icone("busca/375/lupa", "search", C.muted, M2 + 22, 198, 15, 2);
texto("busca/375/hint", "Buscar…", M2 + 40, 188, 13, C.muted, F2);
rect("filtrosBtn", M2 + 244, 176, 99, 44, C.accent, F2, 10);
icone("filtrosBtn/i", "sliders-horizontal", "#0F172A", M2 + 262, 198, 15, 2.2);
texto("filtrosBtn/t", "Filtros (3)", M2 + 276, 188, 12, "#0F172A", F2, { peso: 700 });

// chips em trilha horizontal, cortados à direita (convite a arrastar)
texto("chips/rot/375", "TIPO DE OBRA", M2, 240, 10, C.muted, F2, { peso: 700 });
let cx2 = M2;
["Todos", "Filmes", "Séries", "Games"].forEach((rot, i) => {
  const largura = 34 + rot.length * 7.2;
  rect(
    `chip/375/${i}`,
    cx2,
    258,
    largura,
    44,
    i === 0 ? misturar(C.bg, C.accent, 0.16) : C.card,
    F2,
    22,
    {
      strokes: [i === 0 ? misturar(C.bg, C.accent, 0.7) : C.border],
      strokeWeight: i === 0 ? 1.5 : 1,
    },
  );
  texto(`chip/375/${i}/t`, rot, cx2 + 16, 272, 13, i === 0 ? C.accent : C.fg2, F2, {
    peso: i === 0 ? 700 : undefined,
  });
  cx2 += largura + 10;
});

// grade 2 colunas
texto("recorte/375", "N títulos no recorte", M2, 322, 11, C.fg2, F2);
const CARD_W2 = Math.floor((W2 - VAO) / 2); // 163
for (let i = 0; i < 4; i++) {
  const col = i % 2;
  const lin = Math.floor(i / 2);
  const x = M2 + col * (CARD_W2 + VAO);
  const yc = 348 + lin * (Math.round(CARD_W2 * 1.5) + 46);
  rect(`c/375/${i}`, x, yc, CARD_W2, Math.round(CARD_W2 * 1.5), C.elev, F2, 8, {
    strokes: [C.border],
    strokeWeight: 1,
  });
  icone(
    `c/375/${i}/ph`,
    "image",
    misturar(C.elev, C.muted, 0.5),
    x + CARD_W2 / 2,
    yc + Math.round(CARD_W2 * 0.75) - 10,
    20,
    1.4,
  );
  texto(
    `c/375/${i}/t`,
    "título no catálogo",
    x + 2,
    yc + Math.round(CARD_W2 * 1.5) + 8,
    11,
    C.fg,
    F2,
  );
  texto(`c/375/${i}/m`, "tipo · ano", x + 2, yc + Math.round(CARD_W2 * 1.5) + 24, 10, C.muted, F2);
  if (i === 1 || i === 4) {
    const raio = 14;
    rect(
      `c/375/${i}/selo`,
      x + CARD_W2 - 36,
      yc + 8,
      raio * 2,
      raio * 2,
      misturar(C.bg, C.s7, 0.55),
      F2,
      raio,
      {
        strokes: [C.s7],
        strokeWeight: 1.5,
      },
    );
    texto(`c/375/${i}/selo/t`, "8,7", x + CARD_W2 - 32, yc + 14, 10, C.s7, F2, { peso: 700 });
  }
}
rect("mais/375", M2, 940, W2, 44, C.card, F2, 10, { strokes: [C.border], strokeWeight: 1 });
texto("mais/375/t", "Carregar mais", M2 + 118, 954, 13, C.fg2, F2);

// ═══════════════════════ PÁGINA 3 — drawer de filtros (375) ═══════════════════════
cmd("page.add", { name: "Catálogo — filtros 375" });
cmd("page.setBackground", { color: C.bg });
const F3 = "Catálogo / 375 — filtros";
// fundo da página (escurecido pelo overlay)
rect("fundo", 0, 0, 375, 812, misturar(C.bg, C.card, 0.35), F3);
texto("fundo/h1", "Catálogo", M2, 96, 30, C.muted, F3, { fonte: HEAD, peso: 700 });
// painel w-72 = 288
const DW = 288;
rect("drawer", 0, 0, DW, 812, C.card, F3, 0, { strokes: [C.border], strokeWeight: 1 });
texto("drawer/t", "Filtros", 20, 28, 18, C.fg, F3, { fonte: HEAD, peso: 700 });
icone("drawer/x", "x", C.fg2, DW - 28, 36, 18, 2);
rect("drawer/div", 20, 60, DW - 40, 1, C.border, F3);
let dy = 80;
dy = grupoFiltro(
  F3,
  "dTipo",
  "Tipo",
  20,
  dy,
  DW - 40,
  TIPOS.map((t, i) => ({ rotulo: t.rotulo, marcado: i === 0, n: "N" })),
);
rect("drawer/div2", 20, dy + 4, DW - 40, 1, C.border, F3);
dy = grupoFiltro(F3, "dGenero", "Gênero", 20, dy + 20, DW - 40, [
  { rotulo: "Drama", marcado: true, n: "N" },
  { rotulo: "Ficção científica", n: "N" },
  { rotulo: "Comédia", n: "N" },
]);
rect("drawer/div3", 20, dy + 4, DW - 40, 1, C.border, F3);
texto("drawer/anoT", "ANO", 20, dy + 24, 11, C.muted, F3, { peso: 700 });
rect("drawer/ano1", 20, dy + 46, 116, 44, C.elev, F3, 8, { strokes: [C.border], strokeWeight: 1 });
texto("drawer/ano1/t", "de", 32, dy + 58, 12, C.muted, F3);
rect("drawer/ano2", 152, dy + 46, 116, 44, C.elev, F3, 8, { strokes: [C.border], strokeWeight: 1 });
texto("drawer/ano2/t", "até", 164, dy + 58, 12, C.muted, F3);
// rodapé fixo do drawer com alvos de 48 px
rect("drawer/rodape", 0, 700, DW, 112, C.card, F3, 0, { strokes: [C.border], strokeWeight: 1 });
rect("drawer/limpar", 20, 724, 116, 48, C.card, F3, 10, { strokes: [C.border], strokeWeight: 1 });
texto("drawer/limpar/t", "Limpar tudo", 40, 740, 13, C.fg2, F3);
rect("drawer/aplicar", 148, 724, 120, 48, C.accent, F3, 10);
texto("drawer/aplicar/t", "Ver N títulos", 168, 740, 12, "#0F172A", F3, { peso: 700 });
texto(
  "drawer/nota",
  "Esc fecha · foco preso no painel · alvos de 48 px",
  20,
  664,
  10,
  C.muted,
  F3,
  { largura: DW - 40 },
);

// ═══════════════════════ PÁGINA 4 — estados ═══════════════════════
cmd("page.add", { name: "Catálogo — estados" });
cmd("page.setBackground", { color: C.bg });
const F4 = "Catálogo / estados";
texto("est/t", "Catálogo — estados obrigatórios", M, 28, 22, C.fg, F4, { fonte: HEAD, peso: 700 });
const painel = (nome, titulo, x, y, w = 584, h = 380) => {
  rect(`est/${nome}`, x, y, w, h, C.card, F4, 12, { strokes: [C.border], strokeWeight: 1 });
  texto(`est/${nome}/t`, titulo, x + 20, y + 18, 13, C.fg, F4, { fonte: HEAD, peso: 700 });
};
// 1. Skeleton
painel("sk", "1 · Carregando (skeleton com PAGE_SIZE itens)", M, 76);
for (let i = 0; i < 5; i++) {
  rect(`est/sk/${i}`, M + 20 + i * 108, 122, 96, 144, C.elev, F4, 8);
  rect(`est/sk/${i}/l1`, M + 20 + i * 108, 276, 78, 8, C.elev, F4, 4);
  rect(`est/sk/${i}/l2`, M + 20 + i * 108, 292, 52, 8, C.elev, F4, 4);
}
texto(
  "est/sk/n",
  'aria-busy="true" · nenhuma altura muda quando os dados chegam (CLS)',
  M + 20,
  322,
  11,
  C.muted,
  F4,
  {
    largura: 540,
  },
);
// 2. Vazio por filtro
painel("vz", "2 · Sem resultado no recorte", M + 616, 76);
icone("est/vz/i", "search-x", C.muted, M + 616 + 292, 168, 28, 1.6);
texto("est/vz/t", "Nenhum título neste recorte", M + 616 + 118, 196, 13, C.fg, F4, { peso: 700 });
texto(
  "est/vz/b",
  "Tire um filtro ou amplie o ano — o acervo tem outras portas.",
  M + 616 + 40,
  220,
  12,
  C.fg2,
  F4,
  {
    largura: 504,
  },
);
rect("est/vz/cta", M + 616 + 202, 250, 180, 44, C.accent, F4, 10);
texto("est/vz/cta/t", "Limpar filtros", M + 616 + 240, 264, 12, "#0F172A", F4, { peso: 700 });
// 3. Erro de rede
painel("er", "3 · Erro de rede", M, 484);
icone("est/er/i", "wifi-off", C.danger, M + 20 + 24, 528, 18, 2);
texto("est/er/t", "Não foi possível carregar o catálogo", M + 60, 520, 13, C.fg, F4, { peso: 700 });
texto(
  "est/er/b",
  "O acervo continua aqui: tente de novo em instantes.",
  M + 20,
  552,
  12,
  C.fg2,
  F4,
  { largura: 500 },
);
rect("est/er/cta", M + 20, 584, 128, 44, C.card, F4, 10, { strokes: [C.border], strokeWeight: 1 });
texto("est/er/cta/t", "Tentar de novo", M + 36, 598, 12, C.fg2, F4, { peso: 700 });
// 4. Dados parciais + offline (A CRIAR)
painel("of", "4 · Dados parciais e offline (A CRIAR)", M + 616, 484);
rect("est/of/aviso", M + 636, 528, 544, 56, misturar(C.bg, C.s6, 0.12), F4, 10, {
  strokes: [misturar(C.bg, C.s6, 0.5)],
  strokeWeight: 1,
});
texto(
  "est/of/aviso/t",
  "Sem conexão · mostrando o que já estava carregado",
  M + 656,
  550,
  12,
  C.s6,
  F4,
  { peso: 700 },
);
texto(
  "est/of/aviso/b",
  "O aviso volta a sumir sozinho quando a rede retorna.",
  M + 656,
  568,
  11,
  C.fg2,
  F4,
);
for (let i = 0; i < 4; i++) rect(`est/of/${i}`, M + 636 + i * 108, 608, 96, 132, C.elev, F4, 8);
texto(
  "est/of/n",
  "Regra: o aviso é estado, não erro — o conteúdo carregado nunca é descartado.",
  M + 636,
  762,
  11,
  C.muted,
  F4,
  {
    largura: 520,
  },
);

writeFileSync(
  `${OUT}/conceito-catalogo.jsonl`,
  passos.map((p) => JSON.stringify(p)).join("\n") + "\n",
  "utf8",
);
console.log(`comandos: ${passos.length} · páginas: 4`);
