import fs from "node:fs";
import path from "node:path";

/**
 * P1 (review pós-#143) — detector de chaves i18n referenciadas sem entrada
 * nas messages (o bug `dashboard.profileWebShare`: referência sem chave não
 * é pego pela varredura de órfãs). Roda como teste no vitest (CI: Test &
 * Coverage), sem tocar no ci.yml.
 *
 * Estratégia:
 * 1. varre `src/` mapeando VARIÁVEL → namespace (`const t = useTranslations("ns")`,
 *    `await getTranslations("ns")`, `getTranslations({namespace:"ns"})`);
 * 2. extrai chamadas `variavel("chave")` e resolve o caminho completo com o
 *    namespace da variável (chaves absolutas "ns.chave" também são aceitas);
 * 3. aparados sufixos dinâmicos "chave:param";
 * 4. chaves montadas dinamicamente (`t(var as never)`) ficam fora do alcance
 *    estático — limitação documentada.
 */

const SRC = path.resolve(process.cwd(), "src");
export const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

type Messages = Record<string, unknown>;

/** Conjunto de caminhos-folha (ex.: "dashboard.profileWebShare") de um locale. */
export function leafPaths(messages: Messages): Set<string> {
  const out = new Set<string>();
  const walk = (obj: Messages, prefix: string): void => {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") walk(v as Messages, full);
      else out.add(full);
    }
  };
  walk(messages, "");
  return out;
}

export function loadMessages(): Record<string, Messages> {
  const out: Record<string, Messages> = {};
  for (const locale of LOCALES) {
    const p = path.resolve(process.cwd(), "src/messages", `${locale}.json`);
    out[locale] = JSON.parse(fs.readFileSync(p, "utf8")) as Messages;
  }
  return out;
}

export function walkSources(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSources(p, acc);
    else if (/\.(ts|tsx|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** `const t = useTranslations("ns")` / `await getTranslations({namespace:"ns"})`. */
const DECL_PATTERNS = [
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?useTranslations(?:\(\s*\))?\s*\(\s*["']([^"']+)["']\s*\)/g,
  /(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g,
  /(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslations\(\s*\{[^}]*namespace:\s*["']([^"']+)["'][^}]*\}\s*\)/g,
];

/** Chaves usadas por arquivo: mapeia VARIÁVEL de tradutor → namespace declarado. */
export function usedKeysFromFile(file: string): { namespaces: string[]; used: string[] } {
  const source = fs.readFileSync(file, "utf8");
  const varParaNs = new Map<string, string>();
  for (const re of DECL_PATTERNS) {
    for (const m of source.matchAll(re)) varParaNs.set(m[1], m[2]);
  }

  const used = new Set<string>();
  for (const m of source.matchAll(/(?<![A-Za-z$])(\w+)\(\s*["']([^"':\s]+)["']/g)) {
    // descarta concatenação dinâmica: t("s" + n) — chave não é literal pura
    const depois = source.slice(m.index + m[0].length, m.index + m[0].length + 3);
    if (/^\s*\+/.test(depois)) continue;
    const ns = varParaNs.get(m[1]);
    if (!ns) continue; // receptor não é tradutor conhecido
    used.add(`${ns}.${m[2]}`);
  }
  return { namespaces: [...varParaNs.values()], used: [...used] };
}

export interface ChaveAusente {
  file: string;
  key: string;
  faltando: string[];
}

export function collectMissing(): ChaveAusente[] {
  const messages = loadMessages();
  const pathsPorLocale = Object.fromEntries(
    Object.entries(messages).map(([locale, m]) => [locale, leafPaths(m)]),
  );
  const missing: ChaveAusente[] = [];
  for (const file of walkSources(SRC)) {
    const { used } = usedKeysFromFile(file);
    for (const key of used) {
      const faltando = LOCALES.filter((locale) => !pathsPorLocale[locale]?.has(key));
      if (faltando.length > 0) {
        missing.push({ file: path.relative(process.cwd(), file), key, faltando });
      }
    }
  }
  return missing;
}
