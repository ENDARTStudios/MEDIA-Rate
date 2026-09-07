import { HttpException, HttpStatus, Logger } from "@nestjs/common";
// T037: import nominal de tipo (o layout ESM-first do sharp 0.35 não expõe
// mais o namespace `sharp.Metadata` para `import sharp from` no tsc).
import sharp, { type Metadata } from "sharp";

/**
 * variants (T031/D-446) — ladder fixa de posters no upload.
 *
 * - Saída: WebP q75 em 320/640/960 (`<uuid>-w{w}.webp`, mesmo diretório do
 *   original). Rungs acima da largura do original são CLAMPED às dimensões
 *   reais (`withoutEnlargement`, nunca upscale) em vez de pulados: a ladder
 *   é sempre completa e a derivação de srcset no frontend (`localSrcSet`,
 *   apps/web/src/lib/image-policy.ts) nunca gera 404.
 * - Segurança (STRIDE): parse real via sharp (magic bytes/header, nunca
 *   extensão/MIME declarados) → 422 em mismatch; `limitInputPixels` 24MP
 *   contra bomba de descompressão (com o body limit vigente de 5MB);
 *   nenhum fetch remoto (zero SSRF); sem execução do arquivo.
 */

export const VARIANT_WIDTHS = [320, 640, 960] as const;
export const VARIANT_QUALITY = 75;
export const MAX_INPUT_PIXELS = 24_000_000; // 24MP

const logger = new Logger("UploadVariants");

function rejeitar(motivo: string): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      error: "Unprocessable Entity",
      message: motivo,
    },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

/** `<uuid>.jpg` → `<uuid>-w320.webp` (contrato lido pelo frontend). */
export function nomeVariante(uuidFilename: string, width: number): string {
  const base = uuidFilename.replace(/\.[a-z0-9]+$/i, "");
  return `${base}-w${width}.webp`;
}

/**
 * Gera a ladder completa a partir dos bytes do original.
 * Lança 422 se o buffer não for imagem parseável ou exceder 24MP.
 */
export async function gerarVariantes(buffer: Buffer): Promise<Map<number, Buffer>> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch (e) {
    logger.warn(`variante rejeitada: parse falhou (${(e as Error)?.message ?? e})`);
    rejeitar("Arquivo não é uma imagem válida.");
  }
  const largura = meta.width ?? 0;
  const altura = meta.height ?? 0;
  if (!largura || !altura || largura * altura > MAX_INPUT_PIXELS) {
    logger.warn(`variante rejeitada: ${largura}x${altura} excede ${MAX_INPUT_PIXELS} px`);
    rejeitar("Imagem excede o limite de 24 megapixels.");
  }

  const ladder = new Map<number, Buffer>();
  for (const w of VARIANT_WIDTHS) {
    try {
      const out = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: w, fit: "inside", withoutEnlargement: true })
        .webp({ quality: VARIANT_QUALITY })
        .toBuffer();
      ladder.set(w, out);
    } catch (e) {
      logger.error(`falha gerando rung w${w}: ${(e as Error)?.message ?? e}`);
      const err = new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Internal Server Error",
          message: "Falha ao processar a imagem.",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      throw err;
    }
  }
  return ladder;
}
