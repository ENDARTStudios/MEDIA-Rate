import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guarda do conceito nas rotas públicas (D-660/D-661).
 *
 * A reestruturação foi medida pelo `audit:routes` e conferida no DOM, mas nada
 * impedia a próxima página de nascer fora da casca. Este spec transforma a métrica
 * em contrato, lendo o fonte das rotas públicas — inclusive dos componentes que a
 * página importa, porque em várias rotas o conteúdo (e o h1) vive neles:
 *
 *   - a rota tem um caminho para o h1 em algum ponto da sua árvore;
 *   - a página compõe a casca OU reproduz o container/título do conceito;
 *   - nenhuma classe com hex cru (`text-[#F5F5F7]`) nas páginas;
 *   - nenhum `rounded-2xl` (D-065), salvo o banner do /top, que é deliberado.
 *
 * O que ele NÃO faz: medir pixel. Isso é `audit:routes` (números) e `visual-qa`
 * (DOM/render), que exigem servidor.
 */

const SRC = path.resolve(__dirname, "../src");
const APP = path.join(SRC, "app");
const TOKENS = path.join(SRC, "lib", "design-tokens.ts");

/**
 * Fluxos centrados: h1 próprio, composição intencionalmente centralizada (login,
 * cadastro, checkout, confirmação, boas-vindas, verificação de e-mail). Não usam
 * PageShell por decisão registrada no handoff — mas continuam obrigados a token e
 * a um único h1.
 */
const CENTRADOS = new Set([
  "/billing/success",
  "/welcome",
  "/verificar-email",
  "/login",
  "/register",
  "/checkout/[plan]",
]);

/**
 * `/top` mantém `rounded-2xl` no banner do Nº 1 (imagem de fundo, raio 16 do
 * conceito). O D-065 proíbe raio grande EM BLOCO; um elemento deliberado passa.
 */
const R2XL_PERMITIDO = new Set(["/top"]);

/**
 * Contrato de casca quando a página NÃO compõe `PageShell`/`PageContainer`: ou ela
 * reproduz o container do conceito, ou o teste acusa. Foi assim que as páginas
 * legais ficaram em `py-12` e passaram despercebidas até virarem contrato.
 */
const CONTAINER_CONCEITO = /mx-auto max-w-[a-z0-9]+ px-4 py-16/;
/** Ordem das classes não importa; a presença das quatro, sim. */
const TITULO_CONCEITO = (fonte: string) =>
  /font-heading/.test(fonte) &&
  /text-3xl/.test(fonte) &&
  /font-bold/.test(fonte) &&
  /tracking-tight/.test(fonte) &&
  /text-fg-primary/.test(fonte);

const H1 = /<h1\b|<PageTitle\b|<PageShell\b/;
const EXT = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const RX_IMPORT = /(?:from\s*|import\(\s*)["']([^"']+)["']/g;

interface Pagina {
  rota: string;
  arquivo: string;
  fonte: string;
}

function rotasPublicas(): Pagina[] {
  const out: Pagina[] = [];
  const andar = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        andar(abs);
        continue;
      }
      if (entrada.name !== "page.tsx") continue;
      const rel = path.relative(APP, dir).split(path.sep).join("/") || "/";
      const semLocale = rel
        .split("/")
        .filter((p) => p !== "[locale]")
        .join("/");
      if (/^(admin|dashboard)(\/|$)/.test(semLocale)) continue;
      out.push({
        rota: `/${semLocale}`.replace(/\/+$/, "") || "/",
        arquivo: abs,
        fonte: fs.readFileSync(abs, "utf8"),
      });
    }
  };
  andar(APP);
  return out.sort((a, b) => a.rota.localeCompare(b.rota));
}

function materializar(base: string): string | null {
  for (const cand of [base, ...EXT.map((e) => base + e)]) {
    try {
      if (fs.statSync(cand).isFile()) return cand;
    } catch {
      /* segue */
    }
  }
  return null;
}

function resolver(de: string, spec: string): string | null {
  if (spec.startsWith("@/")) return materializar(path.join(SRC, spec.slice(2)));
  if (spec.startsWith("./") || spec.startsWith("../"))
    return materializar(path.join(path.dirname(de), spec));
  return null;
}

/**
 * O h1 da rota pode estar na página, num componente importado ou numa primitiva
 * que esse componente importa (ex.: `historico/page.tsx` → `HistoricoPage` →
 * `PageTitle`). Percorre até 3 níveis.
 */
function temH1NaArvore(pagina: Pagina): boolean {
  if (H1.test(pagina.fonte)) return true;
  let fronteira = [pagina.arquivo];
  const vistos = new Set(fronteira);
  for (let nivel = 0; nivel < 3 && fronteira.length; nivel++) {
    const proxima: string[] = [];
    for (const arquivo of fronteira) {
      const fonte = fs.readFileSync(arquivo, "utf8");
      RX_IMPORT.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RX_IMPORT.exec(fonte)) !== null) {
        const alvo = resolver(arquivo, m[1]);
        if (!alvo || vistos.has(alvo)) continue;
        vistos.add(alvo);
        if (!alvo.split(path.sep).join("/").includes("/components/")) continue;
        if (H1.test(fs.readFileSync(alvo, "utf8"))) return true;
        proxima.push(alvo);
      }
    }
    fronteira = proxima;
  }
  return false;
}

/** Rota que só redireciona não renderiza nada: h1 não se aplica. */
function soRedireciona(fonte: string): boolean {
  const semComentario = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const temJsx = /<[A-Za-z]/.test(semComentario);
  return !temJsx && /permanentRedirect\(|redirect\(|notFound\(/.test(semComentario);
}

const paginas = rotasPublicas();

describe("conceito nas rotas públicas", () => {
  it("encontra as rotas públicas (sanidade do próprio spec)", () => {
    expect(paginas.length).toBeGreaterThanOrEqual(35);
  });

  it("toda rota tem um caminho para o h1 (página, componente ou shell)", () => {
    const semH1 = paginas
      .filter((p) => !soRedireciona(p.fonte))
      .filter((p) => !temH1NaArvore(p))
      .map((p) => p.rota);
    expect(semH1, `rotas sem h1: ${semH1.join(", ")}`).toEqual([]);
  });

  it("página de conteúdo compõe a casca OU reproduz o container e o título do conceito", () => {
    const foraDoContrato = paginas
      .filter((p) => !soRedireciona(p.fonte))
      .filter((p) => !CENTRADOS.has(p.rota))
      .filter((p) => !/PageShell|PageContainer/.test(p.fonte))
      // Páginas que só orquestram um componente client: o container vive nele.
      .filter((p) => !/components\/[A-Za-z]+\b/.test(p.fonte))
      .filter((p) => !CONTAINER_CONCEITO.test(p.fonte) || !TITULO_CONCEITO(p.fonte))
      .map((p) => p.rota);
    expect(foraDoContrato, `rotas fora do contrato de casca: ${foraDoContrato.join(", ")}`).toEqual(
      [],
    );
  });

  it("nenhuma página pública tem hex cru em classe", () => {
    const comHex = paginas.filter((p) => /-\[#[0-9A-Fa-f]{3,6}\]/.test(p.fonte)).map((p) => p.rota);
    expect(comHex, `hex cru em: ${comHex.join(", ")}`).toEqual([]);
  });

  it("nenhuma página pública usa rounded-2xl fora do permitido (D-065)", () => {
    const comR2xl = paginas
      .filter((p) => /rounded-2xl/.test(p.fonte))
      .map((p) => p.rota)
      .filter((rota) => !R2XL_PERMITIDO.has(rota));
    expect(comR2xl, `rounded-2xl em: ${comR2xl.join(", ")}`).toEqual([]);
  });

  it("os tokens que a migração criou continuam declarados", () => {
    const tokens = fs.readFileSync(TOKENS, "utf8");
    for (const token of ["indigoHover", "brandHover", "borderHover", "ink", "disabled"]) {
      expect(tokens, `token ausente em design-tokens.ts: ${token}`).toContain(token);
    }
  });
});
