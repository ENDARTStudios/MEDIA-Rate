import { test, expect, chromium } from "@playwright/test";

const PROD = "https://media-rate-web.vercel.app";
const BRAVE = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

test.describe("T105 - Deep CSS inspection", () => {
  test("computed-style do 1o card + grid wrapper", async () => {
    const browser = await chromium.launch({
      executablePath: BRAVE,
      headless: false,
      args: ["--no-sandbox", "--disable-gpu"],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      console.log("\n=== DEEP CSS INSPECTION CATALOG ===");

      await page.goto(`${PROD}/pt-BR/catalog`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2500);

      const cardSelector = 'a[href*="/media/"]';
      const allCards = page.locator(cardSelector);
      const totalNoDom = await allCards.count();
      console.log(`Total cards no DOM: ${totalNoDom}`);

      // Inspect first card thoroughly
      if (totalNoDom > 0) {
        const firstCard = allCards.nth(0);
        const isVis = await firstCard.isVisible();
        const box = await firstCard.boundingBox();
        console.log(`Card 0 isVisible: ${isVis}, boundingBox: ${JSON.stringify(box)}`);

        const cardStyles = await firstCard.evaluate((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          // Walk up the DOM tree
          const ancestors: any[] = [];
          let current: Element | null = el;
          let depth = 0;
          while (current && depth < 8) {
            const tag = current.tagName;
            const cls = (current as HTMLElement).className?.substring(0, 80) || "";
            const pcs = getComputedStyle(current);
            const pr = current.getBoundingClientRect();
            ancestors.push({
              depth,
              tag,
              cls,
              display: pcs.display,
              opacity: pcs.opacity,
              visibility: pcs.visibility,
              overflow: pcs.overflow,
              width: pr.width,
              height: pr.height,
              transform: pcs.transform?.substring(0, 100),
              position: pcs.position,
              animation: pcs.animationName !== "none" ? pcs.animationName : "none",
              transition:
                pcs.transition !== "all 0s ease 0s" ? pcs.transition?.substring(0, 80) : "none",
            });
            current = current.parentElement;
            depth++;
          }

          return {
            self: {
              opacity: cs.opacity,
              visibility: cs.visibility,
              display: cs.display,
              transform: cs.transform?.substring(0, 100),
              width: r.width,
              height: r.height,
              animationName: cs.animationName,
              animationFillMode: cs.animationFillMode,
              willChange: cs.willChange,
            },
            ancestors,
          };
        });

        console.log("\n=== CARD 0 CSS TREE ===");
        console.log(
          `SELF: opacity=${cardStyles.self.opacity} visibility=${cardStyles.self.visibility} display=${cardStyles.self.display} w=${cardStyles.self.width} h=${cardStyles.self.height}`,
        );
        console.log(
          `SELF: transform=${cardStyles.self.transform} animation=${cardStyles.self.animationName} fillMode=${cardStyles.self.animationFillMode} willChange=${cardStyles.self.willChange}`,
        );
        console.log("\nANCESTORS:");
        cardStyles.ancestors.forEach((a: any) => {
          console.log(`  [${a.depth}] ${a.tag}.${a.cls}`);
          console.log(
            `       display=${a.display} opacity=${a.opacity} overflow=${a.overflow} w=${a.width} h=${a.height} pos=${a.position}`,
          );
          if (a.animation !== "none") console.log(`       animation=${a.animation}`);
          if (a.transition !== "none") console.log(`       transition=${a.transition}`);
          if (a.transform !== "none") console.log(`       transform=${a.transform}`);
        });

        // Check for framer-motion / motion.div patterns
        const motionDivs = await page
          .locator('[style*="opacity"], [class*="motion"], [class*="framer"], [class*="animate"]')
          .count();
        console.log(`\nMotion/animation elements on page: ${motionDivs}`);

        // Check prefers-reduced-motion
        const prefersReduced = await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        console.log(`prefers-reduced-motion: ${prefersReduced}`);

        // Check if any card has opacity < 1
        for (let i = 0; i < totalNoDom; i++) {
          const op = await allCards.nth(i).evaluate((el) => getComputedStyle(el).opacity);
          if (op !== "1") {
            console.log(`Card ${i} opacity=${op} (NOT FULLY VISIBLE!)`);
          }
        }
        console.log("All cards opacity check complete");
      }

      await page.screenshot({ path: "e2e/screenshots/t105-catalog-deep-css.png", fullPage: true });
    } finally {
      await browser.close();
    }
  });
});
