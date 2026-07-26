import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { QueueService, GracefulShutdownService } from "../src/common/queue.service.js";

describe("QueueService (unit — mock BullMQ)", () => {
  let service: QueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: QueueService,
          useFactory: () => new QueueService({ name: "test", connection: { host: "localhost", port: 6379 } }),
        },
      ],
    }).compile();
    service = module.get<QueueService>(QueueService);
  });

  it("getQueue — cria fila com nome único", () => {
    const q = service.getQueue("test-queue");
    expect(q).toBeDefined();
    expect(q.name).toBe("test-queue");
  });

  it("getQueue — retorna mesma instância", () => {
    const a = service.getQueue("test-queue");
    const b = service.getQueue("test-queue");
    expect(a).toBe(b);
  });

  it("addJob — adiciona job à fila", async () => {
    const spy = vi.spyOn(service.getQueue("test-queue"), "add").mockResolvedValue({ id: "job-1" } as any);
    await service.addJob("test-queue", "test-job", { data: 123 });
    expect(spy).toHaveBeenCalledWith("test-job", { data: 123 }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
  });

  it("closeAll — fecha todas as filas e workers", async () => {
    const q = service.getQueue("q1");
    const closeSpy = vi.spyOn(q, "close").mockResolvedValue();
    await service.closeAll();
    expect(closeSpy).toHaveBeenCalled();
  });
});

describe("GracefulShutdownService (unit)", () => {
  it("enableShutdown — registra handlers SIGTERM e SIGINT", () => {
    const mockQueue = { closeAll: vi.fn().mockResolvedValue(undefined) } as any;
    const svc = new GracefulShutdownService(mockQueue);
    const mockServer = { close: vi.fn((cb: () => void) => cb()) };

    const spyOn = vi.spyOn(process, "on");
    svc.enableShutdown(mockServer);
    expect(spyOn).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(spyOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });
});

describe("QueueModule (unit)", () => {
  it("forRoot — registra QueueService como global", async () => {
    const { QueueModule } = await import("../src/common/queue.module.js");
    const dynamic = QueueModule.forRoot({ redis: { host: "localhost", port: 6379 } });
    expect(dynamic.module).toBe(QueueModule);
    expect(dynamic.global).toBe(true);
    expect(dynamic.providers).toBeDefined();
    expect(dynamic.exports).toEqual([QueueService]);
  });
});
