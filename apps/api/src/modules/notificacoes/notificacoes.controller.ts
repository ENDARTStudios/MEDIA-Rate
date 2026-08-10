import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { NotificacoesService } from "./notificacoes.service.js";

type NotificacaoRequest = FastifyRequest & { user?: { id: string } };

@ApiTags("notificacoes")
@Controller("api/v1/notificacoes")
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  private userId(req: NotificacaoRequest): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException("Autenticação necessária.");
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Lista notificações do usuário (mais recentes primeiro)" })
  async listar(@Req() req: NotificacaoRequest, @Query("limite") limite?: string) {
    const items = await this.service.listar(this.userId(req), Number(limite) || 30);
    const naoLidas = await this.service.naoLidas(this.userId(req));
    return { items, naoLidas };
  }

  @Post("ler")
  @ApiOperation({ summary: "Marca todas as notificações como lidas" })
  async lerTodas(@Req() req: NotificacaoRequest) {
    await this.service.marcarTodasLidas(this.userId(req));
    return { ok: true };
  }

  @Patch(":id/lida")
  @ApiOperation({ summary: "Marca uma notificação como lida" })
  async marcarLida(@Req() req: NotificacaoRequest, @Param("id") id: string) {
    await this.service.marcarLida(this.userId(req), id);
    return { ok: true };
  }
}
