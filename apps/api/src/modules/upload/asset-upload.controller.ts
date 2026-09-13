import {
  BadRequestException,
  Controller,
  HttpCode,
  NotFoundException,
  Optional,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AssetUploadService } from "./asset-upload.service.js";
import { UploadService } from "./upload.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { AuditLogService } from "../../common/audit-log.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  filename: string;
}
type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

/**
 * T453 — upload de assets (admin) para R2.
 *
 * POST /api/v1/admin/assets/:midiaId/:tipoMidia — @Roles('ADMIN'); multipart;
 * validação por magic bytes (415), limite 10 MiB (413), chave
 * content-addressed, audit append-only. O storage é R2 em produção e
 * InMemory em dev/test (sem credenciais).
 */
@Controller("api/v1/admin/assets")
export class AssetUploadController {
  constructor(
    private readonly assets: AssetUploadService,
    private readonly uploads: UploadService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  @Post(":midiaId/:tipoMidia")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(201)
  async upload(
    @Param("midiaId") midiaId: string,
    @Param("tipoMidia") tipoMidia: string,
    @Req() req: FastifyRequest,
  ): Promise<{
    key: string;
    url: string;
    sha256: string;
    size: number;
    mime: string;
  }> {
    const admin = (req as FastifyRequest & { user?: { id: string } }).user?.id;
    // Reaproveita o rate limit por admin (10 uploads/hora).
    if (admin) this.uploads.registrarUpload(admin);

    const midia = await this.prisma?.midia.findFirst({
      where: { id: midiaId, deleted_at: null },
      select: { id: true },
    });
    if (this.prisma && !midia) {
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

    const resultado = await this.assets.enviar({ tipoMidia, midiaId, buffer });

    await this.auditLog?.log({
      entidade: "Midia",
      entidadeId: midiaId,
      acao: "MEDIA_ASSET_UPLOADED",
      usuarioId: admin,
      ipOrigem: req?.ip ?? undefined,
      dadosDepois: {
        key: resultado.key,
        sha256: resultado.sha256,
        size: resultado.size,
        mime: resultado.mime,
      },
    });

    return resultado;
  }
}
