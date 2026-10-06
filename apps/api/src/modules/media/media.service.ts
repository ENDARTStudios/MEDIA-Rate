import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { comContextoRls } from "../../common/rls-context.js";
import { slugUnico } from "./slug-service.js";
import { CreateMediaDto, UpdateMediaDto } from "./dto/media.dto.js";
import type { ClassificacaoIndicativa, Prisma, TipoMidia } from "@prisma/client";

const NR_TO_CLASSIFICACAO: Record<number, ClassificacaoIndicativa> = {
  0: "L",
  10: "DEZ",
  12: "DOZE",
  14: "CATORZE",
  16: "DEZESSEIS",
  18: "DEZOITO",
};

function mapCreateDto(dto: CreateMediaDto) {
  return {
    titulo: dto.titulo,
    titulo_original: dto.titulo_original ?? null,
    titulo_en: dto.titulo_en ?? null,
    titulo_es: dto.titulo_es ?? null,
    tipo: dto.tipo,
    sinopse: dto.sinopse,
    sinopse_en: dto.sinopse_en ?? null,
    sinopse_es: dto.sinopse_es ?? null,
    ano_lancamento: dto.ano_lancamento,
    classificacao_indicativa:
      dto.classificacao_indicativa !== undefined
        ? (NR_TO_CLASSIFICACAO[dto.classificacao_indicativa] ?? null)
        : null,
    duracao_minutos: dto.duracao ? Number.parseInt(dto.duracao, 10) || null : null,
    imagem_url: dto.imagem_url ?? null,
    fonte: dto.fonte ?? "manual",
    fonte_id: dto.fonte_id ?? "manual",
  };
}

function mapUpdateDto(dto: UpdateMediaDto) {
  return {
    ...(dto.titulo !== undefined && { titulo: dto.titulo }),
    ...(dto.titulo_original !== undefined && { titulo_original: dto.titulo_original }),
    ...(dto.titulo_en !== undefined && { titulo_en: dto.titulo_en }),
    ...(dto.titulo_es !== undefined && { titulo_es: dto.titulo_es }),
    ...(dto.tipo !== undefined && { tipo: dto.tipo }),
    ...(dto.sinopse !== undefined && { sinopse: dto.sinopse }),
    ...(dto.sinopse_en !== undefined && { sinopse_en: dto.sinopse_en }),
    ...(dto.sinopse_es !== undefined && { sinopse_es: dto.sinopse_es }),
    ...(dto.ano_lancamento !== undefined && { ano_lancamento: dto.ano_lancamento }),
    ...(dto.classificacao_indicativa !== undefined && {
      classificacao_indicativa: NR_TO_CLASSIFICACAO[dto.classificacao_indicativa] ?? null,
    }),
    ...(dto.duracao !== undefined && { duracao_minutos: Number.parseInt(dto.duracao, 10) || null }),
    ...(dto.imagem_url !== undefined && { imagem_url: dto.imagem_url }),
    ...(dto.fonte !== undefined && { fonte: dto.fonte }),
    ...(dto.fonte_id !== undefined && { fonte_id: dto.fonte_id }),
  };
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * T215: unicidade por (fonte, fonte_id) — POST duplicado → 409.
   * Mídia soft-deletada NÃO bloqueia o id (pode ser recriada).
   */
  private async verificarUnicidade(
    client: Prisma.TransactionClient,
    dto: { fonte?: string; fonte_id?: string; excluirId?: string },
  ): Promise<void> {
    const fonte = dto.fonte ?? "manual";
    const fonte_id = dto.fonte_id ?? "manual";
    const existente = await client.midia.findFirst({
      where: {
        fonte,
        fonte_id,
        deleted_at: null,
        ...(dto.excluirId ? { id: { not: dto.excluirId } } : {}),
      },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException({
        statusCode: 409,
        error: "Conflict",
        message: "Mídia com esta fonte/fonte_id já existe.",
      });
    }
  }

  // T328: escritas sob comContextoRls(role ADMIN) — com FORCE RLS as policies
  // de escrita (midia_*_curator) exigem current_user_role IN ('CURATOR','ADMIN').
  async create(dto: CreateMediaDto) {
    return comContextoRls(this.prisma, { role: "ADMIN" }, async (tx) => {
      await this.verificarUnicidade(tx, dto);
      // T398: slug único — desambigua colisões entre tipos com sufixo "-{tipo}".
      const slug = await slugUnico(tx, dto.titulo, dto.tipo);
      return tx.midia.create({ data: { ...mapCreateDto(dto), slug } });
    });
  }

  async update(id: string, dto: UpdateMediaDto) {
    return comContextoRls(this.prisma, { role: "ADMIN" }, async (tx) => {
      const midia = await tx.midia.findFirst({
        where: { id, deleted_at: null },
        select: { id: true, fonte: true, fonte_id: true, titulo: true, tipo: true },
      });
      if (!midia) throw new NotFoundException("Mídia não encontrada.");
      if (dto.fonte !== undefined || dto.fonte_id !== undefined) {
        // Unicidade com os valores RESULTANTES (dto + estado atual).
        await this.verificarUnicidade(tx, {
          fonte: dto.fonte ?? midia.fonte,
          fonte_id: dto.fonte_id ?? midia.fonte_id,
          excluirId: id,
        });
      }
      // T398: título/tipo mudou → recomputa slug com unicidade (exclui a própria).
      const tituloNovo = dto.titulo ?? midia.titulo;
      const tipoNovo = dto.tipo ?? midia.tipo;
      const slug =
        dto.titulo !== undefined || dto.tipo !== undefined
          ? await slugUnico(tx, tituloNovo, tipoNovo as TipoMidia, id)
          : undefined;
      return tx.midia.update({
        where: { id },
        data: { ...mapUpdateDto(dto), ...(slug ? { slug } : {}) },
      });
    });
  }

  /** T215: soft delete — marca deleted_at, nunca remove a linha. */
  async remove(id: string) {
    return comContextoRls(this.prisma, { role: "ADMIN" }, async (tx) => {
      const midia = await tx.midia.findFirst({
        where: { id, deleted_at: null },
        select: { id: true },
      });
      if (!midia) throw new NotFoundException("Mídia não encontrada.");
      return tx.midia.update({
        where: { id },
        // T401 (D-374): NULLa o slug no soft-delete (defesa em profundidade
        // junto ao índice parcial UNIQUE de ativos).
        data: { deleted_at: new Date(), slug: null },
      });
    });
  }

  /** T215: auxiliar de leitura — mídia ativa por id (ou null). */
  async findAtiva(id: string) {
    return this.prisma.midia.findFirst({
      where: { id, deleted_at: null },
    });
  }

  /**
   * T162 (Onda A — Rankings): payload do hub /top por tipo.
   * TOP ordenado pelo score desnormalizado (quirk do engine — ver Midia.score)
   * com gate de >= 2 fontes e fallback para >= 1 quando o gate esvazia a lista
   * (livros/quadrinhos hoje têm coleta de fonte única). Franquias aparecem só
   * com >= 2 mídias ativas do tipo — é o "por onde começar cada universo".
   */
  async topPorTipo(
    tipoRaw: string,
    limiteRaw?: number,
    anoRaw?: number,
  ): Promise<{
    tipo: string;
    ano: number;
    top: Record<string, unknown>[];
    lancamentos_ano: Record<string, unknown>[];
    generos: { id: number; nome: string; slug: string; total_midias: number }[];
    franquias: Record<string, unknown>[];
  }> {
    const TIPOS: Record<string, string> = {
      FILME: "FILME",
      SERIE: "SERIE",
      GAME: "GAME",
      LIVRO: "LIVRO",
      MANGA: "MANGA",
      COMIC: "COMIC",
      // Aliases legados (mesma tabela do controller.list).
      ANIME: "MANGA",
      HQ: "COMIC",
    };
    const tipo = TIPOS[tipoRaw?.toUpperCase?.() ?? ""] as TipoMidia | undefined;
    if (!tipo) {
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: "Tipo inválido. Use FILME, SERIE, GAME, LIVRO, MANGA ou COMIC.",
      });
    }
    const limite = Math.min(20, Math.max(1, Math.trunc(limiteRaw ?? 10) || 10));
    const ano = Math.trunc(anoRaw ?? 0) || new Date().getFullYear();

    const SELECT_RESUMO: Prisma.MidiaSelect = {
      id: true,
      slug: true,
      titulo: true,
      titulo_original: true,
      titulo_en: true,
      titulo_es: true,
      tipo: true,
      ano_lancamento: true,
      imagem_url: true,
      backdrop_url: true,
      score: true,
    };
    const SELECT_COM_FONTE: Prisma.MidiaSelect = {
      ...SELECT_RESUMO,
      scores: {
        select: { num_fontes: true },
        take: 1,
        orderBy: { calculado_em: "desc" },
      },
    };
    const orderByScore: Prisma.MidiaOrderByWithRelationInput = {
      score: { sort: "desc", nulls: "last" },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape do select é dinâmico (gate vs. fallback); payload serializa com JSON.stringify (D-447)
    const comFonte = (rows: any[]) =>
      rows.map((r) => {
        const { scores, ...resto } = r;
        return { ...resto, num_fontes: scores?.[0]?.num_fontes ?? null };
      });

    // 1) TOP com gate de >= 2 fontes (amostra menos ruidosa).
    const comGate = await this.prisma.midia.findMany({
      where: {
        deleted_at: null,
        tipo,
        score: { not: null },
        scores: { some: { num_fontes: { gte: 2 } } },
      },
      orderBy: orderByScore,
      take: limite,
      select: SELECT_COM_FONTE,
    });
    // 2) Fallback: < limite no gate → completa com >= 1 fonte, sem duplicar.
    const top = comFonte(comGate);
    if (top.length < limite) {
      const semGate = await this.prisma.midia.findMany({
        where: { deleted_at: null, tipo, score: { not: null } },
        orderBy: orderByScore,
        take: limite,
        select: SELECT_COM_FONTE,
      });
      const ids = new Set(top.map((i) => i.id as string));
      for (const item of comFonte(semGate)) {
        if (top.length >= limite) break;
        if (!ids.has(item.id as string)) {
          top.push(item);
          ids.add(item.id as string);
        }
      }
    }

    const lancamentos = comFonte(
      await this.prisma.midia.findMany({
        where: { deleted_at: null, tipo, score: { not: null }, ano_lancamento: ano },
        orderBy: orderByScore,
        take: limite,
        select: SELECT_COM_FONTE,
      }),
    );

    // genero.midias passa pela junção MidiaGenero — o filtro de tipo/midia
    // ativa aninha em `midia` (mesmo padrão das franquias abaixo).
    const generosBrutos = await this.prisma.genero.findMany({
      where: { midias: { some: { midia: { tipo, deleted_at: null } } } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        slug: true,
        _count: { select: { midias: { where: { midia: { tipo, deleted_at: null } } } } },
      },
    });
    const generos = generosBrutos.map((g) => ({
      id: g.id,
      nome: g.nome,
      slug: g.slug,
      total_midias: g._count.midias,
    }));

    // "Por onde começar": itens do tipo consultado, ordem cronológica quando
    // diverge do lançamento (nulls first = quem começa a história).
    const franquiasBrutas = await this.prisma.franquia.findMany({
      where: { midias: { some: { midia: { tipo, deleted_at: null } } } },
      select: {
        id: true,
        nome: true,
        slug: true,
        midias: {
          where: { midia: { tipo, deleted_at: null } },
          orderBy: [
            { ordem_cronologica: { sort: "asc", nulls: "first" } },
            { ordem_lancamento: "asc" as const },
          ],
          select: {
            ordem_lancamento: true,
            ordem_cronologica: true,
            midia: { select: SELECT_RESUMO },
          },
        },
      },
    });
    const franquias = franquiasBrutas
      .filter((f) => f.midias.length >= 2)
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        slug: f.slug,
        itens: f.midias.map((v) => ({
          ...v.midia,
          ordens: { lancamento: v.ordem_lancamento, cronologica: v.ordem_cronologica },
        })),
      }));

    return { tipo, ano, top, lancamentos_ano: lancamentos, generos, franquias };
  }
}
