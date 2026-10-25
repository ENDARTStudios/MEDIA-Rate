/**
 * Installs the logo's typeface (Space Grotesk, OFL) into the VectorCraft profile
 * so live text in the document resolves. Run once before rebuilds: node install-font.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VC, sleep } from "./vc.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "fonts");

const vc = new VC();
await vc.connect();

await vc.exec("text.findFontFiles", { folder: FONT_DIR, fonts: [{ family: "Space Grotesk" }] });
let found;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  found = await vc.exec("text.findFontFiles", {});
  if (found.state === "done" || found.state === "failed") break;
}
const files = (found.fonts || []).flatMap((f) => f.files || []);
if (!files.length) throw new Error("Space Grotesk not found in " + FONT_DIR);
console.log("installed:", JSON.stringify(await vc.exec("text.addFontFiles", { files })));
console.log(
  "styles:",
  JSON.stringify((await vc.exec("text.fontList", { family: "Space Grotesk" })).styles),
);
vc.close();
