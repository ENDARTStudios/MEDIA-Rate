import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConsentService } from "./consent.service.js";
import { RegistrarConsentDto, type RegistrarConsentDtoType } from "./consent.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import type { AuthenticatedUser } from "../../common/guards/auth.guard.js";

/**
 * Consentimento (T443) — trilha auditável do que o titular autorizou.
 * - POST /api/v1/consent — registra a escolha (append-only).
 * - GET  /api/v1/consent/history — histórico do próprio usuário (owner-only).
 * Ambos exigem sessão autenticada (AuthGuard); o histórico é do próprio titular.
 */
@ApiTags("consent")
@Controller("api/v1/consent")
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Registra a escolha de consentimento (append-only)" })
  @ApiResponse({ status: 201, description: "Consentimento registrado." })
  @ApiResponse({ status: 429, description: "Muitas requisições." })
  async registrar(
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
    @Body(new ZodValidationPipe(RegistrarConsentDto)) body: unknown,
  ): Promise<{ registrado: boolean }> {
    const user = req.user;
    if (!user) throw new Error("Usuário não autenticado.");
    return this.consent.registrar(user.id, body as RegistrarConsentDtoType, req.ip);
  }

  @Get("history")
  @ApiOperation({ summary: "Histórico de consentimento do próprio titular (owner-only)" })
  @ApiResponse({ status: 200, description: "Histórico de consentimento (ts em ms epoch, Number)." })
  async historico(@Req() req: FastifyRequest & { user?: AuthenticatedUser }): Promise<unknown[]> {
    const user = req.user;
    if (!user) throw new Error("Usuário não autenticado.");
    return this.consent.historico(user.id);
  }
}
