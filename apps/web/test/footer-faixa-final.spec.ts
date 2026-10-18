import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guarda da faixa final do rodapé (D-661): idioma, status e identificação legal.
 *
 * O rodapé é server component com `getTranslations`, então renderizá-lo em jsdom
 * custaria mais mock do que valor: o que precisa de guarda aqui é a ESTRUTURA
 * (o que está na faixa) e a paridade das chaves — o texto em si vem das mensagens,
 * que o `i18n-parity` já valida.
 */

const RAIZ = path.resolve(__dirname, "..");
const FOOTER = fs.readFileSync(path.join(RAIZ, "src/components/MotionFooter.tsx"), "utf8");
const STATUS = fs.readFileSync(path.join(RAIZ, "src/app/[locale]/status/page.tsx"), "utf8");
const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

const mensagens = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(RAIZ, `src/messages/${locale}.json`), "utf8")) as Record<
    string,
    Record<string, string>
  >;

describe("faixa final do rodapé", () => {
  it("tem o seletor de idioma, o status e a identificação legal", () => {
    expect(FOOTER).toContain('<LocaleSwitcher placement="top" />');
    expect(FOOTER).toContain('href="/status"');
    expect(FOOTER).toContain("CNPJ 45.370.930/0001-75");
    expect(FOOTER).toContain("rightsReserved");
  });

  it("não usa mais o rótulo de 'Direitos do titular' como copyright", () => {
    // O fecho era `MEDIA Rate. {t("rights")}` e renderizava
    // "MEDIA Rate. Direitos do titular" — `rights` agora só aponta para a página
    // /direitos-do-titular (link legal), nunca para o copyright.
    expect(FOOTER).not.toMatch(/\{`MEDIA Rate\. \$\{t\("rights"\)\}`\}/);
    expect(FOOTER).toMatch(/t\("rightsReserved"\)/);
  });

  it("mantém a identificação legal idêntica (não paráfrase de texto legal)", () => {
    expect(FOOTER).toContain(
      "END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, São Paulo — Brasil · endart.studios+contato@gmail.com",
    );
  });

  it("as 3 locales têm as chaves novas com texto", () => {
    for (const locale of LOCALES) {
      const m = mensagens(locale);
      expect(m.footer.rightsReserved, `${locale} footer.rightsReserved`).toBeTruthy();
      expect(m.footer.status, `${locale} footer.status`).toBeTruthy();
      expect(m.footer.language, `${locale} footer.language`).toBeTruthy();
      for (const k of ["title", "operational", "degraded", "unavailable", "checkedAt", "explain"]) {
        expect(m.status[k], `${locale} status.${k}`).toBeTruthy();
      }
    }
  });

  it("a página /status mede na hora e não promete status fixo", () => {
    expect(STATUS).toContain('export const dynamic = "force-dynamic"');
    expect(STATUS).toContain("AbortSignal.timeout");
    expect(STATUS).toContain('cache: "no-store"');
    // Sem resposta ou resposta não-ok nunca vira "operational".
    expect(STATUS).toMatch(/catch \{[\s\S]*unavailable/);
    expect(STATUS).toContain('if (!res.ok) return { estado: "degraded"');
  });
});
