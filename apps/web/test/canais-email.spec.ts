import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Mapa de canais de e-mail (aliases +suffix da END ART Studios).
 *
 * O endereço é o que faz o programa funcionar: um alias trocado manda pedido de
 * reembolso para a fila de parceria e some. Este spec trava o par
 * **seção → canal** nos nove aliases oficiais — nas páginas (fonte) e nos textos
 * legais (messages, com paridade nas 3 línguas).
 */

const RAIZ = path.resolve(__dirname, "..");
const fonte = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

const ALIASES = {
  contato: "endart.studios+contato@gmail.com",
  suporte: "endart.studios+suporte@gmail.com",
  privacidade: "endart.studios+privacidade@gmail.com",
  security: "endart.studios+security@gmail.com",
  reembolso: "endart.studios+reembolso@gmail.com",
  direitos: "endart.studios+direitos@gmail.com",
  feedback: "endart.studios+feedback@gmail.com",
  parcerias: "endart.studios+parcerias@gmail.com",
  patrocinio: "endart.studios+patrocinio@gmail.com",
} as const;

describe("aliases de e-mail — cada seção usa o SEU canal", () => {
  it("/feedback usa +feedback (não o contato geral)", () => {
    const pagina = fonte("src/app/[locale]/feedback/page.tsx");
    expect(pagina).toContain(ALIASES.feedback);
    expect(pagina).not.toContain(ALIASES.contato);
  });

  it("/apoie: apoiador → contato, parceiro → parcerias, patrocinador → patrocinio", () => {
    const pagina = fonte("src/app/[locale]/apoie/page.tsx");
    expect(pagina).toContain(`apoiador: "${ALIASES.contato}"`);
    expect(pagina).toContain(`parceiro: "${ALIASES.parcerias}"`);
    expect(pagina).toContain(`patrocinador: "${ALIASES.patrocinio}"`);
  });

  it("/direitos-do-titular usa +direitos e /seguranca usa +security", () => {
    expect(fonte("src/app/[locale]/direitos-do-titular/page.tsx")).toContain(ALIASES.direitos);
    const seguranca = fonte("src/app/[locale]/seguranca/page.tsx");
    expect(seguranca).toContain(ALIASES.security);
  });

  it("security.txt (RFC 9116) aponta o canal +security", () => {
    expect(fonte("public/.well-known/security.txt")).toContain(`Contact: mailto:${ALIASES.security}`);
  });

  it("rodapé usa +contato como canal geral", () => {
    const footer = fonte("src/components/MotionFooter.tsx");
    expect(footer).toContain(ALIASES.contato);
  });

  it("textos legais: +privacidade (DPO), +suporte e +reembolso nas 3 línguas", () => {
    for (const locale of ["pt-BR", "en-US", "es-ES"]) {
      const mensagens = fs.readFileSync(path.join(RAIZ, `src/messages/${locale}.json`), "utf8");
      expect(mensagens, `${locale}: +privacidade ausente`).toContain(ALIASES.privacidade);
      expect(mensagens, `${locale}: +suporte ausente`).toContain(ALIASES.suporte);
      expect(mensagens, `${locale}: +reembolso ausente`).toContain(ALIASES.reembolso);
    }
  });

  it("nenhum alias com typo (domínio/base sempre endart.studios+…@gmail.com)", () => {
    const fontes = [
      "src/app/[locale]/feedback/page.tsx",
      "src/app/[locale]/apoie/page.tsx",
      "src/app/[locale]/direitos-do-titular/page.tsx",
      "src/app/[locale]/seguranca/page.tsx",
      "src/components/MotionFooter.tsx",
    ];
    for (const rel of fontes) {
      for (const bruto of fonte(rel).match(/endart\.studios[^\s"'`]+@gmail\.com/g) ?? []) {
        expect(Object.values(ALIASES), `alias desconhecido: ${bruto}`).toContain(bruto);
      }
    }
  });
});
