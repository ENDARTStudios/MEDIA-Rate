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
import { capturarSentry } from "./sentry.js";

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  correlationId: string;
  timestamp: string;
  // T293: presente apenas quando o erro é 5xx e o Sentry está habilitado.
  sentryEventId?: string;
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
 * T070/D-551 — descrição SEGURA (sem valores) de um valor não-Error lançado.
 * Inclui tipo, construtor e NOMES de chaves — nunca os valores (PII/segredos).
 */
function descreverNaoErro(valor: unknown): string {
  if (valor === null) return "null";
  const tipo = typeof valor;
  if (tipo !== "object") return `${tipo}: ${String(valor).slice(0, 120)}`;
  const ctor = (valor as { constructor?: { name?: string } }).constructor?.name ?? "Object";
  const chaves = Object.keys(valor as Record<string, unknown>)
    .slice(0, 12)
    .join(",");
  return `Object(ctor=${ctor}; chaves=[${chaves}])`;
}

/**
 * T072/D-551 — statusCode numérico seguro (400–599) de um objeto não-Error
 * (ex.: o rate limit do `@fastify/rate-limit` lança `{statusCode,error,message}`).
 * Retorna `null` se ausente/inválido (mantém 500).
 */
function statusDeNaoErro(valor: unknown): number | null {
  if (valor === null || typeof valor !== "object") return null;
  const sc = (valor as { statusCode?: unknown }).statusCode;
  if (typeof sc !== "number" || !Number.isInteger(sc) || sc < 400 || sc > 599) return null;
  return sc;
}

/** T072: mensagem canônica por status (NUNCA ecoa o objeto lançado). */
const MSG_POR_STATUS: Record<number, string> = {
  401: "Autenticação necessária.",
  403: "Acesso negado.",
  404: "Recurso não encontrado.",
  409: "Conflito.",
  429: "Limite de requisições excedido. Tente novamente em breve.",
};

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
      // T072/D-551: honra statusCode numérico válido (400–599) de objeto
      // Nest-like lançado como não-Error (ex.: 429 do rate limit) — SEM ecoar
      // message/error/keys do objeto (mensagem canônica do status).
      const honrado = statusDeNaoErro(exception);
      if (honrado !== null) {
        statusCode = honrado;
        error = STATUS_TEXT[honrado as keyof typeof STATUS_TEXT] ?? "Error";
        message = MSG_POR_STATUS[honrado] ?? `Requisição não processada (${honrado}).`;
        internalMessage = `Non-Error com statusCode honrado ${honrado}: ${descreverNaoErro(exception)}`;
      } else {
        internalMessage = `Non-Error thrown: ${descreverNaoErro(exception)}`;
      }
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

    // T293: Sentry apenas em 5xx, com correlationId ligando UI → API.
    const user = (request as FastifyRequest & { user?: { id?: string } }).user;
    const sentryEventId =
      statusCode >= 500
        ? capturarSentry(exception, {
            correlationId,
            userId: user?.id,
            path: request.url,
            method: request.method,
            statusCode,
            error,
          })
        : undefined;

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(sentryEventId ? { sentryEventId } : {}),
    };

    // Preserva details de validacao em nao-producao.
    const details = (response as unknown as { _details?: unknown })._details;
    if (details !== undefined) {
      (body as unknown as { details?: unknown }).details = details;
    }

    void response.header("X-Request-Id", correlationId);
    void response.header("X-Correlation-Id", correlationId);
    void response.status(statusCode).send(body);
  }
}
