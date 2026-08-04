import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stats públicas de perfil (Premium — comparador de perfis, D-132).
 * Agrega watchlist (total, por tipo, por coluna), gêneros favoritos e
 * score médio do consumo — sem dados pessoais sensíveis.
 */
@ApiTags("perfil")
@Controller("api/v1/usuarios")
export class PerfilController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":id/stats")
  @ApiOperation({ summary: "Estatísticas públicas de um perfil (comparador)" })
  async stats(@Param("id") id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true },
    });
    if (!usuario) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Perfil não encontrado.",
      });
    }

    const entradas = await this.prisma.watchlistEntry.findMany({
      where: { usuario_id: id },
      select: { midia_id: true, coluna: true },
    });

    const midiaIds = entradas.map((e) => e.midia_id).filter((mid) => UUID_RE.test(mid));
    const porId = new Map<string, { tipo: string; score: number | null; generos: string[] }>();
    if (midiaIds.length > 0) {
      const midias = await this.prisma.midia.findMany({
        where: { id: { in: midiaIds } },
        select: {
          id: true,
          tipo: true,
          score: true,
          generos: { select: { genero: { select: { nome: true } } }, take: 8 },
        },
      });
      for (const m of midias) {
        porId.set(m.id, {
          tipo: m.tipo,
          score: m.score,
          generos: m.generos.map((g) => g.genero.nome),
        });
      }
    }

    const porTipo: Record<string, number> = {};
    const porColuna: Record<string, number> = {};
    const contagemGeneros: Record<string, number> = {};
    const scores: number[] = [];

    for (const e of entradas) {
      porColuna[e.coluna] = (porColuna[e.coluna] ?? 0) + 1;
      const midia = porId.get(e.midia_id);
      if (!midia) continue;
      porTipo[midia.tipo] = (porTipo[midia.tipo] ?? 0) + 1;
      for (const g of midia.generos) {
        contagemGeneros[g] = (contagemGeneros[g] ?? 0) + 1;
      }
      if (midia.score != null) scores.push(midia.score);
    }

    const generosTop = Object.entries(contagemGeneros)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, count]) => ({ nome, count }));
    const scoreMedio =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

    return {
      usuario: { id: usuario.id, nome: usuario.nome },
      total: entradas.length,
      por_tipo: porTipo,
      por_coluna: porColuna,
      generos_top: generosTop,
      score_medio: scoreMedio,
    };
  }
}
