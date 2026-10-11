/**
 * T192 (CodeQL js/path-injection) — UploadService com guard de caminho.
 *
 * Filesystem REAL apenas dentro de `uploads/media` (gitignored; mesma
 * convenção de upload.spec.ts), com cleanup. Nenhum acesso a produção.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rm, access } from "node:fs/promises";
import * as path from "node:path";
import { UploadService } from "../src/modules/upload/upload.service.js";
import { CaminhoBloqueadoError } from "../src/common/path-guard.js";

const UUID_OK = "123e4567-e89b-12d3-a456-426614174000";
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "media");

describe("T192 — UploadService: guard de caminho (path-injection)", () => {
  let service: UploadService;

  beforeAll(() => {
    service = new UploadService();
  });

  afterAll(async () => {
    await rm(UPLOADS_DIR, { recursive: true, force: true });
  });

  describe("caminhoArquivo (GET público)", () => {
    it("aceita nome legítimo gerado por nós (original e variantes)", () => {
      const original = service.caminhoArquivo(UUID_OK, `${UUID_OK}.jpg`);
      expect(original).toBe(path.join(UPLOADS_DIR, UUID_OK, `${UUID_OK}.jpg`));
      const variante = service.caminhoArquivo(UUID_OK, `${UUID_OK}-w640.webp`);
      expect(variante).toBe(path.join(UPLOADS_DIR, UUID_OK, `${UUID_OK}-w640.webp`));
    });

    it.each([
      "../../../etc/passwd",
      "..%2F..%2Fetc%2Fpasswd",
      `${UUID_OK}.jpg/../../etc/passwd`,
      `${UUID_OK}.jpg\u0000.png`,
      "%2e%2e%2fetc",
      "....//etc",
      "C:\\windows\\system32\\config\\SAM",
      "/etc/passwd",
    ])("rejeita filename malicioso: %j", (filename) => {
      expect(service.caminhoArquivo(UUID_OK, filename)).toBeNull();
    });

    it.each(["../../etc", "..%2Fetc", "a/b", "a\\b", ".."])(
      "rejeita midiaId malicioso: %j",
      (midiaId) => {
        expect(service.caminhoArquivo(midiaId, `${UUID_OK}.jpg`)).toBeNull();
      },
    );

    it("nunca devolve caminho fora de uploads/media", () => {
      const p = service.caminhoArquivo(UUID_OK, `${UUID_OK}.png`);
      expect(p).toBeTruthy();
      const base = path.resolve(UPLOADS_DIR);
      expect(path.resolve(p as string).startsWith(base + path.sep)).toBe(true);
    });
  });

  describe("salvar/salvarVariantes/remover (mutações)", () => {
    it("grava upload legítimo dentro de uploads/media e permite remover", async () => {
      const filename = `${UUID_OK}.jpg`;
      const destino = await service.salvar(UUID_OK, Buffer.from("bytes"), filename);
      expect(path.resolve(destino).startsWith(path.resolve(UPLOADS_DIR) + path.sep)).toBe(true);
      await expect(access(destino)).resolves.toBeUndefined();
      await service.remover(UUID_OK, filename);
      await expect(access(destino)).rejects.toBeTruthy();
    });

    it.each(["../../etc", "..%2Fetc", "/etc", "a\\b", ".."])(
      "salvar rejeita midiaId malicioso antes de tocar o disco: %j",
      async (midiaId) => {
        await expect(
          service.salvar(midiaId, Buffer.from("x"), `${UUID_OK}.jpg`),
        ).rejects.toBeInstanceOf(CaminhoBloqueadoError);
      },
    );

    it("salvar rejeita filename malicioso", async () => {
      await expect(
        service.salvar(UUID_OK, Buffer.from("x"), "../../evil.jpg"),
      ).rejects.toBeInstanceOf(CaminhoBloqueadoError);
    });

    it("salvarVariantes rejeita midiaId malicioso", async () => {
      await expect(
        service.salvarVariantes("../etc", `${UUID_OK}.jpg`, new Map([[320, Buffer.from("x")]])),
      ).rejects.toBeInstanceOf(CaminhoBloqueadoError);
    });

    it("remover rejeita midiaId/filename maliciosos (não falha em silêncio)", async () => {
      await expect(service.remover("../etc", `${UUID_OK}.jpg`)).rejects.toBeInstanceOf(
        CaminhoBloqueadoError,
      );
      await expect(service.remover(UUID_OK, "../../evil.jpg")).rejects.toBeInstanceOf(
        CaminhoBloqueadoError,
      );
    });
  });
});
