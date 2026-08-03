import { Controller, Post, UseGuards, Req, HttpCode } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { UploadService } from "./upload.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  mimetype: string;
  filename: string;
}

interface MultipartRequest extends FastifyRequest {
  file: () => Promise<MultipartFile | undefined>;
}

@Controller("api/v1/upload")
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(201)
  async upload(@Req() req: FastifyRequest) {
    const file = await (req as MultipartRequest).file();
    if (!file) throw new Error("Nenhum arquivo enviado.");
    const buffer = await file.toBuffer();
    const result = this.service.validateAndPrepare({ buffer, mimetype: file.mimetype, originalname: file.filename });
    return { filename: result.filename, size: result.size, mimetype: result.mimetype, sha256: result.sha256 };
  }
}
