import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

/** Métodos que mudam estado — GET/HEAD/OPTIONS não precisam de CSRF. */
const METODOS_MUTAVEIS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest() as {
      method?: string;
      cookies?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
    };
    const reply = context.switchToHttp().getResponse() as {
      status: (code: number) => { send: (body: unknown) => void };
    };

    // T325: double-submit só em métodos mutantes (GET não muda estado).
    const method = (req.method ?? "GET").toUpperCase();
    if (!METODOS_MUTAVEIS.has(method)) return true;

    // Se nao ha sessao, deixa passar — o AuthGuard retorna 401.
    const hasSession = !!req.cookies?.["sess"];
    if (!hasSession) return true;

    const cookieToken = req.cookies?.csrf_token;
    const headerVal = req.headers["x-csrf-token"];
    const headerToken = Array.isArray(headerVal) ? headerVal[0] : headerVal;

    if (!cookieToken || !headerToken) {
      reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "CSRF token inválido.",
      });
      return false;
    }

    try {
      const a = Buffer.from(headerToken, "utf-8");
      const b = Buffer.from(cookieToken, "utf-8");
      if (a.byteLength !== b.byteLength) {
        reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "CSRF token inválido.",
        });
        return false;
      }
      if (!timingSafeEqual(a, b)) {
        reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "CSRF token inválido.",
        });
        return false;
      }
      return true;
    } catch {
      reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "CSRF token inválido.",
      });
      return false;
    }
  }
}
