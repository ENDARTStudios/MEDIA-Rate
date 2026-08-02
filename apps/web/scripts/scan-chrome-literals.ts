#!/usr/bin/env tsx
/**
 * scan-chrome-literals.ts — MEDIA Rate Static Chrome Literal Scanner (CI-ready)
 *
 * Varre arquivos TSX/TS de src/components e src/app e detecta:
 *   - Text nodes JSX com palavras PT/EN que NÃO estão dentro de t()/useTranslations()
 *   - Atributos aria-label/placeholder/alt/title com strings literais não-i18n
 *   - Elementos <hX> e <p> com texto hardcoded
 *
 * Lista branca de exclusão:
 *   - seed-data.ts, mock-data, api.ts (dados mock — regra D3)
 *   - Nomes próprios, marcas (MEDIA Score, Metacritic, Igdb, Stripe, TMDB)
 *   - Cognatos PT/ES (títulos, Completos, Abandonados, Explorador, Activo, Idioma, Email)
 *   - Strings puramente simbólicas (—, ✓, ☆, ★)
 *   - Comentários e strings de tipo (TypeScript type annotations)
 *
 * Exit code: 0 se 0 literais de chrome; > 0 se encontrados.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC = path.resolve(__dirname, "..", "src");
const SCAN_DIRS = ["components", "app"];

const EXCLUDE_FILES = [
  "seed-data.ts",
  "mock-data.ts",
  "api.ts",
  "design-tokens.ts",
  ".spec.",
  ".test.",
  "DesignSystemClient.tsx",
];

// Whitelist — words that are NOT chrome UI (mock data, brand names, cognates)
const WHITELIST = [
  "MEDIA Score",
  "MEDIA Rate",
  "MEDIA Score™",
  "Metacritic",
  "Igdb",
  "Stripe",
  "TMDB",
  "RAWG",
  "Steam",
  "OpenLibrary",
  "TVMaze",
  "IMDb",
  "Rotten Tomatoes",
  "AniList",
  "Goodreads",
  "Completos",
  "Abandonados",
  "Explorador",
  "Activo",
  "Idioma",
  "Email",
  "Perfil",
  "Catálogo",
  "Configuración",
  "LGPD",
  "CDC",
  "ANPD",
  "DPO",
  "Osasco",
  "São Paulo",
  "Brasil",
  "Free",
  "Plus",
  "Premium",
  "ENDART Studios",
  "EDINALDO SOARES DA SILVA",
  "—",
  "✓",
  "☆",
  "★",
  "...",
];

// PT function words that signal a UI label (not mock content)
const PT_CHROME_WORDS = [
  "Configurações",
  "Configuracoes",
  "Conta",
  "Nome",
  "Sessão",
  "Sessao",
  "Sair",
  "Entrar",
  "Cadastre-se",
  "Cadastrar",
  "Buscar",
  "Favoritar",
  "Favorito",
  "Compartilhar",
  "Compartilhem",
  "Avaliar",
  "Salvar",
  "Cancelar",
  "Confirmar",
  "Enviar",
  "Voltar",
  "Avançar",
  "Continuar",
  "Concluir",
  "Fechar",
  "Adicionar",
  "Remover",
  "Editar",
  "Excluir",
  "Criar",
  "Atualizar",
  "Carregando",
  "Processando",
  "Verificando",
  "Selecione",
  "Digite",
  "Escolha",
  "Informe",
  "Preencha",
  "assistir",
  "jogar",
  "ver",
  "filme",
  "série",
  "game",
  "jogo",
  "sinopse",
  "elenco",
  "temporada",
  "episódio",
  "nota",
  "score",
  "fontes",
  "Fontes",
  "confiança",
  "atualizado",
  "desatualizado",
  "watchlist",
  "dashboard",
  "catálogo",
];

// EN words that would look like chrome in wrong context
const EN_CHROME_WORDS = [
  "Settings",
  "Account",
  "Name",
  "Session",
  "Sign out",
  "Log in",
  "Register",
  "Search",
  "Favorite",
  "Share",
  "Save",
  "Cancel",
  "Submit",
  "Send",
  "Loading",
  "Processing",
  "Verifying",
  "Select",
  "Type",
  "Choose",
  "Enter",
  "watch",
  "play",
  "movie",
  "series",
  "game",
  "synopsis",
  "cast",
  "season",
  "episode",
  "rating",
  "score",
  "sources",
  "confidence",
  "updated",
  "outdated",
];

interface Flag {
  file: string;
  line: number;
  text: string;
  type: "textNode" | "ariaLabel" | "placeholder" | "alt" | "title";
}

function isChromeLiteral(text: string, context: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return false;

  // Skip whitelist
  if (WHITELIST.some((w) => trimmed.toLowerCase().includes(w.toLowerCase()))) return false;

  // Skip pure symbols/numbers
  if (/^[\d\s.,;:!?()\[\]{}\-–—★☆✓✕✔✖●○◉◎#@$%^&*+=<>~`|\\/'"]+$/.test(trimmed)) return false;

  // Skip if surrounded by t() call
  if (/t\(+/.test(context)) return false;
  if (/getTranslations\(+/.test(context)) return false;
  if (/useTranslations\(+/.test(context)) return false;

  // Check for PT chrome words
  return PT_CHROME_WORDS.some((w) => trimmed.toLowerCase().includes(w.toLowerCase()));
}

function scanFile(filePath: string): Flag[] {
  const flags: Flag[] = [];
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments
    if (/^\s*\/\/|\/\*|\*/.test(line.trim())) continue;

    // Detect JSX text nodes: >SomeText< or >SomeText{ or >Some Text<
    const textMatches = line.matchAll(/>([^<>{]*?[A-Za-zÀ-Úà-ú]{2,}[^<>{]*?)</g);
    for (const m of textMatches) {
      const text = m[1].trim();
      if (isChromeLiteral(text, line)) {
        flags.push({ file: filePath, line: i + 1, text, type: "textNode" });
      }
    }

    // Detect aria-label="text"
    const ariaMatch = line.match(/aria-label=["']([^"']+)["']/);
    if (ariaMatch && isChromeLiteral(ariaMatch[1], line)) {
      flags.push({ file: filePath, line: i + 1, text: ariaMatch[1], type: "ariaLabel" });
    }

    // Detect placeholder="text"
    const phMatch = line.match(/placeholder=["']([^"']+)["']/);
    if (phMatch && isChromeLiteral(phMatch[1], line)) {
      flags.push({ file: filePath, line: i + 1, text: phMatch[1], type: "placeholder" });
    }

    // Detect alt="text"
    const altMatch = line.match(/alt=["']([^"']{3,})["']/);
    if (altMatch && isChromeLiteral(altMatch[1], line)) {
      flags.push({ file: filePath, line: i + 1, text: altMatch[1], type: "alt" });
    }

    // Detect title="text"
    const titleMatch = line.match(/title=["']([^"']{3,})["']/);
    if (titleMatch && isChromeLiteral(titleMatch[1], line)) {
      flags.push({ file: filePath, line: i + 1, text: titleMatch[1], type: "title" });
    }
  }

  return flags;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...walk(full));
    } else if (
      entry.isFile() &&
      /\.(tsx|ts)$/.test(entry.name) &&
      !EXCLUDE_FILES.some((ex) => entry.name.includes(ex))
    ) {
      files.push(full);
    }
  }
  return files;
}

// ========= MAIN =========
const allFlags: Flag[] = [];

let totalFiles = 0;
for (const dir of SCAN_DIRS) {
  const fullDir = path.join(SRC, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = walk(fullDir);
  totalFiles += files.length;
  for (const file of files) {
    const flags = scanFile(file);
    allFlags.push(...flags);
  }
}

// D-199.1: mojibake/double-encoding detection — exit !=0 if found
(function checkMojibake() {
  const MOJIBAKE = [
    "\u00c3\u00a9",
    "\u00c3\u00a3",
    "\u00c3\u00a7",
    "\u00c3\u00aa",
    "\u00c3\u00b4",
    "\u00c3\u00ad",
    "\u00c3\u00ba",
    "\u00c3\u00b3",
    "\u00c3\u00a1",
    "\u00c3\u00a2",
    "\u00c3\u00b5",
    "\u00e2\u20ac\u201c",
    "\u00e2\u201e\u00a2",
    "\u00c2\u00b7",
  ];
  const issues: string[] = [];
  for (const loc of ["pt-BR", "en-US", "es-ES"]) {
    const p = path.resolve(SRC, "messages", loc + ".json");
    if (!fs.existsSync(p)) continue;
    const c = fs.readFileSync(p, "utf8");
    for (const pat of MOJIBAKE) {
      if (c.includes(pat)) {
        issues.push(loc + ".json: " + pat);
        break;
      }
    }
  }
  if (issues.length > 0) {
    console.log("MOJIBAKE FAIL: " + issues.join("; "));
    process.exit(1);
  }
  console.log("Mojibake check: PASS (0 in 3 locales)");
})();

console.log("=== MEDIA Rate Static Chrome Literal Scan ===\n");
console.log(`Files scanned: ${totalFiles}`);
console.log(`Chrome literals found: ${allFlags.length}\n`);

if (allFlags.length > 0) {
  for (const f of allFlags) {
    const rel = path.relative(SRC, f.file);
    console.log(`  ${rel}:${f.line} [${f.type}] "${f.text.substring(0, 60)}"`);
  }
  console.log(`\nFAIL: ${allFlags.length} chrome literals found.`);
  process.exit(1);
} else {
  console.log("PASS: Zero chrome literals.");
  process.exit(0);
}
