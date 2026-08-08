/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Logger } from "@nestjs/common";
import { AlertsService } from "../src/modules/metrics/alerts.service.js";

function makeAlerts() {
  const auditLog = { log: vi.fn(async () => undefined) };
  const service = new AlertsService(auditLog as any);
  return { service, auditLog };
}

describe("AlertsService (T218, 9.5.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("5xx > 1% em 5min → ACTIVE + audit ALERT_TRIGGERED + log error", async () => {
    const { service, auditLog } = makeAlerts();
    const errSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    for (let i = 0; i < 99; i++) service.registrarRequisicao(200);
    service.registrarRequisicao(500);
    service.registrarRequisicao(500); // ratio 2/101 ≈ 1.98% > 1%

    const alertas = await service.calcular();
    const a5xx = alertas.find((a) => a.nome === "5xx_rate")!;
    expect(a5xx.estado).toBe("active");
    expect(a5xx.valorAtual).toBeGreaterThan(0.01);
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ALERT_TRIGGERED", entidadeId: "5xx_rate" }),
    );
    expect(errSpy).toHaveBeenCalled();
  });

  it("histerese: entre 90% e 100% do threshold permanece ACTIVE; abaixo resolve", async () => {
    const { service, auditLog } = makeAlerts();
    for (let i = 0; i < 99; i++) service.registrarRequisicao(200);
    service.registrarRequisicao(500);
    service.registrarRequisicao(500); // 1.98% → active
    await service.calcular();

    // 2/210 = 0.95% (entre 0.9% e 1%) → permanece ACTIVE (sem flapping).
    for (let i = 0; i < 108; i++) service.registrarRequisicao(200);
    const entre = await service.calcular();
    expect(entre.find((a) => a.nome === "5xx_rate")!.estado).toBe("active");

    // 2/300 = 0.67% (< 0.9%) → RESOLVED.
    for (let i = 0; i < 90; i++) service.registrarRequisicao(200);
    const resolvido = await service.calcular();
    expect(resolvido.find((a) => a.nome === "5xx_rate")!.estado).toBe("resolved");
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ALERT_RESOLVED", entidadeId: "5xx_rate" }),
    );
  });

  it("janela de 5min expira: eventos antigos somem e o alerta resolve", async () => {
    const { service } = makeAlerts();
    for (let i = 0; i < 99; i++) service.registrarRequisicao(200);
    service.registrarRequisicao(500);
    service.registrarRequisicao(500); // active
    await service.calcular();

    vi.setSystemTime(new Date("2026-08-08T12:06:00Z")); // +6min
    const depois = await service.calcular();
    expect(depois.find((a) => a.nome === "5xx_rate")!.estado).toBe("resolved");
    expect(depois.find((a) => a.nome === "5xx_rate")!.valorAtual).toBe(0);
  });

  it("auth failures > 50 em 1min → ACTIVE (WARNING) + ALERT_TRIGGERED", async () => {
    const { service, auditLog } = makeAlerts();
    for (let i = 0; i < 51; i++) service.registrarFalhaAuth();
    const alertas = await service.calcular();
    const auth = alertas.find((a) => a.nome === "auth_failures")!;
    expect(auth.estado).toBe("active");
    expect(auth.valorAtual).toBe(51);
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ALERT_TRIGGERED", entidadeId: "auth_failures" }),
    );
  });

  it("auth: janela de 1min expira → RESOLVED + ALERT_RESOLVED", async () => {
    const { service, auditLog } = makeAlerts();
    for (let i = 0; i < 51; i++) service.registrarFalhaAuth();
    await service.calcular(); // active

    vi.setSystemTime(new Date("2026-08-08T12:01:30Z")); // +90s
    const depois = await service.calcular();
    expect(depois.find((a) => a.nome === "auth_failures")!.estado).toBe("resolved");
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "ALERT_RESOLVED", entidadeId: "auth_failures" }),
    );
  });

  it("status inicial: ambos resolved com ultimoDisparo null", async () => {
    const { service } = makeAlerts();
    const alertas = await service.calcular();
    expect(alertas).toHaveLength(2);
    expect(alertas.every((a) => a.estado === "resolved")).toBe(true);
    expect(alertas.every((a) => a.ultimoDisparo === null)).toBe(true);
  });
});
