import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { buildHelmetOptions } from "./common/security.config.js";
import { buildCspHeader, generateRequestNonce } from "./common/security.config.js";
import { buildCorsOptions } from "./common/cors.config.js";
import { buildRateLimitOptions } from "./common/rate-limit.config.js";
import { GlobalExceptionFilter } from "./common/global-exception.filter.js";
import { HttpsRedirectGuard } from "./common/https-redirect.guard.js";

async function bootstrap(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  const isProduction = process.env.NODE_ENV === "production";
  const cspTrustedOrigins = (process.env.CSP_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // T020/7.7: bodyLimit padrao de 1 MiB.
  const fastifyAdapter = new FastifyAdapter({
    trustProxy: true,
    logger: false,
    bodyLimit: 1_048_576, // 1 MiB
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    bufferLogs: true,
  });
  console.log("module graph built");

  // T020/7.3 + T1.3: Rate limit com key generator por user+IP+rota.
  // Store em memoria — Redis distribuido depende de infra conectada (T036).
  await fastifyAdapter.register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rateLimit as any,
    buildRateLimitOptions(),
  );
  console.log("[boot] rate-limit registered");

  // T1.2: Helmet (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
  // CSP gerenciada separadamente via hook onSend (T021/7.1).
  await fastifyAdapter.register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    helmet as any,
    buildHelmetOptions(),
  );

  // T1.5: CORS restrito a ALLOWED_ORIGINS (sem wildcard em producao).
  await fastifyAdapter.register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cors as any,
    buildCorsOptions(),
  );

  // T041: @fastify/cookie — plugin necessario para reply.setCookie/clearCookie.
  await fastifyAdapter.register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cookie as any,
    {
      secret: process.env.COOKIE_SECRET ?? "dev-secret-change-me",
      hook: "onRequest",
    },
  );
  console.log("[boot] plugins registered (rate-limit, helmet, cors, cookie)");

  const fastify = fastifyAdapter.getInstance();

  // T020/7.7: Upload route com bodyLimit de 50 MiB.
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.url === "/api/v1/upload" && routeOptions.method === "POST") {
      routeOptions.bodyLimit = 52_428_800; // 50 MiB
    }
  });

  // T021/7.1: CSP com nonce dinamico por requisicao (script-src sem 'unsafe-inline').
  fastify.addHook("onSend", (_request, reply, _payload, done) => {
    const nonce = generateRequestNonce();
    const csp = buildCspHeader({ nonce, isProduction, cspTrustedOrigins });
    void reply.header("Content-Security-Policy", csp);
    done();
  });

  // T020/7.6: Rejeitar metodos HTTP nao utilizados (TRACE, CONNECT).
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

  // T1.1: HTTPS redirect em producao (308 quando x-forwarded-proto=http).
  app.useGlobalGuards(new HttpsRedirectGuard());

  // T1.6: Exception filter global.
  app.useGlobalFilters(new GlobalExceptionFilter());
  console.log("[boot] hooks + guards done");

  // T4.2: Swagger OpenAPI 3.1 em /api/docs e /api/docs-json.
  const config = new DocumentBuilder()
    .setTitle("MEDIA Rate API")
    .setDescription("Plataforma de descoberta de mídia com MEDIA Score™ unificado.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addTag("auth", "Autenticação e sessão")
    .addTag("media", "Catálogo de mídia e MEDIA Score")
    .addTag("payment", "Checkout e webhooks Stripe")
    .addTag("lgpd", "Direitos do titular de dados")
    .addTag("admin", "Endpoints administrativos")
    .build();
  console.log("[boot] calling app.init + app.listen...");
  try {
    await app.listen(port, "0.0.0.0");
    console.log(`[boot] listening on 0.0.0.0:${port}`);

    // Swagger apos listen (rotas resolvidas)
    try {
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api/docs", app, document);
      console.log("[boot] swagger setup done");
    } catch (swagErr) {
      console.warn(`[boot] swagger setup FAILED (non-blocking): ${String(swagErr)}`);
    }
  } catch (err) {
    console.error(`[boot] listen FAILED: ${String(err)}`);
    throw err;
  }
  console.log(`[media-rate-api] Swagger UI: http://${host}:${port}/api/docs`);
}

void bootstrap().catch((err: unknown) => {
  process.stderr.write(`[boot] FATAL: ${String(err)}\n`);
  process.exit(1);
});
