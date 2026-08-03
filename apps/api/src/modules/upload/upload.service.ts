import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"];
const MIME_MAGIC: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  validateAndPrepare(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
    }

    if (file.buffer.length > MAX_SIZE) {
      throw new BadRequestException(`Arquivo excede o limite de ${MAX_SIZE / 1024 / 1024}MB.`);
    }

    this.validateMagicBytes(file.buffer, file.mimetype);

    const parts = file.originalname.split(".");
    const ext = parts.length > 1 ? (parts.pop() ?? "bin") : "bin";
    const filename = `${randomUUID()}.${ext}`;
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");

    this.logger.log(`Upload validado: ${filename} (${file.buffer.length} bytes, SHA-256: ${sha256.slice(0, 8)}...)`);
    return { filename, buffer: file.buffer, mimetype: file.mimetype, sha256, size: file.buffer.length };
  }

  private validateMagicBytes(buffer: Buffer, mimetype: string) {
    const magic = MIME_MAGIC[mimetype];
    if (!magic) return;

    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        throw new BadRequestException(`Tipo MIME declara ${mimetype} mas os magic bytes não conferem. Rejeitado por segurança.`);
      }
    }
  }
}
