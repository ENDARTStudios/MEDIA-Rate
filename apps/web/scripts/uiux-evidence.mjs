/**
 * uiux-evidence.mjs — captura a evidência visual das sessões de UI-UX.
 *
 * Por que existe: cada spec de `docs/02-architecture-design/ui-ux/` cita capturas em
 * `docs/02-architecture-design/evidencias/ui-ux-<sessao>/{1440,375}.png`. Fazer isso à
 * mão a cada sessão gerou divergência (viewport diferente, banner de cookies aberto,
 * imagem de altura variável). Este script fixa o formato:
 *
 *   - 1440×900 com **página inteira** (a sessão é lida de cima a baixo);
 *   - 375×812 com a **dobra** (no mobile o que importa é o que cabe na tela);
 *   - banner de consentimento dispensado antes da captura (senão a evidência mostra
 *     o aviso em vez da tela);
 *   - `deviceScaleFactor: 1` para o PNG não sair com o dobro do peso.
 *
 * ARMADILHA DE LEITURA (custou um falso achado na sessão Catálogo): em captura
 * `fullPage`, elemento com `position: sticky`/`fixed` aparece na posição de scroll
 * final — a sidebar de filtros do catálogo parecia estar "no fim da página" e no DOM
 * ela é o PRIMEIRO bloco da coluna. Nunca concluir posição lendo a página inteira:
 * confirmar no DOM (`getBoundingClientRect`) ou capturar por dobra.
 *
 * Uso (dev server no ar em :3000):
 *   node apps/web/scripts/uiux-evidence.mjs catalogo=/catalog rankings=/top planos=/pricing
 *   node apps/web/scripts/uiux-evidence.mjs --all        # todas as sessões do índice
 *   node apps/web/scripts/uiux-evidence.mjs --base http://localhost:3001 catalogo=/catalog
 *
 * Sessões que exigem sessão autenticada (dashboard, admin, listas, perfil, configurações)
 * NÃO são capturadas por padrão: elas precisam do storageState do `test:auth` (D-605).
 * Passe `--state <arquivo.json>` para usá-las.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..", "..");
const SAIDA = resolve(RAIZ, "docs", "02-architecture-design", "evidencias");

/** Mapa sessão → rota canônica (mantém o índice e as capturas com o mesmo nome). */
const SESSOES = {
  "catalogo": "/catalog",
  "rankings": "/top",
  "planos": "/pricing",
  "media-score": "/methodology",
  "dashboard": "/dashboard",
  "biblioteca": "/biblioteca",
  "assinaturas": "/checkout/plus",
  "auth": "/login",
  "busca-avancada": "/catalog",
  "watchlist": "/watchlist",
  "descoberta": "/discover",
  "listas": "/listas",
  "perfil": "/profile",
  "configuracoes": "/settings",
  "legal-sobre": "/about",
  "legal-planos": "/pricing",
  "legal-metodologia": "/methodology",
  "legal-privacidade": "/privacy",
  "legal-termos": "/terms",
};

/** Sessões que só existem autenticadas — só entram com --state. */
const EXIGEM_SESSAO = new Set([
  "dashboard",
  "biblioteca",
  "assinaturas",
  "watchlist",
  "listas",
  "perfil",
  "configuracoes",
]);

const argv = process.argv.slice(2);
const base = valorDe("--base") ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const estado = valorDe("--state");
const locale = valorDe("--locale") ?? "pt-BR";

function valorDe(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

const pedidos = argv.filter((a) => a.includes("=") && !a.startsWith("--"));
const alvos =
  argv.includes("--all") || pedidos.length === 0
    ? Object.entries(SESSOES)
    : pedidos.map((p) => {
        const [nome, rota] = p.split("=");
        return [nome, rota ?? SESSOES[nome] ?? `/${nome}`];
      });

const navegador = await chromium.launch();
let feitas = 0;
let puladas = 0;

for (const [nome, rota] of alvos) {
  if (EXIGEM_SESSAO.has(nome) && !estado) {
    console.log(`pulado ${nome} (exige sessão — use --state)`);
    puladas += 1;
    continue;
  }
  const destino = resolve(SAIDA, `ui-ux-${nome}`);
  mkdirSync(destino, { recursive: true });

  for (const [tag, viewport, paginaInteira] of [
    ["1440", { width: 1440, height: 900 }, true],
    ["375", { width: 375, height: 812 }, false],
  ]) {
    const contexto = await navegador.newContext({
      viewport,
      deviceScaleFactor: 1,
      storageState: estado,
    });
    const pagina = await contexto.newPage();
    /**
     * Retry em caso de REDIRECT: rotas autenticadas (sobretudo /admin) têm guard no
     * cliente que corre com a hidratação da sessão — medido em 2026-10-15: com sessão
     * válida, a MESMA rota alterna entre renderizar e mandar para /login, e **nenhuma**
     * chamada a /api/v1/admin acontece (a decisão é local). Sem retry, a evidência sairia
     * como tela de login em vez de tela do produto.
     */
    let redirecionou = false;
    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      await pagina.goto(`${base}/${locale}${rota}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await pagina.waitForTimeout(2500);
      const caminho = new URL(pagina.url()).pathname.replace(`/${locale}`, "");
      redirecionou = !caminho.startsWith(rota);
      if (!redirecionou) break;
      console.log(`  retry ${rota}: caiu em ${caminho}`);
    }
    if (redirecionou) {
      console.log(`  AVISO: ${rota} seguiu redirecionando — a captura pode não ser da tela`);
    }
    try {
      await pagina
        .getByRole("button", { name: /recusar|reject|aceitar|accept/i })
        .first()
        .click({ timeout: 2500 });
    } catch {
      // sem banner: segue
    }
    await pagina.waitForTimeout(800);
    await pagina.screenshot({ path: resolve(destino, `${tag}.png`), fullPage: paginaInteira });
    console.log(`ok ${nome} ${tag}${paginaInteira ? " (inteira)" : " (dobra)"}`);
    feitas += 1;
    await contexto.close();
  }
}

await navegador.close();
console.log(`\n${feitas} captura(s) em ${SAIDA} | ${puladas} sessão(ões) pulada(s)`);
