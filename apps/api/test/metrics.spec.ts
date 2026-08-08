/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MetricsService } from "../src/modules/metrics/metrics.service.js";
import { LokiStream } from "../src/common/loki-stream.js";

describe("MetricsService (T217)", () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService({ registrarRequisicao: () => undefined } as any);
  });

  it("registrarRequisicao: incrementa http_requests_total por método/rota/status", async () => {
    metrics.registrarRequisicao({
      method: "GET",
      route: "/api/v1/midias",
      status: 200,
      duracaoSegundos: 0.02,
    });
    metrics.registrarRequisicao({
      method: "GET",
      route: "/api/v1/midias",
      status: 200,
      duracaoSegundos: 0.03,
    });
    metrics.registrarRequisicao({
      method: "GET",
      route: "/api/v1/midias/:id",
      status: 404,
      duracaoSegundos: 0.01,
    });
    const texto = await metrics.getMetricsText();
    expect(texto).toContain(
      'http_requests_total{method="GET",route="/api/v1/midias",status="200"} 2',
    );
    expect(texto).toContain(
      'http_requests_total{method="GET",route="/api/v1/midias/:id",status="404"} 1',
    );
  });

  it("histograma registra latência nos buckets corretos", async () => {
    metrics.registrarRequisicao({
      method: "GET",
      route: "/health",
      status: 200,
      duracaoSegundos: 0.02,
    });
    metrics.registrarRequisicao({
      method: "GET",
      route: "/health",
      status: 200,
      duracaoSegundos: 0.2,
    });
    const texto = await metrics.getMetricsText();
    expect(texto).toContain("http_request_duration_seconds_bucket");
    expect(texto).toContain('le="0.01"');
    expect(texto).toContain('le="0.05"');
    expect(texto).toContain('le="0.5"');
    expect(texto).toContain('le="5"');
  });

  it("5xx incrementa http_errors_total", async () => {
    metrics.registrarRequisicao({ method: "GET", route: "/x", status: 500, duracaoSegundos: 0.1 });
    const texto = await metrics.getMetricsText();
    expect(texto).toContain('http_errors_total{method="GET",route="/x",status="500"} 1');
    expect(texto).toContain('http_requests_total{method="GET",route="/x",status="500"} 1');
  });

  it("getMetricsText: formato Prometheus (nunca PII/emails)", async () => {
    const texto = await metrics.getMetricsText();
    expect(texto).toContain("# HELP http_requests_total");
    expect(texto).not.toMatch(/@/); // sem emails
    expect(texto).not.toContain("password");
    expect(texto).not.toContain("token");
  });
});

describe("LokiStream (T217)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.LOKI_URL;
  });

  it("flush envia batch para /loki/api/v1/push (JSON, label job)", async () => {
    const enviado: { url: string; corpo: any }[] = [];
    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      enviado.push({ url: String(url), corpo: JSON.parse(opts.body as string) });
      return { ok: true } as Response;
    });

    const stream = new LokiStream("http://loki:3100");
    stream.write({ level: 30, time: 1_700_000_000_000, msg: "teste", password: "[Redacted]" });
    await stream.flush();

    expect(enviado.length).toBe(1);
    expect(enviado[0].url).toBe("http://loki:3100/loki/api/v1/push");
    const linha = enviado[0].corpo.streams[0];
    expect(linha.stream.job).toBe("media-rate-api");
    expect(linha.values[0][1]).toContain("teste");
  });

  it("sem LOKI_URL: flush é no-op (logs nativos do Railway)", async () => {
    const stream = new LokiStream("");
    stream.write({ level: 30, msg: "x" });
    await expect(stream.flush()).resolves.toBeUndefined();
  });

  it("falha de envio é silenciosa (não derruba)", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("loki down");
    });
    const stream = new LokiStream("http://loki:3100");
    stream.write({ level: 30, msg: "x" });
    await expect(stream.flush()).resolves.toBeUndefined();
  });
});
