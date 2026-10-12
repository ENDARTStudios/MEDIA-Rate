import { Body, Controller, HttpException, HttpStatus, Logger, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { AdminProbingMonitor } from "../../common/admin-probing-monitor.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PasswordService } from "../../common/password.service.js";
import { CacheService } from "../../common/cache.service.js";
import { AdminStepUpService } from "./admin-stepup.service.js";

/** T205 Fase 1 — corpo do step-up: apenas a senha atual do admin. */
const stepUpSchema = z.object({
  senha: z.string().min(1).max(200),
});

interface StepUpUser {
  id: string;
  sessao_id: string;
}

/**
 * T205 Fase 1 — step-up por re-auth de senha (design T204 §5).
 *
 * Confirma a senha do ADMIN autenticado e concede a marca TTL (default 15 min)
 * que o AdminStepUpGuard exige nas ações admin destrutivas (guard aplicado à
 * CLASSE dos controllers admin, rodando DEPOIS da cadeia global Auth → CSRF →
 * Roles → Plan: 401/403/CSRF vêm antes do 428). PasswordService existente, NÃO
 * modificado; audit sanitizado (nunca senha/hash/PII); falhas de senha
 * alimentam o anti-probing (hash de sessão).
 */
@Controller("api/v1/admin")
export class AdminStepUpController {
  private readonly logger = new Logger(AdminStepUpController.name);

  constructor(
    private readonly stepUpService: AdminStepUpService,
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly cache: CacheService,
    private readonly probing: AdminProbingMonitor,
    private readonly audit?: AuditLogService,
  ) {}

  @Post("step-up")
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirma a senha do admin e concede a marca de step-up (15 min)" })
  async stepUp(
    @Req() req: FastifyRequest & { user?: StepUpUser; cookies?: Record<string, string> },
    @Body(new ZodValidationPipe(stepUpSchema))
    body: z.infer<typeof stepUpSchema>,
  ): Promise<{ ok: true; expiresIn: number }> {
    const user = req.user;
    if (!user) {
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Autenticação necessária." },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const registro = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { password_hash: true },
    });
    const hash = registro?.password_hash;
    const ok =
      typeof hash === "string" && hash.length > 0 && (await this.password.verify(body.senha, hash));

    if (!ok) {
      const r = this.probing.registrar("STEPUP_FAIL", "/api/v1/admin/step-up", req.cookies?.sess);
      if (r.repetida) {
        this.logger.warn(
          `ADMIN_STEPUP_FAIL_REPEAT route=/api/v1/admin/step-up sess=${r.hash} count=${r.contagem}`,
        );
      }
      await this.audit?.log({
        entidade: "Admin",
        entidadeId: "step-up",
        acao: "ADMIN_STEPUP_FAIL",
        usuarioId: user.id,
      });
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Credencial inválida." },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const ttl = await this.stepUpService.marcar(user.sessao_id);
    await this.audit?.log({
      entidade: "Admin",
      entidadeId: "step-up",
      acao: "ADMIN_STEPUP_SUCCESS",
      usuarioId: user.id,
    });
    return { ok: true, expiresIn: ttl };
  }
}
