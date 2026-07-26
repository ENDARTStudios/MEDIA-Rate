import { chromium } from "@playwright/test";

const BASE = "https://media-rate-end-art-studios.vercel.app";
const routes = ["/pt-BR", "/pt-BR/catalog", "/pt-BR/register"];
const b = await chromium.launch();

async function probe(ctxOpts, label) {
  const ctx = await b.newContext(ctxOpts);
  for (const u of routes) {
    const p = await ctx.newPage();
    const resp401 = [], resp4xx = [], pageErr = [], reqFail = [];
    p.on("response", (r) => {
      const s = r.status();
      const url = r.url();
      if (s === 401) resp401.push(url);
      if (s >= 400 && s < 600) resp4xx.push(s + " " + url);
    });
    p.on("pageerror", (e) => pageErr.push(e.message));
    p.on("requestfailed", (r) => reqFail.push(r.url() + " :: " + (r.failure()?.errorText)));

    try {
      await p.goto(BASE + u, { waitUntil: "domcontentloaded", timeout: 30_000 });
    } catch (e) {
      pageErr.push("[goto] " + e.message);
    }

    const read = async () =>
      p.evaluate(() => {
        const main = document.querySelector("main") || document.body;
        const cs = getComputedStyle(main);
        const contentEl =
          [...(main ? main.querySelectorAll("*") : [])].find(
            (e) => (e.innerText || "").trim().length > 20
          ) || main || document.body;
        const ccs = getComputedStyle(contentEl);
        const cx = window.innerWidth / 2,
          cy = Math.min(window.innerHeight / 2, 600);
        const top = document.elementFromPoint(cx, cy);
        return {
          mainTextLen: (main?.innerText || "").trim().length,
          contentOpacity: ccs.opacity,
          contentVisibility: ccs.visibility,
          contentDisplay: ccs.display,
          topAtCenter: top
            ? top.tagName + "." + (top.className || "").toString().slice(0, 50)
            : "null",
        };
      });

    const early = await read();
    await p.waitForTimeout(3500);
    const late = await read();

    console.log(
      "\n[" + label + "] " + u +
      "\n  early=" + JSON.stringify(early) +
      "\n  late =" + JSON.stringify(late)
    );
    console.log("  401=" + resp401.map((x) => x.replace(BASE, "")).slice(0, 8));
    console.log("  4xx=" + resp4xx.map((x) => x.replace(BASE, "")).slice(0, 8));
    console.log("  pageErr=" + pageErr.slice(0, 5), "reqFail=" + reqFail.slice(0, 5));
    await p.close();
  }
  await ctx.close();
}

await probe({}, "NORMAL");
await probe({ reducedMotion: "reduce" }, "REDUCED-MOTION");
await b.close();
