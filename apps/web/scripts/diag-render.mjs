import { chromium } from "@playwright/test";

const targets = [
  "https://media-rate-end-art-studios.vercel.app/pt-BR",
  "https://media-rate-end-art-studios.vercel.app/pt-BR/register",
];

const b = await chromium.launch();
for (const u of targets) {
  const p = await b.newPage();
  const consoleErr = [], pageErr = [], reqFail = [], badResp = [];
  p.on("console", (m) => { if (m.type() === "error") consoleErr.push(m.text()); });
  p.on("pageerror", (e) => pageErr.push(e.stack || e.message));
  p.on("requestfailed", (r) => reqFail.push(r.url() + " :: " + r.failure()?.errorText));
  p.on("response", (r) => { if (r.status() >= 400) badResp.push(r.status() + " " + r.url()); });
  
  try { await p.goto(u, { waitUntil: "networkidle", timeout: 30_000 }); }
  catch (e) { pageErr.push("[goto] " + e.message); }
  
  await p.waitForTimeout(3000);

  const dom = await p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const vis = (el) => {
      if (!el) return "ABSENT";
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (s.display !== "none" && s.visibility !== "hidden" && Number.parseFloat(s.opacity) > 0.01 && r.width > 0 && r.height > 0)
        ? "VISIBLE" : "HIDDEN(op=" + s.opacity + ",disp=" + s.display + ")";
    };
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const top = document.elementFromPoint(cx, cy);
    const appEmail = q('input[type="email"], input[name="email"], input[name="identifier"]');
    const vercelWall = /Log in to Vercel|Vercel Authentication|deployment protection/i.test(document.body.innerText);
    return {
      vercelWall,
      appEmail: vis(appEmail),
      form: vis(q("form")),
      mainLen: (q("main")?.innerText || "").trim().length,
      mainSnippet: (q("main")?.innerText || "").trim().slice(0, 300),
      topAtCenter: top ? (top.tagName + "#" + top.id + "." + (top.className || "").toString().slice(0, 80)) : "null",
      bodyTextLen: document.body.innerText.trim().length,
    };
  });

  console.log("\n========== " + u);
  console.log("PAGEERRORS:\n" + (pageErr.join("\n---\n") || "(nenhum)"));
  console.log("CONSOLE.ERROR:\n" + (consoleErr.slice(0, 15).join("\n") || "(nenhum)"));
  console.log("REQ_FAILED:\n" + (reqFail.slice(0, 15).join("\n") || "(nenhum)"));
  console.log("RESP_>=400:\n" + (badResp.slice(0, 15).join("\n") || "(nenhum)"));
  console.log("DOM:\n" + JSON.stringify(dom, null, 2));
  await p.close();
}
await b.close();
