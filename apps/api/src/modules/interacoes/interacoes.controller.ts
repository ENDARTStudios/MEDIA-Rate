import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { InteracoesService } from "./interacoes.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe.js";
import {
  upsertInteracaoSchema,
  listInteracoesQuerySchema,
  type UpsertInteracaoDto,
  type ListInteracoesQueryDto,
} from "./interacoes.dto.js";

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
  @ApiOperation({
    summary: "Lista as interações (status+reação) do usuário, paginadas e filtráveis",
    description:
      "D-525 — fonte da biblioteca. Retorna envelope { items, total, porStatus, nextCursor }; " +
      "somente dados do próprio usuário (RLS owner-only). Rate limit global do gateway se aplica.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"],
  })
  @ApiQuery({
    name: "tipo",
    required: false,
    enum: ["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"],
  })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "1-50 (default 50)" })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "Token opaco de nextCursor",
  })
  @ApiOkResponse({ description: "Envelope paginado de interações do usuário" })
  @ApiUnauthorizedResponse({ description: "Sem sessão válida." })
  @ApiBadRequestResponse({ description: "Query inválida (enum/limit/cursor)." })
  async list(
    @Req() req: InteracaoRequest,
    @Query(new ZodValidationPipe(listInteracoesQuerySchema)) query: ListInteracoesQueryDto,
  ) {
    return this.service.listar(this.userId(req), query);
  }

  @Get(":midiaId")
  @ApiOperation({ summary: "Retorna a interação do usuário com uma mídia" })
  @ApiNotFoundResponse({
    description: "404 — midiaId malformado (UUID inválido, validação pré-Prisma) ou sem interação.",
  })
  async get(@Req() req: InteracaoRequest, @Param("midiaId", UuidParamPipe) midiaId: string) {
    return this.service.obter(this.userId(req), midiaId);
  }

  @Put(":midiaId")
  @ApiOperation({ summary: "Cria/atualiza status+reação de uma mídia" })
  @ApiNotFoundResponse({
    description: "404 — midiaId malformado (UUID inválido, validação pré-Prisma) ou mídia inexistente.",
  })
  async put(
    @Req() req: InteracaoRequest,
    @Param("midiaId", UuidParamPipe) midiaId: string,
    // T308: pipe no PARÂMETRO (não no método) — @UsePipes no método validaria
    // o @Param (string) contra o schema do body e quebraria com "expected
    // object, received string". Mesmo padrão do watchlist PATCH.
    @Body(new ZodValidationPipe(upsertInteracaoSchema)) body: UpsertInteracaoDto,
  ) {
    return this.service.upsert(this.userId(req), midiaId, body);
  }
}
