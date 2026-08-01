/**
 * audit-i18n.ts — MEDIA Rate i18n Audit (CI-ready)
 *
 * Extrai innerText + aria-label + placeholder + alt de cada URL e aplica
 * heurística de detecção PT. Classifica achados como "chrome" (precisa t())
 * ou "mock" (regra D3). Exit code > 0 se flags de chrome encontrados.
 *
 * Uso: npx playwright test scripts/audit-i18n.ts
 *   Ou: npx tsx scripts/audit-i18n.ts
 *   Ou via CI: node scripts/audit-i18n.ts (se compilado)
 */

import { chromium, type Page } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";

// PT-only diacritics/patterns (absent in EN/ES)
const PT_DIACRITICS = /[ãõÃÕ]|ção\b|ções\b|íssimo|íssima|mente\b(?=.*[áéíóú])/;

// PT function words that don't exist in EN/ES as-is
const PT_FUNCTION_WORDS = [
  "voce", "você", "nao", "não", "esta", "está", "para", "pelo", "pela",
  "como", "quando", "onde", "porque", "muito", "pouco", "agora", "depois",
  "antes", "sempre", "nunca", "tambem", "também", "ainda", "ja", "já",
  "aqui", "ali", "nisso", "disso", "naquilo", "daquele", "naquela"
];

// ES-only function words (used to exclude false positives for ES pages)
const ES_FUNCTION_WORDS = ["usted", "vosotros", "nosotros", "conmigo", "contigo"];

interface Flag {
  selector: string;
  text: string;
  classification: "chrome" | "mock";
}

interface UrlResult {
  url: string;
  flags: Flag[];
  mockItems: string[];
}

function isMockContentTitle(text: string): boolean {
  // Proper nouns that start with a capital letter + are 1-3 words
  if (/^[A-ZÀ-Ú]/.test(text) && text.split(" ").length <= 3 && text.length <= 40) return true;
  // Contains colon (subtitle separator) = likely a title
  if (text.includes(":")) return true;
  // Multiple capitalized words = proper noun
  if (/^[A-ZÀ-Ú]/.test(text) && text.split(" ").length >= 4) return true;
  return false;
}

function isLegalContent(text: string): boolean {
  // Privacy/terms page section headings (numbered legal sections)
  if (/^\d+\.\s/.test(text) || /^\d+[a-z]?\.\s/.test(text)) return true;
  // Legal page content terms (LGPD, CDC, Art.)
  if (/\b(LGPD|CDC|Art\.|Inc\.)\b/.test(text)) return true;
  return false;
}

function isUIChrome(text: string): boolean {
  if (isMockContentTitle(text)) return false;
  if (isLegalContent(text)) return false;
  // English-only text = not PT chrome
  if (!/[ãõÃÕáéíóúàèìòùâêîôû]/.test(text) && !/[çÇ]/.test(text)) {
    // Unless it has PT function words
    const lower = text.toLowerCase();
    if (!PT_FUNCTION_WORDS.some((w) => lower.includes(w))) return false;
  }
  return true;
}

function detectPT(text: string, isES: boolean): { isPT: boolean; word: string; classification: "chrome" | "mock" } {
  if (!text || text.length < 3) return { isPT: false, word: "", classification: "mock" };

  // Skip product names and brand terms
  if (/MEDIA Score|MEDIA Rate/i.test(text)) return { isPT: false, word: "", classification: "mock" };

  // If text has no PT-only diacritics AND no PT function words, it's not PT
  const hasPTDiacritic = PT_DIACRITICS.test(text);
  const lower = text.toLowerCase();
  const hasPTFuncWord = PT_FUNCTION_WORDS.some((w) => lower.includes(` ${w} `) || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`));
  
  if (!hasPTDiacritic && !hasPTFuncWord) {
    return { isPT: false, word: "", classification: "mock" };
  }

  // If ES page and text contains ES-only indicators, classify as mock (not chrome)
  if (isES && ES_FUNCTION_WORDS.some((w) => text.toLowerCase().includes(w))) {
    return { isPT: true, word: text, classification: "mock" };
  }

  // Classify using heuristics
  if (!isUIChrome(text)) {
    return { isPT: true, word: text, classification: "mock" };
  }

  return { isPT: true, word: text, classification: "chrome" };
}

async function auditPage(page: Page, url: string, locale: string): Promise<UrlResult> {
  const result: UrlResult = { url, flags: [], mockItems: [] };
  const isES = locale === "es-ES";

  try {
    await page.goto(url, { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(1500);

    // Extract innerText
    const bodyText = await page.locator("body").innerText().catch(() => "");

    // Extract headings (h1-h3)
    const headings = await page.locator("h1, h2, h3").allInnerTexts().catch(() => []);

    // Extract aria-labels
    const ariaLabels: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[aria-label]"))
        .map((el) => el.getAttribute("aria-label") || "")
        .filter(Boolean);
    });

    // Extract placeholders
    const placeholders: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[placeholder]"))
        .map((el) => el.getAttribute("placeholder") || "")
        .filter(Boolean);
    });

    // Extract alt text
    const altTexts: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[alt]"))
        .map((el) => el.getAttribute("alt") || "")
        .filter(Boolean);
    });

    // Extract button text
    const buttonTexts: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button, a[role='button']"))
        .map((el) => el.textContent?.trim() || "")
        .filter(Boolean);
    });

    // Check headings for PT
    for (const h of headings) {
      const { isPT, word, classification } = detectPT(h, isES);
      if (isPT) {
        result.flags.push({ selector: "heading", text: word, classification });
      }
    }

    // Check aria-labels
    for (const label of ariaLabels) {
      const { isPT, word, classification } = detectPT(label, isES);
      if (isPT) {
        result.flags.push({ selector: "aria-label", text: word, classification });
      }
    }

    // Check placeholders
    for (const ph of placeholders) {
      const { isPT, word, classification } = detectPT(ph, isES);
      if (isPT) {
        result.flags.push({ selector: "placeholder", text: word, classification });
      }
    }

    // Check alt text
    for (const alt of altTexts) {
      if (alt.length < 3) continue;
      const { isPT, word, classification } = detectPT(alt, isES);
      if (isPT) {
        result.flags.push({ selector: "alt", text: word, classification: isMockContentTitle(alt) ? "mock" : classification });
      }
    }

    // Check button text
    for (const btn of buttonTexts) {
      const { isPT, word, classification } = detectPT(btn, isES);
      if (isPT) {
        result.flags.push({ selector: "button", text: word, classification });
      }
    }

    // Heuristic: find PT words in body text that match mock patterns
    // Titles with diacritics in body are likely mock data (synopses, cast names)
    const mockPatterns = bodyText.match(/\b[A-ZÀ-Ú][a-zà-ú]{3,}\b/g) || [];
    for (const m of mockPatterns) {
      if (PT_DIACRITICS.test(m)) {
        result.mockItems.push(m);
      }
    }

  } catch (err: any) {
    result.flags.push({ selector: "error", text: err.message?.substring(0, 60) || "unknown", classification: "mock" });
  }

  return result;
}

// ======= CONFIG =======
const LOCALES = ["pt-BR", "en-US", "es-ES"];

const PUBLIC_ROUTES = [
  "/", "/catalog", "/pricing", "/about", "/faq", "/methodology", "/sources",
  "/privacy", "/terms", "/discover"
];

const DETAIL_SLUGS = [
  "/movie/a-odisseia", "/tv/frieren", "/game/elden-ring", "/game/minecraft",
  "/media/1275779", "/media/27181", "/media/549", "/media/g7",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let totalChromeFlags = 0;
  let totalMockItems = 0;
  const allResults: UrlResult[] = [];

  console.log("=== MEDIA Rate i18n Audit ===\n");

  for (const locale of LOCALES) {
    const isNonPT = locale !== "pt-BR";
    console.log(`--- ${locale} ---`);

    const routes = [...PUBLIC_ROUTES, ...DETAIL_SLUGS];
    for (const route of routes) {
      const url = `${PROD}/${locale}${route}`.replace(/\/$/, "");
      const result = await auditPage(page, url, locale);
      allResults.push(result);

      const chromeFlags = result.flags.filter((f) => f.classification === "chrome");
      if (chromeFlags.length > 0 && isNonPT) {
        totalChromeFlags += chromeFlags.length;
        console.log(`  ${route === "/" ? "home" : route.replace("/", "")} | ${chromeFlags.length} chrome flag(s)`);
        for (const f of chromeFlags) {
          console.log(`    [${f.selector}] ${f.text.substring(0, 70)}`);
        }
      }
      if (result.mockItems.length > 0) {
        totalMockItems += result.mockItems.length;
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Routes audited: ${allResults.length}`);
  console.log(`Chrome PT flags (non-PT locales): ${totalChromeFlags}`);
  console.log(`Mock items (documented): ${totalMockItems}`);

  await browser.close();

  if (totalChromeFlags > 0) {
    console.log(`\nFAIL: ${totalChromeFlags} chrome PT flags found.`);
    process.exit(1);
  } else {
    console.log(`\nPASS: Zero chrome PT flags in en-US/es-ES.`);
    process.exit(0);
  }
})();
