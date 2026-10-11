/**
 * T192 (CodeQL js/path-injection) — UploadsController.servir (GET público).
 *
 * Verifica a ponta HTTP do path-injection: params maliciosos viram 404 sem
 * tocar filesystem; caminho legítimo continua servindo com o Content-Type
 * correto. Filesystem real apenas em `uploads/media` (gitignored) + cleanup.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { rm } from "node:fs/promises";
import * as path from "node:path";
import { NotFoundException } from "@nestjs/common";
import { UploadService } from "../src/modules/upload/upload.service.js";
import { UploadsController } from "../src/modules/upload/upload.controller.js";

const UUID_OK = "123e4567-e89b-12d3-a456-426614174000";
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "media");

function replyFake() {
  return { header: vi.fn() } as unknown as { header: ReturnType<typeof vi.fn> };
}

describe("T192 — UploadsController.servir: path-injection", () => {
  let controller: UploadsController;
  const service = new UploadService();

  beforeAll(async () => {
    controller = new UploadsController(service);
    await service.salvar(UUID_OK, Buffer.from([0xff, 0xd8, 0xff, 0xe0]), `${UUID_OK}.jpg`);
  });

  afterAll(async () => {
    await rm(UPLOADS_DIR, { recursive: true, force: true });
  });

  it.each([
    ["../../etc/passwd"],
    ["..%2F..%2Fetc%2Fpasswd"],
    ["....//etc/passwd"],
    [`${UUID_OK}.jpg\u0000.png`],
    ["C:\\windows\\system32\\config\\SAM"],
  ])("filename malicioso (%j) → 404 sem tocar disco", async (filename) => {
    await expect(controller.servir(UUID_OK, filename, replyFake() as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(["../../etc", "..%2Fetc", ".."])("midiaId malicioso (%j) → 404", async (midiaId) => {
    await expect(
      controller.servir(midiaId, `${UUID_OK}.jpg`, replyFake() as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("caminho legítimo continua servindo bytes com Content-Type correto", async () => {
    const reply = replyFake();
    const bytes = await controller.servir(UUID_OK, `${UUID_OK}.jpg`, reply as never);
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect((bytes as Buffer).length).toBe(4);
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    expect(reply.header).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
  });
});
