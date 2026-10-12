import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AdminStepUpService } from "./admin-stepup.service.js";

/**
 * T205 Fase 1 — guarda de step-up, aplicada à CLASSE dos controllers admin
 * (AdminController, FeatureFlagsController, AssetUploadController). Por ser um
 * guard de controller, roda DEPOIS dos guards globais (Auth → CSRF → Roles →
 * Plan): 401/403/CSRF vêm antes do 428.
 *
 * Regra: requisições MUTANTES (POST/PATCH/PUT/DELETE) sob /api/v1/admin/* —
 * exceto o próprio /step-up — exigem marca TTL válida (AdminStepUpService).
 * GET/HEAD/OPTIONS liberados. Kill-switch de rollback:
 * ADMIN_STEPUP_REQUIRED=0 desliga (sem deploy de código).
 *
 * FAIL-CLOSED: falha do store, sessão ausente ou qualquer erro = 428.
 */
@Injectable()
export class AdminStepUpGuard implements CanActivate {
  constructor(private readonly stepUp: AdminStepUpService) {}

  private habilitado(): boolean {
    return process.env.ADMIN_STEPUP_REQUIRED !== "0";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.habilitado()) return true;

    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: { sessao_id?: string };
      }
    >();
    const method = request.method?.toUpperCase() ?? "GET";
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
    const url = (request.url ?? "").split("?")[0] ?? "";
    if (!url.startsWith("/api/v1/admin/")) return true;
    if (url === "/api/v1/admin/step-up") return true; // o próprio step-up

    const sessaoId = request.user?.sessao_id;
    if (!sessaoId) return this.negar();

    let temMarca = false;
    try {
      temMarca = await this.stepUp.temMarca(sessaoId);
    } catch {
      temMarca = false; // fail-closed
    }
    if (temMarca) return true;
    return this.negar();
  }

  private negar(): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.PRECONDITION_REQUIRED,
        error: "Precondition Required",
        message: "Confirme sua senha para executar esta ação.",
        code: "ADMIN_STEPUP_REQUIRED",
      },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
}
