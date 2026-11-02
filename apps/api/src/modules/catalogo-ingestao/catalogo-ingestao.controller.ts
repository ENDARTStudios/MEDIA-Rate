import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { isAdminTokenValid } from "../../common/admin-token.util.js";
import { CatalogoIngestaoService } from "./catalogo-ingestao.service.js";

/**
 * T-DADOS-63 — administração do motor de ingestão do catálogo.
 *
 * Autenticação: header `x-admin-token` (mesmo padrão de metrics/invite/
 * score-job). O AuthGuard global libera esta rota e a validação real acontece
 * aqui, com comparação timing-safe.
 */
@ApiTags("admin")
@Controller("api/v1/catalogo-ingestao")
export class CatalogoIngestaoController {
  constructor(private readonly ingestao: CatalogoIngestaoService) {}

  private exigirToken(req: FastifyRequest): void {
    const bruto = req.headers["x-admin-token"];
    const token = Array.isArray(bruto) ? bruto[0] : bruto;
    if (!isAdminTokenValid(token)) {
      throw new UnauthorizedException("x-admin-token inválido.");
    }
  }

  @Get("status")
  @ApiOperation({ summary: "Status da ingestão em escala: catálogo por tipo, notas e cursores" })
  @ApiResponse({ status: 200, description: "Status agregado (sem PII)." })
  async status(@Req() req: FastifyRequest) {
    this.exigirToken(req);
    return this.ingestao.status();
  }

  @Post("rodada")
  @HttpCode(200)
  @ApiOperation({ summary: "Executa uma rodada de ingestão agora (todos os tipos ativos)" })
  @ApiResponse({ status: 200, description: "Resumo da rodada." })
  async rodada(@Req() req: FastifyRequest) {
    this.exigirToken(req);
    return this.ingestao.rodada();
  }

  @Post("pausa")
  @HttpCode(200)
  @ApiOperation({ summary: "Pausa/retoma a ingestão de um tipo (cursor preservado)" })
  async pausa(
    @Req() req: FastifyRequest,
    @Body() corpo: { tipo?: string; fonte?: string; pausado?: boolean },
  ) {
    this.exigirToken(req);
    const tipo = String(corpo?.tipo ?? "")
      .trim()
      .toUpperCase();
    const fonte = String(corpo?.fonte ?? "").trim();
    if (!tipo || !fonte || typeof corpo?.pausado !== "boolean") {
      throw new BadRequestException("Informe { tipo, fonte, pausado: boolean }.");
    }
    return this.ingestao.alternarPausa(tipo, fonte, corpo.pausado);
  }
}
