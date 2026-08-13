/* eslint-disable no-console */
/**
 * T294 — security-gate CI (checklist Parte 10):
 * 1) Varre arquivos commitados por padrões de segredo real (API keys/tokens).
 * 2) Garante que variáveis NEXT_PUBLIC_* do web são placeholders (vazias),
 *    nunca segredos reais (flags/segredos nunca no bundle do frontend).
 * 3) Referencia a matriz de autorização (CURATOR → /admin/* = 403) que é
 *    coberta por test/curadoria.e2e.spec.ts e o spec RLS
 *    (tests/security/rls-isolation.e2e.spec.ts).
 * Uso: node --import @swc-node/register/esm-register scripts/security-gate.ts
 * Exit 1 = finding (bloqueia CI). Segredos NUNCA são impressos.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const IGNORAR = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  ".turbo",
  ".gitignore",
  "package-lock.json",
  "skills-lock.json",
  "SECURITY.md",
  "scripts",
  "k6-scripts",
  // T303: fixtures de teste (tests/security/fixtures/proibida/) contêm
  // segredos FAKE de propósito para validar o scanner — não são segredos reais
  // e nunca devem derrubar o gate no scan do repo inteiro.
  "tests",
]);

/** Arquivos cujos hashes de integridade/cache não são segredos. */
const ARQUIVOS_IGNORAR_POR_NOME = ["tsconfig.tsbuildinfo"];

/** Padrões de segredo real (não placeholders). */
const PADROES: RegExp[] = [
  /(sk-[A-Za-z0-9]{20,})/,
  /(xox[baprs]-[A-Za-z0-9-]{10,})/,
  /(gh[pousr]_[A-Za-z0-9]{20,})/,
  /(-----BEGIN [A-Z ]+ PRIVATE KEY-----)/,
  /(AIza[0-9A-Za-z_-]{35})/, // Google API key
  /(AKIA[0-9A-Z]{16})/, // AWS access key
  /(Bearer [A-Za-z0-9._-]{20,})/,
];

const ENV_EXEMPLE = ["apps/web/.env.example", "apps/api/.env.example", ".env.example"];

function coletarArquivos(dir: string, acumulador: string[]): void {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entradas) {
    const caminho = join(dir, e);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(caminho);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!IGNORAR.has(e)) coletarArquivos(caminho, acumulador);
    } else if (ARQUIVOS_IGNORAR_POR_NOME.includes(e) || IGNORAR.has(e)) {
      // cache/integridade — ignora
    } else if (
      ![
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".ico",
        ".svg",
        ".lock",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
      ].some((ext) => caminho.endsWith(ext))
    ) {
      acumulador.push(caminho);
    }
  }
}

function main(): number {
  // T302: alvo posicional (fixture/test) ou --bundle <dir>; default ".".
  const bundleArg = process.argv.indexOf("--bundle");
  const alvo = bundleArg >= 0 ? process.argv[bundleArg + 1] : (process.argv[2] ?? ".");
  const findings: string[] = [];
  const arquivos: string[] = [];
  coletarArquivos(alvo, arquivos);

  for (const f of arquivos) {
    const conteudo = readFileSync(f, "utf8");
    if (f.endsWith("security-gate.ts")) continue;
    for (const re of PADROES) {
      const m = conteudo.match(re);
      if (m) {
        findings.push(`[SEGREDO?] ${f}: padrão ${re} (ocorrência mascarada)`);
        break;
      }
    }
  }

  // NEXT_PUBLIC_* (env real embutido no bundle) deve ser placeholder, nunca segredo.
  for (const envPath of ENV_EXEMPLE) {
    try {
      const linhas = readFileSync(envPath, "utf8").split("\n");
      for (const linha of linhas) {
        const m = linha.match(/^NEXT_PUBLIC_([A-Z0-9_]+)=(.+)$/);
        if (
          m &&
          m[2].trim().length > 0 &&
          !/^#|\{\{|<|>|placeholder|sua|your|exemplo|example|https?:\/\//i.test(m[2])
        ) {
          findings.push(
            `[NEXT_PUBLIC não-placeholder] ${envPath}: NEXT_PUBLIC_${m[1]}=*** (valor real — jamais expor segredo no bundle)`,
          );
        }
      }
    } catch {
      /* ausente */
    }
  }

  console.log(`=== SECURITY GATE (T294/T302) — ${bundleArg >= 0 ? `bundle: ${alvo}` : alvo} ===`);
  console.log(`Arquivos varridos: ${arquivos.length}`);
  if (findings.length === 0) {
    console.log("security-gate: OK — nenhum segredo/placeholder quebrado.");
    return 0;
  }
  for (const f of findings) console.log(`  ✗ ${f}`);
  console.log("security-gate: FAIL — corrija antes do merge.");
  return 1;
}

process.exit(main());
