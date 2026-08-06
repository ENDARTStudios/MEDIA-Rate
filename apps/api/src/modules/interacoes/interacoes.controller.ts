import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  UsePipes,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { InteracoesService } from "./interacoes.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { upsertInteracaoSchema, type UpsertInteracaoDto } from "./interacoes.dto.js";

type InteracaoRequest = FastifyRequest & { user?: { id: string } };

@ApiTags("interacoes")
@ApiBearerAuth()
@Controller("api/v1/interacoes")
@UseGuards(AuthGuard)
export class InteracoesController {
  constructor(private readonly service: InteracoesService) {}

  private userId(req: InteracaoRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException("Autenticação necessária.");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Lista as interações (status+reação) do usuário" })
  async list(@Req() req: InteracaoRequest) {
    return this.service.listar(this.userId(req));
  }

  @Get(":midiaId")
  @ApiOperation({ summary: "Retorna a interação do usuário com uma mídia" })
  async get(@Req() req: InteracaoRequest, @Param("midiaId") midiaId: string) {
    return this.service.obter(this.userId(req), midiaId);
  }

  @Put(":midiaId")
  @ApiOperation({ summary: "Cria/atualiza status+reação de uma mídia" })
  @UsePipes(new ZodValidationPipe(upsertInteracaoSchema))
  async put(
    @Req() req: InteracaoRequest,
    @Param("midiaId") midiaId: string,
    @Body() body: UpsertInteracaoDto,
  ) {
    return this.service.upsert(this.userId(req), midiaId, body);
  }
}
