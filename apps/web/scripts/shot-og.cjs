/* eslint-disable */
// shot-og.cjs (T406) — gera o og:image de marca (1200x630) em public/.
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:linear-gradient(135deg,#0B0B1E 0%,#12121C 55%,#1C1C2E 100%);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif">
    <div style="text-align:center">
      <div style="font-size:84px;font-weight:800;color:#F5F5F7;letter-spacing:-0.03em">MEDIA<span style="color:#E11D48"> Rate</span></div>
      <div style="margin-top:20px;font-size:30px;color:#A0A0B8">Descubra seu próximo título favorito com o MEDIA Score™</div>
      <div style="margin-top:28px;display:inline-flex;gap:10px">
        <span style="background:#818CF8;color:#0F172A;padding:8px 18px;border-radius:999px;font-size:18px;font-weight:600">Filmes</span>
        <span style="background:#38BDF8;color:#0F172A;padding:8px 18px;border-radius:999px;font-size:18px;font-weight:600">Séries</span>
        <span style="background:#34D399;color:#0F172A;padding:8px 18px;border-radius:999px;font-size:18px;font-weight:600">Games</span>
        <span style="background:#F59E0B;color:#0F172A;padding:8px 18px;border-radius:999px;font-size:18px;font-weight:600">Livros</span>
      </div>
    </div>
  </body></html>`);
  await page.screenshot({
    path: path.join(__dirname, "..", "public", "og-image.png"),
  });
  await browser.close();
  console.log("public/og-image.png criado (1200x630)");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
