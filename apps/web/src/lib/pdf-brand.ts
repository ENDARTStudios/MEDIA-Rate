import { colors } from "./design-tokens";

/**
 * Identidade de marca dos PDFs gerados no cliente (lista compartilhada,
 * relatório de perfil).
 *
 * O PDF é a única peça do produto que sai da tela: sem marca e sem caminho de
 * volta ele é texto solto num arquivo. Este módulo é o "papel timbrado" —
 * cabeçalho com o símbolo + wordmark, rodapé com o site e o link do conteúdo —
 * para quem gera PDF só se preocupar com o corpo.
 *
 * O símbolo é redesenhado com primitivas vetoriais do jsPDF (mesmo losango +
 * anel + ponto do `<Logo/>`): nítido em qualquer escala e sem asset binário
 * versionado. As cores vêm dos tokens (`design-tokens.ts`), nunca literais.
 */

/** Subconjunto do jsPDF usado pelo timbrado (permite dublê em teste). */
export interface DocLike {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFont: (fonte: string, estilo?: string) => void;
  setFontSize: (tamanho: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (largura: number) => void;
  text: (texto: string, x: number, y: number, opcoes?: { maxWidth?: number }) => void;
  textWithLink: (texto: string, x: number, y: number, opcoes: { url: string }) => void;
  splitTextToSize: (texto: string, largura: number) => string[];
  addPage: () => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, largura: number, altura: number, estilo?: "F" | "S" | "FD") => void;
  circle: (x: number, y: number, raio: number, estilo?: "F" | "S" | "FD") => void;
  save: (nome: string) => void;
}

/** "#818CF8" → [129, 140, 248] — os hex vivem nos tokens, aqui viram RGB. */
function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export const MARCA_PDF = {
  /** Fundo da faixa de marca (surface.card — a "tinta" escura do produto). */
  faixa: rgb(colors.surface.card),
  indigo: rgb(colors.accent.indigo),
  indigoClaro: rgb(colors.accent.indigoHover),
  textoClaro: rgb(colors.text.primary),
  textoClaroSuave: rgb(colors.text.secondary),
  /** Tinta sobre papel branco. */
  tinta: rgb(colors.ink),
  tintaSuave: rgb(colors.text.muted),
  linha: rgb(colors.surface.border),
} as const;

/** Altura da faixa de marca no topo da primeira página (pt). */
export const ALTURA_FAIXA = 96;

/**
 * Símbolo da marca (losango + anel + ponto, viewBox 40×40 do `<Logo/>`),
 * redesenhado em torno de (cx, cy). `tamanho` é a diagonal do losango.
 */
export function desenharSimboloMarca(doc: DocLike, cx: number, cy: number, tamanho: number): void {
  const d = tamanho / 2;
  doc.setDrawColor(...MARCA_PDF.indigo);
  doc.setLineWidth(tamanho * 0.05);
  // Losango: 4 arestas (M20 3 L37 20 L20 37 L3 20 Z).
  doc.line(cx, cy - d, cx + d, cy);
  doc.line(cx + d, cy, cx, cy + d);
  doc.line(cx, cy + d, cx - d, cy);
  doc.line(cx - d, cy, cx, cy - d);
  // Anel interno (r 6.5/40) + ponto central (r 1.5/40).
  doc.setLineWidth(tamanho * 0.0375);
  doc.circle(cx, cy, tamanho * 0.1625, "S");
  doc.setFillColor(...MARCA_PDF.indigo);
  doc.circle(cx, cy, tamanho * 0.0375, "F");
  doc.setLineWidth(1);
}

/**
 * Faixa de marca no topo da página: fundo escuro, símbolo, wordmark e tagline.
 * Devolve o Y onde o corpo do documento começa.
 */
export function cabecalhoDeMarca(doc: DocLike, tagline: string, margem = 48): number {
  const largura = doc.internal.pageSize.getWidth();
  doc.setFillColor(...MARCA_PDF.faixa);
  doc.rect(0, 0, largura, ALTURA_FAIXA, "F");
  desenharSimboloMarca(doc, margem + 18, 46, 34);
  doc.setTextColor(...MARCA_PDF.textoClaro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("MEDIA", margem + 46, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MARCA_PDF.indigoClaro);
  doc.text("Rate", margem + 46, 57);
  doc.setFontSize(9);
  doc.setTextColor(...MARCA_PDF.textoClaroSuave);
  doc.text(tagline, margem + 46, 74);
  return ALTURA_FAIXA + 34;
}

/** Rótulos do rodapé — vêm do i18n, o módulo não conhece idioma. */
export interface RodapeMarca {
  /** Domínio exibido e linkado (ex.: "mediarate.app"). */
  site: string;
  /** Rótulo antes do link do conteúdo (ex.: "Veja a lista:"). */
  verEm: string;
  /** URL pública do conteúdo (link clicável). */
  url: string;
}

/**
 * Rodapé de marca na página corrente: linha, símbolo pequeno, wordmark, site e
 * o caminho de volta ao conteúdo — tudo clicável onde é URL.
 */
export function rodapeComLinks(doc: DocLike, dados: RodapeMarca, margem = 48): void {
  const altura = doc.internal.pageSize.getHeight();
  const largura = doc.internal.pageSize.getWidth();
  const yBase = altura - 58;

  doc.setDrawColor(...MARCA_PDF.linha);
  doc.setLineWidth(0.75);
  doc.line(margem, yBase, largura - margem, yBase);

  desenharSimboloMarca(doc, margem + 7, yBase + 18, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MARCA_PDF.tinta);
  doc.text("MEDIA Rate", margem + 20, yBase + 21);
  doc.setTextColor(...MARCA_PDF.indigo);
  doc.textWithLink("·", margem + 78, yBase + 21, { url: `https://${dados.site}` });
  doc.setFont("helvetica", "normal");
  doc.textWithLink(dados.site, margem + 88, yBase + 21, { url: `https://${dados.site}` });

  doc.setFontSize(8.5);
  doc.setTextColor(...MARCA_PDF.tintaSuave);
  doc.text(dados.verEm, margem + 20, yBase + 35);
  doc.setTextColor(...MARCA_PDF.indigo);
  doc.textWithLink(dados.url, margem + 20 + 62, yBase + 35, { url: dados.url });
}
