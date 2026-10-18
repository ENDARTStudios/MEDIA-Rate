import { linhasDosItens, nomeArquivoPdf, type ListaResumo } from "./list-share";

/**
 * PDF da lista — gerado NO cliente, sob demanda.
 *
 * Por que `jsPDF` em import dinâmico: baixar PDF é ação rara; carregar ~350 KB no
 * bundle inicial de quem só quer ler a lista seria trocar LCP por conveniência
 * (D-380/T405). O `await import("jspdf")` dentro do clique mantém o caminho crítico
 * intacto — o custo só existe para quem clica em "Baixar PDF".
 *
 * Por que não imprimir a página: "imprimir" entrega o layout da tela (navbar, rodapé,
 * botões) e depende do diálogo do navegador. A pessoa pediu o arquivo.
 *
 * O documento é montado por `escreverDocumento`, que recebe um `DocLike` — assim o
 * layout é testável com um dublê, sem gerar binário no teste.
 */

/** Subconjunto do jsPDF que o layout usa (permite dublê em teste). */
export interface DocLike {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFont: (fonte: string, estilo?: string) => void;
  setFontSize: (tamanho: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  text: (texto: string, x: number, y: number, opcoes?: { maxWidth?: number }) => void;
  splitTextToSize: (texto: string, largura: number) => string[];
  addPage: () => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  save: (nome: string) => void;
}

export interface RotulosPdf {
  byOwner: string;
  itemsCount: string;
  /** Rodapé institucional (marca + domínio). */
  footer: string;
  /** Rótulo do recado, quando houver descrição. */
  note?: string;
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
  let y = MARGEM + 12;

  const garantirEspaco = (necessario: number) => {
    if (y + necessario > altura - MARGEM) {
      doc.addPage();
      y = MARGEM + 12;
    }
  };

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  for (const linha of doc.splitTextToSize(lista.titulo, LARGURA_MAX)) {
    garantirEspaco(24);
    doc.text(linha, MARGEM, y);
    y += 24;
  }

  // Cabeçalho secundário: dono · quantidade
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  garantirEspaco(16);
  doc.text(`${rotulos.byOwner} · ${rotulos.itemsCount}`, MARGEM, y);
  y += 20;

  // Recado para o amigo (a descrição da lista é o convite)
  if (lista.descricao) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(60);
    for (const linha of doc.splitTextToSize(lista.descricao, LARGURA_MAX)) {
      garantirEspaco(16);
      doc.text(linha, MARGEM, y);
      y += 16;
    }
    y += 6;
  }

  // Separador
  doc.setDrawColor(200);
  garantirEspaco(12);
  doc.line(MARGEM, y, MARGEM + LARGURA_MAX, y);
  y += 18;

  // Itens
  doc.setTextColor(20);
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

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(130);
  garantirEspaco(14);
  const data = agora.toISOString().slice(0, 10);
  doc.text(`${rotulos.footer} · ${data}`, MARGEM, altura - MARGEM / 2);

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
