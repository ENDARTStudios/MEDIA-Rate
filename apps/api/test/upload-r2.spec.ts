import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssetUploadService, ASSET_MAX_SIZE } from "../src/modules/upload/asset-upload.service.js";
import { AssetUploadController } from "../src/modules/upload/asset-upload.controller.js";
import { InMemoryStorage } from "../src/modules/upload/storage/in-memory.storage.js";
import { UploadService } from "../src/modules/upload/upload.service.js";
import { detectarImagemAsset } from "../src/common/utils/file-validation.util.js";

function jpeg(n = 32): Buffer {
  const b = Buffer.alloc(n);
  b[0] = 0xff;
  b[1] = 0xd8;
  b[2] = 0xff;
  return b;
}
function png(n = 32): Buffer {
  const b = Buffer.alloc(n);
  b[0] = 0x89;
  b[1] = 0x50;
  b[2] = 0x4e;
  b[3] = 0x47;
  return b;
}
function webp(n = 32): Buffer {
  const b = Buffer.alloc(n);
  b.write("RIFF", 0, "ascii");
  b.write("WEBP", 8, "ascii");
  return b;
}
function avif(n = 24): Buffer {
  const b = Buffer.alloc(n);
  b.writeUInt32BE(n, 0);
  b.write("ftyp", 4, "ascii");
  b.write("avif", 8, "ascii");
  return b;
}
function gif(n = 16): Buffer {
  const b = Buffer.alloc(n);
  b.write("GIF8", 0, "ascii");
  return b;
}

function statusOf(fn: () => unknown): number | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return (e as { getStatus?: () => number }).getStatus?.();
  }
}

describe("T453 — AssetUploadService (magic bytes + chave content-addressed)", () => {
  let storage: InMemoryStorage;
  let svc: AssetUploadService;

  beforeEach(() => {
    storage = new InMemoryStorage();
    svc = new AssetUploadService(storage);
  });

  it("aceita JPEG/PNG/WebP/AVIF e gera chave content-addressed", async () => {
    for (const [buf, ext] of [
      [jpeg(), "jpg"],
      [png(), "png"],
      [webp(), "webp"],
      [avif(), "avif"],
    ] as const) {
      const r = await svc.enviar({ tipoMidia: "filme", midiaId: "abc-123", buffer: buf });
      expect(r.mime).toMatch(/^image\//);
      expect(r.key).toBe(`media/filme/abc-123/${r.sha256}.${ext}`);
      expect(r.url).toBe(`memory://${r.key}`);
      expect(r.size).toBe(buf.length);
    }
  });

  it("415 para GIF (fora da whitelist) e para não-imagem", () => {
    expect(statusOf(() => svc.validar(gif()))).toBe(415);
    expect(statusOf(() => svc.validar(Buffer.from("not an image at all!!")))).toBe(415);
  });

  it("413 acima de 10 MiB", () => {
    const grande = Buffer.concat([jpeg(8), Buffer.alloc(ASSET_MAX_SIZE)]);
    expect(grande.length).toBeGreaterThan(ASSET_MAX_SIZE);
    expect(statusOf(() => svc.validar(grande))).toBe(413);
  });

  it("400 para arquivo vazio", () => {
    expect(statusOf(() => svc.validar(Buffer.alloc(0)))).toBe(400);
  });

  it("chave NÃO contém fragmento do filename do usuário (sanitização)", () => {
    const key = svc.chaveAsset("../../etc", "id/../x", "a".repeat(64), "jpg");
    expect(key).toBe(`media/etc/idx/${"a".repeat(64)}.jpg`);
    expect(key).not.toContain("..");
    expect(key.startsWith("media/etc/idx/")).toBe(true);
  });

  it("detectarImagemAsset reconhece AVIF e rejeita GIF", () => {
    expect(detectarImagemAsset(avif())?.ext).toBe("avif");
    expect(detectarImagemAsset(gif())).toBeNull();
  });
});

describe("T453 — AssetUploadController (admin, 201 + audit)", () => {
  function fakeReq(buffer: Buffer) {
    return {
      file: async () => ({ toBuffer: async () => buffer, filename: "hack.jpg" }),
      headers: { "user-agent": "vitest" },
      ip: "127.0.0.1",
      user: { id: "admin-1" },
    } as unknown as Parameters<AssetUploadController["upload"]>[2];
  }

  it("201 com key/url/sha256 e registra audit sem PII", async () => {
    const storage = new InMemoryStorage();
    const assets = new AssetUploadService(storage);
    const uploads = new UploadService();
    const prisma = {
      midia: { findFirst: vi.fn().mockResolvedValue({ id: "m-1" }) },
    };
    const audit = { log: vi.fn().mockResolvedValue(undefined) };
    const ctrl = new AssetUploadController(assets, uploads, prisma as never, audit as never);

    const r = await ctrl.upload("m-1", "filme", fakeReq(jpeg()));

    expect(r.key).toBe(`media/filme/m-1/${r.sha256}.jpg`);
    expect(r.mime).toBe("image/jpeg");
    expect(storage.obter(r.key)).not.toBeNull();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entidade: "Midia",
        entidadeId: "m-1",
        acao: "MEDIA_ASSET_UPLOADED",
        usuarioId: "admin-1",
        dadosDepois: expect.objectContaining({ sha256: r.sha256, mime: "image/jpeg" }),
      }),
    );
    // nenhum dado do filename do cliente vaza no audit
    expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toContain("hack.jpg");
  });

  it("404 quando a mídia não existe", async () => {
    const ctrl = new AssetUploadController(
      new AssetUploadService(new InMemoryStorage()),
      new UploadService(),
      { midia: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
      { log: vi.fn() } as never,
    );
    await expect(ctrl.upload("m-x", "filme", fakeReq(jpeg()))).rejects.toMatchObject({
      status: 404,
    });
  });
});
