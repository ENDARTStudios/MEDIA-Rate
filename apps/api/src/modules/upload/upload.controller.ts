import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Res,
  Param,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Optional,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { UploadService } from "./upload.service.js";
import { gerarVariantes } from "./variants.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { CacheInvalidationService } from "../../common/cache.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { EXT_PARA_MIME } from "../../common/utils/file-validation.util.js";

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  filename: string;
}

type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

/**
 * T216 — upload de posters (admin) + servimento público.
 *
 * POST /api/v1/midias/:id/upload — @Roles('ADMIN'); multipart via
 * @fastify/multipart; validação por magic bytes (415), limite 5MB (413),
 * nome UUID server-side, storage local, poster_url atualizado + cache
 * invalidado + audit.
 *
 * GET /uploads/media/:midiaId/:filename — público (lista do AuthGuard);
 * Content-Type derivado do conteúdo servido (ext gerada por nós).
 */
@Controller("api/v1/midias")
export class UploadController {
  constructor(
    private readonly service: UploadService,
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheInvalidation?: CacheInvalidationService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  @Post(":id/upload")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(201)
  async upload(
    @Param("id") id: string,
    @Req() req: FastifyRequest,
  ): Promise<{
    poster_url: string;
    filename: string;
    size: number;
    sha256: string;
    variantes: { w320?: string; w640?: string; w960?: string };
  }> {
    const admin = (req as FastifyRequest & { user?: { id: string } }).user?.id;
    // Rate limit por admin: 10 uploads/hora.
    if (admin) this.service.registrarUpload(admin);

    // Mídia deve existir e não estar soft-deletada.
    const midia = await this.prisma.midia.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!midia) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Mídia não encontrada.",
      });
    }

    const file = await (req as MultipartRequest).file();
    if (!file) {
      throw new BadRequestException("Nenhum arquivo enviado (campo 'file').");
    }
    const buffer = await file.toBuffer();

    const { filename, mime, sha256 } = this.service.validarEPreparar(buffer);
    // T031: ladder ANTES de gravar (422 não deixa resíduo); original primeiro,
    // variantes depois; falha na ladder = rollback total (500 genérico).
    const ladder = await gerarVariantes(buffer);
    await this.service.salvar(id, buffer, filename);
    let salvas: { width: number; filename: string }[];
    try {
      salvas = await this.service.salvarVariantes(id, filename, ladder);
    } catch {
      await this.service.remover(id, filename);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: "Internal Server Error",
          message: "Falha ao processar a imagem.",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const poster_url = `/uploads/media/${id}/${filename}`;
    const variantes: { w320?: string; w640?: string; w960?: string } = {};
    for (const s of salvas) {
      variantes[`w${s.width}` as keyof typeof variantes] = `/uploads/media/${id}/${s.filename}`;
    }

    await this.prisma.midia.update({
      where: { id },
      data: { imagem_url: poster_url },
    });
    await this.cacheInvalidation?.onMediaUpdated(id);

    const userAgent = req?.headers?.["user-agent"];
    await this.auditLog?.log({
      entidade: "Midia",
      entidadeId: id,
      acao: "MEDIA_POSTER_UPLOADED",
      usuarioId: admin,
      ipOrigem: req?.ip ?? undefined,
      dadosDepois: {
        filename,
        mime,
        size: buffer.length,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
      },
    });

    return { poster_url, filename, size: buffer.length, sha256, variantes };
  }
}

@Controller("uploads")
export class UploadsController {
  constructor(private readonly service: UploadService) {}

  /** GET /uploads/media/:midiaId/:filename — serve com Content-Type correto. */
  @Get("media/:midiaId/:filename")
  @HttpCode(200)
  async servir(
    @Param("midiaId") midiaId: string,
    @Param("filename") filename: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const caminho = this.service.caminhoArquivo(midiaId, filename);
    if (!caminho) {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Arquivo não encontrado.",
      });
    }
    let bytes: Buffer;
    try {
      bytes = await readFile(caminho);
    } catch {
      throw new NotFoundException({
        statusCode: 404,
        error: "Not Found",
        message: "Arquivo não encontrado.",
      });
    }
    const ext = filename.split(".").pop() ?? "jpg";
    reply.header("Content-Type", EXT_PARA_MIME[ext] ?? "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("X-Content-Type-Options", "nosniff");
    return bytes;
  }
}
