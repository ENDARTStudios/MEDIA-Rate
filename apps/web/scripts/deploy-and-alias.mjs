// Deploy to Vercel production + update media-rate-web.vercel.app alias
// Usage: node scripts/deploy-and-alias.mjs
// The alias auto-update fails because media-rate-web.vercel.app is a manual
// alias (not a production domain). This script fixes it post-deploy.

import { execSync } from "node:child_process";

const PROD_DOMAIN = "media-rate-web.vercel.app";

console.log("[deploy] Deploying to Vercel production...");
try {
  const output = execSync("npx vercel --prod --yes", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: new URL(".", import.meta.url).pathname + "..",
  });
  console.log(output);

  // Extract the deployment URL from the output
  const match = output.match(/Production\s+(https:\/\/[^\s]+)/);
  if (!match) {
    console.error("[deploy] Could not find deployment URL in output.");
    process.exit(1);
  }
  const deployUrl = match[1];
  if (!deployUrl) {
    console.error("[deploy] Missing deployment URL.");
    process.exit(1);
  }
  console.log(`[deploy] Deployment URL: ${deployUrl}`);

  // Update the production domain alias
  console.log(`[deploy] Updating alias ${PROD_DOMAIN} → ${deployUrl}...`);
  const aliasOutput = execSync(`npx vercel alias set ${deployUrl} ${PROD_DOMAIN}`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: new URL(".", import.meta.url).pathname + "..",
  });
  console.log(aliasOutput);
  console.log(`[deploy] ✅ ${PROD_DOMAIN} now points to ${deployUrl}`);
} catch (e) {
  console.error("[deploy] Failed:", e.message);
  process.exit(1);
}
