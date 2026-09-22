import { describe, it, expect } from "vitest";
import http from "node:http";
import Fastify, { type FastifyInstance } from "fastify";

/**
 * T044 — e2e de drenagem do shutdown (Fastify, adapter HTTP da API):
 * - uma requisição EM ANDAMENTO termina com 200 após `close()` (drenagem);
 * - novas conexões são recusadas após o fechamento;
 * - nenhum `unhandledRejection` durante o processo.
 *
 * O cliente usa `agent:false` (Connection: close) para que o socket encerre
 * após a resposta — sem keep-alive segurando o `close()` do servidor.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function get(
  port: number,
  path: string,
): Promise<{ status: number; body: string; error?: unknown }> {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path, agent: false }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", (error) => resolve({ status: 0, body: "", error }));
  });
}

describe("T044 — drenagem no shutdown (e2e Fastify)", () => {
  it("requisição em andamento termina 200; novas conexões recusadas; sem unhandledRejection", async () => {
    const rejeicoes: unknown[] = [];
    const onRej = (e: unknown) => rejeicoes.push(e);
    process.on("unhandledRejection", onRej);

    const app: FastifyInstance = Fastify({ logger: false, forceCloseConnections: "idle" });
    app.get("/slow", async () => {
      await sleep(300);
      return { ok: true };
    });
    app.get("/health", async () => ({ status: "ok" }));

    try {
      await app.listen({ port: 0, host: "127.0.0.1" });
      const addr = app.server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      expect(port).toBeGreaterThan(0);

      // health responde antes do shutdown
      expect((await get(port, "/health")).status).toBe(200);

      // dispara a requisição lenta SEM await (fica em andamento)
      const emAndamento = get(port, "/slow");
      await sleep(50); // garante in-flight quando o close começa

      // close DRENA a requisição em andamento
      const fechando = app.close();

      const resp = await emAndamento;
      expect(resp.status).toBe(200);
      expect(JSON.parse(resp.body)).toEqual({ ok: true });

      await fechando;

      // nova conexão recusada após fechar
      const depois = await get(port, "/health");
      expect(depois.status).toBe(0);
      expect(depois.error).toBeDefined();
    } finally {
      try {
        await app.close();
      } catch {
        /* já fechado */
      }
      process.off("unhandledRejection", onRej);
    }

    expect(rejeicoes).toEqual([]);
  });
});
