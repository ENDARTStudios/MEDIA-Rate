import { cabecalhoDeMarca, MARCA_PDF, rodapeComLinks, type DocLike } from "./pdf-brand";
import { linhasDosItens, nomeArquivoPdf, type ListaResumo } from "./list-share";

export type { DocLike } from "./pdf-brand";

/**
 * PDF da lista — gerado NO cliente, sob demanda.
 *
 * Por que `jsPDF` em import dinâmico: baixar PDF é ação rara; carregar ~350 KB no
 * bundle inicial de quem só quer ler a lista seria trocar LCP por conveniência
 * (D-380/T405). O `await import("jspdf")` dentro do clique mantém o caminho crítico
 * intacto — o custo só existe para quem clica em "Baixar PDF".
 *
 * Conceito visual (UAT-39): a lista sai timbrada — faixa de marca no topo
 * (`cabecalhoDeMarca`), corpo com título/recado/itens e rodapé com o site e o
 * link público da lista, clicáveis (`rodapeComLinks`). O timbrado vive em
 * `pdf-brand.ts` e é o mesmo do relatório de perfil.
 *
 * O documento é montado por `escreverDocumento`, que recebe um `DocLike` — assim o
 * layout é testável com um dublê, sem gerar binário no teste.
 */

export interface RotulosPdf {
  byOwner: string;
  itemsCount: string;
  /** Rótulo do recado, quando houver descrição. */
  note?: string;
  /** Tagline da marca na faixa (ex.: "Listas colaborativas de filmes e séries"). */
  tagline: string;
  /** Domínio de marca exibido/linkado no rodapé. */
  site: string;
  /** Rótulo antes do link da lista no rodapé (ex.: "Veja a lista:"). */
  verEm: string;
  /** URL pública da lista (link do rodapé). */
  url: string;
}

const MARGEM = 48;
const LARGURA_MAX = 595 - MARGEM * 2; // A4 em pt

/** Escreve a lista no documento. Devolve a última coordenada Y usada. */
export function escreverDocumento(
  doc: DocLike,
  lista: ListaResumo,
  rotulos: RotulosPdf,
  agora: Date = new Date(),
): number {
  const altura = doc.internal.pageSize.getHeight();
  let y = cabecalhoDeMarca(doc, rotulos.tagline, MARGEM);

  const garantirEspaco = (necessario: number) => {
    if (y + necessario > altura - 72) {
      doc.addPage();
      y = MARGEM + 12;
    }
  };

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...MARCA_PDF.tinta);
  for (const linha of doc.splitTextToSize(lista.titulo, LARGURA_MAX)) {
    garantirEspaco(28);
    doc.text(linha, MARGEM, y);
    y += 28;
  }

  // Cabeçalho secundário: dono · quantidade · data de geração
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MARCA_PDF.tintaSuave);
  garantirEspaco(16);
  const data = agora.toISOString().slice(0, 10);
  doc.text(`${rotulos.byOwner} · ${rotulos.itemsCount} · ${data}`, MARGEM, y);
  y += 20;

  // Recado para o amigo (a descrição da lista é o convite). As quebras de linha
  // que o usuário escreveu fazem parte do recado — cada bloco é quebrado por
  // largura, mas o \n original é preservado (UAT-38).
  if (lista.descricao) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    for (const bloco of lista.descricao.split("\n")) {
      for (const linha of doc.splitTextToSize(bloco, LARGURA_MAX)) {
        garantirEspaco(16);
        doc.text(linha, MARGEM, y);
        y += 16;
      }
    }
    y += 6;
  }

  // Separador
  doc.setDrawColor(200);
  garantirEspaco(12);
  doc.line(MARGEM, y, MARGEM + LARGURA_MAX, y);
  y += 20;

  // Itens
  doc.setTextColor(...MARCA_PDF.tinta);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const linha of linhasDosItens(lista)) {
    for (const pedaco of doc.splitTextToSize(linha, LARGURA_MAX)) {
      garantirEspaco(16);
      doc.text(pedaco, MARGEM, y);
      y += 16;
    }
    y += 4;
  }

  rodapeComLinks(doc, { site: rotulos.site, verEm: rotulos.verEm, url: rotulos.url }, MARGEM);

  return y;
}

/**
 * Gera e baixa o PDF. Erros de carregamento da lib sobem para a camada de UI
 * (que mostra mensagem honesta em vez de um botão que não faz nada).
 */
export async function baixarListaPdf(lista: ListaResumo, rotulos: RotulosPdf): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as unknown as DocLike;
  escreverDocumento(doc, lista, rotulos);
  doc.save(nomeArquivoPdf(lista.slug));
}
