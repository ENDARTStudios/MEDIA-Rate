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

// T038/D-537: schema de mídia do item (reusado no GET lista, GET /:id e PUT).
const MIDIA_ITEM_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    slug: { type: "string", nullable: true },
    titulo: { type: "string" },
    tipo: { type: "string" },
    ano_lancamento: { type: "integer", nullable: true },
    imagem_url: { type: "string", nullable: true },
    score: { type: "number", nullable: true },
  },
};

/** Item do contrato público de interações (allowlist — sem colunas internas). */
const INTERACAO_ITEM_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    midia_id: { type: "string", format: "uuid" },
    status: { type: "string", enum: ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"] },
    reacao: { type: "string", nullable: true, enum: ["GOSTEI", "NAO_GOSTEI"] },
    motivo_abandono: { type: "string", nullable: true },
    progresso_detalhe: { type: "string", nullable: true },
    iniciado_em: { type: "string", format: "date-time", nullable: true },
    concluido_em: { type: "string", format: "date-time", nullable: true },
    atualizado_em: { type: "string", format: "date-time" },
    origem_relacao_id: { type: "string", format: "uuid", nullable: true },
    midia: MIDIA_ITEM_SCHEMA,
  },
};

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
  // T036/B3 (D-536): Swagger reflete o DTO público (allowlist). Colunas
  // internas/legadas (usuario_id, tenant_id, created_at, tipo, rating,
  // comentario) NÃO são expostas.
  @ApiOkResponse({
    description:
      "Envelope paginado { items, total, porStatus, nextCursor }. Cada item é o " +
      "DTO público: id, midia_id, status, reacao, motivo_abandono, progresso_detalhe, " +
      "timestamps e midia{...}.",
    schema: {
      type: "object",
      properties: {
        items: { type: "array", items: INTERACAO_ITEM_SCHEMA },
        total: { type: "integer" },
        porStatus: { type: "object", additionalProperties: { type: "integer" } },
        nextCursor: { type: "string", nullable: true },
      },
    },
  })
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
  @ApiOkResponse({
    description: "Interação do usuário (DTO allowlist) ou null. Sem colunas internas/legadas.",
    schema: INTERACAO_ITEM_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: "Sem sessão válida." })
  @ApiNotFoundResponse({
    description: "404 — midiaId malformado (UUID inválido, validação pré-Prisma) ou sem interação.",
  })
  async get(@Req() req: InteracaoRequest, @Param("midiaId", UuidParamPipe) midiaId: string) {
    return this.service.obter(this.userId(req), midiaId);
  }

  @Put(":midiaId")
  @ApiOperation({ summary: "Cria/atualiza status+reação de uma mídia" })
  @ApiOkResponse({
    description: "Interação criada/atualizada (DTO allowlist). Sem colunas internas/legadas.",
    schema: INTERACAO_ITEM_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: "Sem sessão válida." })
  @ApiBadRequestResponse({ description: "Transição de status/reação/motivo inválidos." })
  @ApiNotFoundResponse({
    description:
      "404 — midiaId malformado (UUID inválido, validação pré-Prisma) ou mídia inexistente.",
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
