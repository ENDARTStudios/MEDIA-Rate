/**
 * WaitlistNotify — captura pública de e-mail para categorias futuras (T185).
 *
 * POST /api/v1/waitlist-notify { email, category }
 * - Validação Zod (email formato, category enum) na fronteira.
 * - Rate limit por IP (sliding window em memória, 10/hora) → 429.
 * - Unique (email+category) → 409 dup.
 * - Sucesso → 201 genérico; NUNCA retorna emails armazenados.
 * - Sem auth (lead capture público); sem PII em logs.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { waitlistNotifySchema, type WaitlistNotifyDto } from "./dto/waitlist-notify.dto.js";
import { WaitlistNotifyService } from "./waitlist-notify.service.js";

@ApiTags("waitlist-notify")
@Controller("api/v1/waitlist-notify")
export class WaitlistNotifyController {
  constructor(private readonly service: WaitlistNotifyService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Captura lead de e-mail para categoria futura (público)" })
  @UsePipes(new ZodValidationPipe(waitlistNotifySchema))
  async notificar(
    @Req() req: FastifyRequest,
    @Body() body: WaitlistNotifyDto,
  ): Promise<{ ok: true }> {
    const ip = req.ip ?? "desconhecido";
    if (!this.service.permitirPorIp(ip)) {
      throw new HttpException(
        "Muitas solicitações. Tente novamente mais tarde.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.service.registrar(body.email.toLowerCase(), body.category);
    return { ok: true };
  }
}
