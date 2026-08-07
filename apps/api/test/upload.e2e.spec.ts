/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import multipart from "@fastify/multipart";
import { rm } from "node:fs/promises";
import * as path from "node:path";
import { UploadModule } from "../src/modules/upload/upload.module.js";
import { CacheModule } from "../src/common/cache.module.js";
import { MetricsModule } from "../src/modules/metrics/metrics.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { CacheInvalidationService } from "../src/common/cache.service.js";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { RolesGuard } from "../src/common/guards/roles.guard.js";

const AUDIT: string[] = [];
let ROLE: "ADMIN" | "USER" = "ADMIN";
let MIDIA_DELETADA = false;

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: ROLE === "ADMIN" ? "admin-1" : "user-1" };
    return true;
  }
}
class FakeRolesGuard implements CanActivate {
  canActivate(): boolean {
    if (ROLE !== "ADMIN") {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        message: "Acesso negado.",
      });
    }
    return true;
  }
}

function jpegBytes(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}
function exeBytes(): Buffer {
  return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
}

describe("Upload de posters — e2e via HTTP (T216)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UploadModule, CacheModule.forRoot(), MetricsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        midia: {
          findFirst: async ({ where }: any) => {
            if (where.id !== "midia-1") return null;
            if (MIDIA_DELETADA) return null; // deleted → treated as missing
            return { id: "midia-1" };
          },
          update: async ({ where, data }: any) => ({ id: where.id, ...data }),
        },
      })
      .overrideProvider(CacheInvalidationService)
      .useValue({ onMediaUpdated: async () => undefined })
      .overrideProvider(AuditLogService)
      .useValue({
        log: async (params: { acao: string }) => {
          // eslint-disable-next-line no-console
          console.log("AUDIT LOG CALLED:", params.acao);
          AUDIT.push(params.acao);
        },
      })
      .overrideGuard(AuthGuard)
      .useValue(new FakeAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(new FakeRolesGuard())
      .compile();

    const adapter = new FastifyAdapter({ logger: false });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await app.register(multipart as never, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
    await rm(path.join(process.cwd(), "uploads", "media"), { recursive: true, force: true });
  });

  beforeEach(() => {
    ROLE = "ADMIN";
    MIDIA_DELETADA = false;
    AUDIT.length = 0;
  });

  it("admin upload jpeg → 201 + poster_url + audit", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", jpegBytes(), "poster.jpg");
    // eslint-disable-next-line no-console
    console.log(
      "UPLOAD STATUS:",
      res.status,
      "BODY:",
      JSON.stringify(res.body).slice(0, 200),
      "AUDIT:",
      JSON.stringify(AUDIT),
    );
    expect(res.status).toBe(201);
    expect(res.body.poster_url).toMatch(/^\/uploads\/media\/midia-1\/[0-9a-f-]{36}\.jpg$/);
    expect(AUDIT).toContain("MEDIA_POSTER_UPLOADED");
  });

  it("non-admin → 403", async () => {
    ROLE = "USER";
    const res = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", jpegBytes(), "poster.jpg");
    expect(res.status).toBe(403);
  });

  it(".exe renomeado .jpg → 415 (magic bytes)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", exeBytes(), "poster.jpg");
    expect(res.status).toBe(415);
  });

  it("arquivo 10MB → 413", async () => {
    const grande = Buffer.concat([jpegBytes(), Buffer.alloc(10 * 1024 * 1024)]);
    const res = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", grande, "grande.jpg");
    expect(res.status).toBe(413);
  });

  it("mídia inexistente ou deletada → 404", async () => {
    const naoExiste = await request(app.getHttpServer())
      .post("/api/v1/midias/desconhecida/upload")
      .attach("file", jpegBytes(), "poster.jpg");
    expect(naoExiste.status).toBe(404);
    MIDIA_DELETADA = true;
    const deletada = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", jpegBytes(), "poster.jpg");
    expect(deletada.status).toBe(404);
  });

  it("GET /uploads/... → 200 com Content-Type do conteúdo + Cache-Control", async () => {
    const up = await request(app.getHttpServer())
      .post("/api/v1/midias/midia-1/upload")
      .attach("file", jpegBytes(), "poster.jpg");
    expect(up.status).toBe(201);
    const url: string = up.body.poster_url;
    const get = await request(app.getHttpServer()).get(url);
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toContain("image/jpeg");
    expect(get.headers["cache-control"]).toContain("max-age=86400");
  });

  it("GET /uploads com filename fora do padrão (path traversal) → 404", async () => {
    const res = await request(app.getHttpServer()).get(
      "/uploads/media/midia-1/..%2F..%2Fpackage.json",
    );
    expect(res.status).toBe(404);
  });
});
