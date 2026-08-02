import { describe, it, expect, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { UploadService } from "../src/modules/upload/upload.service.js";
import { BadRequestException } from "@nestjs/common";

describe("UploadService (unit)", () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();
    service = module.get<UploadService>(UploadService);
  });

  it("validate — JPEG valido (magic bytes FF D8 FF)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/jpeg",
      originalname: "test.jpg",
    });
    expect(result.filename).toMatch(/\.jpg$/);
    expect(result.sha256).toHaveLength(64);
    expect(result.size).toBe(16);
  });

  it("validate — PNG valido (magic bytes 89 50 4E 47)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/png",
      originalname: "test.png",
    });
    expect(result.filename).toMatch(/\.png$/);
  });

  it("validate — GIF valido (magic bytes 47 49 46 38)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x47;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x38;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/gif",
      originalname: "test.gif",
    });
    expect(result.filename).toMatch(/\.gif$/);
  });

  it("validate — WebP valido (magic bytes 52 49 46 46)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/webp",
      originalname: "test.webp",
    });
    expect(result.filename).toMatch(/\.webp$/);
  });

  it("validate — PDF valido (magic bytes 25 50 44 46)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x25;
    buf[1] = 0x50;
    buf[2] = 0x44;
    buf[3] = 0x46;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "application/pdf",
      originalname: "doc.pdf",
    });
    expect(result.filename).toMatch(/\.pdf$/);
  });

  it("validate — MIME nao permitido lanca BadRequestException", () => {
    const buf = Buffer.alloc(16);
    expect(() =>
      service.validateAndPrepare({
        buffer: buf,
        mimetype: "application/exe",
        originalname: "test.exe",
      }),
    ).toThrow(BadRequestException);
  });

  it("validate — arquivo > 10MB lanca BadRequestException", () => {
    const buf = Buffer.alloc(11 * 1024 * 1024);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    expect(() =>
      service.validateAndPrepare({ buffer: buf, mimetype: "image/jpeg", originalname: "big.jpg" }),
    ).toThrow(BadRequestException);
  });

  it("validate — magic bytes nao conferem lanca BadRequestException", () => {
    const buf = Buffer.alloc(16, 0xaa);
    expect(() =>
      service.validateAndPrepare({ buffer: buf, mimetype: "image/jpeg", originalname: "fake.jpg" }),
    ).toThrow(BadRequestException);
  });

  it("validate — SVG (sem magic bytes definidos) aceita normalmente", () => {
    const buf = Buffer.from("<svg></svg>");
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/svg+xml",
      originalname: "icon.svg",
    });
    expect(result.filename).toMatch(/\.svg$/);
  });

  it("validate — arquivo sem extensao usa 'bin' como fallback", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x25;
    buf[1] = 0x50;
    buf[2] = 0x44;
    buf[3] = 0x46;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "application/pdf",
      originalname: "noextension",
    });
    expect(result.filename).toMatch(/\.bin$/);
  });

  it("validate — buffer vazio (0 bytes) lanca BadRequestException nos magic bytes", () => {
    const buf = Buffer.alloc(0);
    expect(() =>
      service.validateAndPrepare({
        buffer: buf,
        mimetype: "image/jpeg",
        originalname: "empty.jpg",
      }),
    ).toThrow(BadRequestException);
  });

  it("validate — filename com multiplos pontos usa ultima extensao", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/jpeg",
      originalname: "photo.test.final.jpg",
    });
    expect(result.filename).toMatch(/\.jpg$/);
  });

  it("validate — SHA-256 hex gerado corretamente", () => {
    const buf = Buffer.from("hello world");
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    const result = service.validateAndPrepare({
      buffer: buf,
      mimetype: "image/jpeg",
      originalname: "hash.jpg",
    });
    expect(result.sha256).toHaveLength(64);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("validate — GIF magic bytes errados (apenas primeiros 2 corretos) lanca erro", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x47;
    buf[1] = 0x49;
    buf[2] = 0x00;
    buf[3] = 0x00;
    expect(() =>
      service.validateAndPrepare({ buffer: buf, mimetype: "image/gif", originalname: "bad.gif" }),
    ).toThrow(BadRequestException);
  });
});
