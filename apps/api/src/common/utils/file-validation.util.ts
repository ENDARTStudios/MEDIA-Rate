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
  avif: "image/avif",
};

/**
 * T453 — whitelist ESTRITA para assets (jpeg/png/webp/avif; sem GIF) validada
 * por MAGIC BYTES (nunca extensão/MIME declarado). Base da chave
 * content-addressed do upload para R2.
 */
export function detectarImagemAsset(buffer: Buffer): ImagemDetectada | null {
  if (!buffer || buffer.length < 12) return null;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  // WebP: RIFF....WEBP
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  // AVIF: box ISO-BMFF `ftyp` com brand `avif`/`avis`.
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", ext: "avif" };
  }
  return null;
}
