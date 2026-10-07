import { describe, it, expect } from "vitest";
import { parsearCsv, construirPlano } from "../scripts/seed-premios-csv.mjs";

/**
 * T167 — ingestão do CSV de prêmios curado: parser tolerante (comentários,
 * CRLF), match por (titulo, tipo), idempotência por chave natural e
 * relatório de ausentes/ambiguos.
 */

const CSV = `titulo;tipo;organizacao;nome;categoria;ano;venceu
Duna;LIVRO;Nebula;Nebula;Melhor Romance;1965;true
Duna;LIVRO;Hugo;Hugo;Melhor Romance;1966;True
Watchmen;COMIC;Hugo;Hugo;Outras Formas;1988;true
NÃO EXISTE;FILME;Oscar;Oscar;Melhor Filme;1999;true
`;

const CATALOGO = [
  { id: "m-duna", titulo: "Duna", tipo: "LIVRO" },
  { id: "m-watch", titulo: "Watchmen", tipo: "COMIC" },
];

describe("parsearCsv (T167)", () => {
  it("parseia linhas, venceu case-insensitive e respeita CRLF/comentários", () => {
    const linhas = parsearCsv(`# comentário\n${CSV}\n`);
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toEqual({
      titulo: "Duna",
      tipo: "LIVRO",
      organizacao: "Nebula",
      nome: "Nebula",
      categoria: "Melhor Romance",
      ano: 1965,
      venceu: true,
    });
    expect(linhas[1].venceu).toBe(true); // "True" aceito
  });

  it("cabeçalho errado lança erro claro", () => {
    expect(() => parsearCsv("a;b;c\n1;2;3")).toThrow(/cabeçalho/);
  });
});

describe("construirPlano (T167)", () => {
  it("casa por (titulo, tipo), reporta ausentes e é idempotente", () => {
    const linhas = parsearCsv(CSV);
    const p1 = construirPlano(linhas, CATALOGO, []);
    // 3 casam (Duna×2, Watchmen×1); "NÃO EXISTE" vai para ausentes.
    expect(p1.plano).toHaveLength(3);
    expect(p1.ausentes).toHaveLength(1);
    expect(p1.ausentes[0].titulo).toBe("NÃO EXISTE");
    // Segunda execução com o resultado já aplicado → plano vazio (no-op).
    const aplicadas = p1.plano.map((p) => ({
      midia_id: p.midiaId,
      organizacao: p.organizacao,
      nome: p.nome,
      categoria: p.categoria,
      ano: p.ano,
    }));
    const p2 = construirPlano(linhas, CATALOGO, aplicadas);
    expect(p2.plano).toHaveLength(0);
  });

  it("título duplicado no mesmo tipo é ambiguo e é pulado", () => {
    const linhas = parsearCsv(
      "titulo;tipo;organizacao;nome;categoria;ano;venceu\nX;FILME;Oscar;Oscar;Melhor Filme;2000;true\n",
    );
    const catalogo = [
      { id: "a", titulo: "X", tipo: "FILME" },
      { id: "b", titulo: "X", tipo: "FILME" },
    ];
    const p = construirPlano(linhas, catalogo, []);
    expect(p.plano).toHaveLength(0);
    expect(p.ambiguos).toHaveLength(1);
  });
});
