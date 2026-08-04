import {
  Body,
  Controller,
  Delete,
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
import { ListasService } from "./listas.service.js";

type ListasRequest = FastifyRequest & { user?: { id: string } };

@ApiTags("listas")
@Controller("api/v1/listas")
export class ListasController {
  constructor(private readonly service: ListasService) {}

  private userId(req: ListasRequest): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException("Autenticação necessária.");
    return id;
  }

  @Post()
  @ApiOperation({ summary: "Cria uma lista colaborativa (Premium)" })
  async criar(@Req() req: ListasRequest, @Body() body: { titulo: string; descricao?: string }) {
    return this.service.criar(this.userId(req), body);
  }

  @Get()
  @ApiOperation({ summary: "Minhas listas" })
  async minhas(@Req() req: ListasRequest) {
    return this.service.listarMinhas(this.userId(req));
  }

  @Get(":slug")
  @ApiOperation({ summary: "Lista colaborativa por slug (pública com o link)" })
  async obter(@Param("slug") slug: string, @Req() req: ListasRequest) {
    return this.service.obterPorSlug(slug, req.user?.id);
  }

  @Patch(":slug")
  @ApiOperation({ summary: "Edita título/descrição (dono)" })
  async editar(
    @Req() req: ListasRequest,
    @Param("slug") slug: string,
    @Body() body: { titulo?: string; descricao?: string | null },
  ) {
    return this.service.editar(this.userId(req), slug, body);
  }

  @Delete(":slug")
  @ApiOperation({ summary: "Exclui a lista (dono)" })
  async excluir(@Req() req: ListasRequest, @Param("slug") slug: string) {
    await this.service.excluir(this.userId(req), slug);
    return { ok: true };
  }

  @Post(":slug/itens")
  @ApiOperation({ summary: "Adiciona um título à lista (qualquer usuário logado)" })
  async adicionarItem(
    @Req() req: ListasRequest,
    @Param("slug") slug: string,
    @Body() body: { midia_id: string; observacao?: string },
  ) {
    return this.service.adicionarItem(this.userId(req), slug, body);
  }

  @Delete(":slug/itens/:itemId")
  @ApiOperation({ summary: "Remove um item da lista (dono)" })
  async removerItem(
    @Req() req: ListasRequest,
    @Param("slug") slug: string,
    @Param("itemId") itemId: string,
  ) {
    await this.service.removerItem(this.userId(req), slug, itemId);
    return { ok: true };
  }
}
