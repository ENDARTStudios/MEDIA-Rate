import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { rm, readdir } from "node:fs/promises";
import * as path from "node:path";
import { HttpException } from "@nestjs/common";
import sharp from "sharp";
import { detectarImagem } from "../src/common/utils/file-validation.util.js";
import { UploadService, UPLOAD_MAX_SIZE } from "../src/modules/upload/upload.service.js";
import { gerarVariantes } from "../src/modules/upload/variants.js";
import { UploadController } from "../src/modules/upload/upload.controller.js";

function jpegBytes(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}
function pngBytes(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
function webpBytes(): Buffer {
  const b = Buffer.alloc(14);
  b.write("RIFF", 0, "ascii");
  b.write("WEBP", 8, "ascii");
  return b;
}
function exeBytes(): Buffer {
  return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ
}

describe("file-validation.util (T216)", () => {
  it("detecta JPEG/PNG/GIF/WebP por magic bytes", () => {
    expect(detectarImagem(jpegBytes())).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(detectarImagem(pngBytes())).toEqual({ mime: "image/png", ext: "png" });
    expect(detectarImagem(webpBytes())).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it("rejeita arquivo não-imagem (exe) e buffer curto", () => {
    expect(detectarImagem(exeBytes())).toBeNull();
    expect(detectarImagem(Buffer.from([0xff, 0xd8]))).toBeNull(); // truncado
    expect(detectarImagem(Buffer.alloc(0))).toBeNull();
  });
});

const UUID_OK = "123e4567-e89b-12d3-a456-426614174000";

describe("UploadService (T216)", () => {
  let service: UploadService;
  const uploadsDir = path.join(process.cwd(), "uploads", "media");

  beforeAll(() => {
    service = new UploadService();
  });

  afterAll(async () => {
    await rm(uploadsDir, { recursive: true, force: true });
  });

  it("validarEPreparar: nome UUID + extensão do MAGIC (nunca do cliente)", () => {
    const r = service.validarEPreparar(jpegBytes());
    expect(r.mime).toBe("image/jpeg");
    expect(r.ext).toBe("jpg");
    expect(r.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validarEPreparar: .exe renomeado .jpg → 415 (magic não confere)", () => {
    try {
      service.validarEPreparar(exeBytes());
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(415);
    }
  });

  it("validarEPreparar: arquivo > 5MB → 413", () => {
    const grande = Buffer.concat([jpegBytes(), Buffer.alloc(UPLOAD_MAX_SIZE + 1)]);
    try {
      service.validarEPreparar(grande);
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(413);
    }
  });

  it("salvar: grava em uploads/media/:id/ e retorna o caminho", async () => {
    const destino = await service.salvar("midia-1", jpegBytes(), `${UUID_OK}.jpg`);
    expect(destino).toContain(path.join("uploads", "media", "midia-1"));
    expect(service.caminhoArquivo("midia-1", `${UUID_OK}.jpg`)).toBe(destino);
  });

  it("caminhoArquivo: path traversal e nomes fora do padrão → null", () => {
    expect(service.caminhoArquivo("midia-1", "../etc/passwd")).toBeNull();
    expect(service.caminhoArquivo("midia-1", "não-uuid.jpg")).toBeNull();
    expect(service.caminhoArquivo("midia-1", `${UUID_OK}.jpg.exe`)).toBeNull();
    expect(service.caminhoArquivo("midia-1", `${UUID_OK}.jpg`)).not.toBeNull();
  });

  it("registrarUpload: 10/h por admin → 11ª lança 429; admins têm cotas separadas", () => {
    for (let i = 0; i < 10; i++) service.registrarUpload("admin-1");
    try {
      service.registrarUpload("admin-1");
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
    expect(() => service.registrarUpload("admin-2")).not.toThrow();
  });

  it("salvarVariantes: persiste ladder <uuid>-w320/640/960.webp; caminhoArquivo resolve", async () => {
    const buf = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#112233" },
    })
      .jpeg()
      .toBuffer();
    const salvas = await service.salvarVariantes(
      "midia-v",
      `${UUID_OK}.jpg`,
      await gerarVariantes(buf),
    );
    expect(salvas.map((s) => s.width).sort((a, b) => a - b)).toEqual([320, 640, 960]);
    for (const s of salvas) {
      expect(s.filename).toMatch(/-w(320|640|960)\.webp$/);
      expect(service.caminhoArquivo("midia-v", s.filename)).not.toBeNull();
    }
    expect(service.caminhoArquivo("midia-v", "x-w320.webp")).toBeNull();
  });

  it("upload: falha na ladder → 500 genérico + rollback do original (sem órfãos)", async () => {
    const buf = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#445566" },
    })
      .jpeg()
      .toBuffer();
    const prisma = {
      midia: {
        findFirst: async () => ({ id: "midia-rb" }),
        update: async () => ({}),
      },
    };
    const controller = new UploadController(service, prisma as never);
    const req = {
      user: { id: "admin-9" },
      file: async () => ({ toBuffer: async () => buf }),
      headers: {},
      ip: "127.0.0.1",
    };
    const spy = vi
      .spyOn(service, "salvarVariantes")
      .mockRejectedValueOnce(new Error("disco cheio"));
    try {
      await controller.upload("midia-rb", req as never);
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(500);
      expect((e as HttpException).message).not.toContain("disco cheio");
    } finally {
      spy.mockRestore();
    }
    const restam = await readdir(path.join(uploadsDir, "midia-rb")).catch(() => []);
    expect(restam).toEqual([]);
  });
});
