import type { FastifyAdapter } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { buildHelmetOptions } from "../../src/common/security.config.js";
import { buildCspHeader, generateRequestNonce } from "../../src/common/security.config.js";
import { buildCorsOptions } from "../../src/common/cors.config.js";
import { buildRateLimitOptions } from "../../src/common/rate-limit.config.js";

export async function applySecurityToAdapter(
  adapter: FastifyAdapter,
  options: {
    isProduction?: boolean;
    allowedOrigins?: string[];
    apiPerMinute?: number;
    loginPerMinute?: number;
    bodyLimit?: number;
  } = {},
): Promise<void> {
  const previousNodeEnv = process.env.NODE_ENV;
  if (options.isProduction !== undefined) {
    process.env.NODE_ENV = options.isProduction ? "production" : "test";
  }
  const isProduction = process.env.NODE_ENV === "production";

  try {
    await adapter.register(helmet, buildHelmetOptions());
    await adapter.register(cors, buildCorsOptions({ allowedOrigins: options.allowedOrigins }));
    await adapter.register(
      rateLimit,
      buildRateLimitOptions({
        apiPerMinute: options.apiPerMinute,
        loginPerMinute: options.loginPerMinute,
      }),
    );

    const fastify = adapter.getInstance();

    // T021/7.1: CSP com nonce dinamico
    fastify.addHook("onSend", (_request, reply, _payload, done) => {
      const nonce = generateRequestNonce();
      const csp = buildCspHeader({ nonce, isProduction, cspTrustedOrigins: [] });
      void reply.header("Content-Security-Policy", csp);
      done();
    });

    // T020/7.6: Rejeitar TRACE e CONNECT
    fastify.addHook("onRequest", (request, reply, done) => {
      const blockedMethods = ["TRACE", "CONNECT"];
      if (blockedMethods.includes(request.method.toUpperCase())) {
        void reply.status(405).send({
          statusCode: 405,
          error: "Method Not Allowed",
          message: `Metodo HTTP ${request.method} nao permitido neste servidor.`,
        });
        return;
      }
      done();
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
}
