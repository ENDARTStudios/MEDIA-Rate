#!/usr/bin/env node
/**
 * Conceito v2 — família PÚBLICO (5 quadros), desenhado no FigCraft.
 *
 * Fonte de verdade: `docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md`
 * (tokens, grade, mecânica por tela, anti-padrões). O que o produto já mede vem de
 * `docs/02-architecture-design/ui-ux/{10-catalogo,11-rankings,13-media-score,22-descoberta}.md`
 * e do código lido em `apps/web/src/lib/{source-registry,media-score-engine,sources}.ts`.
 *
 * Regras embutidas:
 *  - tokens só de `00-FUNDAMENTOS.md`; nenhuma cor fora delas;
 *  - contagens sempre como `N` (vêm da API); notas/obras/datas são EXEMPLO DE ESCALA,
 *    declarado no rodapé de cada quadro;
 *  - a régua aparece só onde representa nota (eixo, selo, faixa, decomposição);
 *  - sem card com borda 1px em tudo: pôster + legenda como folha de contato;
 *  - cada quadro tem a linha `mecânica:` no rodapé.
 *
 * NOTA DE GRADE: usa a grade da lib já corrigida — `COL=78`, `VAO=24`, `col(i)=M+i*(COL+VAO)`
 * e `largura(n)=n*COL+(n-1)*VAO` fecham `12 colunas = 1200` (120 → 1320). Nenhuma coordenada
 * "no olho": as âncoras de bloco são `col(0)`, `col(3)`, `col(6)`, `col(7)`, `col(8)` e as
 * larguras vêm de `largura(n)`.
 *
 * Saída: docs/02-architecture-design/conceito-v2/publico/
 *   run  : figcraft-cli run conceito-publico-v2.jsonl --out conceito-publico-v2.figcraft
 *   render: figcraft-cli render conceito-publico-v2.figcraft -o home-v2.png --scale 1 --page "Home — v2 público"
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookImage,
  BookMarked,
  BookOpen,
  BookmarkPlus,
  Check,
  ChevronDown,
  Clapperboard,
  Database,
  Equal,
  Gamepad2,
  GitCompare,
  Image as ImageIcon,
  Layers,
  Link2,
  ListPlus,
  Search,
  Tv,
  X,
} from "lucide-react";
import {
  C,
  HEAD,
  BODY,
  FAIXAS,
  M,
  CONTEUDO,
  DIREITA,
  COL,
  VAO,
  col,
  largura,
  criarComandos,
  salvar,
} from "./figcraft-v2-lib.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = resolve(RAIZ, "docs/02-architecture-design/conceito-v2/publico");
const JSONL = `${OUT.split("\\").join("/")}/conceito-publico-v2.jsonl`;

const { passos, cmd, rect, texto, rotulo, icone, quadro } = criarComandos();

// ── grade da lib (12 colunas fecham em 1200: COL=78, VAO=24) ──────────────
const col3 = col(3); // 426
const col6 = col(6); // 732
const col7 = col(7); // 834
const col8 = col(8); // 936
const railW = largura(3); // 282
const conteudo9 = largura(9); // 894

// ── tipografia / medidas ────────────────────────────────────────────────────
const wTxt = (t, size = 13) =>
  [...t].reduce(
    (acc, ch) =>
      acc + (ch === " " ? 0.28 : /[A-ZÀ-ÖØ-Ú]/.test(ch) ? 0.64 : 0.52) * size,
    0,
  );
const linhas = (t) => t.split("\n").length;

/** Texto com line-height/tracking/align tabulares explícitos. */
function tx(p, nome, txt, x, y, size, cor, opts = {}) {
  const name = `${p}/${nome}`;
  texto(name, txt, x, y, size, cor, null, {
    fonte: opts.fonte ?? BODY,
    peso: opts.peso,
    largura: opts.largura,
  });
  const extra = {};
  if (opts.lh) extra.lineHeight = Math.round(size * opts.lh * 100) / 100;
  if (opts.track) extra.letterSpacing = Math.round(size * opts.track * 100) / 100;
  if (opts.align) extra.textAlign = opts.align;
  if (opts.tnum) extra.features = { tnum: true };
  if (opts.opacity !== undefined) extra.opacity = opts.opacity;
  if (Object.keys(extra).length) cmd("node.set", { name, ...extra });
  return { w: opts.largura ?? wTxt(txt, size), h: linhas(txt) * size * (opts.lh ?? 1.28) };
}

/** Rótulo de seção (uppercase + tracking 0.08em), com caixa até a margem direita. */
const lab = (p, nome, txt, x, y, cor = C.tinta3) => {
  rotulo(`${p}/${nome}`, txt, x, y, cor);
  cmd("node.set", {
    name: `${p}/${nome}`,
    width: Math.max(60, DIREITA - x),
    textAutoResize: "height",
  });
};

/** Hairline horizontal (coluna 1 → 12). */
const linha = (p, nome, x, y, w = CONTEUDO, cor = C.regra1) =>
  rect(`${p}/${nome}`, x, y, w, 1, cor);

/** Cor canônica da faixa de uma nota 0–10. */
function corFaixa(nota) {
  if (nota >= 9) return C.faixa9;
  if (nota >= 8) return C.faixa8;
  if (nota >= 7) return C.faixa7;
  if (nota >= 6) return C.faixa6;
  if (nota >= 5) return C.faixa5;
  return C.faixa0;
}
function nomeFaixa(nota) {
  if (nota >= 9) return "Excepcional";
  if (nota >= 8) return "Muito bom";
  if (nota >= 7) return "Bom";
  if (nota >= 6) return "Razoável";
  if (nota >= 5) return "Fraco";
  return "Evite";
}
/** Nota de exibição: sempre 1 decimal e vírgula (pt-BR, D-602). */
const nota = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");

// ── peças reaproveitadas ────────────────────────────────────────────────────
/** Navbar do produto (Catálogo · Rankings · Descobertas · Planos) + busca/entrar/criar. */
function nav(p, ativo = null) {
  rect(`${p}/nav/marca`, M, 26, 4, 18, C.acento);
  tx(p, "nav/nome", "MEDIA RATE", M + 14, 24, 17, C.tinta1, {
    fonte: HEAD,
    peso: 700,
    track: 0.01,
  });
  const links = [
    ["Catálogo", "catalogo", 448],
    ["Rankings", "rankings", 560],
    ["Descobertas", "descobertas", 668],
    ["Planos", "planos", 812],
  ];
  for (const [txt, id, x] of links) {
    const isAtivo = id === ativo;
    tx(p, `nav/link/${id}`, txt, x, 28, 13, isAtivo ? C.tinta1 : C.tinta2, {
      peso: isAtivo ? 600 : 400,
    });
    if (isAtivo) {
      rect(`${p}/nav/link/${id}/sub`, x, 52, wTxt(txt, 13), 2, C.acento);
    }
  }
  icone(Search, `${p}/nav/busca/i`, C.tinta2, 986, 36, 15, 1.8);
  tx(p, "nav/busca/t", "Buscar", 1000, 28, 13, C.tinta2);
  rect(`${p}/nav/busca/k`, 1064, 26, 34, 20, C.mesa2, null, 2, {
    strokes: [C.regra1],
    strokeWeight: 1,
  });
  tx(p, "nav/busca/k/t", "⌘K", 1071, 30, 10, C.tinta3, { peso: 600 });
  tx(p, "nav/entrar", "Entrar", 1122, 28, 13, C.tinta1, { peso: 500 });
  botao(p, "nav/cta", "Criar conta", 1200, 18, 120, 38, { size: 13 });
  linha(p, "nav/linha", M, 71);
}

/** Botão retangular (raio 2 — não é pill). */
function botao(p, nome, txt, x, y, w, h, opts = {}) {
  const { tipo = "primario", size = 13, peso = 600, Icone = null } = opts;
  const primario = tipo === "primario";
  rect(`${p}/${nome}`, x, y, w, h, primario ? C.acento : C.mesa2, null, 2, primario
    ? {}
    : { strokes: [C.regra1], strokeWeight: 1, strokeAlign: "inside" });
  const tw = wTxt(txt, size);
  const grupo = (Icone ? 23 : 0) + tw;
  const inicio = x + (w - grupo) / 2;
  if (Icone) {
    icone(Icone, `${p}/${nome}/i`, primario ? C.acentoTinta : C.tinta1, inicio + 7, y + h / 2, 15, 1.8);
  }
  tx(p, `${nome}/t`, txt, inicio + (Icone ? 23 : 0), y + (h - size * 1.25) / 2, size, primario ? C.acentoTinta : C.tinta1, { peso });
}

/** Selo de nota: carimbo quadrado com a cor da faixa. */
function selo(p, nome, x, y, valor, opts = {}) {
  const { cor = null, vazio = false, tam = 32 } = opts;
  const c = cor ?? corFaixa(valor);
  rect(`${p}/${nome}`, x, y, tam, tam, C.mesa0, null, 1, {
    strokes: vazio ? [C.regra2] : [c],
    strokeWeight: vazio ? 1 : 1.5,
    strokeAlign: "inside",
  });
  tx(p, `${nome}/n`, vazio ? "—" : nota(valor), x, y + (tam - 13 * 1.1) / 2, 13, vazio ? C.tinta3 : c, {
    fonte: HEAD,
    peso: 700,
    largura: tam,
    align: "center",
    tnum: true,
  });
}

/** Pôster de exemplo: bloco 2:3 com monograma + selo (sem arte inventada). */
function poster(p, nome, x, y, w, h, opts = {}) {
  const { inicial = "M", valor = null, vazio = false, rotuloPoster = true } = opts;
  rect(`${p}/${nome}`, x, y, w, h, C.mesa2, null, 1, {
    strokes: [C.regra1],
    strokeWeight: 1,
    strokeAlign: "inside",
  });
  if (w < 88) {
    icone(ImageIcon, `${nome}/phi`, C.regra2, x + w / 2, y + h / 2 - 4, 16, 1.4);
  } else {
    tx(p, `${nome}/mg`, inicial, x + 14, y + h * 0.34, Math.round(w * 0.32), C.regra2, {
      fonte: HEAD,
      peso: 700,
      lh: 1,
    });
  }
  if (rotuloPoster) {
    const pequeno = w < 100;
    tx(p, `${nome}/ph`, "PÔSTER", x + (pequeno ? 8 : 10), y + h - (pequeno ? 14 : 18), pequeno ? 8 : 9, C.tinta3, {
      track: 0.08,
    });
  }
  if (valor !== null || vazio) selo(p, `${nome}/selo`, x + w - 40, y + 8, valor ?? 0, { vazio });
}

/** Régua 0–10 com as seis faixas proporcionais (o instrumento). */
function regua(p, nome, x, y, w, opts = {}) {
  const { ativa = null, alt = 8, corMarcador = C.tinta1, valor = null } = opts;
  const seg = [
    [0, 5, C.faixa0],
    [5, 6, C.faixa5],
    [6, 7, C.faixa6],
    [7, 8, C.faixa7],
    [8, 9, C.faixa8],
    [9, 10, C.faixa9],
  ];
  seg.forEach(([a, b, c], i) => {
    rect(`${p}/${nome}/seg${i}`, x + (a / 10) * w, y, ((b - a) / 10) * w, alt, c, null, 0, {
      opacity: ativa === null || ativa === i ? 1 : 0.38,
    });
  });
  if (valor !== null) {
    const mx = x + Math.min(10, Math.max(0, valor)) * (w / 10);
    rect(`${p}/${nome}/marca`, mx - 1, y - 6, 2, alt + 8, corMarcador);
  }
}

/** Rodapé obrigatório: mecânica (uma linha) + nota de exemplo + índice. */
function rodape(p, altura, mecanica, indice) {
  linha(p, "rodape/linha", M, altura - 84);
  lab(p, "rodape/rot", "mecânica:", M, altura - 62);
  tx(p, "rodape/mec", mecanica, M + 96, altura - 65, 12, C.tinta2, { largura: 620 });
  tx(p, "rodape/pag", `CONCEITO V2 · PÚBLICO · ${indice}`, 1000, altura - 62, 9, C.tinta3, {
    largura: 320,
    align: "right",
    track: 0.08,
    tnum: true,
  });
  tx(
    p,
    "rodape/nota",
    "exemplo de escala: notas, obras e datas são amostra · contagens N vêm da API",
    860,
    altura - 40,
    10,
    C.tinta3,
    { largura: 460, align: "right" },
  );
}

// ═══════════════════════════════ 1. HOME ═══════════════════════════════════
{
  const p = quadro("Home — v2 público", 2760);
  // remove a página em branco que o documento novo cria por padrão
  cmd("page.select", { index: 0 });
  cmd("page.delete", {});
  nav(p);

  lab(p, "hero/rot", "A régua de 0 a 10 · mesa de decisão", M, 120);
  tx(
    p,
    "hero/h1",
    "Descubra o que vale\no seu tempo para\nassistir, ler e jogar.",
    M,
    146,
    44,
    C.tinta1,
    { fonte: HEAD, peso: 700, lh: 1.06, largura: 660 },
  );
  tx(
    p,
    "hero/sub",
    "Uma nota só, de 0 a 10, que reúne crítica e público de fontes que você pode conferir. Sem caixa-preta.",
    M,
    312,
    16,
    C.tinta2,
    { lh: 1.6, largura: 560 },
  );
  rect(`${p}/hero/busca`, M, 388, 560, 52, C.mesa2, null, 2, {
    strokes: [C.regra2],
    strokeWeight: 1,
    strokeAlign: "inside",
  });
  icone(Search, `${p}/hero/busca/i`, C.tinta3, M + 26, 414, 16, 1.8);
  tx(p, "hero/busca/t", "Buscar título, pessoa ou franquia", M + 48, 403, 14, C.tinta3);
  rect(`${p}/hero/busca/k`, M + 560 - 56, 402, 44, 24, C.mesa0, null, 2, {
    strokes: [C.regra1],
    strokeWeight: 1,
  });
  tx(p, "hero/busca/k/t", "⌘K", M + 560 - 46, 407, 11, C.tinta3, { peso: 600 });
  tx(p, "hero/micro", "Catálogo aberto · N obras avaliadas · N fontes ativas", M, 458, 12, C.tinta3);

  // selo-exemplo do hero: a promessa é uma nota com procedência
  const hx = col7;
  const hw = DIREITA - col7; // 486
  linha(p, "hero/selo/linha", hx, 120, hw, C.regra2);
  lab(p, "hero/selo/rot", "Exemplo de escala", hx, 136);
  tx(p, "hero/selo/num", "8,7", hx, 152, 112, C.faixa8, {
    fonte: HEAD,
    peso: 700,
    lh: 1,
    tnum: true,
  });
  tx(p, "hero/selo/de", "de 10", hx + 230, 226, 13, C.tinta3);
  tx(p, "hero/selo/nome", "Muito bom", hx, 268, 17, C.tinta1, { peso: 500 });
  tx(p, "hero/selo/meta", "MEDIA Score · consolidado a partir de N fontes", hx, 296, 11, C.tinta3);
  tx(p, "hero/selo/data", "atualizado há N dias", hx, 314, 11, C.tinta3);
  regua(p, "hero/selo/regua", hx, 344, hw, { valor: 8.7, alt: 6 });
  [0, 5, 6, 7, 8, 9, 10].forEach((v) => {
    tx(p, `hero/selo/regua/t${v}`, String(v), hx + (v / 10) * hw - 12, 356, 10, C.tinta3, {
      tnum: true,
      largura: 24,
      align: "center",
    });
  });
  const dec = [
    ["Crítica", "8,9", C.faixa8],
    ["Público", "8,6", C.faixa8],
    ["Consenso", "9,7", C.faixa9],
  ];
  dec.forEach(([rot, valor, cor], i) => {
    const x = hx + i * 158;
    tx(p, `hero/selo/dec${i}/rot`, rot.toUpperCase(), x, 388, 9, C.tinta3, { track: 0.08 });
    tx(p, `hero/selo/dec${i}/val`, valor, x, 404, 20, cor, {
      fonte: HEAD,
      peso: 700,
      tnum: true,
    });
  });
  tx(p, "hero/selo/decnota", "consenso = concordância entre crítica e público", hx, 434, 10, C.tinta3);

  // ── régua como instrumento (o clique filtra) ──
  linha(p, "regua/linha", M, 520);
  lab(p, "regua/rot", "A régua é o instrumento", M, 544);
  tx(p, "regua/h2", "Clique numa faixa. O catálogo obedece.", M, 566, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(
    p,
    "regua/lead",
    "As seis faixas são botões de filtro, não legenda: o clique reescreve a URL e o recorte volta pelo link.",
    M,
    612,
    14,
    C.tinta2,
    { largura: 900 },
  );
  regua(p, "regua/barra", M, 664, CONTEUDO, { ativa: 4, alt: 10 });
  tx(p, "regua/ativa", "FAIXA 8 · ATIVA", 1080, 630, 11, C.acento, {
    track: 0.08,
    peso: 600,
  });
  tx(p, "regua/limpar", "limpar ×", 1220, 630, 11, C.tinta2, {
    largura: 100,
    align: "right",
  });
  rect(`${p}/regua/ativa/linha`, 1080, 646, 120, 2, C.acento);
  for (let i = 0; i <= 10; i += 1) {
    tx(p, `regua/tick${i}`, String(i), M + i * 120 - 12, 678, 10, C.tinta3, {
      tnum: true,
      largura: 24,
      align: "center",
    });
  }
  FAIXAS.forEach((f, i) => {
    const x = M + i * 200;
    const ativo = i === 1; // faixa 8
    rect(`${p}/regua/faixa${i}`, x, 706, 192, 72, ativo ? C.mesa1 : C.mesa0, null, 2, ativo
      ? { strokes: [C.acento], strokeWeight: 1.5, strokeAlign: "inside" }
      : { strokes: [C.regra1], strokeWeight: 1, strokeAlign: "inside" });
    rect(`${p}/regua/faixa${i}/tira`, x, 706, 192, 4, f.cor, null, 0, {
      opacity: ativo ? 1 : 0.6,
    });
    tx(p, `regua/faixa${i}/rot`, f.rotulo.toUpperCase(), x + 14, 720, 10, f.cor, {
      track: 0.08,
      peso: 600,
    });
    if (ativo) tx(p, "regua/faixa/ativa", "ATIVA", x + 192 - 56, 720, 9, C.acento, { track: 0.08, peso: 600 });
    tx(p, `regua/faixa${i}/nome`, f.nome, x + 14, 738, 13, ativo ? C.tinta1 : C.tinta2, {
      peso: ativo ? 500 : 400,
    });
    tx(p, `regua/faixa${i}/n`, "N obras", x + 14, 758, 10, C.tinta3);
  });
  lab(p, "regua/url/rot", "URL do recorte", M, 806);
  tx(p, "regua/url/val", "/catalog?faixa=8", M + 140, 803, 12, C.tinta2);
  tx(p, "regua/url/nota", "→ o mesmo link abre o catálogo já filtrado nesta faixa", M + 330, 804, 11, C.tinta3);

  // ── seis tipos, mesma régua ──
  linha(p, "tipos/linha", M, 880);
  lab(p, "tipos/rot", "Seis tipos · uma régua", M, 900);
  tx(p, "tipos/h2", "A mesma escala para tudo o que você consome.", M, 922, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(p, "tipos/lead", "O tipo muda as fontes e os pesos; a régua não muda.", M, 966, 14, C.tinta2);
  linha(p, "tipos/topo", M, 1010);
  const TIPOS = [
    [Clapperboard, "Filmes", "N obras", "N com nota"],
    [Tv, "Séries", "N obras", "N com nota"],
    [Gamepad2, "Games", "N obras", "N com nota"],
    [BookOpen, "Livros", "N obras", "N com nota"],
    [BookImage, "Quadrinhos", "N obras", "notas em preparação"],
    [BookMarked, "Mangás", "N obras", "N com nota"],
  ];
  TIPOS.forEach(([Icone, nome, contagem, extra], i) => {
    const x = M + i * 200;
    icone(Icone, `tipos/${i}/i`, C.tinta2, x + 24, 1044, 20, 1.6);
    tx(p, `tipos/${i}/idx`, `0${i + 1}`, x + 184 - 20, 1030, 10, C.tinta3, { tnum: true });
    tx(p, `tipos/${i}/nome`, nome, x, 1072, 17, C.tinta1, { fonte: BODY, peso: 600 });
    tx(p, `tipos/${i}/n`, contagem, x, 1102, 12, C.tinta2);
    tx(p, `tipos/${i}/extra`, extra, x, 1122, 10, C.tinta3);
  });
  linha(p, "tipos/base", M, 1176);

  // ── prova: fontes ──
  rect(`${p}/prova/fundo`, 0, 1230, 1440, 490, C.mesa1);
  lab(p, "prova/rot", "Prova · de onde vem a nota", M, 1266);
  tx(p, "prova/h2", "N fontes ativas. Cada nota com fonte e data.", M, 1288, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(
    p,
    "prova/lead",
    "Crítica e público separados; pesos declarados por tipo; a lista completa aparece na ficha e em /sources.",
    M,
    1332,
    14,
    C.tinta2,
    { largura: 1000 },
  );
  const FONTES = [
    ["Metacritic", "CRÍTICA", "Filmes · Séries · Games"],
    ["Rotten Tomatoes", "CRÍTICA", "Filmes · Séries"],
    ["IGDB (agregada)", "CRÍTICA", "Games"],
    ["OpenCritic", "CRÍTICA", "Games"],
    ["TMDB", "PÚBLICO", "Filmes · Séries"],
    ["OMDb (IMDb)", "PÚBLICO", "Filmes · Séries"],
    ["Trakt.tv", "PÚBLICO", "Filmes · Séries"],
    ["Letterboxd", "PÚBLICO", "Filmes"],
    ["Open Library", "PÚBLICO", "Livros"],
    ["Google Books", "PÚBLICO", "Livros"],
    ["Goodreads", "PÚBLICO", "Livros"],
    ["MyAnimeList", "PÚBLICO", "Mangás"],
  ];
  FONTES.forEach(([nome, tipo, midias], i) => {
    const x = M + (i % 4) * 300;
    const y = 1380 + Math.floor(i / 4) * 100;
    linha(p, `prova/f${i}/linha`, x, y, 276);
    tx(p, `prova/f${i}/nome`, nome, x, y + 16, 15, C.tinta1, { peso: 500 });
    lab(p, `prova/f${i}/tipo`, tipo, x, y + 40, C.tinta3);
    tx(p, `prova/f${i}/midias`, midias, x, y + 60, 11, C.tinta3);
  });
  lab(p, "prova/foot", "Amostra por tipo · N fontes ativas no registro · ver todas →", M, 1694);

  // ── carrosséis (dois dos seis trilhos) ──
  lab(p, "car/rot", "Carrosséis · seis trilhos, ordem canônica", M, 1755);
  tx(p, "car/h2", "Cada tipo na sua trilha.", M, 1777, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(
    p,
    "car/lead",
    "Filmes · Séries · Games · Livros · Quadrinhos · Mangás. Abaixo, os dois primeiros trilhos.",
    M,
    1820,
    14,
    C.tinta2,
  );
  const trilhos = [
    {
      nome: "FILMES",
      icone: Clapperboard,
      y: 1900,
      obras: [
        ["Duna: Parte Dois", "2024", 8.7, "D"],
        ["Oppenheimer", "2023", 8.4, "O"],
        ["Pobres Criaturas", "2023", 8.0, "P"],
        ["Duna: Parte Um", "2021", 8.2, "D"],
        ["Anora", "2024", 7.9, "A"],
        ["A Substância", "2024", 7.4, "A"],
      ],
    },
    {
      nome: "GAMES",
      icone: Gamepad2,
      y: 2280,
      obras: [
        ["Baldur's Gate 3", "2023", 9.6, "B"],
        ["Elden Ring", "2022", 9.4, "E"],
        ["Hades II", "2024", 8.5, "H"],
        ["Cocoon", "2023", 8.8, "C"],
        ["Animal Well", "2024", 8.8, "A"],
        ["Balatro", "2024", 8.6, "B"],
      ],
    },
  ];
  trilhos.forEach((t) => {
    icone(t.icone, `car/${t.nome}/i`, C.tinta2, 128, t.y + 9, 16, 1.8);
    lab(p, `car/${t.nome}/rot`, t.nome, 144, t.y, C.tinta1);
    const wNome = wTxt(t.nome, 11) + 0.08 * 11 * t.nome.length;
    tx(p, `car/${t.nome}/n`, "N títulos", 144 + wNome + 14, t.y + 1, 11, C.tinta3);
    tx(p, `car/${t.nome}/ver`, "Ver todos →", 1120, t.y, 12, C.acento, {
      largura: 120,
      align: "right",
    });
    rect(`${p}/car/${t.nome}/prev`, 1252, t.y - 7, 26, 26, C.mesa0, null, 1, {
      strokes: [C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    icone(ArrowLeft, `car/${t.nome}/prev/i`, C.tinta3, 1265, t.y + 6, 12, 1.8);
    rect(`${p}/car/${t.nome}/next`, 1286, t.y - 7, 26, 26, C.mesa0, null, 1, {
      strokes: [C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    icone(ArrowRight, `car/${t.nome}/next/i`, C.tinta1, 1299, t.y + 6, 12, 1.8);
    t.obras.forEach(([titulo, ano, valor, inicial], i) => {
      const x = M + i * 200;
      const y = t.y + 40;
      poster(p, `car/${t.nome}/${i}/poster`, x, y, 184, 276, { inicial, valor });
      tx(p, `car/${t.nome}/${i}/titulo`, titulo, x, y + 288, 14, C.tinta1, { peso: 500 });
      tx(p, `car/${t.nome}/${i}/meta`, `${ano} · MEDIA Score`, x, y + 310, 11, C.tinta3);
    });
  });

  rodape(
    p,
    2760,
    "clicar numa faixa reescreve a URL e filtra as seis mídias; o recorte volta pelo link.",
    "01/05",
  );
}

// ══════════════════════════════ 2. CATÁLOGO ════════════════════════════════
{
  const p = quadro("Catálogo — v2 público", 1800);
  nav(p, "catalogo");

  lab(p, "head/rot", "Catálogo · recorte compartilhável", M, 118);
  tx(p, "head/h1", "Catálogo", M, 138, 44, C.tinta1, { fonte: HEAD, peso: 700 });
  tx(
    p,
    "head/lead",
    "Tudo o que já foi avaliado, por tipo de obra. Filtre por tipo, faixa, gênero e ano — e leve o recorte pelo link.",
    M,
    204,
    16,
    C.tinta2,
    { lh: 1.6, largura: 544 },
  );

  // busca + ordenação
  rect(`${p}/ctl/busca`, M, 286, 520, 48, C.mesa2, null, 2, {
    strokes: [C.regra2],
    strokeWeight: 1,
    strokeAlign: "inside",
  });
  icone(Search, `${p}/ctl/busca/i`, C.tinta3, M + 26, 310, 16, 1.8);
  tx(p, "ctl/busca/t", "Buscar título, pessoa ou franquia", M + 48, 298, 14, C.tinta3);
  rect(`${p}/ctl/busca/k`, M + 520 - 56, 300, 44, 24, C.mesa0, null, 2, {
    strokes: [C.regra1],
    strokeWeight: 1,
  });
  tx(p, "ctl/busca/k/t", "⌘K", M + 520 - 46, 305, 11, C.tinta3, { peso: 600 });
  rect(`${p}/ctl/ordem`, 664, 286, 220, 48, C.mesa2, null, 2, {
    strokes: [C.regra1],
    strokeWeight: 1,
    strokeAlign: "inside",
  });
  lab(p, "ctl/ordem/rot", "Ordenar", 680, 294);
  tx(p, "ctl/ordem/val", "MEDIA Score ↓", 680, 311, 13, C.tinta1, { peso: 500 });
  icone(ChevronDown, `${p}/ctl/ordem/i`, C.tinta2, 664 + 220 - 20, 310, 14, 1.8);
  tx(p, "ctl/count", "N obras no recorte", 900, 294, 13, C.tinta2, {
    largura: 420,
    align: "right",
  });
  tx(p, "ctl/count/nota", "atualizado há N dias", 900, 316, 11, C.tinta3, {
    largura: 420,
    align: "right",
  });

  // recorte ativo + URL
  lab(p, "ativo/rot", "Recorte ativo · 3 filtros", M, 368);
  let cx = M + 210;
  const chips = [
    ["Tipo: Games", false],
    ["Faixa: 8–10", true],
    ["Ano: 2020–2026", false],
  ];
  chips.forEach(([txt, comDot], i) => {
    const w = wTxt(txt, 11) + 40;
    rect(`${p}/ativo/chip${i}`, cx, 358, w, 28, C.mesa2, null, 2, {
      strokes: [C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    if (comDot) {
      rect(`${p}/ativo/chip${i}/dot`, cx + 12, 369, 6, 6, C.faixa8, null, 0);
      rect(`${p}/ativo/chip${i}/dot2`, cx + 18, 369, 6, 6, C.faixa9, null, 0);
      tx(p, `ativo/chip${i}/t`, txt, cx + 32, 366, 11, C.tinta1);
    } else {
      tx(p, `ativo/chip${i}/t`, txt, cx + 12, 366, 11, C.tinta1);
    }
    icone(X, `ativo/chip${i}/x`, C.tinta3, cx + w - 14, 372, 10, 2);
    cx += w + 8;
  });
  tx(p, "ativo/limpar", "limpar tudo", cx + 10, 366, 11, C.acento, { peso: 500 });
  tx(
    p,
    "ativo/url",
    "/catalog?tipo=game&faixa=8-10&ano=2020-2026&ordem=score",
    960,
    362,
    11,
    C.tinta3,
    { largura: 360, align: "right" },
  );
  tx(p, "ativo/url/nota", "o link abre esta grade já filtrada", 960, 380, 10, C.tinta3, {
    largura: 360,
    align: "right",
  });
  linha(p, "ativo/linha", M, 420);

  // ── rail de filtros ──
  rect(`${p}/rail/regua`, col3 - VAO, 452, 1, 1212, C.regra1);
  lab(p, "rail/rot", "Filtros", M, 452, C.tinta1);
  tx(p, "rail/ativos", "3 ativos", 120, 452, 11, C.acento, { largura: railW, align: "right", peso: 500 });
  linha(p, "rail/linha0", M, 476, railW);

  const grupo = (nome, y, rot) => {
    lab(p, `rail/${nome}/rot`, rot, M, y, C.tinta2);
    return y + 24;
  };
  const check = (nome, x, y, marcado) => {
    rect(`${p}/${nome}`, x, y, 16, 16, marcado ? C.acento : C.mesa0, null, 1, {
      strokes: [marcado ? C.acento : C.regra2],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    if (marcado) icone(Check, `${p}/${nome}/ok`, C.acentoTinta, x + 8, y + 8, 11, 2.6);
  };
  let ry = grupo("tipo", 500, "Tipo de obra");
  [
    ["Filmes", false],
    ["Séries", false],
    ["Games", true],
    ["Livros", false],
    ["Quadrinhos", false],
    ["Mangás", false],
  ].forEach(([nome, marcado], i) => {
    check(`rail/tipo/${i}`, M, ry + 2, marcado);
    tx(p, `rail/tipo/${i}/t`, nome, M + 26, ry, 13, marcado ? C.tinta1 : C.tinta2);
    tx(p, `rail/tipo/${i}/n`, "N", 120, ry + 1, 11, C.tinta3, { largura: railW, align: "right", tnum: true });
    ry += 38;
  });
  linha(p, "rail/linha1", M, 752, railW);
  ry = grupo("faixa", 776, "Faixa da régua");
  FAIXAS.forEach((f, i) => {
    const marcado = i === 0 || i === 1;
    rect(`${p}/rail/faixa/${i}/dot`, M, ry + 5, 8, 8, f.cor, null, 0);
    tx(p, `rail/faixa/${i}/t`, f.nome, M + 20, ry, 13, marcado ? C.tinta1 : C.tinta2);
    tx(p, `rail/faixa/${i}/r`, f.rotulo, M + 20, ry + 17, 10, C.tinta3);
    tx(p, `rail/faixa/${i}/n`, marcado ? "N" : "N", 120, ry + 4, 11, C.tinta3, {
      largura: railW,
      align: "right",
      tnum: true,
    });
    if (marcado) {
      rect(`${p}/rail/faixa/${i}/marca`, M - 10, ry + 2, 2, 18, C.acento);
    }
    ry += 40;
  });
  linha(p, "rail/linha2", M, 1034, railW);
  ry = grupo("genero", 1058, "Gênero");
  ["Ação", "Aventura", "Estratégia", "RPG", "Indie", "Ver todos →"].forEach((nome, i) => {
    if (i < 5) {
      check(`rail/genero/${i}/c`, M, ry + 2, false);
      tx(p, `rail/genero/${i}`, nome, M + 26, ry, 13, C.tinta2);
    } else {
      tx(p, `rail/genero/${i}`, nome, M, ry, 13, C.acento);
    }
    ry += 36;
  });
  linha(p, "rail/linha3", M, 1292, railW);
  ry = grupo("ano", 1316, "Ano de lançamento");
  [
    ["de", "2020", M],
    ["até", "2026", 264],
  ].forEach(([labTxt, valor, x]) => {
    rect(`${p}/rail/ano/${labTxt}`, x, ry, 132, 46, C.mesa2, null, 2, {
      strokes: [C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    tx(p, `rail/ano/${labTxt}/l`, labTxt, x + 10, ry + 6, 9, C.tinta3);
    tx(p, `rail/ano/${labTxt}/v`, valor, x + 10, ry + 20, 13, C.tinta1, { tnum: true });
  });
  tx(p, "rail/ano/nota", "o recorte usa o ano de lançamento", M, ry + 56, 10, C.tinta3);
  linha(p, "rail/linha4", M, ry + 82, railW);
  lab(p, "rail/res/rot", "Resumo do recorte", M, ry + 104, C.tinta2);
  tx(p, "rail/res/t", "N obras · Games · nota 8,0–10,0 · 2020–2026", M, ry + 124, 11, C.tinta2, {
    largura: railW,
  });
  icone(Link2, `${p}/rail/res/i`, C.acento, 128, ry + 158, 13, 1.8);
  tx(p, "rail/res/link", "Copiar link do recorte", M + 18, ry + 150, 11, C.acento, { peso: 500 });
  tx(p, "rail/res/nota", "o rail fica fixo enquanto a grade rola", M, ry + 178, 10, C.tinta3);

  // ── grade densa ──
  lab(p, "grade/rot", "Grade · 12 de N obras", col3, 452, C.tinta1);
  tx(p, "grade/ordem", "ORDENADO POR MEDIA SCORE", col3, 452, 10, C.tinta3, {
    largura: DIREITA - col3,
    align: "right",
    track: 0.08,
  });
  const OBRAS = [
    ["Baldur's Gate 3", "2023", 9.6, "B"],
    ["Elden Ring", "2022", 9.4, "E"],
    ["Hades", "2020", 9.2, "H"],
    ["Disco Elysium", "2021", 9.1, "D"],
    ["Persona 5 Royal", "2020", 9.0, "P"],
    ["God of War Ragnarök", "2022", 8.9, "G"],
    ["Animal Well", "2024", 8.8, "A"],
    ["Alan Wake 2", "2023", 8.7, "A"],
    ["Balatro", "2024", 8.6, "B"],
    ["Cyberpunk 2077", "2020", 8.5, "C"],
    ["Metroid Dread", "2021", 8.4, "M"],
    ["Pentiment", "2022", 8.2, "P"],
  ];
  const CW = 208;
  const CGAP = (conteudo9 - 4 * CW) / 3; // fecha as 9 colunas em 1320
  OBRAS.forEach(([titulo, ano, valor, inicial], i) => {
    const x = col3 + (i % 4) * (CW + CGAP);
    const y = 490 + Math.floor(i / 4) * (Math.round(CW * 1.5) + 68);
    poster(p, `grade/c${i}/poster`, x, y, CW, Math.round(CW * 1.5), { inicial, valor });
    tx(p, `grade/c${i}/titulo`, titulo, x, y + Math.round(CW * 1.5) + 12, 14, C.tinta1, {
      peso: 500,
    });
    tx(p, `grade/c${i}/meta`, `Game · ${ano}`, x, y + Math.round(CW * 1.5) + 32, 11, C.tinta3);
  });

  tx(p, "grade/mais", "Exibindo 1–12 de N obras", col3, 1644, 12, C.tinta3);
  botao(p, "grade/carregar", "Carregar mais", 1120, 1622, 200, 44, { tipo: "secundario", size: 13 });

  rodape(
    p,
    1800,
    "cada filtro reescreve a URL (recorte compartilhável) e o rail conta os ativos.",
    "02/05",
  );
}

// ══════════════════════════════ 3. RANKINGS ════════════════════════════════
{
  const p = quadro("Rankings — v2 público", 1540);
  nav(p, "rankings");

  lab(p, "head/rot", "Rankings · por tipo e por faixa", M, 118);
  tx(p, "head/h1", "O topo de cada régua.", M, 138, 44, C.tinta1, { fonte: HEAD, peso: 700 });
  tx(
    p,
    "head/lead",
    "Melhores notas por tipo e por faixa. Trocar o recorte reordena a lista sem recarregar a página.",
    M,
    204,
    16,
    C.tinta2,
    { lh: 1.6, largura: 720 },
  );
  tx(p, "head/meta1", "N obras ranqueadas", 900, 204, 12, C.tinta2, {
    largura: 420,
    align: "right",
  });
  tx(p, "head/meta2", "atualizado a cada rodada de coleta", 900, 224, 11, C.tinta3, {
    largura: 420,
    align: "right",
  });

  // ── dois topos: por tipo e por faixa ──
  lab(p, "tipo/rot", "Topo por tipo · Filmes", M, 300, C.tinta1);
  lab(p, "faixa/rot", "Topo por faixa · 9 a 10 · Excepcional", col6, 300, C.tinta1);
  const chipsTipo = ["Filmes", "Séries", "Games", "Livros", "Quadrinhos", "Mangás"];
  let cxp = M;
  chipsTipo.forEach((nome, i) => {
    const ativo = i === 0;
    const w = wTxt(nome, 11) + 24;
    rect(`${p}/tipo/chip${i}`, cxp, 326, w, 28, ativo ? C.mesa2 : C.mesa0, null, 2, {
      strokes: [ativo ? C.acento : C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    tx(p, `tipo/chip${i}/t`, nome, cxp + 12, 334, 11, ativo ? C.tinta1 : C.tinta2, {
      peso: ativo ? 500 : 400,
    });
    cxp += w + 8;
  });
  const faixasBotao = ["9–10", "8", "7", "6", "5", "<5"];
  faixasBotao.forEach((rot, i) => {
    const ativo = i === 0;
    const x = col6 + i * 97;
    rect(`${p}/faixa/b${i}`, x, 326, 91, 28, ativo ? C.mesa2 : C.mesa0, null, 2, {
      strokes: [ativo ? C.acento : C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    rect(`${p}/faixa/b${i}/dot`, x + 10, 337, 6, 6, FAIXAS[i].cor, null, 0);
    tx(p, `faixa/b${i}/t`, rot, x + 22, 334, 11, ativo ? C.tinta1 : C.tinta2, { tnum: true });
  });

  const FILMES = [
    ["Duna: Parte Dois", "2024 · Filme", 8.7],
    ["Oppenheimer", "2023 · Filme", 8.4],
    ["Cidade de Deus", "2002 · Filme", 8.2],
    ["Pobres Criaturas", "2023 · Filme", 8.0],
    ["Anora", "2024 · Filme", 7.9],
  ];
  const EXCEPCIONAIS = [
    ["Baldur's Gate 3", "2023 · Game", 9.6],
    ["Elden Ring", "2022 · Game", 9.4],
    ["Berserk", "1989 · Mangá", 9.2],
    ["Chernobyl", "2019 · Série", 9.1],
    ["Torto Arado", "2019 · Livro", 9.0],
  ];
  const linhaTopo = (nome, itens, x, w) => {
    itens.forEach(([titulo, meta, valor], i) => {
      const y = 376 + i * 64;
      tx(p, `${nome}/${i}/rank`, `0${i + 1}`, x, y + 4, 22, C.tinta3, {
        fonte: HEAD,
        peso: 700,
        tnum: true,
      });
      tx(p, `${nome}/${i}/titulo`, titulo, x + 44, y, 15, C.tinta1, { peso: 500 });
      tx(p, `${nome}/${i}/meta`, meta, x + 44, y + 22, 11, C.tinta3);
      tx(p, `${nome}/${i}/nota`, nota(valor), x, y + 2, 20, corFaixa(valor), {
        fonte: HEAD,
        peso: 700,
        largura: w,
        align: "right",
        tnum: true,
      });
      tx(p, `${nome}/${i}/faixa`, nomeFaixa(valor), x, y + 26, 10, C.tinta3, {
        largura: w,
        align: "right",
      });
      if (i < itens.length - 1) linha(p, `${nome}/${i}/linha`, x, y + 52, w);
    });
  };
  linhaTopo("tipo", FILMES, M, largura(6));
  linhaTopo("faixa", EXCEPCIONAIS, col6, largura(6));
  linha(p, "div", M, 730);

  // ── a régua como eixo do top 10 ──
  lab(p, "eixo/rot", "A régua como eixo", M, 760);
  tx(p, "eixo/h2", "Dez posições na escala.", M, 782, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(p, "eixo/nota", "barra = nota · cor = faixa · ordem = ranking", 900, 792, 11, C.tinta3, {
    largura: 420,
    align: "right",
  });
  const X0 = 360;
  const X1 = 1180;
  const eixoW = X1 - X0;
  const TOP10 = [
    ["Baldur's Gate 3", "2023 · Game", 9.6],
    ["Elden Ring", "2022 · Game", 9.4],
    ["Berserk", "1989 · Mangá", 9.2],
    ["Chernobyl", "2019 · Série", 9.1],
    ["Torto Arado", "2019 · Livro", 9.0],
    ["Ruptura", "2022 · Série", 8.9],
    ["Duna: Parte Dois", "2024 · Filme", 8.7],
    ["A Quinta Estação", "2015 · Livro", 8.6],
    ["Oppenheimer", "2023 · Filme", 8.4],
    ["Cidade de Deus", "2002 · Filme", 8.2],
  ];
  for (let i = 0; i <= 10; i += 1) {
    const x = X0 + i * (eixoW / 10);
    rect(`${p}/eixo/grid${i}`, x, 846, 1, 530, C.regra1, null, 0, { opacity: 0.75 });
    tx(p, `eixo/t${i}`, String(i), x - 20, 818, 10, C.tinta3, {
      largura: 40,
      align: "center",
      tnum: true,
    });
  }
  rect(`${p}/eixo/base`, X0, 846, eixoW, 1, C.regra2);
  [
    [0, 5, C.faixa0],
    [5, 6, C.faixa5],
    [6, 7, C.faixa6],
    [7, 8, C.faixa7],
    [8, 9, C.faixa8],
    [9, 10, C.faixa9],
  ].forEach(([de, ate, cor], i) => {
    rect(`${p}/eixo/faixa${i}`, X0 + (de / 10) * eixoW, 850, ((ate - de) / 10) * eixoW, 3, cor, null, 0, {
      opacity: 0.8,
    });
  });
  TOP10.forEach(([titulo, meta, valor], i) => {
    const y = 872 + i * 54;
    tx(p, `top/${i}/rank`, `0${i + 1}`, M, y - 2, 22, i === 0 ? C.acento : C.tinta3, {
      fonte: HEAD,
      peso: 700,
      tnum: true,
    });
    tx(p, `top/${i}/titulo`, titulo, M + 56, y, 15, C.tinta1, { peso: 500 });
    tx(p, `top/${i}/meta`, meta, M + 56, y + 21, 11, C.tinta3);
    rect(`${p}/top/${i}/bar`, X0, y + 4, (valor / 10) * eixoW, 12, corFaixa(valor), null, 0, {
      opacity: 0.95,
    });
    tx(p, `top/${i}/nota`, nota(valor), 1200, y - 4, 20, corFaixa(valor), {
      fonte: HEAD,
      peso: 700,
      tnum: true,
    });
    tx(p, `top/${i}/faixa`, nomeFaixa(valor), 1200, y + 22, 10, C.tinta3);
  });
  tx(
    p,
    "eixo/foot",
    "A ordem da lista é o ranking; o comprimento da barra é a nota. Trocar tipo ou faixa move as duas leituras.",
    M,
    1404,
    12,
    C.tinta3,
  );

  rodape(
    p,
    1540,
    "alternar tipo ou faixa reordena a lista no lugar; a régua é o eixo das duas leituras.",
    "03/05",
  );
}

// ═════════════════════════════ 4. DESCOBERTAS ══════════════════════════════
{
  const p = quadro("Descobertas — v2 público", 1460);
  nav(p, "descobertas");
  lab(p, "head/rot", "Descobertas · relações com motivo", M, 118);
  tx(p, "head/h1", "Por que esta obra, e não outra.", M, 138, 44, C.tinta1, {
    fonte: HEAD,
    peso: 700,
  });
  tx(
    p,
    "head/lead",
    "Relações entre obras com o motivo declarado. Nada de “recomendado para você” sem dizer de onde veio.",
    M,
    204,
    16,
    C.tinta2,
    { lh: 1.6, largura: 760 },
  );

  // ponto de partida (consumo declarado)
  rect(`${p}/seed/fundo`, M, 286, CONTEUDO, 160, C.mesa2, null, 2);
  poster(p, "seed/poster", 132, 300, 96, 144, { inicial: "B", valor: 9.6 });
  lab(p, "seed/rot", "Porque você consumiu", 248, 300);
  tx(p, "seed/t", "Baldur's Gate 3", 248, 318, 26, C.tinta1, { fonte: HEAD, peso: 600 });
  tx(p, "seed/meta", "Game · 2023 · nota 9,6 · você avaliou 9,0", 248, 356, 12, C.tinta2);
  tx(
    p,
    "seed/evid",
    "Ponto de partida: topo da faixa 9–10, com nota de crítica e de público.",
    248,
    380,
    12,
    C.tinta3,
  );
  tx(p, "seed/ver", "Ver ficha →", 248, 410, 12, C.acento, { peso: 500 });
  tx(p, "seed/trocar", "Trocar ponto de partida", 360, 410, 12, C.tinta2);
  [
    [980, "FAIXA", "9 a 10", "Excepcional"],
    [1100, "FONTES", "IGDB (agregada)", "OpenCritic"],
    [1210, "RELAÇÕES", "N", "com motivo"],
  ].forEach(([x, rot, valor, sub], i) => {
    lab(p, `seed/fato${i}/rot`, rot, x, 300);
    tx(p, `seed/fato${i}/v`, valor, x, 318, 12, C.tinta1, { peso: 500 });
    tx(p, `seed/fato${i}/s`, sub, x, 336, 10, C.tinta3);
  });

  // lista de relações
  lab(p, "rel/rot", "Relações · N resultados", M, 500, C.tinta1);
  const motivos = [
    ["Todas", true],
    ["Mesma faixa · N", false],
    ["Mesma fonte · N", false],
    ["Mesma franquia · N", false],
  ];
  let cxr = M;
  motivos.forEach(([txt, ativo], i) => {
    const w = wTxt(txt, 11) + 24;
    rect(`${p}/rel/f${i}`, cxr, 526, w, 28, ativo ? C.mesa2 : C.mesa0, null, 2, {
      strokes: [ativo ? C.acento : C.regra1],
      strokeWeight: 1,
      strokeAlign: "inside",
    });
    tx(p, `rel/f${i}/t`, txt, cxr + 12, 534, 11, ativo ? C.tinta1 : C.tinta2);
    cxr += w + 8;
  });

  const REL = [
    {
      titulo: "Elden Ring",
      meta: "Game · 2022",
      valor: 9.4,
      inicial: "E",
      motivo: "MESMA FAIXA · 9 A 10",
      evid: "Excepcional como o ponto de partida; 0,2 abaixo no topo.",
      icone: Equal,
      cor: C.faixa9,
    },
    {
      titulo: "Divinity: Original Sin 2",
      meta: "Game · 2017",
      valor: 9.2,
      inicial: "D",
      motivo: "MESMA FONTE · IGDB + OPENCRITIC",
      evid: "As duas fontes de crítica que mais pesam em games.",
      icone: Database,
      cor: C.faixa9,
    },
    {
      titulo: "Baldur's Gate: Enhanced Edition",
      meta: "Game · 2012",
      valor: 8.1,
      inicial: "B",
      motivo: "MESMA FRANQUIA · BALDUR'S GATE",
      evid: "Mesma franquia; a porta de entrada para a trilogia.",
      icone: Layers,
      cor: C.faixa8,
    },
    {
      titulo: "Disco Elysium",
      meta: "Game · 2019",
      valor: 9.1,
      inicial: "D",
      motivo: "MESMA FAIXA · 9 A 10",
      evid: "Outra leitura de RPG narrativo dentro da mesma faixa.",
      icone: Equal,
      cor: C.faixa9,
    },
  ];
  REL.forEach((r, i) => {
    const y = 570 + i * 136;
    poster(p, `rel/r${i}/poster`, M, y + 6, 64, 96, {
      inicial: r.inicial,
      valor: r.valor,
    });
    tx(p, `rel/r${i}/titulo`, r.titulo, M + 88, y + 10, 17, C.tinta1, { peso: 500 });
    tx(p, `rel/r${i}/meta`, r.meta, M + 88, y + 36, 11, C.tinta3);
    icone(r.icone, `rel/r${i}/i`, C.tinta2, 500, y + 18, 13, 1.8);
    tx(p, `rel/r${i}/motivo`, r.motivo, 520, y + 11, 10, C.acento, { track: 0.08, peso: 600 });
    tx(p, `rel/r${i}/evid`, r.evid, 520, y + 32, 12, C.tinta2, { largura: 260, lh: 1.5 });
    tx(p, `rel/r${i}/nota`, nota(r.valor), 852, y + 8, 24, r.cor, {
      fonte: HEAD,
      peso: 700,
      largura: 60,
      align: "right",
      tnum: true,
    });
    tx(p, `rel/r${i}/faixa`, nomeFaixa(r.valor), 852, y + 38, 10, C.tinta3, {
      largura: 60,
      align: "right",
    });
    linha(p, `rel/r${i}/linha`, M, y + 118, 792);
  });

  // rail: regras + trilhas
  lab(p, "rail/rot", "Como ler uma relação", 936, 500, C.tinta1);
  const REGRAS = [
    ["01", "O motivo vem antes do título: faixa, fonte, franquia ou consumo."],
    ["02", "Toda relação cita a evidência — nota, fonte ou parentesco."],
    ["03", "Sem motivo, a obra entra no catálogo — não em descobertas."],
  ];
  REGRAS.forEach(([n, t], i) => {
    const y = 528 + i * 78;
    tx(p, `rail/regra${i}/n`, n, 936, y, 18, C.tinta3, { fonte: HEAD, peso: 700, tnum: true });
    tx(p, `rail/regra${i}/t`, t, 936 + 34, y + 1, 12, C.tinta2, { largura: 350, lh: 1.5 });
  });
  linha(p, "rail/linha1", 936, 778, 384);
  lab(p, "rail/trilhas/rot", "Trilhas por motivo", 936, 800, C.tinta1);
  [
    ["Mesma faixa", "N"],
    ["Mesma fonte", "N"],
    ["Mesma franquia", "N"],
    ["Consumo declarado", "N"],
  ].forEach(([nome, n], i) => {
    const y = 828 + i * 32;
    tx(p, `rail/trilha${i}/t`, nome, 936, y, 12, C.tinta1);
    tx(p, `rail/trilha${i}/n`, n, 936, y, 12, C.tinta3, {
      largura: 384,
      align: "right",
      tnum: true,
    });
    if (i < 3) linha(p, `rail/trilha${i}/linha`, 936, y + 24, 384);
  });
  linha(p, "rail/linha2", 936, 972, 384);
  tx(
    p,
    "rail/nota",
    "A recomendação nunca aparece sem motivo: o motivo é dado, não copy.",
    936,
    994,
    11,
    C.tinta3,
    { largura: 360, lh: 1.5 },
  );

  // cadeia de relações
  lab(p, "chain/rot", "Cadeia de relações · um caminho possível", M, 1140);
  const CHAIN = [
    ["Baldur's Gate 3", "Game · 2023", "B", "9,6"],
    ["Divinity: Original Sin 2", "Game · 2017", "D", "9,2"],
    ["Disco Elysium", "Game · 2019", "D", "9,1"],
    ["Planescape: Torment", "Game · 1999", "P", "9,2"],
  ];
  const motivosCadeia = ["mesma fonte", "mesma faixa", "mesma fonte"];
  CHAIN.forEach(([titulo, meta, inicial], i) => {
    const x = M + i * 320;
    poster(p, `chain/${i}/poster`, x, 1172, 72, 108, { inicial });
    tx(p, `chain/${i}/titulo`, titulo, x, 1288, 11, C.tinta1, { largura: 150, lh: 1.4 });
    tx(p, `chain/${i}/meta`, meta, x, 1306, 9, C.tinta3);
    if (i < CHAIN.length - 1) {
      rect(`${p}/chain/${i}/linha`, x + 88, 1226, 208, 1, C.regra2);
      icone(ArrowRight, `chain/${i}/arrow`, C.tinta3, x + 296, 1226, 12, 1.8);
      tx(p, `chain/${i}/motivo`, motivosCadeia[i].toUpperCase(), x + 96, 1204, 9, C.tinta3, {
        track: 0.08,
        peso: 500,
      });
    }
  });

  rodape(
    p,
    1460,
    "toda relação declara o motivo (faixa, fonte ou franquia) e a evidência; nada de “para você” solto.",
    "04/05",
  );
}

// ═════════════════════════════ 5. PÁGINA DA MÍDIA ══════════════════════════
{
  const p = quadro("Obra — v2 público", 1920);
  nav(p, "catalogo");

  tx(p, "crumb", "Catálogo / Filmes / Duna: Parte Dois", M, 106, 12, C.tinta3);

  // hero: pôster + ficha + selo
  poster(p, "hero/poster", M, 150, 300, 450, { inicial: "D", valor: 8.9 });
  lab(p, "hero/rot", "Filme · 2024 · 2h 46", col3, 150);
  tx(p, "hero/h1", "Duna: Parte Dois", col3, 172, 44, C.tinta1, {
    fonte: HEAD,
    peso: 700,
  });
  tx(
    p,
    "hero/meta",
    "Ficção científica · Aventura · Drama · Direção: Denis Villeneuve",
    col3,
    232,
    14,
    C.tinta2,
    { largura: 480 },
  );
  tx(
    p,
    "hero/sinopse",
    "Paul Atreides se une a Chani e aos Fremen para vingar a conspiração que destruiu sua família — e enfrenta uma escolha entre o amor da sua vida e o destino do universo.",
    col3,
    268,
    15,
    C.tinta2,
    { lh: 1.6, largura: 470 },
  );
  botao(p, "hero/watch", "Watchlist", col3, 372, 132, 42, {
    size: 13,
    Icone: BookmarkPlus,
  });
  botao(p, "hero/lista", "Lista", col3 + 140, 372, 100, 42, {
    tipo: "secundario",
    size: 13,
    Icone: ListPlus,
  });
  botao(p, "hero/comparar", "Comparar", col3 + 248, 372, 124, 42, {
    tipo: "secundario",
    size: 13,
    Icone: GitCompare,
  });
  tx(p, "hero/onde", "Onde assistir →", col3 + 392, 388, 13, C.acento, { peso: 500 });

  // ficha técnica dentro do hero (duas colunas, sem faixa extra)
  linha(p, "ficha/topo", col3, 434, 486);
  const FICHA = [
    ["Direção", "Denis Villeneuve"],
    ["Roteiro", "Denis Villeneuve, Jon Spaihts"],
    ["Elenco", "Timothée Chalamet, Zendaya, Rebecca Ferguson"],
    ["Classificação", "14 anos · 166 min · EUA"],
  ];
  FICHA.forEach(([rot, valor], i) => {
    const x = col3 + (i % 2) * 246;
    const y = 452 + Math.floor(i / 2) * 58;
    lab(p, `ficha/${i}/rot`, rot, x, y);
    tx(p, `ficha/${i}/val`, valor, x, y + 18, 12, C.tinta1, { largura: 226, lh: 1.4 });
  });

  // selo de nota (carimbo com a procedência do selo)
  const SX = col8;
  const SW = DIREITA - col8; // 384
  rect(`${p}/selo/fundo`, SX, 150, SW, 450, C.mesa2, null, 2);
  rect(`${p}/selo/tira`, SX, 150, 4, 450, C.faixa8, null, 1);
  lab(p, "selo/rot", "MEDIA Score", SX + 20, 168);
  tx(p, "selo/num", "8,9", SX + 20, 186, 96, C.faixa8, {
    fonte: HEAD,
    peso: 700,
    lh: 1,
    tnum: true,
  });
  tx(p, "selo/de", "de 10", SX + 200, 244, 12, C.tinta3);
  tx(p, "selo/nome", "Muito bom", SX + 20, 290, 17, C.tinta1, { peso: 500 });
  tx(p, "selo/meta", "N fontes · confiança alta", SX + 20, 316, 11, C.tinta3);
  tx(p, "selo/data", "atualizado há N dias", SX + 20, 334, 11, C.tinta3);
  linha(p, "selo/linha", SX + 20, 362, SW - 40);
  lab(p, "selo/fontes/rot", "Fontes do selo", SX + 20, 382);
  [
    ["Metacritic", 9.2],
    ["Rotten Tomatoes", 8.4],
    ["TMDB", 8.6],
  ].forEach(([nome, valor], i) => {
    const y = 406 + i * 30;
    tx(p, `selo/fonte${i}/n`, nome, SX + 20, y, 12, C.tinta2);
    tx(p, `selo/fonte${i}/v`, nota(valor), SX + 20, y, 12, corFaixa(valor), {
      largura: SW - 40,
      align: "right",
      tnum: true,
      peso: 600,
    });
  });
  tx(p, "selo/mais", "+ N fontes no registro", SX + 20, 500, 10, C.tinta3);
  linha(p, "selo/linha2", SX + 20, 522, SW - 40);
  tx(p, "selo/metodo", "ver metodologia →", SX + 20, 538, 11, C.acento, { peso: 500 });

  // decomposição da régua
  linha(p, "dec/topo", M, 640);
  lab(p, "dec/rot", "Decomposição da régua · pesos do tipo filme", M, 680);
  tx(p, "dec/h2", "A nota nunca aparece sozinha.", M, 702, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(
    p,
    "dec/lead",
    "Crítica 40% + público 40% + consenso 20%. Os pesos são do tipo; os componentes aparecem separados.",
    M,
    748,
    14,
    C.tinta2,
  );
  const DEC = [
    {
      nome: "CRÍTICA",
      peso: "PESO 40%",
      valor: 8.9,
      evid: "Metacritic 92/100 → 9,2 · Rotten Tomatoes 84/100 → 8,4",
      fontes: "N avaliações de crítica · normalizadas para 0–10",
    },
    {
      nome: "PÚBLICO",
      peso: "PESO 40%",
      valor: 8.6,
      evid: "TMDB 8,6/10 · OMDb 8,5/10 · Trakt 8,9/10 · Letterboxd 4,3/5 → 8,6",
      fontes: "N avaliações de público · cada fonte na escala nativa",
    },
    {
      nome: "CONSENSO",
      peso: "PESO 20%",
      valor: 9.7,
      evid: "1 − |8,9 − 8,6| = 9,7 · concordância alta (gap de 0,3 ponto)",
      fontes: "índice de concordância entre crítica e público",
    },
  ];
  DEC.forEach((d, i) => {
    const y = 790 + i * 124;
    lab(p, `dec/${i}/rot`, d.nome, M, y);
    tx(p, `dec/${i}/val`, nota(d.valor), M, y + 16, 34, corFaixa(d.valor), {
      fonte: HEAD,
      peso: 700,
      lh: 1,
      tnum: true,
    });
    tx(p, `dec/${i}/de`, "de 10", M + 78, y + 32, 11, C.tinta3);
    tx(p, `dec/${i}/peso`, d.peso, M, y + 60, 10, C.tinta2, { track: 0.08 });
    regua(p, `dec/${i}/regua`, 360, y + 26, 760, { valor: d.valor, alt: 8 });
    [0, 5, 6, 7, 8, 9, 10].forEach((v) => {
      tx(p, `dec/${i}/t${v}`, String(v), 360 + (v / 10) * 760 - 12, y + 40, 9, C.tinta3, {
        tnum: true,
        largura: 24,
        align: "center",
      });
    });
    tx(p, `dec/${i}/evid`, d.evid, 360, y + 58, 12, C.tinta2, { largura: 620 });
    tx(p, `dec/${i}/fontes`, d.fontes, 360, y + 78, 11, C.tinta3, { largura: 620 });
    tx(p, `dec/${i}/faixa`, nomeFaixa(d.valor), 1140, y + 22, 10, C.tinta3, {
      largura: 180,
      align: "right",
      track: 0.08,
    });
    tx(p, `dec/${i}/n`, "N fontes", 1140, y + 40, 11, C.tinta3, {
      largura: 180,
      align: "right",
    });
    if (i < 2) linha(p, `dec/${i}/linha`, M, y + 112, CONTEUDO);
  });

  // conta aberta (bloco de papel — o único do conceito)
  rect(`${p}/conta/fundo`, M, 1190, CONTEUDO, 120, C.papel, null, 2);
  lab(p, "conta/rot", "Conta aberta", M + 20, 1206, C.tintaPapel);
  tx(
    p,
    "conta/eq",
    "0,40 × 8,9  +  0,40 × 8,6  +  0,20 × 9,7  =  8,94",
    M + 20,
    1226,
    21,
    C.tintaPapel,
    { fonte: HEAD, peso: 600, tnum: true },
  );
  tx(
    p,
    "conta/nota",
    "estimador bayesiano: v = N avaliações · m = 60 · média do catálogo C = 7,0 · arredondado para 1 decimal",
    M + 20,
    1266,
    10,
    C.tintaPapel,
  );
  tx(p, "conta/final/rot", "MEDIA SCORE", 1090, 1206, 9, C.tintaPapel, { track: 0.08 });
  rect(`${p}/conta/final/sw`, 1090, 1230, 5, 30, C.faixa8, null, 0);
  tx(p, "conta/final/num", "8,9", 1102, 1224, 32, C.tintaPapel, {
    fonte: HEAD,
    peso: 700,
    tnum: true,
  });
  tx(p, "conta/final/nome", "Muito bom · N fontes", 1090, 1266, 10, C.tintaPapel);

  // fontes com nota e data
  lab(p, "src/rot", "Fontes desta nota", M, 1350);
  tx(p, "src/h2", "Cada número tem procedência.", M, 1372, 26, C.tinta1, {
    fonte: HEAD,
    peso: 600,
    lh: 1.15,
  });
  tx(p, "src/meta", "N fontes · atualizado há N dias", 960, 1378, 12, C.tinta2, {
    largura: 360,
    align: "right",
  });
  const COLS = [
    [M, "FONTE", 280, "left"],
    [420, "CLASSIFICAÇÃO", 160, "left"],
    [600, "NOTA ORIGINAL", 160, "left"],
    [800, "NORMALIZADA 0–10", 180, "left"],
  ];
  COLS.forEach(([x, txt], i) => {
    lab(p, `src/col${i}`, txt, x, 1420);
  });
  tx(p, "src/col4/rt", "COLETADA", 1040, 1420, 11, C.tinta3, {
    largura: 280,
    align: "right",
    track: 0.08,
    peso: 600,
  });
  linha(p, "src/linha", M, 1436);
  const SRC = [
    ["Metacritic", "Crítica", "92/100", 9.2, "12 out 2026"],
    ["Rotten Tomatoes", "Crítica", "84/100", 8.4, "12 out 2026"],
    ["TMDB", "Público", "8,6/10", 8.6, "12 out 2026"],
    ["OMDb (IMDb)", "Público", "8,5/10", 8.5, "12 out 2026"],
    ["Trakt.tv", "Público", "8,9/10", 8.9, "12 out 2026"],
    ["Letterboxd", "Público", "4,3/5", 8.6, "12 out 2026"],
    ["RT (Audiência)", "Público", "84/100", 8.4, "12 out 2026"],
  ];
  SRC.forEach(([fonte, tipo, original, norm, data], i) => {
    const y = 1452 + i * 44;
    tx(p, `src/r${i}/fonte`, fonte, M, y, 14, C.tinta1, { peso: 500 });
    lab(p, `src/r${i}/tipo`, tipo, 420, y + 2, C.tinta3);
    tx(p, `src/r${i}/orig`, original, 600, y + 1, 13, C.tinta2);
    tx(p, `src/r${i}/norm`, nota(norm), 800, y, 14, corFaixa(norm), {
      fonte: HEAD,
      peso: 600,
      tnum: true,
    });
    tx(p, `src/r${i}/data`, data, 1040, y + 2, 11, C.tinta3, {
      largura: 280,
      align: "right",
      tnum: true,
    });
    linha(p, `src/r${i}/linha`, M, y + 34);
  });
  tx(
    p,
    "src/foot",
    "Normalizada para 0–10 antes de pesar · fonte sem nota recente fica fora · categoria sem fonte ativa declara a ausência (quadrinhos hoje).",
    M,
    1770,
    11,
    C.tinta3,
  );

  rodape(
    p,
    1920,
    "a nota nunca aparece sem a decomposição (crítica × público × consenso) e sem a fonte com data.",
    "05/05",
  );
}

// ── salvar ─────────────────────────────────────────────────────────────────
const total = salvar(passos, JSONL);
console.log(`gerado ${JSONL} — ${total} comandos`);
