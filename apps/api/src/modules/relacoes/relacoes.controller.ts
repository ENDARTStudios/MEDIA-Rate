import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RelacoesService, type CriarRelacaoDto } from "./relacoes.service.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { criarRelacaoSchema } from "./relacoes.dto.js";
import { Roles } from "../../common/decorators/roles.decorator.js";

@ApiTags("relacoes")
@Controller("api/v1/midias/:id/relacoes")
export class RelacoesController {
  constructor(private readonly service: RelacoesService) {}

  @Get()
  @ApiOperation({ summary: "Grafo bidirecional de obras relacionadas (Addendum 3)" })
  async listar(@Param("id") id: string) {
    return this.service.listarBidirecional(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Admin — cria aresta de relação (1 aresta ativa a funcionalidade)" })
  async criar(
    @Param("id") _id: string,
    // T308: pipe no PARÂMETRO (o @UsePipes no método validaria o @Param string
    // contra o schema do body — "expected object, received string").
    @Body(new ZodValidationPipe(criarRelacaoSchema)) body: CriarRelacaoDto,
  ) {
    return this.service.criar(body);
  }

  @Delete(":relId")
  @ApiBearerAuth()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Admin — remove aresta de relação" })
  async remover(@Param("relId") relId: string) {
    return this.service.remover(relId);
  }
}
