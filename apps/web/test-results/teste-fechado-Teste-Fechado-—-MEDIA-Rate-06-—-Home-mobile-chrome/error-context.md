# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teste-fechado.spec.ts >> Teste Fechado — MEDIA Rate >> 06 — Home
- Location: e2e\teste-fechado.spec.ts:145:3

# Error details

```
Error: UNKNOWN: unknown error, open 'D:\PROJETOS\MEDIA Rate\MEDIA Rate\apps\web\apps\web\e2e\screenshots\06a-home-desktop.png'
```

# Test source

```ts
  53  | 
  54  |     await page.waitForTimeout(5000);
  55  |     const url = page.url();
  56  |     console.log("  Register result:", url);
  57  |     await ss(page, "01b-register-result");
  58  | 
  59  |     if (url.includes("/register")) {
  60  |       bugs.push({ id: "BUG-001", fluxo: 1, severity: "Alto", desc: "Register — não redirecionou após submit", evidence: `Console: ${consoleErrors.length}, Network: ${networkErrors.length}, Page: ${pageErrors.length}, URL: ${url}`, cause: "Form não submeteu ou backend não respondeu" });
  61  |     }
  62  |   });
  63  | 
  64  |   // Fluxo 2: Login
  65  |   test("02 — Login", async ({ page }) => {
  66  |     await page.goto(`${BASE}/pt-BR/login`, { waitUntil: "networkidle", timeout: 15000 });
  67  |     await ss(page, "02a-login-form");
  68  | 
  69  |     const emailF = page.locator('input[type="email"]').first();
  70  |     const pwdF = page.locator('input[type="password"]').first();
  71  |     const submit = page.locator('button[type="submit"]').first();
  72  | 
  73  |     if (await emailF.count()) await emailF.fill("teste@exemplo.com");
  74  |     if (await pwdF.count()) await pwdF.fill("qualquercoisa");
  75  |     if (await submit.count()) await submit.click();
  76  | 
  77  |     await page.waitForTimeout(4000);
  78  |     await ss(page, "02b-login-result");
  79  |   });
  80  | 
  81  |   // Fluxo 3: Catálogo
  82  |   test("03 — Catálogo", async ({ page }) => {
  83  |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  84  |     await page.waitForTimeout(2000);
  85  | 
  86  |     const cards = await page.locator('a[href*="/media/"]').count();
  87  |     const images = await page.locator('img').count();
  88  |     console.log(`  Catalog: cards=${cards} images=${images}`);
  89  |     await ss(page, "03-catalog");
  90  | 
  91  |     if (cards === 0) {
  92  |       bugs.push({ id: "BUG-002", fluxo: 3, severity: "Crítico", desc: "Catálogo — 0 cards visíveis", evidence: `Cards: ${cards}, Console: ${consoleErrors.length}, Network: ${networkErrors.length}` });
  93  |     }
  94  |     if (images === 0) {
  95  |       bugs.push({ id: "BUG-003", fluxo: 3, severity: "Alto", desc: "Catálogo — 0 imagens carregadas", evidence: `Images: ${images}` });
  96  |     }
  97  |   });
  98  | 
  99  |   // Fluxo 4: Card → Detalhe
  100 |   test("04 — Detalhe de mídia", async ({ page }) => {
  101 |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  102 |     await page.waitForTimeout(1000);
  103 | 
  104 |     const firstCard = page.locator('a[href*="/media/"]').first();
  105 |     if (await firstCard.count()) {
  106 |       await firstCard.click();
  107 |       await page.waitForTimeout(3000);
  108 |       await ss(page, "04a-detail");
  109 | 
  110 |       const h1Count = await page.locator("h1").count();
  111 |       const scoreDial = await page.locator("svg circle").count();
  112 |       console.log(`  Detail: H1=${h1Count} ScoreDial=${scoreDial} URL=${page.url()}`);
  113 | 
  114 |       if (h1Count === 0) {
  115 |         bugs.push({ id: "BUG-004", fluxo: 4, severity: "Alto", desc: "Detalhe — sem H1", evidence: `H1: ${h1Count}` });
  116 |       }
  117 |       if (page.url().includes("404") || page.url().includes("not-found")) {
  118 |         bugs.push({ id: "BUG-005", fluxo: 4, severity: "Crítico", desc: "Detalhe — 404 ao clicar card", evidence: `URL: ${page.url()}` });
  119 |       }
  120 |     } else {
  121 |       bugs.push({ id: "BUG-006", fluxo: 4, severity: "Crítico", desc: "Detalhe — 0 cards no catálogo para clicar", evidence: "No media card links found" });
  122 |     }
  123 |   });
  124 | 
  125 |   // Fluxo 5: Watchlist
  126 |   test("05 — Watchlist", async ({ page }) => {
  127 |     await page.goto(`${BASE}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  128 |     await page.waitForTimeout(1000);
  129 | 
  130 |     const wlBtn = page.locator('button[aria-label*="watchlist"], button[aria-label*="Watchlist"], button:has-text("Adicionar")').first();
  131 |     if (await wlBtn.count()) {
  132 |       await wlBtn.click();
  133 |       await page.waitForTimeout(2000);
  134 |       await ss(page, "05a-watchlist-add");
  135 |     }
  136 | 
  137 |     await page.goto(`${BASE}/pt-BR/watchlist`, { waitUntil: "networkidle", timeout: 15000 });
  138 |     await page.waitForTimeout(2000);
  139 |     await ss(page, "05b-watchlist-page");
  140 |     const wlCards = await page.locator('a[href*="/media/"]').count();
  141 |     console.log(`  Watchlist cards: ${wlCards}`);
  142 |   });
  143 | 
  144 |   // Fluxo 6: Home
  145 |   test("06 — Home", async ({ page }) => {
  146 |     await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
  147 |     await page.waitForTimeout(2000);
  148 | 
  149 |     const hero = await page.locator("#hero-title, h1").first().textContent();
  150 |     const rails = await page.locator("section").count();
  151 |     const cards = await page.locator('a[href*="/media/"]').count();
  152 |     console.log(`  Home: hero="${hero?.slice(0, 60)}" sections=${rails} cards=${cards}`);
> 153 |     await ss(page, "06a-home-desktop");
      |     ^ Error: UNKNOWN: unknown error, open 'D:\PROJETOS\MEDIA Rate\MEDIA Rate\apps\web\apps\web\e2e\screenshots\06a-home-desktop.png'
  154 | 
  155 |     if (!hero) {
  156 |       bugs.push({ id: "BUG-007", fluxo: 6, severity: "Alto", desc: "Home — hero section vazio", evidence: `Hero text: ${hero}` });
  157 |     }
  158 |     if (cards === 0) {
  159 |       bugs.push({ id: "BUG-008", fluxo: 6, severity: "Alto", desc: "Home — 0 cards nos rails", evidence: `Cards: ${cards}` });
  160 |     }
  161 |   });
  162 | 
  163 |   // Fluxo 7: i18n
  164 |   test("07 — i18n (PT/EN/ES)", async ({ page }) => {
  165 |     const locales = ["/pt-BR", "/en-US", "/es-ES"];
  166 |     for (const loc of locales) {
  167 |       await page.goto(`${BASE}${loc}/catalog`, { waitUntil: "networkidle", timeout: 15000 });
  168 |       await page.waitForTimeout(1000);
  169 |       const h1 = await page.locator("h1").first().textContent();
  170 |       console.log(`  ${loc}: H1="${h1}"`);
  171 |       await ss(page, `07-${loc.replace("/", "")}`);
  172 |     }
  173 |   });
  174 | 
  175 |   // Fluxo 8: Logout
  176 |   test("08 — Logout + protected route", async ({ page }) => {
  177 |     // Protected route access (without login)
  178 |     await page.goto(`${BASE}/pt-BR/watchlist`, { waitUntil: "networkidle", timeout: 15000 });
  179 |     await page.waitForTimeout(2000);
  180 |     const protectedUrl = page.url();
  181 |     console.log("  Protected route:", protectedUrl);
  182 |     await ss(page, "08a-protected");
  183 |     if (!protectedUrl.includes("/login")) {
  184 |       bugs.push({ id: "BUG-009", fluxo: 8, severity: "Alto", desc: "Watchlist — não redirecionou para login (usuário deslogado)", evidence: `URL: ${protectedUrl}` });
  185 |     }
  186 |   });
  187 | 
  188 |   // Fluxo 9: Planos
  189 |   test("09 — Planos", async ({ page }) => {
  190 |     await page.goto(`${BASE}/pt-BR/pricing`, { waitUntil: "networkidle", timeout: 15000 });
  191 |     await page.waitForTimeout(1000);
  192 |     await ss(page, "09-pricing");
  193 |     const planCards = await page.locator("article, .bg-\\[\\#11111E\\]").count();
  194 |     console.log(`  Pricing: cards=${planCards}`);
  195 |     if (planCards < 2) {
  196 |       bugs.push({ id: "BUG-010", fluxo: 9, severity: "Médio", desc: "Planos — menos de 2 planos visíveis", evidence: `Cards: ${planCards}` });
  197 |     }
  198 |   });
  199 | 
  200 |   // Fluxo 10: SEO
  201 |   test("10 — SEO (View Source)", async ({ page }) => {
  202 |     await page.goto(`${BASE}/pt-BR/media/g1`, { waitUntil: "networkidle", timeout: 15000 });
  203 |     await page.waitForTimeout(1500);
  204 | 
  205 |     const source = await page.content();
  206 |     const hasCanonical = source.includes("canonical");
  207 |     const hasRobots = source.includes("robots");
  208 |     const hasH1 = /<h1[^>]*>/i.test(source);
  209 |     const hasTitle = /<title>/i.test(source);
  210 | 
  211 |     console.log(`  SEO: canonical=${hasCanonical} robots=${hasRobots} H1=${hasH1} title=${hasTitle}`);
  212 |     await ss(page, "10-seo-meta");
  213 | 
  214 |     if (!hasCanonical) bugs.push({ id: "BUG-011", fluxo: 10, severity: "Alto", desc: "SEO — canonical ausente na página de detalhe", evidence: "Canonical: false" });
  215 |     if (!hasRobots) bugs.push({ id: "BUG-012", fluxo: 10, severity: "Alto", desc: "SEO — meta robots ausente", evidence: "Robots: false" });
  216 |     if (!hasH1) bugs.push({ id: "BUG-013", fluxo: 10, severity: "Alto", desc: "SEO — H1 ausente", evidence: "H1: false" });
  217 |   });
  218 | 
  219 |   // Fluxo 11: Security headers
  220 |   test("11 — Security headers", async ({ page }) => {
  221 |     await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
  222 |     await page.waitForTimeout(1000);
  223 | 
  224 |     // Check via Performance API
  225 |     const headers = await page.evaluate(() => {
  226 |       const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  227 |       return { type: entry?.type || "navigate" };
  228 |     });
  229 |     console.log("  Security: navigation type =", headers.type);
  230 | 
  231 |     // We can't directly read response headers from Playwright without intercepting
  232 |     // Use page.route to capture
  233 |     let securityHeaders = {};
  234 |     await page.route("**/pt-BR", (route) => {
  235 |       const resp = route.request().response();
  236 |       if (resp) {
  237 |         securityHeaders = {
  238 |           "x-frame-options": resp.headers()["x-frame-options"] || "MISSING",
  239 |           "x-content-type-options": resp.headers()["x-content-type-options"] || "MISSING",
  240 |           "referrer-policy": resp.headers()["referrer-policy"] || "MISSING",
  241 |           "csp": resp.headers()["content-security-policy"] ? "PRESENT" : "MISSING",
  242 |         };
  243 |       }
  244 |       route.continue();
  245 |     }, { times: 1 });
  246 | 
  247 |     await page.goto(`${BASE}`, { waitUntil: "networkidle", timeout: 15000 });
  248 |     await page.waitForTimeout(500);
  249 |     console.log("  Security headers:", JSON.stringify(securityHeaders));
  250 |   });
  251 | 
  252 |   // After all: report
  253 |   test.afterAll(() => {
```