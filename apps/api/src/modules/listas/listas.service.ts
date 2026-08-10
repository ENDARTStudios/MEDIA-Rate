import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { slugify } from "../../common/slugify.js";
import { QuotaService } from "../quota/quota.service.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Listas colaborativas (Premium — D-132).
 *
 * - Criar lista: Premium (402 com upsell para FREE).
 * - Adicionar item: qualquer usuário logado com o link (colaboração aberta).
 * - Editar/excluir: apenas o dono.
 * - `midia_id` é VarChar sem FK (padrão da watchlist) — join manual com o
 *   catálogo para título/tipo/ano/imagem/score.
 */
@Injectable()
export class ListasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}

  async criar(usuarioId: string, dto: { titulo: string; descricao?: string }) {
    const plano = await this.quota.planoDe(usuarioId);
    if (plano === "FREE") {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: "Payment Required",
          message: "Listas colaborativas são um recurso do plano Premium. Faça upgrade.",
          current_plan: "FREE",
          required_plan: "PREMIUM",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const base = slugify(dto.titulo).slice(0, 48) || "lista";
    let slug = base;
    for (let tentativa = 2; ; tentativa++) {
      const existente = await this.prisma.listaColaborativa.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existente) break;
      slug = `${base}-${tentativa}`;
    }

    return this.prisma.listaColaborativa.create({
      data: {
        dono_id: usuarioId,
        titulo: dto.titulo.trim(),
        descricao: dto.descricao?.trim() || null,
        slug,
      },
    });
  }

  async listarMinhas(usuarioId: string) {
    const listas = await this.prisma.listaColaborativa.findMany({
      where: { dono_id: usuarioId },
      orderBy: { criada_at: "desc" },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        slug: true,
        criada_at: true,
        _count: { select: { itens: true } },
      },
    });
    return listas.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      descricao: l.descricao,
      slug: l.slug,
      criada_at: l.criada_at,
      total_itens: l._count.itens,
    }));
  }

  async obterPorSlug(slug: string, usuarioId?: string) {
    const lista = await this.prisma.listaColaborativa.findUnique({
      where: { slug },
      include: { dono: { select: { id: true, nome: true } } },
    });
    if (!lista) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Lista não encontrada.",
      });
    }

    const itens = await this.prisma.listaItem.findMany({
      where: { lista_id: lista.id },
      orderBy: { criado_at: "desc" },
      select: { id: true, midia_id: true, observacao: true, criado_at: true, adicionado_por: true },
    });
    const midiaIds = itens.map((i) => i.midia_id).filter((id) => UUID_RE.test(id));
    const midias = midiaIds.length
      ? await this.prisma.midia.findMany({
          where: { id: { in: midiaIds } },
          select: {
            id: true,
            titulo: true,
            tipo: true,
            ano_lancamento: true,
            imagem_url: true,
            score: true,
          },
        })
      : [];
    const porId = new Map(midias.map((m) => [m.id, m]));

    return {
      id: lista.id,
      titulo: lista.titulo,
      descricao: lista.descricao,
      slug: lista.slug,
      criada_at: lista.criada_at,
      dono: lista.dono,
      eh_dono: usuarioId != null && usuarioId === lista.dono_id,
      itens: itens.map((i) => {
        const m = porId.get(i.midia_id);
        return {
          id: i.id,
          midia_id: i.midia_id,
          observacao: i.observacao,
          criado_at: i.criado_at,
          adicionado_por: i.adicionado_por,
          titulo: m?.titulo ?? null,
          tipo: m?.tipo ?? null,
          ano_lancamento: m?.ano_lancamento ?? null,
          imagem_url: m?.imagem_url ?? null,
          score: m?.score ?? null,
        };
      }),
    };
  }

  async editar(
    usuarioId: string,
    slug: string,
    dto: { titulo?: string; descricao?: string | null },
  ) {
    const lista = await this.buscarDono(usuarioId, slug);
    return this.prisma.listaColaborativa.update({
      where: { id: lista.id },
      data: {
        titulo: dto.titulo?.trim() || undefined,
        descricao: dto.descricao !== undefined ? dto.descricao?.trim() || null : undefined,
      },
      select: { id: true, titulo: true, descricao: true, slug: true },
    });
  }

  async excluir(usuarioId: string, slug: string): Promise<void> {
    const lista = await this.buscarDono(usuarioId, slug);
    await this.prisma.listaColaborativa.delete({ where: { id: lista.id } });
  }

  async adicionarItem(
    usuarioId: string,
    slug: string,
    dto: { midia_id: string; observacao?: string },
  ) {
    const lista = await this.prisma.listaColaborativa.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!lista) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Lista não encontrada.",
      });
    }
    const existente = await this.prisma.listaItem.findUnique({
      where: { lista_id_midia_id: { lista_id: lista.id, midia_id: dto.midia_id } },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException("Este título já está na lista.");
    }
    return this.prisma.listaItem.create({
      data: {
        lista_id: lista.id,
        midia_id: dto.midia_id,
        adicionado_por: usuarioId,
        observacao: dto.observacao?.trim() || null,
      },
    });
  }

  async removerItem(usuarioId: string, slug: string, itemId: string): Promise<void> {
    const lista = await this.buscarDono(usuarioId, slug);
    const item = await this.prisma.listaItem.findFirst({
      where: { id: itemId, lista_id: lista.id },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Item não encontrado.",
      });
    }
    await this.prisma.listaItem.delete({ where: { id: item.id } });
  }

  private async buscarDono(usuarioId: string, slug: string) {
    const lista = await this.prisma.listaColaborativa.findUnique({
      where: { slug },
      select: { id: true, dono_id: true },
    });
    if (!lista) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Lista não encontrada.",
      });
    }
    if (lista.dono_id !== usuarioId) {
      throw new ForbiddenException("Apenas o dono da lista pode fazer isso.");
    }
    return lista;
  }
}
