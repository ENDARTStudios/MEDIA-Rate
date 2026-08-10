import { describe, it, expect, beforeEach, vi } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import { WaitlistNotifyController } from "../src/modules/waitlist-notify/waitlist-notify.controller.js";
import { WaitlistNotifyService } from "../src/modules/waitlist-notify/waitlist-notify.service.js";
import { waitlistNotifySchema } from "../src/modules/waitlist-notify/dto/waitlist-notify.dto.js";
import type { FastifyRequest } from "fastify";

function mockReq(ip = "10.0.0.1") {
  return { ip } as unknown as FastifyRequest;
}

describe("WaitlistNotifyController (unit)", () => {
  let controller: WaitlistNotifyController;
  let service: WaitlistNotifyService;

  beforeEach(() => {
    service = {
      permitirPorIp: vi.fn(() => true),
      registrar: vi.fn(async () => undefined),
    } as unknown as WaitlistNotifyService;
    controller = new WaitlistNotifyController(service);
  });

  it("201: cria lead com email+categoria válidos", async () => {
    const res = await controller.notificar(mockReq(), {
      email: "eu@exemplo.com",
      category: "book",
    });
    expect(res).toEqual({ ok: true });
    expect(service.registrar).toHaveBeenCalledWith("eu@exemplo.com", "book");
  });

  it("400: categoria fora do enum é rejeitada pelo Zod", async () => {
    const dto = waitlistNotifySchema.safeParse({ email: "eu@exemplo.com", category: "filme" });
    expect(dto.success).toBe(false);
  });

  it("400: email inválido é rejeitado", async () => {
    const dto = waitlistNotifySchema.safeParse({ email: "nao-email", category: "book" });
    expect(dto.success).toBe(false);
  });

  it("400: campo extra é rejeitado (strict)", async () => {
    const dto = waitlistNotifySchema.safeParse({
      email: "eu@exemplo.com",
      category: "book",
      extra: true,
    });
    expect(dto.success).toBe(false);
  });

  it("409: duplicata (email+category) vira conflito genérico", async () => {
    const erro: HttpException & { code?: string } = new HttpException("dup", HttpStatus.CONFLICT);
    erro.code = "P2002";
    service.registrar = vi.fn(async () => {
      throw erro;
    });
    await expect(
      controller.notificar(mockReq(), { email: "dup@exemplo.com", category: "comic" }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it("429: rate limit por IP nega a solicitação", async () => {
    service.permitirPorIp = vi.fn(() => false);
    await expect(
      controller.notificar(mockReq("10.0.0.9"), { email: "eu@exemplo.com", category: "anime" }),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it("normaliza email para minúsculas antes de registrar", async () => {
    await controller.notificar(mockReq(), { email: "EU@Exemplo.COM", category: "book" });
    expect(service.registrar).toHaveBeenCalledWith("eu@exemplo.com", "book");
  });
});
