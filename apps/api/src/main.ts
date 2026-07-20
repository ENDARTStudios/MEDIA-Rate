import "reflect-metadata";
import "dotenv/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { buildHelmetOptions } from "./common/security.config.js";
import { buildCorsOptions } from "./common/cors.config.js";
import { buildRateLimitOptions } from "./common/rate-limit.config.js";
import { GlobalExceptionFilter } from "./common/global-exception.filter.js";
import { HttpsRedirectGuard } from "./common/https-redirect.guard.js";

async function bootstrap(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  const fastifyAdapter = new FastifyAdapter({
    trustProxy: true,
    logger: false,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    bufferLogs: true,
  });

  // T1.2: Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  // X-Powered-By removido).
  await fastifyAdapter.register(helmet, buildHelmetOptions());

  // T1.5: CORS restrito a ALLOWED_ORIGINS (sem wildcard em producao).
  await fastifyAdapter.register(cors, buildCorsOptions());

  // T1.3: Rate limit por IP (100 req/min APIs gerais, 6 req/min login).
  await fastifyAdapter.register(rateLimit, buildRateLimitOptions());

  // T1.1: HTTPS redirect em producao (308 quando x-forwarded-proto=http).
  // Implementado como Guard global porque hooks Fastify registrados fora
  // do Nest sao sobrescritos pelo router do Nest em versoes recentes.
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new HttpsRedirectGuard(reflector));

  // T1.6: Exception filter global.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // T4.2: Swagger OpenAPI 3.1 em /api/v1/docs e /api/v1/docs-json.
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
  const document = SwaggerModule.createDocument(app, config);
  // /api/docs (UI) e /api/docs-json (JSON) — sem /v1 prefix para acesso direto.
  // A ordem FASE-4 pede /api/docs.
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[media-rate-api] listening on http://${host}:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[media-rate-api] Swagger UI: http://${host}:${port}/api/docs`);
}

void bootstrap();
