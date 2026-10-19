import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * /apoie — apoiadores, parceiros e patrocinadores.
 *
 * Guarda três coisas que se perdem fácil numa página comercial e que este projeto
 * trata como contrato:
 *
 *   1. **Os três públicos existem de verdade** (seções com âncora própria e CTA
 *      próprio), não são três parágrafos de um único "fale conosco";
 *   2. **A nota não está à venda** — a regra aparece escrita e nenhum patrocínio é
 *      apresentado como caminho para mudar ranking ou score;
 *   3. **Nenhuma prova inventada**: sem logo, depoimento, contagem de apoiadores ou
 *      percentual digitado (D-583.4) — números de marketing vêm de fonte, não de copy.
 */

const RAIZ = path.resolve(__dirname, "..");
const PAGINA = fs.readFileSync(path.join(RAIZ, "src/app/[locale]/apoie/page.tsx"), "utf8");
const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

const mensagens = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(RAIZ, `src/messages/${locale}.json`), "utf8")) as Record<
    string,
    Record<string, string>
  >;

describe("/apoie — apoiadores, parceiros e patrocinadores", () => {
  it("tem as três seções, cada uma com âncora", () => {
    for (const id of ["apoiador", "parceiro", "patrocinador"]) {
      expect(PAGINA, `seção ausente: ${id}`).toContain(`id="${id}"`);
    }
  });

  it("cada público tem CTA de contato com assunto próprio (mailto, não formulário)", () => {
    for (const chave of ["contactApoiador", "contactParceiro", "contactPatrocinador"]) {
      expect(PAGINA, `CTA de contato ausente: ${chave}`).toContain(`t("${chave}")`);
    }
    expect(PAGINA.match(/mailto\(CONTATOS\./g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("cada público escreve para o alias certo, e o alias é literal (sem typo)", () => {
    // O endereço é o que faz o programa funcionar: um alias trocado manda proposta de
    // patrocínio para a fila de parceria e some. Por isso o teste cobra o par
    // público → endereço, não só a existência de um mailto.
    expect(PAGINA).toContain('parceiro: "endart.studios+parcerias@gmail.com"');
    expect(PAGINA).toContain('patrocinador: "endart.studios+patrocinio@gmail.com"');
    expect(PAGINA).toContain('apoiador: "endart.studios+contato@gmail.com"');
    expect(PAGINA).toContain("mailto(CONTATOS.parceiro,");
    expect(PAGINA).toContain("mailto(CONTATOS.patrocinador,");
    expect(PAGINA).toContain("mailto(CONTATOS.apoiador,");
  });

  it("declara que a nota e o ranking não estão à venda", () => {
    expect(PAGINA).toContain('t("independenceBody")');
    expect(PAGINA).toContain('t("patrocinadorExtra")');
    // A regra está escrita nas 3 locales, não só no português.
    for (const locale of LOCALES) {
      const m = mensagens(locale);
      expect(m.support.independenceBody, `${locale}: regra ausente`).toBeTruthy();
      expect(m.support.patrocinadorExtra, `${locale}: ressalva ausente`).toBeTruthy();
    }
  });

  it("não inventa prova: sem logo, depoimento ou contagem de apoiadores", () => {
    // A varredura ignora comentário: a docstring da página cita as proibições por nome.
    const semComentario = PAGINA.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(semComentario).not.toMatch(/<img|<Image|depoimento|testimonial/i);
    expect(semComentario).not.toMatch(/className="[^"]*\blogo/i);
    for (const locale of LOCALES) {
      const m = mensagens(locale);
      const texto = Object.values(m.support).join(" ");
      // Contagem de apoiadores/parceiros não existe no produto: não pode existir no copy.
      expect(texto, `${locale}: contagem inventada`).not.toMatch(
        /\d+\s*(apoiador|parceir|patrocin)/i,
      );
    }
  });

  it("não digita número de marketing — a única exceção é o teto de concentração", () => {
    for (const locale of LOCALES) {
      const m = mensagens(locale);
      // `concentrationNote` é compromisso de governança (teto declarado), não número de
      // marketing: ele PRECISA do valor exato, e é o único que pode ter.
      const { concentrationNote, ...resto } = m.support;
      const texto = Object.values(resto).join(" ");
      expect(texto, `${locale}: percentual/número no copy`).not.toMatch(/\d+\s?%|\b\d{2,}\b/);
      expect(concentrationNote, `${locale}: teto de concentração ausente`).toMatch(/\d+\s?%/);
    }
  });

  it("não promete gratuidade perpétua (T087/D-xxx)", () => {
    for (const locale of LOCALES) {
      const texto = Object.values(mensagens(locale).support).join(" ");
      expect(texto).not.toMatch(/grátis para sempre|gratuito para sempre|free forever/i);
    }
  });

  it("as 3 locales têm as mesmas chaves, todas com texto, e não são cópia uma da outra", () => {
    const [pt, en, es] = LOCALES.map(mensagens);
    const chavesPt = Object.keys(pt.support).sort();
    expect(Object.keys(en.support).sort()).toEqual(chavesPt);
    expect(Object.keys(es.support).sort()).toEqual(chavesPt);
    for (const [locale, m] of [
      ["pt-BR", pt],
      ["en-US", en],
      ["es-ES", es],
    ] as const) {
      for (const [chave, valor] of Object.entries(m.support)) {
        expect(valor.trim().length, `${locale}.support.${chave} vazio`).toBeGreaterThan(0);
      }
    }
    // O título de cada locale é próprio: pega o caso de copiar PT para EN/ES.
    expect(en.support.title).not.toBe(pt.support.title);
    expect(es.support.title).not.toBe(pt.support.title);
    expect(es.support.title).not.toBe(en.support.title);
  });

  it("o rodapé linka a página e o sitemap a indexa", () => {
    const footer = fs.readFileSync(path.join(RAIZ, "src/components/MotionFooter.tsx"), "utf8");
    expect(footer).toContain('href="/apoie"');
    const sitemap = fs.readFileSync(path.join(RAIZ, "src/app/sitemap.ts"), "utf8");
    expect(sitemap).toContain('pathname: "/apoie"');
  });
});
