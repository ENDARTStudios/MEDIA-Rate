/** Opens the finished document in the VectorCraft window and captures it. */
import { VC, sleep } from "./vc.mjs";

const ROOT = "D:\\PROJETOS\\MEDIA Rate\\MEDIA Rate\\design-system\\media-rate\\logo";
const SRC = ROOT + "\\src\\media-rate-logo.vectorcraft";

const vc = new VC();
await vc.connect();

for (let i = 0; i < 8; i++) {
  const r = await vc.exec("file.closeAll", {});
  if (!r || r.pending !== "saveChanges") break;
  await vc.request("ui.dialog.set", { field: "discard", value: true });
  await vc.request("ui.dialog.confirm", {});
}

const opened = await vc.exec("document.open", { path: SRC });
console.log("opened:", JSON.stringify(opened));
await vc.request("ui.focus", {});
await sleep(600);
await vc.request("ui.key", { key: "0", cmd: true }); // fit artboard in window
await sleep(900);
const shot = await vc.request("ui.screenshot", { path: ROOT + "\\exports\\png\\00-vectorcraft-window.png" });
console.log("shot:", JSON.stringify(shot));
vc.close();
