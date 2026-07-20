import type { FastifyAdapter } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { buildHelmetOptions } from "../../src/common/security.config.js";
import { buildCorsOptions } from "../../src/common/cors.config.js";
import { buildRateLimitOptions } from "../../src/common/rate-limit.config.js";

/**
 * Aplica Helmet + CORS + Rate Limit no FastifyAdapter em testes e2e,
 * replicando o que main.ts faz em runtime. HTTPS redirect (T1.1) e
 * exception filter (T1.6) sao aplicados no teste via app.useGlobalGuards
 * e app.useGlobalFilters respectivamente — ver testes especificos.
 */
export async function applySecurityToAdapter(
  adapter: FastifyAdapter,
  options: {
    isProduction?: boolean;
    allowedOrigins?: string[];
    apiPerMinute?: number;
    loginPerMinute?: number;
  } = {},
): Promise<void> {
  const previousNodeEnv = process.env.NODE_ENV;
  if (options.isProduction !== undefined) {
    process.env.NODE_ENV = options.isProduction ? "production" : "test";
  }
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
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
}
