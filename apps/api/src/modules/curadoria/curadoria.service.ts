import { Injectable, NotFoundException, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";

/** T291 — rate limit próprio de curadoria (10/min por usuário). */
const CURADORIA_LIMITE = 10;
const JANELA_MS = 60_000;

interface CriaRelacaoDto {
  origem_id: string;
  destino_id: string;
  tipo: string;
  nota_editorial?: string | null;
}

interface CriaPremioDto {
  midia_id: string;
  nome: string;
  categoria: string;
  ano: number;
  venceu: boolean;
  organizacao: string;
}

interface CriaClassificacaoDto {
  midia_id: string;
  regiao: "BR" | "US" | "ES";
  valor: string;
  fonte: string;
}

interface VinculaGeneroDto {
  midia_id: string;
  genero_id: number;
}

/**
 * T291 (Arquitetura §3) — curadoria de conteúdo (MediaRelation, Award,
 * classificação, gênero). Separada de ADMIN: CURATOR não acessa usuários,
 * billing ou flags. Toda mutação grava audit_log (sem PII).
 */
@Injectable()
export class CuradoriaService {
  private readonly janela = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /** Rate limit por usuário (10/min) — janela deslizante em memória. */
  private verificarRateLimit(usuarioId: string): void {
    const agora = Date.now();
    const timestamps = (this.janela.get(usuarioId) ?? []).filter((t) => agora - t < JANELA_MS);
    if (timestamps.length >= CURADORIA_LIMITE) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Limite de curadoria: 10 operações por minuto.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    timestamps.push(agora);
    this.janela.set(usuarioId, timestamps);
  }

  async criarRelacao(usuarioId: string, dto: CriaRelacaoDto) {
    this.verificarRateLimit(usuarioId);
    const ids = [dto.origem_id, dto.destino_id];
    const existentes = await this.prisma.midia.findMany({
      where: { id: { in: ids }, deleted_at: null },
      select: { id: true },
    });
    if (existentes.length !== 2) {
      throw new NotFoundException("origem_id e destino_id devem existir.");
    }
    const relacao = await this.prisma.relacaoObra.upsert({
      where: { origem_id_destino_id: { origem_id: dto.origem_id, destino_id: dto.destino_id } },
      create: {
        origem_id: dto.origem_id,
        destino_id: dto.destino_id,
        tipo: dto.tipo as never,
        nota_editorial: dto.nota_editorial ?? null,
      },
      update: { tipo: dto.tipo as never, nota_editorial: dto.nota_editorial ?? null },
    });
    await this.audit.log({
      entidade: "relacao_obra",
      entidadeId: relacao.id,
      acao: "CURADORIA_RELACAO_UPSERT",
      usuarioId,
    });
    return relacao;
  }

  async criarPremio(usuarioId: string, dto: CriaPremioDto) {
    this.verificarRateLimit(usuarioId);
    const premio = await this.prisma.premio.create({ data: dto });
    await this.audit.log({
      entidade: "premio",
      entidadeId: premio.id,
      acao: "CURADORIA_PREMIO_CREATE",
      usuarioId,
    });
    return premio;
  }

  async upsertClassificacao(usuarioId: string, dto: CriaClassificacaoDto) {
    this.verificarRateLimit(usuarioId);
    const classificacao = await this.prisma.classificacaoRegiao.upsert({
      where: { midia_id_regiao: { midia_id: dto.midia_id, regiao: dto.regiao } },
      create: { midia_id: dto.midia_id, regiao: dto.regiao, valor: dto.valor, fonte: dto.fonte },
      update: { valor: dto.valor, fonte: dto.fonte },
    });
    await this.audit.log({
      entidade: "classificacao_regiao",
      entidadeId: `${dto.midia_id}:${dto.regiao}`,
      acao: "CURADORIA_CLASSIFICACAO_UPSERT",
      usuarioId,
    });
    return classificacao;
  }

  async vincularGenero(usuarioId: string, dto: VinculaGeneroDto) {
    this.verificarRateLimit(usuarioId);
    const vinculo = await this.prisma.midiaGenero.upsert({
      where: { midia_id_genero_id: { midia_id: dto.midia_id, genero_id: dto.genero_id } },
      create: { midia_id: dto.midia_id, genero_id: dto.genero_id },
      update: {},
    });
    await this.audit.log({
      entidade: "midia_genero",
      entidadeId: `${dto.midia_id}:${dto.genero_id}`,
      acao: "CURADORIA_GENERO_VINCULAR",
      usuarioId,
    });
    return vinculo;
  }
}
