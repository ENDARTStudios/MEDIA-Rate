import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  correlationId: string;
  timestamp: string;
}

/**
 * Mapa de status code -> texto (Reason-Phrase do RFC 9110).
 * NestJS 11 removeu HttpStatus.getStatusText; mantemos mapa local.
 */
const STATUS_TEXT = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
} as const;

/**
 * Exception filter global (T1.6).
 *
 * Comportamento:
 * - HttpException: preserva statusCode e message do exception. Em producao,
 *   remove qualquer detalhe adicional que possa vazar info (stack, internal
 *   paths). Em desenvolvimento, mantem details para debug.
 * - Erro nao-HTTP (Error generico): retorna 500 Internal Server Error com
 *   mensagem generica. Em producao, NUNCA inclui stack trace nem message
 *   original (pode conter secretos ou paths internos). Em desenvolvimento,
 *   inclui message original para debug.
 * - Gera correlationId (UUID v4) para cada erro, retornado no body e no
 *   header X-Request-Id. Permite rastrear o erro nos logs.
 * - Loga o erro completo (com stack) internamente no servidor, nunca no body.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const isProduction = process.env.NODE_ENV === "production";

    const correlationId = (request.headers["x-request-id"] as string | undefined) ?? randomUUID();

    let statusCode: number;
    let error = "";
    let message: string;
    let internalMessage: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responsePayload = exception.getResponse();
      if (typeof responsePayload === "string") {
        message = responsePayload;
      } else if (responsePayload !== null && typeof responsePayload === "object") {
        const payload = responsePayload as Record<string, unknown>;
        message =
          typeof payload.message === "string"
            ? payload.message
            : Array.isArray(payload.message)
              ? payload.message.join("; ")
              : exception.message;
        // Validation pipes (ZodValidationPipe) include `details` — keep them.
        if (payload.details !== undefined && !isProduction) {
          (response as unknown as { _details?: unknown })._details = payload.details;
        }
        // Se o payload inclui `error` (padrao NestHttpException), usa.
        if (typeof payload.error === "string") {
          error = payload.error;
        }
      } else {
        message = exception.message;
      }
      // Fallback: derivar do status code (ex.: 409 -> Conflict).
      if (!error) {
        error = STATUS_TEXT[statusCode as keyof typeof STATUS_TEXT] ?? "Error";
      }
      internalMessage = `HttpException ${statusCode} ${error}: ${exception.message}`;
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = "Internal Server Error";
      // Em producao, NUNCA expor exception.message original (pode vazar segredos).
      message = isProduction
        ? "Ocorreu um erro interno inesperado. Tente novamente."
        : exception.message;
      internalMessage = `Unhandled error: ${exception.message}`;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = "Internal Server Error";
      message = isProduction
        ? "Ocorreu um erro interno inesperado. Tente novamente."
        : "Unknown non-Error thrown";
      internalMessage = `Non-Error thrown: ${String(exception)}`;
    }

    // Log interno (com stack se houver) — nunca vai pro body da resposta.
    const logContext = {
      correlationId,
      method: request.method,
      url: request.url,
      statusCode,
      error,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      stack: exception instanceof Error ? exception.stack : undefined,
    };
    if (statusCode >= 500) {
      this.logger.error(internalMessage, logContext);
    } else {
      this.logger.warn(internalMessage, logContext);
    }

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    // Preserva details de validacao em nao-producao.
    const details = (response as unknown as { _details?: unknown })._details;
    if (details !== undefined) {
      (body as unknown as { details?: unknown }).details = details;
    }

    void response.header("X-Request-Id", correlationId);
    void response.status(statusCode).send(body);
  }
}
