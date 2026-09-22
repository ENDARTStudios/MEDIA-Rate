import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { GracefulShutdownService } from "../src/common/queue.service.js";

const processMock = vi.hoisted(() => {
  const handlers: Record<string, () => void> = {};
  return {
    handlers,
    on: vi.fn((sig: string, fn: () => void) => {
      handlers[sig] = fn;
    }),
    exit: vi.fn(() => undefined as never),
  };
});

describe("GracefulShutdownService (T211)", () => {
  let service: GracefulShutdownService;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    processMock.handlers["SIGTERM"] = () => undefined;
    processMock.handlers["SIGINT"] = () => undefined;
    vi.spyOn(process, "on").mockImplementation(processMock.on as never);
    vi.spyOn(process, "exit").mockImplementation(processMock.exit as never);
    logSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    service = new GracefulShutdownService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("registra handlers SIGTERM e SIGINT", () => {
    service.enableShutdown(async () => undefined);
    expect(processMock.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(processMock.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("shutdown normal: executa onShutdown, loga completo e sai com código 0", async () => {
    const onShutdown = vi.fn(async () => undefined);
    service.enableShutdown(onShutdown);
    processMock.handlers["SIGTERM"]();
    await vi.runAllTimersAsync();

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(processMock.exit).toHaveBeenCalledWith(0);
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Graceful shutdown iniciado"))).toBe(
      true,
    );
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Shutdown completo"))).toBe(true);
  });

  it("idempotente: segundo sinal não reinicia o shutdown", async () => {
    const onShutdown = vi.fn(async () => undefined);
    service.enableShutdown(onShutdown);
    processMock.handlers["SIGTERM"]();
    processMock.handlers["SIGINT"]();
    await vi.runAllTimersAsync();
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it("timeout de 30s: forca saida com código 1 quando onShutdown trava", async () => {
    service.enableShutdown(async () => new Promise(() => undefined)); // nunca resolve
    processMock.handlers["SIGTERM"]();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(processMock.exit).toHaveBeenCalledWith(1);
  });

  it("erro no recurso: onShutdown rejeita → loga erro e sai com código 1", async () => {
    service.enableShutdown(async () => {
      throw new Error("recurso falhou");
    });
    processMock.handlers["SIGTERM"]();
    await vi.runAllTimersAsync();
    expect(processMock.exit).toHaveBeenCalledWith(1);
  });

  it("integração: SIGTERM fecha HTTP, Prisma, Redis e filas — erro em um não impede os demais", async () => {
    // Réplica do wiring do main.ts com recursos fake.
    const http = { close: vi.fn(async () => undefined) };
    const prisma = {
      $disconnect: vi.fn(async () => {
        throw new Error("prisma falhou"); // erro em um recurso
      }),
    };
    const cache = { shutdown: vi.fn(async () => undefined) };
    const queue = { closeAll: vi.fn(async () => undefined) };
    const app = {
      close: http.close,
      get: (token: unknown) => {
        if (token === "prisma") return prisma;
        if (token === "cache") return cache;
        if (token === "queue") return queue;
        return undefined;
      },
    };

    service.enableShutdown(async () => {
      try {
        await app.close();
      } catch {
        /* continua */
      }
      const p = app.get("prisma");
      if (p) {
        try {
          await p.$disconnect();
        } catch {
          /* continua */
        }
      }
      const c = app.get("cache");
      if (c) {
        try {
          await c.shutdown();
        } catch {
          /* continua */
        }
      }
      const q = app.get("queue");
      if (q) {
        try {
          await q.closeAll();
        } catch {
          /* continua */
        }
      }
    });
    processMock.handlers["SIGTERM"]();
    await vi.runAllTimersAsync();

    // Todos os recursos foram fechados mesmo com erro no Prisma.
    expect(http.close).toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(cache.shutdown).toHaveBeenCalled();
    expect(queue.closeAll).toHaveBeenCalled();
    expect(processMock.exit).toHaveBeenCalledWith(0);
  });

  it("T044: timeout configurável via SHUTDOWN_TIMEOUT_MS", async () => {
    process.env.SHUTDOWN_TIMEOUT_MS = "1000";
    try {
      processMock.exit.mockClear();
      service.enableShutdown(async () => new Promise(() => undefined));
      processMock.handlers["SIGTERM"]();
      await vi.advanceTimersByTimeAsync(999);
      expect(processMock.exit).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(processMock.exit).toHaveBeenCalledWith(1);
    } finally {
      delete process.env.SHUTDOWN_TIMEOUT_MS;
    }
  });

  it("T044: timeout inválido cai no default (30s)", async () => {
    process.env.SHUTDOWN_TIMEOUT_MS = "abc";
    try {
      processMock.exit.mockClear();
      service.enableShutdown(async () => new Promise(() => undefined));
      processMock.handlers["SIGTERM"]();
      await vi.advanceTimersByTimeAsync(29_999);
      expect(processMock.exit).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(processMock.exit).toHaveBeenCalledWith(1);
    } finally {
      delete process.env.SHUTDOWN_TIMEOUT_MS;
    }
  });
});
