import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1) login/register: renderizam formularios?
for (const path of ["/en-US/login", "/en-US/register"]) {
  await page.goto("https://media-rate-web.vercel.app" + path, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const d = await page.evaluate(() => ({
    erro: document.body.innerText.includes("Algo deu errado") || document.body.innerText.includes("Something went wrong"),
    temEmail: !!document.querySelector('input[type="email"]'),
    temNome: !!document.querySelector('input[id*="name"], input[name*="name"]'),
    h1: document.querySelector("h1")?.textContent?.trim()?.slice(0, 40) || null,
  }));
  console.log(path, JSON.stringify(d));
}

// 2) busca: "Oppenheimer" retorna o item da home?
await page.goto("https://media-rate-web.vercel.app/pt-BR", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);
const temHome = await page.evaluate(() =>
  [...document.querySelectorAll("a[href*='/media/']")].some((a) => (a.textContent || "").includes("Oppenheimer")),
);
console.log("Oppenheimer na home:", temHome);
await page.keyboard.press("Control+k");
await page.waitForTimeout(800);
const input = page.locator('input[type="search"], input[placeholder*="buscar"], input[placeholder*="search"]').first();
if (await input.count()) {
  await input.fill("Oppenheimer");
  await page.waitForTimeout(1500);
  const resultados = await page.evaluate(() =>
    [...document.querySelectorAll("a[href*='/media/']")].slice(0, 6).map((a) => a.textContent.trim().split("\n")[0]),
  );
  console.log("busca resultados:", JSON.stringify(resultados));
} else {
  console.log("input de busca nao encontrado via Ctrl+K");
}
await browser.close();
