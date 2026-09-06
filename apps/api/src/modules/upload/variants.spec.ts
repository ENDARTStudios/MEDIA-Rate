import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { HttpException } from "@nestjs/common";
import {
  gerarVariantes,
  nomeVariante,
  VARIANT_WIDTHS,
  VARIANT_QUALITY,
  MAX_INPUT_PIXELS,
} from "./variants.js";

async function jpegFixture(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#224466" },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** CRC32 (ISO 3309) mínimo para montar o fixture "bomba" sem dependências. */
function crc32(buf: Buffer): number {
  let table = (crc32 as { t?: number[] }).t;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as { t?: number[] }).t = table;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = (table[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo: string, dados: Buffer): Buffer {
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([len, corpo, crc]);
}

/** PNG que declara 50000×50000 no IHDR (2.5G px > 24MP) com IDAT mínima válida. */
function bombaPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(50000, 0);
  ihdr.writeUInt32BE(50000, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  // Bloco deflate "stored" vazio: zlib válido de 11 bytes (ordem de chunks OK,
  // o header IHDR é lido e o pixel-cap dispara antes de qualquer decode).
  const idat = Buffer.from([0x78, 0x01, 0x01, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x01]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function statusDe(e: unknown): number | null {
  return e instanceof HttpException ? e.getStatus() : null;
}

describe("variants (T031)", () => {
  it("gera ladder 320/640/960 WebP q75 de JPEG 1200×800", async () => {
    const mapa = await gerarVariantes(await jpegFixture(1200, 800));
    expect([...mapa.keys()].sort((a, b) => a - b)).toEqual([...VARIANT_WIDTHS]);
    expect(VARIANT_QUALITY).toBe(75);
    for (const w of VARIANT_WIDTHS) {
      const buf = mapa.get(w);
      expect(buf).toBeDefined();
      const bytes = buf as Buffer;
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      const meta = await sharp(bytes).metadata();
      expect(meta.width).toBe(w);
      expect(meta.format).toBe("webp");
    }
  });

  it("original menor que o rung: clamped sem upscale (ladder sempre completa, sem 404)", async () => {
    const mapa = await gerarVariantes(await jpegFixture(500, 400));
    expect(mapa.size).toBe(3);
    const w960 = await sharp(mapa.get(960)).metadata();
    expect(w960.width).toBeLessThanOrEqual(500);
  });

  it("bomba de descompressão (50000×50000 > 24MP) → 422", async () => {
    expect(MAX_INPUT_PIXELS).toBe(24_000_000);
    try {
      await gerarVariantes(bombaPng());
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(statusDe(e)).toBe(422);
    }
  });

  it("buffer lixo (não parseável) → 422", async () => {
    try {
      await gerarVariantes(Buffer.from("isto não é imagem nem de longe 12345"));
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(statusDe(e)).toBe(422);
    }
  });

  it("nomeVariante: <uuid>-w320.webp (mesmo diretório lógico)", () => {
    expect(nomeVariante("123e4567-e89b-12d3-a456-426614174000.jpg", 320)).toBe(
      "123e4567-e89b-12d3-a456-426614174000-w320.webp",
    );
  });
});
