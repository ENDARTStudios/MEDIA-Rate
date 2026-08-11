import { Controller, Post, Body, Req, UnauthorizedException } from "@nestjs/common";
import { z } from "zod";
import type { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CuradoriaService } from "./curadoria.service.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";

type CuradoriaRequest = FastifyRequest & { user?: { id: string } };

const relacaoSchema = z.object({
  origem_id: z.string().uuid(),
  destino_id: z.string().uuid(),
  tipo: z.enum([
    "ADAPTACAO_DE",
    "SEQUENCIA_DE",
    "PREQUELA_DE",
    "SPINOFF_DE",
    "MESMO_UNIVERSO",
    "MESMA_HISTORIA_REAL",
  ]),
  nota_editorial: z.string().max(160).optional().nullable(),
});

const premioSchema = z.object({
  midia_id: z.string().uuid(),
  nome: z.string().min(1).max(160),
  categoria: z.string().min(1).max(160),
  ano: z.number().int().min(1900).max(2100),
  venceu: z.boolean().default(true),
  organizacao: z.string().min(1).max(120),
});

const classificacaoSchema = z.object({
  midia_id: z.string().uuid(),
  regiao: z.enum(["BR", "US", "ES"]),
  valor: z.string().min(1).max(32),
  fonte: z.string().min(1).max(32),
});

const generoSchema = z.object({
  midia_id: z.string().uuid(),
  genero_id: z.number().int().positive(),
});

/**
 * T291 (Arquitetura §3) — endpoints de curadoria protegidos por
 * @Roles('CURATOR','ADMIN'). Leitura pública permanece nos endpoints
 * existentes. Zod na fronteira; audit_log em toda mutação.
 */
@ApiTags("curadoria")
@ApiBearerAuth()
@Controller("api/v1/curadoria")
@Roles("CURATOR", "ADMIN")
export class CuradoriaController {
  constructor(private readonly service: CuradoriaService) {}

  private userId(req: CuradoriaRequest): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException("Autenticação necessária.");
    return id;
  }

  @Post("relacoes")
  @ApiOperation({ summary: "Cria/atualiza relação do grafo (CURATOR/ADMIN)" })
  async relacoes(
    @Req() req: CuradoriaRequest,
    @Body(new ZodValidationPipe(relacaoSchema)) body: z.infer<typeof relacaoSchema>,
  ) {
    return this.service.criarRelacao(this.userId(req), body);
  }

  @Post("premios")
  @ApiOperation({ summary: "Cria prêmio da obra (CURATOR/ADMIN)" })
  async premios(
    @Req() req: CuradoriaRequest,
    @Body(new ZodValidationPipe(premioSchema)) body: z.infer<typeof premioSchema>,
  ) {
    return this.service.criarPremio(this.userId(req), body);
  }

  @Post("classificacoes")
  @ApiOperation({ summary: "Upsert de classificação indicativa por região (CURATOR/ADMIN)" })
  async classificacoes(
    @Req() req: CuradoriaRequest,
    @Body(new ZodValidationPipe(classificacaoSchema)) body: z.infer<typeof classificacaoSchema>,
  ) {
    return this.service.upsertClassificacao(this.userId(req), body);
  }

  @Post("generos")
  @ApiOperation({ summary: "Vincula gênero a uma obra (CURATOR/ADMIN)" })
  async generos(
    @Req() req: CuradoriaRequest,
    @Body(new ZodValidationPipe(generoSchema)) body: z.infer<typeof generoSchema>,
  ) {
    return this.service.vincularGenero(this.userId(req), body);
  }
}
