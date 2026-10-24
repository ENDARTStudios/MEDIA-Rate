import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import {
  linhaDoItem,
  linhasDosItens,
  montarConvite,
  nomeArquivoPdf,
  ordenarItens,
  urlDaLista,
  type ListaItemResumo,
  type ListaResumo,
} from "../src/lib/list-share";
import { escreverDocumento, type DocLike } from "../src/lib/list-pdf";

/**
 * Listas — compartilhar e PDF.
 *
 * O que se testa aqui é o que a pessoa **manda para um amigo** e o que ela **arquiva**:
 * o texto do convite e as linhas do PDF. Ambos são função pura justamente para poder
 * ser verificados sem DOM, sem jsPDF e sem browser.
 */

const LISTA: ListaResumo = {
  titulo: "Para o João começar a ler",
  descricao: "Comece por estes três — nenhum passa de 300 páginas.",
  slug: "para-o-joao",
  donoNome: "Maria",
  itens: [
    { titulo: "O Hobbit", tipo: "LIVRO", ano: 1937, score: 8.4 },
    { titulo: "Cem Anos de Solidão", tipo: "livro", ano: 1967, score: null },
    { titulo: "Sem metadados", tipo: null, ano: null, score: 7 },
  ],
};

const ROTULOS = { byOwner: "por Maria", itemsCount: "3 indicações", seeList: "Veja a lista:" };

describe("convite da lista", () => {
  it("abre com o título, segue com o recado e termina no link", () => {
    const texto = montarConvite(LISTA, "https://mediarate.app/pt-BR/listas/para-o-joao", ROTULOS);
    const linhas = texto.split("\n");
    expect(linhas[0]).toBe("Para o João começar a ler");
    expect(linhas[1]).toBe("Comece por estes três — nenhum passa de 300 páginas.");
    expect(linhas[2]).toBe("por Maria · 3 indicações");
    expect(linhas[linhas.length - 1]).toBe("https://mediarate.app/pt-BR/listas/para-o-joao");
  });

  it("sem descrição, o convite não deixa linha em branco no lugar do recado", () => {
    const texto = montarConvite({ ...LISTA, descricao: null }, "https://x/listas/a", ROTULOS);
    expect(texto).not.toMatch(/\n\n\n/);
    expect(texto.split("\n")[1]).toBe("por Maria · 3 indicações");
  });

  it("colapsa quebra de linha da descrição (mensageiro não deve receber linha solta)", () => {
    const texto = montarConvite(
      { ...LISTA, descricao: "linha 1\n\nlinha   2\tfim" },
      "https://x/listas/a",
      ROTULOS,
    );
    expect(texto).toContain("linha 1 linha 2 fim");
  });
});

describe("linhas do PDF", () => {
  it("numera e formata tipo/ano/nota", () => {
    expect(linhaDoItem(LISTA.itens[0], 0)).toBe("1. O Hobbit — LIVRO · 1937 · 8.4");
  });

  it("tolera tipo em caixa baixa e item sem nota", () => {
    expect(linhaDoItem(LISTA.itens[1], 1)).toBe("2. Cem Anos de Solidão — LIVRO · 1967");
  });

  it("não imprime 'null' nem 'undefined' quando falta metadado", () => {
    const linha = linhaDoItem(LISTA.itens[2], 2);
    expect(linha).toBe("3. Sem metadados · 7.0");
    expect(linha).not.toMatch(/null|undefined|NaN/);
  });

  it("lista vazia gera zero linhas (não gera uma linha falsa)", () => {
    expect(linhasDosItens({ ...LISTA, itens: [] })).toEqual([]);
  });
});

describe("nome do arquivo e link", () => {
  it("gera nome de arquivo estável e sem acento", () => {
    expect(nomeArquivoPdf("Para o João")).toBe("lista-para-o-joao.pdf");
    expect(nomeArquivoPdf("ação/2026 — lista!")).toBe("lista-acao-2026-lista.pdf");
  });

  it("cai num nome previsível quando o slug não tem caractere aproveitável", () => {
    expect(nomeArquivoPdf("///")).toBe("lista-sem-titulo.pdf");
  });

  it("monta o link público por locale, sem barra dupla", () => {
    expect(urlDaLista("para-o-joao", "pt-BR", "https://mediarate.app/")).toBe(
      "https://mediarate.app/pt-BR/listas/para-o-joao",
    );
    expect(urlDaLista("x", "en-US")).toBe("https://mediarate.app/en-US/listas/x");
  });
});

describe("ordenação da lista (UAT-38)", () => {
  const ITENS: ListaItemResumo[] = [
    { titulo: "Zack Snyder", tipo: "FILME", ano: 2021, score: null },
    { titulo: "A Chegada", tipo: "SERIE", ano: null, score: null },
    { titulo: "Midnight Gospel", tipo: "GAME", ano: 2019, score: null },
    { titulo: "Avenida Brasil", tipo: "COMIC", ano: 2015, score: null },
  ];

  it("padrao devolve a ordem de inserção sem mutar o original", () => {
    const ordenado = ordenarItens(ITENS, "padrao");
    expect(ordenado.map((i) => i.titulo)).toEqual([
      "Zack Snyder",
      "A Chegada",
      "Midnight Gospel",
      "Avenida Brasil",
    ]);
    expect(ITENS[0].titulo).toBe("Zack Snyder");
  });

  it("titulo ordena alfabética ignorando acento/caixa", () => {
    expect(ordenarItens(ITENS, "titulo").map((i) => i.titulo)).toEqual([
      "A Chegada",
      "Avenida Brasil",
      "Midnight Gospel",
      "Zack Snyder",
    ]);
  });

  it("ano ordena crescente e deixa sem ano no fim", () => {
    expect(ordenarItens(ITENS, "ano").map((i) => i.ano)).toEqual([2015, 2019, 2021, null]);
  });

  it("tipo agrupa alfabeticamente pelo tipo de mídia", () => {
    expect(ordenarItens(ITENS, "tipo").map((i) => i.tipo)).toEqual([
      "COMIC",
      "FILME",
      "GAME",
      "SERIE",
    ]);
  });
});

/** Dublê do jsPDF: registra chamadas e simula quebra de página. */
function docFalso(altura = 842) {
  const chamadas: string[] = [];
  const paginas = { total: 1 };
  const doc: DocLike = {
    internal: {
      pageSize: { getWidth: () => 595, getHeight: () => altura },
    },
    setFont: (fonte, estilo) => chamadas.push(`font:${fonte}:${estilo ?? ""}`),
    setFontSize: (t) => chamadas.push(`size:${t}`),
    setTextColor: (r, g, b) => chamadas.push(`color:${r},${g ?? ""},${b ?? ""}`),
    setFillColor: (r, g, b) => chamadas.push(`fill:${r},${g ?? ""},${b ?? ""}`),
    setDrawColor: (r, g, b) => chamadas.push(`draw:${r},${g ?? ""},${b ?? ""}`),
    setLineWidth: (l) => chamadas.push(`lineWidth:${l}`),
    text: (texto) => chamadas.push(`text:${texto}`),
    textWithLink: (texto, _x, _y, opcoes) => chamadas.push(`link:${texto}:${opcoes.url}`),
    splitTextToSize: (texto) => (texto.includes("\n") ? texto.split("\n") : [texto]),
    addPage: () => {
      paginas.total += 1;
      chamadas.push("addPage");
    },
    line: () => chamadas.push("line"),
    rect: (_x, _y, _w, _h, estilo) => chamadas.push(`rect:${estilo ?? ""}`),
    circle: (_x, _y, _r, estilo) => chamadas.push(`circle:${estilo ?? ""}`),
    save: (nome) => chamadas.push(`save:${nome}`),
  };
  return { doc, chamadas, paginas };
}

const ROTULOS_PDF = {
  byOwner: "por Maria",
  itemsCount: "3 indicações",
  tagline: "Listas colaborativas de filmes, séries e mais",
  site: "mediarate.app",
  verEm: "Veja a lista:",
  url: "https://mediarate.app/pt-BR/listas/para-o-joao",
};

describe("documento do PDF", () => {
  it("escreve título, recado, contagem e os itens", () => {
    const { doc, chamadas } = docFalso();
    escreverDocumento(doc, LISTA, ROTULOS_PDF);
    const texto = chamadas.join("|");
    expect(texto).toContain("text:Para o João começar a ler");
    expect(texto).toContain("text:Comece por estes três");
    expect(texto).toContain("3 indicações");
    expect(texto).toContain("text:1. O Hobbit");
    expect(texto).toContain("text:3. Sem metadados");
  });

  it("sai timbrado: faixa de marca, wordmark e links de volta (UAT-39)", () => {
    const { doc, chamadas } = docFalso();
    escreverDocumento(doc, LISTA, ROTULOS_PDF);
    const texto = chamadas.join("|");
    // Faixa de marca no topo (retângulo preenchido) + wordmark + tagline.
    expect(texto).toContain("rect:F");
    expect(texto).toContain("text:MEDIA");
    expect(texto).toContain(`text:${ROTULOS_PDF.tagline}`);
    // Rodapé: site e link da lista, ambos linkados.
    expect(texto).toContain(`link:${ROTULOS_PDF.site}:https://${ROTULOS_PDF.site}`);
    expect(texto).toContain(`link:${ROTULOS_PDF.url}:${ROTULOS_PDF.url}`);
    expect(texto).toContain(`text:${ROTULOS_PDF.verEm}`);
  });

  it("preserva as quebras de linha da descrição (UAT-38)", () => {
    const { doc, chamadas } = docFalso();
    escreverDocumento(doc, { ...LISTA, descricao: "linha 1\nlinha 2" }, ROTULOS_PDF);
    const texto = chamadas.join("|");
    expect(texto).toContain("text:linha 1");
    expect(texto).toContain("text:linha 2");
  });

  it("quebra página quando a lista passa de uma página", () => {
    const muitos: ListaResumo = {
      ...LISTA,
      itens: Array.from({ length: 120 }, (_, i) => ({
        titulo: `Título ${i + 1}`,
        tipo: "FILME",
        ano: 2000 + (i % 20),
        score: 7,
      })),
    };
    const { doc, paginas } = docFalso(842);
    escreverDocumento(doc, muitos, { ...ROTULOS_PDF, itemsCount: "120 indicações" });
    expect(paginas.total).toBeGreaterThan(1);
  });

  it("lista vazia ainda produz documento válido (título + zero itens)", () => {
    const { doc, chamadas } = docFalso();
    expect(() =>
      escreverDocumento(
        doc,
        { ...LISTA, itens: [], descricao: null },
        {
          ...ROTULOS_PDF,
          itemsCount: "0 indicações",
        },
      ),
    ).not.toThrow();
    expect(chamadas.join("|")).toContain("0 indicações");
  });
});

describe("documento real (jsPDF, não dublê)", () => {
  function bytes(doc: unknown): Buffer {
    return Buffer.from((doc as { output: (t: string) => ArrayBuffer }).output("arraybuffer"));
  }

  it("produz um PDF válido com o conteúdo da lista", () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" }) as unknown as DocLike;
    escreverDocumento(doc, LISTA, ROTULOS_PDF);
    const buf = bytes(doc);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it("lista maior produz arquivo maior (o conteúdo entra, não é template vazio)", () => {
    const pequena = new jsPDF({ unit: "pt", format: "a4" }) as unknown as DocLike;
    escreverDocumento(pequena, LISTA, ROTULOS_PDF);
    const grande: ListaResumo = {
      ...LISTA,
      itens: Array.from({ length: 60 }, (_, i) => ({
        titulo: `Título ${i + 1}`,
        tipo: "FILME",
        ano: 2000 + (i % 20),
        score: 7.5,
      })),
    };
    const docGrande = new jsPDF({ unit: "pt", format: "a4" }) as unknown as DocLike;
    escreverDocumento(docGrande, grande, { ...ROTULOS_PDF, itemsCount: "60 indicações" });
    expect(bytes(docGrande).byteLength).toBeGreaterThan(bytes(pequena).byteLength);
  });
});
