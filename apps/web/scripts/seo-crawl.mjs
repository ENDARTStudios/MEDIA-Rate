#!/usr/bin/env node
// seo-crawl.mjs — Screaming Frog headless wrapper for MEDIA Rate
// Uso: node apps/web/scripts/seo-crawl.mjs [URL]
// Default: https://media-rate-web.vercel.app

import { spawn } from "child_process";
import { readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve } from "path";

const SF = "D:\\Program Files (x86)\\Screaming Frog SEO Spider\\ScreamingFrogSEOSpiderCli.exe";
const URL = process.argv[2] || "https://media-rate-web.vercel.app";
const OUT = resolve("apps/web/.seo-crawl");
const TIMEOUT_MS = 8 * 60 * 1000;

console.log(`[SEO-CRAWL] Starting crawl: ${URL}`);
console.log(`[SEO-CRAWL] Output: ${OUT}`);
console.log(`[SEO-CRAWL] Timeout: ${TIMEOUT_MS / 60000} min`);

mkdirSync(OUT, { recursive: true });

const now = new Date().toISOString().replace(/[:.]/g, "-");
const crawlDir = join(OUT, `crawl-${now}`);
mkdirSync(crawlDir, { recursive: true });

function run() {
  return new Promise((resolve, reject) => {
    const args = [
      "--crawl", URL,
      "--headless",
      "--output-folder", crawlDir,
      "--export-format", "csv",
      "--export-tabs",
      "Internal:All,Response Codes:Internal All,Directives:All,Hreflang:All,Page Titles:All,Meta Description:All,Images:All",
      "--overwrite",
    ];

    const proc = spawn(SF, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("TIMEOUT"));
    }, TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Exit code: ${code}`));
    });

    proc.on("error", reject);
  });
}

function parseCsv(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const row = {};
    const vals = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
    headers.forEach((h, i) => { row[h] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
}

function findCsv(dir, pattern) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir);
  const match = files.find((f) => f.toLowerCase().includes(pattern.toLowerCase()) && f.endsWith(".csv"));
  return match ? join(dir, match) : null;
}

function summarize() {
  console.log("\n=== SEO CRAWL SUMMARY ===");

  let respRows = [];

  // 1. Response codes
  const respFile = findCsv(crawlDir, "response_codes") || findCsv(crawlDir, "internal_all");
  if (respFile) {
    respRows = parseCsv(respFile);
    const codes = {};
    respRows.forEach((r) => {
      const code = r["Status Code"] || r["Status"] || r["Response"];
      if (code) codes[code] = (codes[code] || 0) + 1;
    });
    console.log(`\n--- Response Codes (${respRows.length} URLs) ---`);
    Object.entries(codes).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    const errors = respRows.filter((r) => {
      const c = Number(r["Status Code"] || r["Status"] || 0);
      return c >= 400;
    });
    if (errors.length) {
      console.log(`\n--- URLs 4xx/5xx (${errors.length}) ---`);
      errors.slice(0, 20).forEach((r) => console.log(`  [${r["Status Code"]}] ${r["Address"] || r["URL"]}`));
      if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
    } else {
      console.log("\n--- URLs 4xx/5xx: NONE ---");
    }
  } else {
    console.log("[WARN] No response codes CSV found — SF may still be crawling");
  }

  // 2. Noindex
  const rows = respRows.length ? respRows : parseCsv(respFile || "");
  const noindexUrls = rows.filter((r) => {
    const idx = (r["Indexability"] || r["Indexability Status"] || r["Indexable"] || "").toLowerCase();
    const robots = (r["Meta Robots"] || r["Meta Robots 1"] || "").toLowerCase();
    return idx.includes("noindex") || robots.includes("noindex");
  });
  if (noindexUrls.length) {
    console.log(`\n--- Noindex URLs (${noindexUrls.length}) ---`);
    noindexUrls.slice(0, 15).forEach((r) => console.log(`  ${r["Address"] || r["URL"]}`));
    if (noindexUrls.length > 15) console.log(`  ... and ${noindexUrls.length - 15} more`);
  } else {
    console.log("\n--- Noindex URLs: NONE ---");
  }

  // 3. Hreflang
  const hfFile = findCsv(crawlDir, "hreflang");
  if (hfFile) {
    const hfRows = parseCsv(hfFile);
    const hfNon200 = hfRows.filter((r) => {
      const sc = Number(r["Status Code"] || r["Status"] || 0);
      return sc > 0 && sc !== 200;
    });
    console.log(`\n--- Hreflang (${hfRows.length} entries) ---`);
    if (hfNon200.length) {
      console.log(`  Non-200: ${hfNon200.length} (should be 0)`);
      hfNon200.slice(0, 10).forEach((r) => console.log(`    [${r["Status Code"]}] ${r["Address"] || r["Hreflang URL"] || r["URL"]}`));
    } else {
      console.log(`  Non-200: 0 (all valid)`);
    }
  } else {
    console.log("\n--- Hreflang: no CSV (hreflang data not exported) ---");
  }

  // 4. Images — alt text and size
  const imgFile = findCsv(crawlDir, "image") || findCsv(crawlDir, "images");
  if (imgFile) {
    const imgRows = parseCsv(imgFile);
    const missingAlt = imgRows.filter((r) => {
      const alt = r["Alt Text"] || r["Alt"] || r["Alternative Text"] || "";
      return alt.trim() === "";
    });
    const missingSize = imgRows.filter((r) => {
      const w = r["Width"] || r["Image Width"] || "";
      const h = r["Height"] || r["Image Height"] || "";
      return !w || !h || w === "0" || h === "0";
    });
    console.log(`\n--- Images (${imgRows.length} total) ---`);
    console.log(`  Missing alt: ${missingAlt.length} (decorative alt=\"\" may be flagged)`);
    console.log(`  Missing size: ${missingSize.length} (Next.js fill mode may be flagged)`);
  } else {
    console.log("\n--- Images: no CSV ---");
  }

  // 5. Content gaps
  const titleFile = findCsv(crawlDir, "page_title");
  if (titleFile) {
    const tRows = parseCsv(titleFile);
    const missing = tRows.filter((r) => !r["Title 1"] && !r["Title"]);
    if (missing.length) {
      console.log(`\n--- Missing Titles (${missing.length}) ---`);
      missing.slice(0, 10).forEach((r) => console.log(`  ${r["Address"]}`));
    } else {
      console.log("\n--- Missing Titles: NONE ---");
    }
  }

  console.log(`\n--- Export folder: ${crawlDir}`);
}

try {
  console.log("[SEO-CRAWL] Running SF...");
  await run();
  console.log("[SEO-CRAWL] Crawl complete. Parsing CSVs...");
  summarize();
  console.log("\n[SEO-CRAWL] Done.");
} catch (err) {
  if (err.message === "TIMEOUT") {
    console.error("[SEO-CRAWL] TIMEOUT — crawl exceeded 8 min limit.");
    process.exit(2);
  }
  console.error("[SEO-CRAWL] FAILED:", err.message);
  process.exit(1);
}
