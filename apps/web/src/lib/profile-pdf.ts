import { cabecalhoDeMarca, MARCA_PDF, rodapeComLinks, type DocLike } from "./pdf-brand";

/**
 * Relatório de perfil — PDF gerado no cliente com o mesmo timbrado da lista
 * (`pdf-brand.ts`): UAT-42 pediu "todas as estatísticas, KPIs e métricas".
 *
 * Este módulo só desenha; o componente (DashboardOverview) monta os dados com
 * rótulos do i18n. Assim o layout é testável com dublê e a copy fica na camada
 * de UI — o mesmo contrato de `list-pdf.ts`.
 */

export interface DadosPerfilPdf {
  titulos: { principal: string; subtitulo: string };
  kpis: { label: string; value: string }[];
  /** UAT-42: as "definições que se completam". */
  tracos: { label: string; value: string | null }[];
  tipos: { label: string; total: number }[];
  radar: { label: string; pct: number }[];
  histograma: { faixa: string; total: number }[];
  /** Série mensal (Premium); null omite a seção. */
  evolucao: { mes: string; total: number }[] | null;
}

export interface RotulosPerfilPdf {
  tagline: string;
  site: string;
  verEm: string;
  url: string;
  /** Rótulos de seção (i18n). */
  secKpis: string;
  secTracos: string;
  secTipos: string;
  secRadar: string;
  secHistograma: string;
  secEvolucao: string;
}

const MARGEM = 48;
const LARGURA_MAX = 595 - MARGEM * 2;

export function escreverPerfilDocumento(
  doc: DocLike,
  dados: DadosPerfilPdf,
  rotulos: RotulosPerfilPdf,
  agora: Date = new Date(),
): number {
  const altura = doc.internal.pageSize.getHeight();
  let y = cabecalhoDeMarca(doc, rotulos.tagline, MARGEM);

  const garantirEspaco = (necessario: number) => {
    if (y + necessario > altura - 76) {
      doc.addPage();
      y = MARGEM + 12;
    }
  };

  const tituloSecao = (texto: string) => {
    garantirEspaco(34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...MARCA_PDF.tinta);
    doc.text(texto, MARGEM, y);
    y += 20;
  };

  // Título do relatório + data.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...MARCA_PDF.tinta);
  for (const linha of doc.splitTextToSize(dados.titulos.principal, LARGURA_MAX)) {
    garantirEspaco(26);
    doc.text(linha, MARGEM, y);
    y += 26;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MARCA_PDF.tintaSuave);
  garantirEspaco(14);
  doc.text(`${dados.titulos.subtitulo} · ${agora.toISOString().slice(0, 10)}`, MARGEM, y);
  y += 22;

  // KPIs — grade de caixas 3 por linha.
  tituloSecao(rotulos.secKpis);
  const larguraCaixa = (LARGURA_MAX - 2 * 12) / 3;
  for (let i = 0; i < dados.kpis.length; i += 3) {
    const linhaKpi = dados.kpis.slice(i, i + 3);
    garantirEspaco(62);
    for (let j = 0; j < linhaKpi.length; j++) {
      const x = MARGEM + j * (larguraCaixa + 12);
      doc.setDrawColor(...MARCA_PDF.linha);
      doc.setLineWidth(0.75);
      doc.rect(x, y, larguraCaixa, 50, "S");
      doc.setFontSize(8.5);
      doc.setTextColor(...MARCA_PDF.tintaSuave);
      doc.text(linhaKpi[j].label, x + 10, y + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...MARCA_PDF.tinta);
      doc.text(linhaKpi[j].value, x + 10, y + 40);
      doc.setFont("helvetica", "normal");
    }
    y += 62;
  }

  // Traços (UAT-42) — "Explorador — 4/6" uma linha por definição.
  tituloSecao(rotulos.secTracos);
  doc.setFontSize(10.5);
  for (const traco of dados.tracos) {
    garantirEspaco(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MARCA_PDF.tinta);
    doc.text(traco.label, MARGEM, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MARCA_PDF.tintaSuave);
    doc.text(traco.value ?? "—", MARGEM + 200, y);
    y += 16;
  }
  y += 8;

  // Distribuição por tipo — barras horizontais.
  const maxTipo = Math.max(1, ...dados.tipos.map((t) => t.total));
  tituloSecao(rotulos.secTipos);
  doc.setFontSize(10);
  for (const tipo of dados.tipos) {
    garantirEspaco(20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MARCA_PDF.tinta);
    doc.text(tipo.label, MARGEM, y);
    const larguraBarra = Math.round((tipo.total / maxTipo) * (LARGURA_MAX - 170));
    doc.setFillColor(...MARCA_PDF.indigo);
    if (larguraBarra > 0) {
      doc.rect(MARGEM + 110, y - 8, larguraBarra, 10, "F");
    }
    doc.setTextColor(...MARCA_PDF.tintaSuave);
    doc.text(String(tipo.total), MARGEM + 118 + larguraBarra, y);
    y += 20;
  }
  y += 8;

  // Radar — eixos com percentual.
  tituloSecao(rotulos.secRadar);
  doc.setFontSize(10.5);
  for (const eixo of dados.radar) {
    garantirEspaco(16);
    doc.setTextColor(...MARCA_PDF.tinta);
    doc.text(`${eixo.label}`, MARGEM, y);
    doc.setTextColor(...MARCA_PDF.indigo);
    doc.text(`${eixo.pct}%`, MARGEM + 220, y);
    y += 16;
  }
  y += 8;

  // Histograma de notas — 5 faixas com barras.
  tituloSecao(rotulos.secHistograma);
  const maxHist = Math.max(1, ...dados.histograma.map((h) => h.total));
  doc.setFontSize(10);
  for (const faixa of dados.histograma) {
    garantirEspaco(20);
    doc.setTextColor(...MARCA_PDF.tinta);
    doc.text(faixa.faixa, MARGEM, y);
    const larguraBarra = Math.round((faixa.total / maxHist) * (LARGURA_MAX - 170));
    doc.setFillColor(...MARCA_PDF.indigo);
    if (larguraBarra > 0) {
      doc.rect(MARGEM + 110, y - 8, larguraBarra, 10, "F");
    }
    doc.setTextColor(...MARCA_PDF.tintaSuave);
    doc.text(String(faixa.total), MARGEM + 118 + larguraBarra, y);
    y += 20;
  }
  y += 8;

  // Evolução 12 meses (Premium) — barras verticais.
  if (dados.evolucao && dados.evolucao.length > 0) {
    tituloSecao(rotulos.secEvolucao);
    const maxEvo = Math.max(1, ...dados.evolucao.map((p) => p.total));
    const larguraBarra = (LARGURA_MAX - 11 * 8) / 12;
    const alturaGrafico = 90;
    const yBase = y + alturaGrafico;
    for (let i = 0; i < dados.evolucao.length; i++) {
      const ponto = dados.evolucao[i];
      const h = Math.round((ponto.total / maxEvo) * alturaGrafico);
      const x = MARGEM + i * (larguraBarra + 8);
      doc.setFillColor(...MARCA_PDF.indigo);
      if (h > 0) doc.rect(x, yBase - h, larguraBarra, h, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(...MARCA_PDF.tintaSuave);
      doc.text(ponto.mes.substring(2), x, yBase + 12);
    }
    y = yBase + 26;
  }

  rodapeComLinks(doc, { site: rotulos.site, verEm: rotulos.verEm, url: rotulos.url }, MARGEM);
  return y;
}

/** Gera e baixa o relatório (jsPDF em import dinâmico — mesma política da lista). */
export async function baixarPerfilPdf(
  dados: DadosPerfilPdf,
  rotulos: RotulosPerfilPdf,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as unknown as DocLike;
  escreverPerfilDocumento(doc, dados, rotulos);
  doc.save("media-rate-perfil.pdf");
}
