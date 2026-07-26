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

  it("validate — JPEG válido (magic bytes FF D8 FF)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
    const result = service.validateAndPrepare({ buffer: buf, mimetype: "image/jpeg", originalname: "test.jpg" });
    expect(result.filename).toMatch(/\.jpg$/);
    expect(result.sha256).toHaveLength(64);
    expect(result.size).toBe(16);
  });

  it("validate — PNG válido (magic bytes 89 50 4E 47)", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4E; buf[3] = 0x47;
    const result = service.validateAndPrepare({ buffer: buf, mimetype: "image/png", originalname: "test.png" });
    expect(result.filename).toMatch(/\.png$/);
  });

  it("validate — MIME não permitido lança BadRequestException", () => {
    const buf = Buffer.alloc(16);
    expect(() => service.validateAndPrepare({ buffer: buf, mimetype: "application/exe", originalname: "test.exe" }))
      .toThrow(BadRequestException);
  });

  it("validate — arquivo > 10MB lança BadRequestException", () => {
    const buf = Buffer.alloc(11 * 1024 * 1024);
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
    expect(() => service.validateAndPrepare({ buffer: buf, mimetype: "image/jpeg", originalname: "big.jpg" }))
      .toThrow(BadRequestException);
  });

  it("validate — magic bytes não conferem lança BadRequestException", () => {
    const buf = Buffer.alloc(16, 0xAA); // wrong bytes
    expect(() => service.validateAndPrepare({ buffer: buf, mimetype: "image/jpeg", originalname: "fake.jpg" }))
      .toThrow(BadRequestException);
  });

  it("validate — SVG (sem magic bytes definidos) aceita normalmente", () => {
    const buf = Buffer.from("<svg></svg>");
    const result = service.validateAndPrepare({ buffer: buf, mimetype: "image/svg+xml", originalname: "icon.svg" });
    expect(result.filename).toMatch(/\.svg$/);
  });

  it("validate — arquivo sem extensão usa 'bin' como fallback", () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x25; buf[1] = 0x50; buf[2] = 0x44; buf[3] = 0x46;
    const result = service.validateAndPrepare({ buffer: buf, mimetype: "application/pdf", originalname: "noextension" });
    expect(result.filename).toMatch(/\.bin$/);
  });
});
