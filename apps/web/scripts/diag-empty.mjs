import { chromium } from "@playwright/test";

const urls = [
  "https://media-rate-end-art-studios.vercel.app/pt-BR/register",
  "https://media-rate-end-art-studios.vercel.app/pt-BR/login",
];

const b = await chromium.launch();
for (const u of urls) {
  const p = await b.newPage();
  const errs = [];
  p.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      errs.push(`[${m.type()}] ${m.text()}`);
  });
  p.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));

  try {
    await p.goto(u, { waitUntil: "networkidle", timeout: 30_000 });
  } catch (e) {
    errs.push("[goto] " + e.message);
  }
  await p.waitForTimeout(2500);

  const info = await p.evaluate(() => {
    const email = document.querySelector('input[type="email"], input[name="email"]');
    const form = document.querySelector("form");
    function vis(el) {
      if (!el) return "ABSENT";
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" &&
        s.visibility !== "hidden" &&
        parseFloat(s.opacity) > 0.01 &&
        r.width > 0 &&
        r.height > 0
        ? "VISIBLE"
        : "HIDDEN(" + s.opacity + "/" + s.display + ")";
    }
    const top = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      email: vis(email),
      form: vis(form),
      topTag: top
        ? top.tagName + "." + (top.className?.toString() || "").slice(0, 60)
        : "null",
      bodyChildren: document.body.children.length,
      mainHTML: document.querySelector("main")?.innerHTML?.slice(0, 400) || "(no main)",
    };
  });

  console.log("\n=== " + u);
  console.log("ERRORS:\n" + (errs.join("\n") || "(none)"));
  console.log("DOM:\n" + JSON.stringify(info, null, 2));
  await p.close();
}
await b.close();
