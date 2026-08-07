/**
 * T216 — validação de imagem por MAGIC BYTES (nunca por Content-Type ou
 * extensão do cliente). Extensão derivada do conteúdo real.
 */
export interface ImagemDetectada {
  mime: string;
  ext: string;
}

const MAGIC_IMAGENS: { mime: string; ext: string; magic: number[]; checarWebp?: boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", ext: "gif", magic: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46], checarWebp: true },
];

/** Detecta a imagem real pelos primeiros bytes; null = não suportada. */
export function detectarImagem(buffer: Buffer): ImagemDetectada | null {
  if (!buffer || buffer.length < 4) return null;
  for (const f of MAGIC_IMAGENS) {
    const casa = f.magic.every((b, i) => buffer[i] === b);
    if (!casa) continue;
    if (f.checarWebp) {
      // RIFF....WEBP — "WEBP" nos bytes 8..11.
      if (buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WEBP") {
        return { mime: f.mime, ext: f.ext };
      }
      continue;
    }
    return { mime: f.mime, ext: f.ext };
  }
  return null;
}

/** MIME derivado de uma extensão SERVIDA (gerada por nós, nunca do cliente). */
export const EXT_PARA_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
