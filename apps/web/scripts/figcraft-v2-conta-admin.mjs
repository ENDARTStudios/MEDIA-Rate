#!/usr/bin/env node
/**
 * Conceito v2 — quadros de CONTA (família C) e ADMIN (família D).
 *
 * Fonte de verdade: `docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md`.
 * Primitivas: `apps/web/scripts/figcraft-v2-lib.mjs` (tokens, grade, FAIXAS).
 *
 * ── Por que este gerador define a coluna sozinho ────────────────────────────
 * A lib exporta `COL = 84` / `VAO = 24`, mas 12 colunas de 84 com 11 vãos de 24
 * somam 1272 — não cabem no conteúdo de 1200 (120 → 1320) que a fundação manda.
 * Aqui a coluna é `(1200 - 11*24) / 12 = 78`, com vão 24: 12*78 + 11*24 = 1200.
 * Assim a régua/hairline sempre fecha em 1320 e nada vaza a margem direita.
 * (Ajustar a lib é da frente Fundação; este gerador não a edita.)
 *
 * ── Regras de produção embutidas ────────────────────────────────────────────
 *  - nenhuma cor fora dos tokens; as 6 faixas só aparecem onde há NOTA;
 *  - todo número que vem da API sai como `N`; nota/valor de exemplo é marcado
 *    com a etiqueta `EXEMPLO` na seção;
 *  - rodapé de cada quadro: `mecânica: <uma linha>`;
 *  - nenhum estado depende de sorteio: coordenadas literais, sem random.
 *
 * Saída (dois documentos, um por família):
 *   docs/02-architecture-design/conceito-v2/conta/conceito-v2-conta.jsonl
 *   docs/02-architecture-design/conceito-v2/admin/conceito-v2-admin.jsonl
 */
import { mkdirSync } from "node:fs";
import {
  C,
  CONTEUDO,
  DIREITA,
  FAIXAS,
  HEAD,
  BODY,
  M,
  criarComandos,
  salvar,
} from "./figcraft-v2-lib.mjs";

// ── grade corrigida (ver comentário do cabeçalho) ────────────────────────────
const GCOL = (CONTEUDO - 11 * 24) / 12; // 78
const GX = (i) => M + i * (GCOL + 24); // 120 + i*102
const GW = (n) => n * GCOL + (n - 1) * 24;

// ── famílias tipográficas ────────────────────────────────────────────────────
const MONO = "Cascadia Mono";

const FAMILIA_CONTA = "docs/02-architecture-design/conceito-v2/conta";
const FAMILIA_ADMIN = "docs/02-architecture-design/conceito-v2/admin";
mkdirSync(FAMILIA_CONTA, { recursive: true });
mkdirSync(FAMILIA_ADMIN, { recursive: true });

// ════════════════════════════════════════════════════════════════════════════
// fábrica de desenho — um escopo de nomes por documento
// ════════════════════════════════════════════════════════════════════════════
function criarDesenho() {
  const d = criarComandos();
  let esc = "q";
  const nome = (s) => `${esc}/${s}`;

  const set = (s, props) => d.cmd("node.set", { name: nome(s), ...props });

  /** retângulo; `extra` recebe strokes/strokeWeight/opacity etc. */
  const R = (s, x, y, w, h, cor, opts = {}) => {
    const { raio = 0, ...extra } = opts;
    d.rect(nome(s), x, y, w, h, cor, undefined, raio, extra);
  };

  /** texto; `opts.largura` fixa a caixa (permite wrap e alinhamento). */
  const T = (s, txt, x, y, tam, cor, opts = {}) =>
    d.texto(nome(s), txt, x, y, tam, cor, null, opts);

  const dir = (s, txt, xDir, y, tam, cor, W, opts = {}) => {
    d.texto(nome(s), txt, xDir - W, y, tam, cor, null, { ...opts, largura: W });
    set(s, { textAlign: "right" });
  };

  const centro = (s, txt, cx, y, tam, cor, W, opts = {}) => {
    d.texto(nome(s), txt, cx - W / 2, y, tam, cor, null, { ...opts, largura: W });
    set(s, { textAlign: "center" });
  };

  const ROT = (s, txt, x, y, cor = C.tinta3) => d.rotulo(nome(s), txt, x, y, cor);

  /** rótulo curto (9–11px) com tracking de 0.08em, sem depender de rotulo(). */
  const lbl = (s, txt, x, y, opts = {}) => {
    const { cor = C.tinta3, size = 10, track = 0.8 } = opts;
    T(s, txt, x, y, size, cor, { peso: 500 });
    set(s, { letterSpacing: track });
  };

  const lblDir = (s, txt, xDir, y, opts = {}) => {
    const { cor = C.tinta3, size = 10, track = 0.8, W = 300 } = opts;
    dir(s, txt, xDir, y, size, cor, W, { peso: 500 });
    set(s, { letterSpacing: track });
  };

  const H = (s, x, y, w = CONTEUDO, cor = C.regra1) => d.regra(nome(s), x, y, w, cor);

  const h1 = (s, txt, x, y) => {
    T(s, txt, x, y, 44, C.tinta1, { fonte: HEAD, peso: 700 });
    set(s, { letterSpacing: -0.9 });
  };
  const h2 = (s, txt, x, y, cor = C.tinta1) => {
    T(s, txt, x, y, 26, cor, { fonte: HEAD, peso: 600 });
    set(s, { letterSpacing: -0.4 });
  };
  const h3 = (s, txt, x, y, cor = C.tinta1) => T(s, txt, x, y, 17, cor, { peso: 600 });

  /** parágrafo com entrelinha editorial. */
  const p = (s, txt, x, y, opts = {}) => {
    const { tam = 13, cor = C.tinta2, w } = opts;
    T(s, txt, x, y, tam, cor, { largura: w });
    set(s, { lineHeight: Math.round(tam * 1.58) });
  };

  /** número da API — mono, tabular por natureza. */
  const num = (s, txt, xDir, y, opts = {}) => {
    const { tam = 13, cor = C.tinta1, W = 90, peso = 500 } = opts;
    dir(s, txt, xDir, y, tam, cor, W, { fonte: MONO, peso });
  };

  const numEsq = (s, txt, x, y, opts = {}) => {
    const { tam = 13, cor = C.tinta1, peso = 500 } = opts;
    T(s, txt, x, y, tam, cor, { fonte: MONO, peso });
  };

  const campo = (s, x, y, w, rot, ph) => {
    lbl(`${s}/rot`, rot, x, y);
    T(`${s}/ph`, ph, x, y + 21, 13, C.tinta3);
    H(`${s}/regra`, x, y + 44, w, C.regra2);
  };

  const botao = (s, x, y, w, h, txt, tipo = "acento") => {
    if (tipo === "acento") {
      R(`${s}/bg`, x, y, w, h, C.acento);
      centro(`${s}/rot`, txt, x + w / 2, y + h / 2 - 8, 10, C.acentoTinta, w - 24, { peso: 600 });
    } else if (tipo === "contorno") {
      R(`${s}/bg`, x, y, w, h, "none", { strokes: [C.regra2], strokeWeight: 1 });
      centro(`${s}/rot`, txt, x + w / 2, y + h / 2 - 8, 10, C.tinta1, w - 24, { peso: 500 });
    } else {
      centro(`${s}/rot`, txt, x + w / 2, y + h / 2 - 8, 10, C.tinta2, w - 24, { peso: 500 });
    }
  };

  /** losango/quadrado de estado — nunca pill. */
  const ponto = (s, x, y, cor, lado = 5) => R(s, x, y, lado, lado, cor);

  const caixa = (s, x, y, lado, opts = {}) => {
    const { cor = "none", stroke = C.regra2 } = opts;
    R(s, x, y, lado, lado, cor, { strokes: [stroke], strokeWeight: 1 });
  };

  /** régua de 6 faixas: o instrumento. `w` é o comprimento total. */
  const regua = (s, x, y, w, alt = 4) => {
    const seg = w / 6;
    FAIXAS.forEach((f, i) => R(`${s}/f${i}`, x + i * seg, y, seg - 1, alt, f.cor));
  };

  const corFaixa = (i) => FAIXAS[i].cor;

  /** rodapé obrigatório do quadro: mecânica + identificação. */
  const rodape = (s, altura, mecanica, meta) => {
    H(`${s}/regra`, M, altura - 96, CONTEUDO);
    ROT(`${s}/rot`, "mecânica:", M, altura - 72);
    T(`${s}/txt`, mecanica, M + 112, altura - 76, 13, C.tinta2, { largura: 860 });
    set(`${s}/txt`, { lineHeight: 19 });
    lblDir(`${s}/meta`, meta, DIREITA, altura - 70, { size: 10, W: 400 });
  };

  const pagina = (s, altura, fundo = C.mesa0) => d.quadro(s, altura, 1440, fundo);

  /** o documento novo nasce com "Page 1"; ela não pertence ao quadro — remove no fim. */
  const removerPaginaInicial = () => {
    d.cmd("page.select", { index: 0 });
    d.cmd("page.delete", {});
  };

  return {
    d,
    passos: d.passos,
    escopo: (e) => {
      esc = e;
    },
    R,
    T,
    dir,
    centro,
    ROT,
    lbl,
    lblDir,
    H,
    h1,
    h2,
    h3,
    p,
    num,
    numEsq,
    campo,
    botao,
    ponto,
    caixa,
    regua,
    corFaixa,
    rodape,
    pagina,
    removerPaginaInicial,
    set,
    nome,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// chrome compartilhado
// ════════════════════════════════════════════════════════════════════════════
const NAV_PRODUTO = [
  "Descobrir",
  "Catálogo",
  "Rankings",
  "Descobertas",
  "Fontes",
];

/** barra do produto (conta): 72 de altura, hairline, item ativo em acento. */
function chromeConta(D, ativo = -1) {
  D.H("chrome/linha", 0, 72, 1440);
  D.R("chrome/marca", 120, 33, 7, 7, C.acento);
  D.T("chrome/marca-txt", "MEDIA RATE", 136, 23, 15, C.tinta1, { fonte: HEAD, peso: 600 });
  D.set("chrome/marca-txt", { letterSpacing: 1.6 });
  let x = 470;
  NAV_PRODUTO.forEach((item, i) => {
    D.T(`chrome/nav${i}`, item, x, 27, 13, i === ativo ? C.tinta1 : C.tinta2);
    if (i === ativo) D.R(`chrome/nav${i}/linha`, x, 52, item.length * 7 + 2, 2, C.acento);
    x += item.length * 7 + 38;
  });
  D.lblDir("chrome/plano", "PLANO FREE", 1252, 29, { size: 10, W: 200 });
  D.R("chrome/avatar", 1276, 22, 28, 28, C.mesa2, { strokes: [C.regra2], strokeWeight: 1 });
  D.T("chrome/avatar-ini", "N", 1284, 27, 12, C.tinta3, { fonte: HEAD, peso: 600 });
}

const NAV_ADMIN = [
  "Visão geral",
  "Curadoria",
  "Catálogo",
  "Usuários",
  "Métricas",
  "Auditoria",
  "Diagnóstico",
  "LGPD",
  "Upload",
];

/** shell de operação (admin): 56 de altura, mais denso, sem pôster. */
function chromeAdmin(D, ativo = 0) {
  D.H("chrome/linha", 0, 56, 1440);
  D.R("chrome/marca", 120, 24, 6, 6, C.acento);
  D.T("chrome/marca-txt", "MEDIA RATE", 134, 17, 12, C.tinta1, { fonte: HEAD, peso: 600 });
  D.set("chrome/marca-txt", { letterSpacing: 1.4 });
  D.T("chrome/sep", "/", 232, 17, 12, C.regra2);
  D.lbl("chrome/admin", "ADMIN", 244, 19, { size: 10, cor: C.tinta2 });
  let x = 360;
  NAV_ADMIN.forEach((item, i) => {
    const w = item.length * 6.6;
    D.lbl(`chrome/nav${i}`, item.toUpperCase(), x, 19, {
      size: 10,
      cor: i === ativo ? C.tinta1 : C.tinta3,
    });
    if (i === ativo) D.R(`chrome/nav${i}/linha`, x, 40, w, 2, C.acento);
    x += w + 26;
  });
  D.lblDir("chrome/env", "PRODUÇÃO", 1240, 19, { size: 9, W: 160 });
  D.ponto("chrome/env/dot", 1168, 21, C.aviso, 5);
  D.lblDir("chrome/sair", "SAIR", 1320, 19, { size: 9, W: 60 });
}

// ════════════════════════════════════════════════════════════════════════════
// CONTA — quadro 1: dashboard
// ════════════════════════════════════════════════════════════════════════════
function quadroDashboard(D) {
  const A = 1100;
  D.escopo("conta-dashboard");
  D.pagina("Conta — Dashboard (v2)", A);
  chromeConta(D, -1);

  D.lbl("kicker", "CONTA / DASHBOARD", M, 104);
  D.lblDir("kicker-dir", "ATUALIZADO AGORA", DIREITA, 104, { size: 9, W: 240 });
  D.h1("h1", "Dashboard", M, 128);
  D.p("sub", "Seu radar de gosto e a evolução do seu consumo.", M, 192, { tam: 16, w: 560 });
  D.H("regra-topo", M, 232);

  // ── rail "Seu espaço" (2 colunas) ─────────────────────────────────────────
  const RAIL = GX(0);
  const RAIL_W = GW(2); // 180
  D.ROT("rail/rot", "Seu espaço", RAIL, 264);
  const NAV_CONTA = [
    "Visão geral",
    "Descobertas",
    "Minha biblioteca",
    "Histórico",
    "Listas",
    "Watchlist",
    "Perfil",
    "Configurações",
  ];
  NAV_CONTA.forEach((item, i) => {
    const cor = i === 0 ? C.acento : C.tinta2;
    D.T(`rail/i${i}`, item, RAIL, 292 + i * 38, 14, cor);
    if (i === 0) D.R("rail/ativo", RAIL, 312, item.length * 7 + 2, 2, C.acento);
  });
  D.H("rail/sep", RAIL, 620, RAIL_W);
  D.lbl("rail/plano", "PLANO", RAIL, 640);
  D.T("rail/plano-valor", "Free", RAIL, 660, 17, C.tinta1, { fonte: HEAD, peso: 600 });
  D.T("rail/plano-link", "comparar planos →", RAIL, 690, 12, C.acento);

  // ── coluna de conteúdo (col 3 → 11) ───────────────────────────────────────
  const X = GX(3); // 426
  const W = DIREITA - X; // 894

  // A) continuar de onde parou
  D.R("cont/bloco", X, 264, W, 176, C.mesa2);
  D.lbl("cont/rot", "CONTINUAR · EXEMPLO", X + 24, 280);
  D.R("cont/poster", X + 24, 304, 68, 100, C.mesa1, {
    strokes: [C.regra2],
    strokeWeight: 1,
  });
  D.centro("cont/poster-txt", "PÔSTER", X + 58, 348, 9, C.tinta3, 64);
  D.T("cont/titulo", "Piranesi", X + 116, 300, 26, C.tinta1, { fonte: HEAD, peso: 600 });
  D.lbl("cont/meta", "LIVRO · 2020", X + 116, 340, { size: 10, cor: C.tinta3 });
  D.R("cont/trilha", X + 116, 372, 420, 2, C.regra2);
  D.R("cont/progresso", X + 116, 371, 264, 3, C.acento);
  D.lbl("cont/prog-txt", "RETOME A LEITURA", X + 116, 388, { size: 9, cor: C.tinta3 });

  D.botao("cont/retomar", X + W - 24 - 120, 304, 120, 40, "RETOMAR");
  D.dir("cont/ficha", "ver ficha →", X + W - 24, 356, 12, C.tinta2, 140);

  // B) watchlist + últimas notas
  const XL = X;
  const WL = 420;
  const XR = X + WL + 48; // 894
  const WR = DIREITA - XR; // 426

  D.lbl("wl/rot", "WATCHLIST · N TÍTULOS", XL, 488);
  const WL_ROWS = [
    ["O Conto da Aia", "SÉRIE · 2017"],
    ["Hades", "GAME · 2020"],
    ["Ruptura", "SÉRIE · 2022"],
  ];
  WL_ROWS.forEach(([titulo, meta], i) => {
    const y = 516 + i * 68;
    D.R(`wl/thumb${i}`, XL, y, 40, 56, C.mesa2, {
      strokes: [C.regra1],
      strokeWeight: 1,
    });
    D.T(`wl/titulo${i}`, titulo, XL + 56, y + 4, 15, C.tinta1);
    D.lbl(`wl/meta${i}`, meta, XL + 56, y + 28, { size: 9 });
    D.dir(`wl/seta${i}`, "→", XL + WL, y + 16, 14, C.tinta3, 20);
    D.H(`wl/sep${i}`, XL, y + 58, WL);
  });
  D.T("wl/link", "ver toda a watchlist →", XL, 728, 12, C.acento);

  D.lbl("notas/rot", "ÚLTIMAS NOTAS · EXEMPLO", XR, 488);
  const NOTAS = [
    ["Piranesi", "8,7", 1],
    ["Ruptura", "9,1", 0],
    ["Hades", "7,4", 2],
    ["O Conto da Aia", "6,8", 3],
  ];
  NOTAS.forEach(([titulo, nota, faixa], i) => {
    const y = 516 + i * 52;
    D.T(`notas/t${i}`, titulo, XR, y + 2, 14, C.tinta1);
    D.R(`notas/tick${i}`, XR + WR - 92, y + 4, 3, 13, D.corFaixa(faixa));
    D.dir(`notas/n${i}`, nota, XR + WR, y, 17, D.corFaixa(faixa), 52, {
      fonte: MONO,
      peso: 500,
    });
    D.lblDir(`notas/f${i}`, FAIXAS[faixa].nome.toUpperCase(), XR + WR, y + 24, {
      size: 8,
      W: 140,
    });
    D.H(`notas/sep${i}`, XR, y + 44, WR);
  });

  // C) régua + atalhos
  D.H("regra-meio", M, 800);
  D.lbl("regua/rot", "SUA RÉGUA", XL, 824);
  const segW = WL / 6; // 70
  FAIXAS.forEach((f, i) => {
    D.R(`regua/seg${i}`, XL + i * segW, 856, segW - 8, 4, f.cor);
    D.numEsq(`regua/n${i}`, "N", XL + i * segW, 872, { tam: 22, cor: C.tinta1 });
    D.lbl(`regua/f${i}`, f.rotulo.toUpperCase(), XL + i * segW, 906, { size: 8, cor: C.tinta3 });
  });

  D.lbl("atalhos/rot", "ATALHOS", XR, 824);
  const ATALHOS = [
    ["Quero ver", "watchlist?status=QUERO_CONSUMIR"],
    ["Descobertas", "/dashboard/discoveries"],
    ["Minhas listas", "/listas"],
    ["Meu perfil", "/profile"],
  ];
  ATALHOS.forEach(([item], i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = XR + col * (WR / 2 + 12);
    const y = 856 + linha * 48;
    D.H(`atalhos/sep${i}`, XR, y - 12, WR);
    D.T(`atalhos/t${i}`, item, x, y, 14, C.tinta1);
    D.dir(`atalhos/seta${i}`, "→", x + WR / 2 - 12, y + 1, 13, C.tinta3, 20);
  });

  D.rodape(
    "conta-dashboard",
    A,
    "A ordem da coluna é a decisão: continuar (1 ação), watchlist (fila) e últimas notas (memória) — o dashboard retoma antes de descobrir.",
    "CONCEITO V2 · CONTA · 01/03",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONTA — quadro 2: perfil (declarado × observado + régua)
// ════════════════════════════════════════════════════════════════════════════
function quadroPerfil(D) {
  const A = 1320;
  D.escopo("conta-perfil");
  D.pagina("Conta — Perfil (v2)", A);
  chromeConta(D, -1);

  D.lbl("kicker", "CONTA / PERFIL", M, 104);
  D.lblDir("kicker-dir", "VER PERFIL PÚBLICO →", DIREITA, 104, { size: 9, W: 260, cor: C.acento });
  D.h1("h1", "Perfil", M, 128);
  D.p("sub", "Usuário · Plano Free · membro desde N", M, 192, { tam: 13, w: 520 });
  D.H("regra-topo", M, 236);

  // ── A) declarado × observado ─────────────────────────────────────────────
  const XE = M; // 120
  const WE = GW(5); // 510
  const XD = GX(6); // 732
  const WD = DIREITA - XD; // 588

  D.lbl("dec/rot", "GOSTO DECLARADO", XE, 264);
  D.lblDir("dec/tag", "EXEMPLO", XE + WE, 264, { size: 9, W: 80 });
  D.h2("dec/h2", "O que você escolheu", XE, 288);
  D.p("dec/sub", "Declarado é o que você afirma querer; observado é o que o histórico mostra.", XE, 328, {
    tam: 13,
    w: WE,
  });

  const TIPOS = ["Filmes", "Séries", "Games", "Livros", "Quadrinhos", "Mangás"];
  const DECLARADOS = new Set([0, 1, 5]); // filmes, séries, mangás
  TIPOS.forEach((tipo, i) => {
    const y = 392 + i * 44;
    const on = DECLARADOS.has(i);
    if (on) D.caixa(`dec/box${i}`, XE, y + 3, 12, { cor: C.acento, stroke: C.acento });
    else D.caixa(`dec/box${i}`, XE, y + 3, 12);
    D.T(`dec/tipo${i}`, tipo, XE + 28, y, 15, on ? C.tinta1 : C.tinta2);
    if (on) D.lblDir(`dec/on${i}`, "SELECIONADO", XE + WE, y + 4, { size: 8, cor: C.acento, W: 140 });
    D.H(`dec/sep${i}`, XE, y + 34, WE);
  });

  D.lbl("obs/rot", "GOSTO OBSERVADO", XD, 264);
  D.h2("obs/h2", "O que o histórico mostra", XD, 288);
  D.p("obs/sub", "Derivado de N interações de consumo (quero + consumindo + concluído).", XD, 328, {
    tam: 13,
    w: WD,
  });
  const OBS_BARRAS = [1, 0.82, 0.5, 0.36, 0.22, 0.62]; // comprimento relativo (traço, não número)
  TIPOS.forEach((tipo, i) => {
    const y = 392 + i * 44;
    D.T(`obs/tipo${i}`, tipo, XD, y, 15, C.tinta1);
    const bx = XD + 150;
    const bw = 300;
    D.R(`obs/trilha${i}`, bx, y + 9, bw, 1, C.regra1);
    D.R(`obs/barra${i}`, bx, y + 7, Math.round(bw * OBS_BARRAS[i]), 4, C.tinta2);
    D.num(`obs/n${i}`, "N", XD + WD, y, { tam: 13, W: 60 });
    D.H(`obs/sep${i}`, XD, y + 34, WD);
  });

  // ── B) divergência ───────────────────────────────────────────────────────
  D.R("div/faixa", M, 676, CONTEUDO, 104, C.mesa1);
  D.lbl("div/rot", "DIVERGÊNCIA · DECLARADO ≠ OBSERVADO", M + 24, 692);
  D.h3("div/tipo", "Games", M + 24, 718);
  D.p("div/txt", "declarado, mas N títulos no histórico — o gosto observado não confirma a escolha.", M + 120, 720, {
    tam: 13,
    w: 620,
  });
  D.dir("div/acao", "explorar games da faixa 8+ →", DIREITA - 24, 720, 12, C.acento, 380);
  D.lbl("div/nota", "O PERFIL NOMEIA A DIVERGÊNCIA EM VEZ DE DESENHAR UM GRÁFICO GENÉRICO", M + 24, 752, {
    size: 8,
    cor: C.tinta3,
  });

  // ── C) régua do perfil ───────────────────────────────────────────────────
  D.lbl("reg/rot", "RÉGUA DO PERFIL · AS NOTAS QUE VOCÊ DEU", M, 824);
  D.lblDir("reg/n", "ESCALA 0–10 · N NOTAS", DIREITA, 824, { size: 9, W: 320 });

  // seis faixas, na ordem canônica da lib (alto → baixo), sem eixo linear:
  // a régua é ordinal (6 faixas), não uma reta de 0 a 10.
  const seg = CONTEUDO / 6;
  FAIXAS.forEach((f, i) => {
    const x = M + i * seg;
    D.R(`reg/seg${i}`, x, 872, seg - 2, 4, f.cor);
    D.T(`reg/n${i}`, "N", x, 884, 26, C.tinta1, { fonte: MONO, peso: 500 });
    D.lbl(`reg/f${i}`, f.nome.toUpperCase(), x, 924, { size: 9, cor: C.tinta3 });
    D.lbl(`reg/faixa${i}`, f.rotulo.toUpperCase(), x, 940, { size: 8, cor: f.cor });
  });

  // ── D) score médio + conquistas ──────────────────────────────────────────
  D.H("regra-meio", M, 1000);
  D.lbl("media/rot", "SEU SCORE MÉDIO", M, 1024);
  D.T("media/valor", "N,N", M, 1044, 38, C.tinta1, { fonte: MONO, peso: 500 });
  D.T("media/de", "/10", M + 96, 1056, 13, C.tinta3);
  D.R("media/tick", M, 1090, 64, 3, C.faixa8);
  D.lbl("media/f", "FAIXA N · N NOTAS", M + 76, 1086, { size: 9 });

  D.lbl("badges/rot", "CONQUISTAS", GX(6), 1024);
  const BADGES = [
    ["Explorador", "5+ títulos na watchlist"],
    ["Maratonista", "3+ séries completas"],
    ["Ativo", "assistindo 1+ título"],
  ];
  BADGES.forEach(([nome, regra], i) => {
    const y = 1052 + i * 40;
    D.caixa(`badges/box${i}`, GX(6), y + 3, 10);
    D.T(`badges/t${i}`, nome, GX(6) + 22, y, 14, C.tinta1);
    D.T(`badges/r${i}`, regra, GX(6) + 160, y + 1, 12, C.tinta3);
    D.lblDir(`badges/n${i}`, "N", DIREITA, y, { size: 11, W: 80, cor: C.tinta3 });
  });

  D.rodape(
    "conta-perfil",
    A,
    "O perfil põe declarado e observado lado a lado e nomeia a divergência; a régua do perfil usa a mesma escala da ficha e do catálogo.",
    "CONCEITO V2 · CONTA · 02/03",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONTA — quadro 3: login / registro
// ════════════════════════════════════════════════════════════════════════════
function quadroLogin(D) {
  const A = 1000;
  D.escopo("conta-login");
  D.pagina("Conta — Login e Registro (v2)", A);

  // chrome mínimo: a tela de entrada não repete a nav do produto
  D.H("chrome/linha", 0, 72, 1440);
  D.R("chrome/marca", 120, 33, 7, 7, C.acento);
  D.T("chrome/marca-txt", "MEDIA RATE", 136, 23, 15, C.tinta1, { fonte: HEAD, peso: 600 });
  D.set("chrome/marca-txt", { letterSpacing: 1.6 });
  D.dir("chrome/voltar", "voltar ao site →", DIREITA, 27, 12, C.tinta3, 200);

  // ── coluna esquerda: o princípio ─────────────────────────────────────────
  D.lbl("esq/kicker", "CONCEITO V2 / CONTA", M, 176);
  D.h2("esq/tese", "Uma decisão por tela.", M, 204);
  D.set("esq/tese", { lineHeight: 32 });
  D.p(
    "esq/txt",
    "O fluxo não pede tudo de uma vez: entrar, criar e verificar são telas separadas. Cada uma decide uma coisa só — e o desenho não muda entre elas.",
    M,
    272,
    { tam: 13, w: 268 },
  );
  D.H("esq/sep", M, 396, 268);
  D.lbl("esq/decide", "O QUE ESTA TELA DECIDE", M, 416);
  D.T("esq/decide-valor", "Identificar quem já tem conta.", M, 438, 15, C.tinta1, { largura: 268 });
  D.set("esq/decide-valor", { lineHeight: 23 });

  // ── formulário central ───────────────────────────────────────────────────
  const FX = 480;
  const FW = 480;
  const FCX = FX + FW / 2;

  D.lbl("form/kicker", "CONTA / ENTRAR", FX, 140);
  D.h1("form/h1", "Entrar", FX, 172);
  D.p("form/sub", "Bem-vindo de volta.", FX, 236, { tam: 15, w: FW });

  D.campo("form/email", FX, 296, FW, "EMAIL", "seu@email.com");
  D.lbl("form/senha-rot", "SENHA", FX, 370);
  D.lblDir("form/senha-ver", "MOSTRAR", FX + FW, 370, { size: 9, W: 120, cor: C.tinta3 });
  D.T("form/senha-ph", "Sua senha", FX, 391, 13, C.tinta3);
  D.H("form/senha-regra", FX, 414, FW, C.regra2);

  D.botao("form/entrar", FX, 452, FW, 48, "ENTRAR");

  // divisor "ou"
  D.H("form/ou-esq", FX, 540, 200);
  D.centro("form/ou", "OU", FCX, 531, 10, C.tinta3, 40);
  D.H("form/ou-dir", FX + FW - 200, 540, 200);

  D.botao("form/google", FX, 572, FW, 44, "CONTINUAR COM GOOGLE", "contorno");
  D.T("form/google-g", "G", FX + 22, 584, 14, C.tinta1, { fonte: HEAD, peso: 600 });
  D.botao("form/apple", FX, 632, FW, 44, "CONTINUAR COM APPLE", "fantasma");
  D.lblDir("form/apple-breve", "EM BREVE", FX + FW, 648, { size: 9, W: 100, cor: C.tinta3 });

  D.T("form/nova", "Não tem conta?", FX, 716, 13, C.tinta2);
  D.T("form/nova-link", "Cadastre-se →", FX + 130, 716, 13, C.acento);
  D.lbl("form/legal", "AO CONTINUAR, VOCÊ ACEITA", FX, 782, { size: 9 });
  D.T("form/legal-links", "TERMOS · POLÍTICA DE PRIVACIDADE", FX, 800, 11, C.tinta2);
  D.set("form/legal-links", { letterSpacing: 0.4 });

  // ── coluna direita: a trilha do fluxo ────────────────────────────────────
  const TX = 1040;
  D.lbl("trilha/rot", "TRILHA DO FLUXO", TX, 176);
  D.R("trilha/linha", TX - 1, 220, 1, 236, C.regra1);
  const PASSOS = [
    ["01", "Entrar", "identificar quem já tem conta", "NESTA TELA"],
    ["02", "Criar conta", "nome, email e senha — uma vez", "PRÓXIMA"],
    ["03", "Verificar email", "confirmar o endereço pelo link", "PRÓXIMA"],
  ];
  PASSOS.forEach(([n, titulo, desc, estado], i) => {
    const y = 208 + i * 88;
    D.R(`trilha/ponto${i}`, TX - 5, y + 5, 9, 9, i === 0 ? C.acento : C.mesa0, {
      strokes: [i === 0 ? C.acento : C.regra2],
      strokeWeight: 1,
    });
    D.lbl(`trilha/n${i}`, n, TX + 24, y, { size: 9, cor: i === 0 ? C.acento : C.tinta3 });
    D.T(`trilha/t${i}`, titulo, TX + 24, y + 16, 15, i === 0 ? C.tinta1 : C.tinta2);
    D.T(`trilha/d${i}`, desc, TX + 24, y + 40, 11, C.tinta3, { largura: 256 });
    D.lbl(`trilha/e${i}`, estado, TX + 24, y + 60, {
      size: 8,
      cor: i === 0 ? C.acento : C.tinta3,
    });
  });
  D.lbl("trilha/nota", "O LAYOUT NÃO MUDA ENTRE AS TELAS — MUDA A DECISÃO", TX, 500, {
    size: 8,
    cor: C.tinta3,
  });

  D.rodape(
    "conta-login",
    A,
    "Fluxo centrado com uma decisão por tela: entrar, criar e verificar compartilham o desenho; o que muda é a pergunta, não o formulário.",
    "CONCEITO V2 · CONTA · 03/03",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — quadro 4: overview (saúde do acervo)
// ════════════════════════════════════════════════════════════════════════════
function quadroAdminOverview(D) {
  const A = 1020;
  D.escopo("admin-overview");
  D.pagina("Admin — Overview (v2)", A);
  chromeAdmin(D, 0);

  D.lbl("kicker", "OPERAÇÃO / VISÃO GERAL", M, 92);
  D.lblDir("kicker-dir", "ATUALIZADO HÁ N MIN · RECARREGAR", DIREITA, 92, { size: 9, W: 380 });
  D.h2("h1", "Saúde do acervo", M, 116);
  D.p(
    "sub",
    "O que está publicado, o que está na fila e o que falhou — na mesma passada de olho.",
    M,
    158,
    { tam: 13, w: 640 },
  );
  D.H("regra-topo", M, 204);

  // ── faixa de métricas: 5 células separadas por hairline (não por card) ────
  const METRICAS = [
    ["ACERVO", "N", "títulos no catálogo"],
    ["COBERTURA", "N%", "títulos com nota"],
    ["FILA", "N", "itens em curadoria"],
    ["ERROS 24H", "N", "coletas falharam"],
    ["ÚLTIMA COLETA", "N", "min atrás"],
  ];
  const CW = CONTEUDO / 5; // 240
  METRICAS.forEach(([rot, valor, help], i) => {
    const x = M + i * CW + (i ? 24 : 0);
    if (i > 0) D.R(`m/div${i}`, x - 12, 228, 1, 84, C.regra1);
    D.lbl(`m/rot${i}`, rot, x, 232);
    D.T(`m/val${i}`, valor, x, 254, 28, C.tinta1, { fonte: MONO, peso: 500 });
    D.lbl(`m/help${i}`, help, x, 292, { size: 9 });
  });

  // ── cobertura por tipo ───────────────────────────────────────────────────
  const TX = M;
  const TW = GW(8) + 24; // 816 (col 0 → 7)
  const TR = TX + TW; // 936
  D.lbl("cov/rot", "COBERTURA POR TIPO", TX, 368);
  D.lblDir("cov/fonte", "FONTE: API · N TIPOS", TR, 368, { size: 8, W: 260 });

  const COL_TIT = 480;
  const COL_NOTA = 596;
  const COL_FONTES = 690;
  D.lbl("cov/th1", "TIPO", TX, 400);
  D.lblDir("cov/th2", "TÍTULOS", COL_TIT, 400, { size: 9, W: 120 });
  D.lblDir("cov/th3", "COM NOTA", COL_NOTA, 400, { size: 9, W: 120 });
  D.lblDir("cov/th4", "FONTES", COL_FONTES, 400, { size: 9, W: 100 });
  D.lblDir("cov/th5", "COBERTURA", TR, 400, { size: 9, W: 200 });
  D.H("cov/linha-th", TX, 420, TW);

  const COV = [1, 0.9, 0.72, 0.55, 0.34, 0.61];
  const TIPOS = ["Filmes", "Séries", "Games", "Livros", "Quadrinhos", "Mangás"];
  TIPOS.forEach((tipo, i) => {
    const y = 432 + i * 52;
    D.T(`cov/tipo${i}`, tipo, TX, y, 14, C.tinta1);
    D.num(`cov/n${i}`, "N", COL_TIT, y, { tam: 13, W: 100 });
    D.num(`cov/nota${i}`, "N", COL_NOTA, y, { tam: 13, W: 100, cor: C.tinta2 });
    D.num(`cov/fontes${i}`, "N", COL_FONTES, y, { tam: 13, W: 80, cor: C.tinta2 });
    const bx = 712;
    const bw = 168;
    D.R(`cov/trilha${i}`, bx, y + 7, bw, 1, C.regra1);
    D.R(`cov/barra${i}`, bx, y + 5, Math.round(bw * COV[i]), 4, C.tinta2);
    D.num(`cov/pct${i}`, "N%", TR, y, { tam: 12, W: 50, cor: C.tinta2 });
    D.H(`cov/sep${i}`, TX, y + 40, TW);
  });

  // ── filas ────────────────────────────────────────────────────────────────
  const FX = 960;
  const FW = DIREITA - FX; // 360
  D.lbl("fila/rot", "FILAS", FX, 368);
  D.lblDir("fila/total", "N ITENS", FX + FW, 368, { size: 9, W: 120, cor: C.tinta3 });
  const FILAS = [
    ["Curadoria pendente", "N"],
    ["Coleta com erro", "N"],
    ["Títulos sem nota", "N"],
    ["Pedidos LGPD", "N"],
  ];
  FILAS.forEach(([nome, qtd], i) => {
    const y = 396 + i * 58;
    D.T(`fila/t${i}`, nome, FX, y, 13, C.tinta1);
    D.num(`fila/n${i}`, qtd, FX + FW, y - 1, { tam: 16, W: 60 });
    D.T(`fila/acao${i}`, "abrir fila →", FX, y + 22, 10, C.acento);
    D.H(`fila/sep${i}`, FX, y + 48, FW);
  });

  // ── erros de coleta ──────────────────────────────────────────────────────
  D.lbl("err/rot", "ERROS DE COLETA", FX, 672);
  D.lblDir("err/janela", "ÚLTIMAS 24H", FX + FW, 672, { size: 8, W: 120 });
  const ERROS = [
    ["TMDB", "N"],
    ["IGDB", "N"],
    ["OpenCritic", "N"],
  ];
  ERROS.forEach(([fonte, qtd], i) => {
    const y = 700 + i * 52;
    D.T(`err/f${i}`, fonte, FX, y, 13, C.tinta1);
    D.num(`err/n${i}`, qtd, FX + FW, y, { tam: 12, W: 40, cor: C.erro });
    D.lbl(`err/det${i}`, "HÁ N MIN · SEM RESPOSTA", FX, y + 22, { size: 8, cor: C.tinta3 });
    D.H(`err/sep${i}`, FX, y + 40, FW);
  });

  // ── últimos eventos (liga este quadro à auditoria) ───────────────────────
  D.H("regra-base", M, 776, TW);
  D.lbl("ev/rot", "ÚLTIMOS EVENTOS", M, 796);
  D.lblDir("ev/link", "VER AUDITORIA →", TR, 796, { size: 9, W: 180, cor: C.acento });
  const EVENTOS = [
    ["ADMIN_MIDIA_PUBLICADA", "há N min", "sucesso"],
    ["COLETA_FALHOU · IGDB", "há N min", "erro"],
  ];
  EVENTOS.forEach(([acao, tempo, estado], i) => {
    const y = 822 + i * 34;
    D.ponto(`ev/dot${i}`, M, y + 5, estado === "erro" ? C.erro : C.sucesso, 5);
    D.T(`ev/a${i}`, acao, M + 18, y, 11, C.tinta2, { fonte: MONO, peso: 500 });
    D.lblDir(`ev/t${i}`, tempo.toUpperCase(), TR, y, { size: 9, W: 160 });
  });

  D.rodape(
    "admin-overview",
    A,
    "Cobertura, filas e erros de coleta dividem uma só dobra: o operador vê a lacuna e a fila que a resolve sem trocar de tela.",
    "CONCEITO V2 · ADMIN · 01/04",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — quadro 5: fila de curadoria
// ════════════════════════════════════════════════════════════════════════════
function quadroAdminFila(D) {
  const A = 1140;
  D.escopo("admin-fila");
  D.pagina("Admin — Fila de curadoria (v2)", A);
  chromeAdmin(D, 1);

  D.lbl("kicker", "OPERAÇÃO / CURADORIA", M, 92);
  D.lblDir("kicker-n", "N PENDENTES", DIREITA, 88, { size: 11, W: 320, cor: C.tinta2 });
  D.h2("h1", "Fila de curadoria", M, 116);
  D.p(
    "sub",
    "O que está pendente, o que falhou e o que publicar. Cada linha declara o próximo passo.",
    M,
    158,
    { tam: 13, w: 720 },
  );
  D.H("regra-topo", M, 204);

  // ── filtros por motivo ───────────────────────────────────────────────────
  const TABS = ["TODOS N", "SEM NOTA N", "DIVERGENTE N", "SEM PÔSTER N", "COLETA FALHOU N"];
  let tx = M;
  TABS.forEach((tab, i) => {
    const w = tab.length * 7.2;
    D.lbl(`tab/t${i}`, tab, tx, 228, { size: 10, cor: i === 0 ? C.tinta1 : C.tinta3 });
    if (i === 0) D.R("tab/ativo", tx, 248, w, 2, C.acento);
    tx += w + 34;
  });
  D.H("regra-tabs", M, 262);
  D.lblDir("tab/exemplo", "ITENS DE EXEMPLO", DIREITA, 228, { size: 8, W: 200 });

  // ── tabela ───────────────────────────────────────────────────────────────
  const C_ITEM = 120;
  const C_TIPO = 560;
  const C_ORIGEM = 660;
  const C_ESTADO = 800;
  D.lbl("tb/th1", "ITEM", C_ITEM, 286);
  D.lbl("tb/th2", "TIPO", C_TIPO, 286);
  D.lbl("tb/th3", "ORIGEM", C_ORIGEM, 286);
  D.lbl("tb/th4", "ESTADO", C_ESTADO, 286);
  D.lblDir("tb/th5", "PRÓXIMO PASSO", DIREITA, 286, { size: 9, W: 260 });
  D.H("tb/linha", M, 306);

  const ITENS = [
    ["Piranesi", "2020", "LIVRO", "SEM NOTA", "aviso", "Conferir nota na fonte", "Open Library"],
    ["Ruptura", "2022", "SÉRIE", "DIVERGENTE", "erro", "Resolver divergência", "TVMaze"],
    ["Hades", "2020", "GAME", "SEM PÔSTER", "tinta", "Subir pôster", "IGDB"],
    ["O Conto da Aia", "2017", "SÉRIE", "COLETA FALHOU", "erro", "Reprocessar coleta", "TMDB"],
    ["A Vegetariana", "2007", "LIVRO", "SEM NOTA", "aviso", "Conferir nota na fonte", "Google Books"],
    ["Disco Elysium", "2019", "GAME", "DIVERGENTE", "erro", "Resolver divergência", "OpenCritic"],
    ["Frieren", "2020", "MANGÁ", "SEM NOTA", "aviso", "Publicar", "MyAnimeList"],
    ["O Problema dos Três Corpos", "2024", "SÉRIE", "SEM PÔSTER", "tinta", "Subir pôster", "TMDB"],
    ["Berserk", "1989", "MANGÁ", "DIVERGENTE", "erro", "Resolver divergência", "MyAnimeList"],
    ["Vingadores: Ultimato", "2019", "FILME", "SEM NOTA", "aviso", "Conferir nota na fonte", "TMDB"],
  ];
  ITENS.forEach(([item, ano, tipo, estado, sev, passo, fonte], i) => {
    const y = 322 + i * 56;
    D.T(`tb/t${i}`, item, C_ITEM, y, 14, C.tinta1);
    D.lbl(`tb/meta${i}`, ano, C_ITEM, y + 22, { size: 8 });
    D.lbl(`tb/tipo${i}`, tipo, C_TIPO, y + 4, { size: 9 });
    D.T(`tb/origem${i}`, fonte, C_ORIGEM, y + 2, 12, C.tinta2);
    const cor = sev === "erro" ? C.erro : sev === "aviso" ? C.aviso : C.tinta3;
    D.ponto(`tb/dot${i}`, C_ESTADO, y + 6, cor, 5);
    D.lbl(`tb/estado${i}`, estado, C_ESTADO + 14, y + 3, { size: 9, cor: cor });
    D.dir(`tb/passo${i}`, `${passo} →`, DIREITA, y + 2, 12, C.acento, 300);
    D.H(`tb/sep${i}`, M, y + 44);
  });

  // ── resumo por motivo ────────────────────────────────────────────────────
  D.H("regra-base", M, 884);
  const MOTIVOS = [
    ["SEM NOTA", "N", "fonte sem nota publicada"],
    ["DIVERGENTE", "N", "fontes discordam acima do limite"],
    ["SEM PÔSTER", "N", "asset faltando"],
    ["COLETA FALHOU", "N", "última coleta sem resposta"],
  ];
  const MW = CONTEUDO / 4; // 300
  MOTIVOS.forEach(([rot, valor, help], i) => {
    const x = M + i * MW + (i ? 24 : 0);
    if (i > 0) D.R(`mot/div${i}`, x - 12, 908, 1, 72, C.regra1);
    D.lbl(`mot/rot${i}`, rot, x, 908, { size: 9 });
    D.T(`mot/val${i}`, valor, x, 928, 26, C.tinta1, { fonte: MONO, peso: 500 });
    D.lbl(`mot/help${i}`, help, x, 966, { size: 8 });
  });

  D.rodape(
    "admin-fila",
    A,
    "Cada linha termina em um verbo: conferir, resolver, subir, reprocessar, publicar — a fila é uma lista de decisões, não de títulos.",
    "CONCEITO V2 · ADMIN · 02/04",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — quadro 6: catálogo (tabela densa + rail + detalhe lateral)
// ════════════════════════════════════════════════════════════════════════════
function quadroAdminCatalogo(D) {
  const A = 1120;
  D.escopo("admin-catalogo");
  D.pagina("Admin — Catálogo (v2)", A);
  chromeAdmin(D, 2);

  D.lbl("kicker", "OPERAÇÃO / CATÁLOGO", M, 92);
  D.h2("h1", "Catálogo", M, 116);
  D.T("h1-total", "(N)", M + 156, 124, 22, C.tinta3, { fonte: MONO, peso: 500 });
  D.lbl("sub", "N TÍTULOS · N PUBLICADOS · N RASCUNHOS", M, 164, { size: 9 });

  D.botao("acoes/importar", 1040, 110, 132, 36, "IMPORTAR", "contorno");
  D.botao("acoes/novo", 1188, 110, 132, 36, "NOVO TÍTULO");

  D.H("regra-topo", M, 196);

  // ── busca + ordenação ────────────────────────────────────────────────────
  D.T("busca/ph", "buscar por título…", M, 216, 14, C.tinta3);
  D.H("busca/regra", M, 242, 400, C.regra2);
  D.lbl("busca/n", "N RESULTADOS · NOTAS DE EXEMPLO", 452, 221, { size: 9 });
  D.lblDir("busca/ordem", "ORDENAR: ATUALIZADO ↓", DIREITA, 221, { size: 9, W: 300 });

  // ── rail de filtros (2 colunas) ──────────────────────────────────────────
  const RX = M;
  const RW = GW(2); // 180
  const RR = RX + RW; // 300
  D.lbl("rail/rot", "FILTROS", RX, 272);
  D.lblDir("rail/limpar", "LIMPAR", RR, 272, { size: 8, W: 80, cor: C.acento });

  D.lbl("rail/tipo", "TIPO", RX, 308);
  const TIPOS = ["Filmes", "Séries", "Games", "Livros", "Quadrinhos", "Mangás"];
  TIPOS.forEach((tipo, i) => {
    const y = 330 + i * 28;
    D.caixa(`rail/tb${i}`, RX, y + 4, 10);
    D.T(`rail/tt${i}`, tipo, RX + 20, y, 12, C.tinta2);
    D.num(`rail/tn${i}`, "N", RR, y, { tam: 10, W: 40, cor: C.tinta3 });
  });

  D.lbl("rail/faixa", "FAIXA", RX, 508);
  FAIXAS.forEach((f, i) => {
    const y = 530 + i * 28;
    D.R(`rail/fc${i}`, RX, y + 5, 10, 10, f.cor);
    D.T(`rail/fl${i}`, f.nome, RX + 20, y, 12, C.tinta2);
    D.num(`rail/fn${i}`, "N", RR, y, { tam: 10, W: 40, cor: C.tinta3 });
  });

  D.lbl("rail/status", "STATUS", RX, 710);
  ["Publicado", "Rascunho", "Arquivado"].forEach((st, i) => {
    const y = 732 + i * 28;
    D.caixa(`rail/sb${i}`, RX, y + 4, 10);
    D.T(`rail/st${i}`, st, RX + 20, y, 12, C.tinta2);
    D.num(`rail/sn${i}`, "N", RR, y, { tam: 10, W: 40, cor: C.tinta3 });
  });

  // ── tabela densa (col 2 → 8) ─────────────────────────────────────────────
  const TX = GX(2); // 324
  const TW = GW(7); // 690
  const TR = TX + TW; // 1014
  const COL_TIPO = 552;
  const COL_NOTA = 700;
  const COL_FONTES = 786;
  const COL_STATUS = 806;

  D.lbl("tb/th1", "TÍTULO", TX, 272);
  D.lbl("tb/th2", "TIPO", COL_TIPO, 272);
  D.lblDir("tb/th3", "NOTA", COL_NOTA, 272, { size: 9, W: 68 });
  D.lblDir("tb/th4", "FONTES", COL_FONTES, 272, { size: 9, W: 60 });
  D.lbl("tb/th5", "STATUS", COL_STATUS, 272);
  D.lblDir("tb/th6", "ATUALIZADO", TR, 272, { size: 9, W: 140 });
  D.H("tb/linha", TX, 292, TW);

  const LINHAS = [
    ["Piranesi", "LIVRO · 2020", "8,7", 1, "Publicado", "há N d"],
    ["Ruptura", "SÉRIE · 2022", "9,1", 0, "Publicado", "há N d"],
    ["Hades", "GAME · 2020", "7,4", 2, "Rascunho", "há N d"],
    ["Ainda Estou Aqui", "FILME · 2024", "8,4", 1, "Publicado", "há N d"],
    ["O Conto da Aia", "SÉRIE · 2017", "6,8", 3, "Publicado", "há N d"],
    ["A Vegetariana", "LIVRO · 2007", "—", -1, "Rascunho", "há N d"],
    ["Disco Elysium", "GAME · 2019", "8,2", 1, "Publicado", "há N d"],
    ["Frieren", "MANGÁ · 2020", "—", -1, "Rascunho", "há N d"],
    ["O Problema dos Três Corpos", "SÉRIE · 2024", "8,9", 1, "Publicado", "há N d"],
    ["Cem Anos de Solidão", "LIVRO · 1967", "7,1", 2, "Publicado", "há N d"],
    ["Berserk", "MANGÁ · 1989", "9,3", 0, "Publicado", "há N d"],
    ["Vingadores: Ultimato", "FILME · 2019", "7,8", 2, "Publicado", "há N d"],
  ];
  const SELECIONADA = 3;
  LINHAS.forEach(([titulo, meta, nota, faixa, status, atz], i) => {
    const y = 300 + i * 56;
    if (i === SELECIONADA) {
      D.R(`tb/sel${i}`, TX - 12, y - 10, TW + 24, 52, C.mesa1);
      D.R(`tb/sel-tick${i}`, TX - 12, y - 10, 2, 52, C.acento);
    }
    D.T(`tb/t${i}`, titulo, TX, y, 13, C.tinta1);
    D.lbl(`tb/meta${i}`, meta, TX, y + 21, { size: 8 });
    D.lbl(`tb/tipo${i}`, meta.split(" · ")[0], COL_TIPO, y + 3, { size: 8 });
    if (faixa >= 0) {
      D.R(`tb/tick${i}`, COL_NOTA - 64, y + 3, 3, 12, D.corFaixa(faixa));
      D.dir(`tb/nota${i}`, nota, COL_NOTA, y, 12, D.corFaixa(faixa), 56, {
        fonte: MONO,
        peso: 500,
      });
    } else {
      D.dir(`tb/nota${i}`, nota, COL_NOTA, y, 12, C.tinta3, 56, { fonte: MONO });
    }
    D.num(`tb/fontes${i}`, "N", COL_FONTES, y, { tam: 11, W: 40, cor: C.tinta2 });
    D.lbl(`tb/status${i}`, status.toUpperCase(), COL_STATUS, y + 2, {
      size: 8,
      cor: status === "Publicado" ? C.tinta2 : C.aviso,
    });
    D.lblDir(`tb/atz${i}`, atz.toUpperCase(), TR, y + 2, { size: 8, W: 120 });
    D.H(`tb/sep${i}`, TX, y + 42, TW);
  });
  D.lbl("tb/rodape", "N DE N TÍTULOS", TX, 976, { size: 9 });
  D.lblDir("tb/pag", "← PÁGINA N DE N →", TR, 976, { size: 9, W: 220 });

  // ── detalhe lateral (col 9 → 11) ─────────────────────────────────────────
  const DX = GX(9); // 1038
  const DW = DIREITA - DX; // 282
  D.R("det/painel", DX, 272, DW, 708, C.mesa2);
  D.lbl("det/rot", "DETALHE · EXEMPLO", DX + 20, 288, { size: 8 });
  D.T("det/titulo", "Ainda Estou Aqui", DX + 20, 312, 22, C.tinta1, { fonte: HEAD, peso: 600 });
  D.set("det/titulo", { lineHeight: 27 });
  D.lbl("det/meta", "FILME · 2024", DX + 20, 350, { size: 8 });

  D.T("det/nota", "8,4", DX + 20, 376, 38, C.faixa8, { fonte: MONO, peso: 500 });
  D.T("det/de", "/10", DX + 86, 394, 12, C.tinta3);
  D.lbl("det/faixa", "MUITO BOM", DX + 20, 424, { size: 9, cor: C.faixa8 });

  D.H("det/sep1", DX + 20, 452, DW - 40);
  D.lbl("det/dec", "DECOMPOSIÇÃO DA RÉGUA", DX + 20, 468, { size: 8 });
  const DEC = [
    ["CRÍTICA", 8.6],
    ["PÚBLICO", 8.2],
    ["CONSENSO", 8.4],
  ];
  DEC.forEach(([rot, valor], i) => {
    const y = 492 + i * 42;
    D.lbl(`det/dr${i}`, rot, DX + 20, y, { size: 8 });
    D.R(`det/dtrilha${i}`, DX + 110, y + 5, 92, 1, C.regra2);
    D.R(`det/dbarra${i}`, DX + 110, y + 3, Math.round(92 * (valor / 10)), 4, C.faixa8);
    D.num(`det/dv${i}`, String(valor).replace(".", ","), DX + DW - 20, y - 2, {
      tam: 11,
      W: 40,
      cor: C.tinta2,
    });
  });

  D.H("det/sep2", DX + 20, 624, DW - 40);
  D.lbl("det/fontes", "FONTES", DX + 20, 640, { size: 8 });
  const FONTES = [
    ["TMDB", "8,5"],
    ["IMDb", "8,2"],
    ["Metacritic", "8,6"],
  ];
  FONTES.forEach(([fonte, nota], i) => {
    const y = 664 + i * 40;
    D.T(`det/ft${i}`, fonte, DX + 20, y, 12, C.tinta1);
    D.num(`det/fn${i}`, nota, DX + DW - 20, y, { tam: 11, W: 44, cor: C.tinta2 });
    D.lbl(`det/fd${i}`, "ATUALIZADO HÁ N D", DX + 20, y + 18, { size: 7 });
    D.H(`det/fs${i}`, DX + 20, y + 32, DW - 40);
  });

  D.H("det/sep3", DX + 20, 790, DW - 40);
  D.botao("det/editar", DX + 20, 806, DW - 40, 36, "EDITAR TÍTULO");
  D.botao("det/reproc", DX + 20, 852, DW - 40, 36, "REPROCESSAR COLETA", "contorno");
  D.dir("det/remover", "REMOVER TÍTULO", DX + DW - 20, 904, 10, C.erro, DW - 40);
  D.lbl("det/remover-nota", "PEDE CONFIRMAÇÃO · SOFT DELETE", DX + 20, 926, {
    size: 7,
    cor: C.tinta3,
  });

  D.rodape(
    "admin-catalogo",
    A,
    "Filtro, contagem e detalhe na mesma tela: mudar o recorte recontabiliza e o detalhe edita sem sair; o rail marca os filtros ativos.",
    "CONCEITO V2 · ADMIN · 03/04",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — quadro 7: auditoria + diagnóstico
// ════════════════════════════════════════════════════════════════════════════
function quadroAdminAuditoria(D) {
  const A = 1080;
  D.escopo("admin-auditoria");
  D.pagina("Admin — Auditoria e diagnóstico (v2)", A);
  chromeAdmin(D, 5);

  D.lbl("kicker", "OPERAÇÃO / AUDITORIA + DIAGNÓSTICO", M, 92);
  D.lblDir("kicker-dir", "EXPORTAR LOG →", DIREITA, 92, { size: 9, W: 240, cor: C.acento });
  D.h2("h1", "Auditoria e diagnóstico", M, 116);
  D.p(
    "sub",
    "Log legível, número em mono e filtro por severidade: o que aconteceu, em que ordem e por quê.",
    M,
    158,
    { tam: 13, w: 720 },
  );
  D.H("regra-topo", M, 204);

  // ── severidade ───────────────────────────────────────────────────────────
  const SEV = [
    ["TODAS", "N", C.tinta2],
    ["INFO", "N", C.tinta2],
    ["AVISO", "N", C.aviso],
    ["ERRO", "N", C.erro],
  ];
  let sx = M;
  SEV.forEach(([rot, qtd, cor], i) => {
    const w = (rot.length + 2) * 7.4;
    D.R(`sev/dot${i}`, sx, 232, 5, 5, cor);
    D.lbl(`sev/t${i}`, `${rot} ${qtd}`, sx + 13, 228, {
      size: 10,
      cor: i === 0 ? C.tinta1 : C.tinta3,
    });
    if (i === 0) D.R("sev/ativo", sx + 13, 248, w, 2, C.acento);
    sx += w + 40;
  });
  D.H("regra-sev", M, 262);
  D.lblDir("sev/amostra", "LOG DE EXEMPLO · AMOSTRA", 900, 228, { size: 8, W: 300 });

  // ── filtros ──────────────────────────────────────────────────────────────
  D.campo("f1", M, 282, 200, "PERÍODO", "de N até N");
  D.campo("f2", 352, 282, 200, "USUÁRIO", "UUID do usuário");
  D.campo("f3", 584, 282, 200, "AÇÃO", "ADMIN_USUARIO_BANIDO");
  D.campo("f4", 816, 282, 120, "ENTIDADE", "tipo de entidade");

  // ── log ──────────────────────────────────────────────────────────────────
  const TX = M;
  const TR = 900;
  D.lbl("log/th1", "QUANDO", TX, 352);
  D.lbl("log/th2", "SEVERIDADE", 240, 352);
  D.lbl("log/th3", "AÇÃO", 380, 352);
  D.lbl("log/th4", "ENTIDADE", 680, 352);
  D.lbl("log/th5", "USUÁRIO", 770, 352);
  D.lblDir("log/th6", "RESULTADO", TR, 352, { size: 9, W: 60 });
  D.H("log/linha", TX, 372, TR - TX);

  const LOG = [
    ["14:02:11", "erro", "COLETA_FALHOU", "Mídia", "3f2a…9c1e", "NEGADO"],
    ["14:01:47", "aviso", "ADMIN_FLAG_ALTERADA", "FeatureFlag", "3f2a…9c1e", "OK"],
    ["13:58:03", "info", "ADMIN_MIDIA_PUBLICADA", "Mídia", "3f2a…9c1e", "OK"],
    ["13:57:12", "info", "LOGIN_SUCESSO", "Sessão", "8b1d…4a02", "OK"],
    ["13:54:38", "erro", "ADMIN_REMOCAO_NEGADA", "Mídia", "3f2a…9c1e", "NEGADO"],
    ["13:50:09", "aviso", "RATE_LIMIT_ATINGIDO", "Sessão", "c09e…71bb", "OK"],
    ["13:46:55", "info", "ADMIN_USUARIO_BANIDO", "Usuário", "3f2a…9c1e", "OK"],
    ["13:42:20", "info", "LGPD_EXPORTACAO", "Usuário", "8b1d…4a02", "OK"],
    ["13:39:41", "erro", "COLETA_FALHOU", "Mídia", "—", "NEGADO"],
    ["13:35:07", "info", "ADMIN_MIDIA_EDITADA", "Mídia", "3f2a…9c1e", "OK"],
    ["13:31:52", "info", "FEATURE_FLAG_LIDA", "FeatureFlag", "3f2a…9c1e", "OK"],
    ["13:28:16", "aviso", "SESSAO_EXPIRADA", "Sessão", "c09e…71bb", "OK"],
    ["13:24:03", "erro", "ADMIN_IMPORTACAO_FALHOU", "Mídia", "3f2a…9c1e", "NEGADO"],
    ["13:21:40", "info", "ADMIN_CATALOGO_EXPORTADO", "Catálogo", "8b1d…4a02", "OK"],
  ];
  LOG.forEach(([hora, sev, acao, entidade, usuario, resultado], i) => {
    const y = 384 + i * 40;
    const cor = sev === "erro" ? C.erro : sev === "aviso" ? C.aviso : C.tinta3;
    D.numEsq(`log/h${i}`, hora, TX, y + 1, { tam: 10, cor: C.tinta3, peso: 400 });
    D.ponto(`log/dot${i}`, 240, y + 5, cor, 4);
    D.lbl(`log/s${i}`, sev.toUpperCase(), 252, y, { size: 8, cor });
    D.numEsq(`log/a${i}`, acao, 380, y, { tam: 9, cor: C.tinta1, peso: 500 });
    D.T(`log/e${i}`, entidade, 680, y + 1, 11, C.tinta2);
    D.numEsq(`log/u${i}`, usuario, 770, y, { tam: 9, cor: C.tinta3, peso: 400 });
    D.lblDir(`log/r${i}`, resultado, TR, y, {
      size: 8,
      W: 60,
      cor: resultado === "NEGADO" ? C.erro : C.sucesso,
    });
    D.H(`log/sep${i}`, TX, y + 32, TR - TX);
  });

  // ── diagnóstico (col 9 → 11) ─────────────────────────────────────────────
  const DX = 960;
  const DW = DIREITA - DX; // 360
  D.R("diag/col", 936, 352, 1, 584, C.regra1);
  D.lbl("diag/rot", "DIAGNÓSTICO", DX, 352);
  D.lblDir("diag/quando", "CHECADO HÁ N S", DIREITA, 352, { size: 8, W: 200 });

  const CHECKS = [
    ["API", "ok", "N ms"],
    ["Banco de dados", "ok", "N ms"],
    ["Redis (cache/filas)", "ok", "N ms"],
    ["Fila de coleta", "aviso", "N itens"],
    ["Storage de assets", "ok", "N ms"],
    ["Provedores externos", "erro", "N falhas"],
  ];
  CHECKS.forEach(([nome, estado, valor], i) => {
    const y = 384 + i * 44;
    const cor = estado === "erro" ? C.erro : estado === "aviso" ? C.aviso : C.sucesso;
    D.ponto(`diag/dot${i}`, DX, y + 5, cor, 5);
    D.T(`diag/t${i}`, nome, DX + 18, y, 12, C.tinta1);
    D.lblDir(`diag/v${i}`, valor, DIREITA, y, { size: 8, W: 130, cor: C.tinta2 });
    D.H(`diag/sep${i}`, DX, y + 32, DW);
  });

  D.lbl("flags/rot", "FEATURE FLAGS", DX, 660);
  const FLAGS = [
    ["assistant_enabled", "ON", "N%"],
    ["coleta_automatica", "ON", "N%"],
    ["beta_fechada", "OFF", "N%"],
  ];
  FLAGS.forEach(([chave, estado, rollout], i) => {
    const y = 688 + i * 38;
    D.numEsq(`flags/k${i}`, chave, DX, y, { tam: 9, cor: C.tinta2, peso: 400 });
    D.lbl(`flags/e${i}`, estado, DX + 190, y, {
      size: 8,
      cor: estado === "ON" ? C.sucesso : C.tinta3,
    });
    D.lblDir(`flags/r${i}`, rollout, DIREITA, y, { size: 8, W: 80 });
    D.H(`flags/s${i}`, DX, y + 26, DW);
  });

  D.lbl("sess/rot", "SESSÕES DE OPERAÇÃO", DX, 812);
  D.lblDir("sess/n", "N ATIVAS", DIREITA, 812, { size: 8, W: 120 });
  const SESSOES = [
    ["3f2a…9c1e", "há N min"],
    ["8b1d…4a02", "há N min"],
    ["c09e…71bb", "há N h"],
  ];
  SESSOES.forEach(([quem, tempo], i) => {
    const y = 838 + i * 30;
    D.numEsq(`sess/k${i}`, quem, DX, y, { tam: 9, cor: C.tinta2, peso: 400 });
    D.lblDir(`sess/t${i}`, tempo.toUpperCase(), DIREITA, y, { size: 8, W: 120 });
    D.H(`sess/s${i}`, DX, y + 22, DW);
  });

  D.rodape(
    "admin-auditoria",
    A,
    "Severidade filtra o log e o diagnóstico lê o mesmo relógio: causa e efeito na mesma tela, sem abrir duas abas para explicar um incidente.",
    "CONCEITO V2 · ADMIN · 04/04",
  );
}

// ════════════════════════════════════════════════════════════════════════════
// execução
// ════════════════════════════════════════════════════════════════════════════
const conta = criarDesenho();
quadroDashboard(conta);
quadroPerfil(conta);
quadroLogin(conta);
conta.removerPaginaInicial();
const nConta = salvar(conta.passos, `${FAMILIA_CONTA}/conceito-v2-conta.jsonl`);

const admin = criarDesenho();
quadroAdminOverview(admin);
quadroAdminFila(admin);
quadroAdminCatalogo(admin);
quadroAdminAuditoria(admin);
admin.removerPaginaInicial();
const nAdmin = salvar(admin.passos, `${FAMILIA_ADMIN}/conceito-v2-admin.jsonl`);

console.log(`conta: ${nConta} comandos → ${FAMILIA_CONTA}/conceito-v2-conta.jsonl`);
console.log(`admin: ${nAdmin} comandos → ${FAMILIA_ADMIN}/conceito-v2-admin.jsonl`);
