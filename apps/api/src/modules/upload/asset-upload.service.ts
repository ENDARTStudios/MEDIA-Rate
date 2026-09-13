import { HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { detectarImagemAsset } from "../../common/utils/file-validation.util.js";
import { STORAGE_ADAPTER, type StorageAdapter } from "./storage/storage.port.js";

/** T453: teto por arquivo do asset (10 MiB). */
export const ASSET_MAX_SIZE = 10 * 1024 * 1024;

export interface AssetEnviado {
  key: string;
  url: string;
  sha256: string;
  size: number;
  mime: string;
}

/**
 * T453 — upload de assets (pôsteres/imagens) para R2.
 *
 * - Validação por MAGIC BYTES (whitelist jpeg/png/webp/avif; nunca extensão).
 * - Limite 10 MiB (413) e tipo inválido (415).
 * - Chave CONTENT-ADDRESSED `media/{tipo}/{midiaId}/{sha256}.{ext}` — nenhum
 *   fragmento de filename do usuário entra no path (anti path-traversal).
 * - Não executa o arquivo; apenas envia bytes ao StorageAdapter.
 */
@Injectable()
export class AssetUploadService {
  private readonly logger = new Logger(AssetUploadService.name);

  constructor(@Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter) {}

  validar(buffer: Buffer): { mime: string; ext: string; sha256: string } {
    if (!buffer || buffer.length === 0) {
      throw new HttpException(
        { statusCode: 400, error: "Bad Request", message: "Arquivo vazio." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (buffer.length > ASSET_MAX_SIZE) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          error: "Payload Too Large",
          message: "Arquivo excede o limite de 10 MiB.",
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const detectada = detectarImagemAsset(buffer);
    if (!detectada) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          error: "Unsupported Media Type",
          message:
            "Apenas imagens JPEG, PNG, WebP ou AVIF são aceitas (validação por conteúdo, não extensão).",
        },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    return { mime: detectada.mime, ext: detectada.ext, sha256 };
  }

  /** Chave content-addressed; sanitiza tipo/id (nunca usa filename do cliente). */
  chaveAsset(tipoMidia: string, midiaId: string, sha256: string, ext: string): string {
    const tipo = String(tipoMidia)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const id = String(midiaId).replace(/[^a-zA-Z0-9-]/g, "");
    return `media/${tipo}/${id}/${sha256}.${ext}`;
  }

  async enviar(input: {
    tipoMidia: string;
    midiaId: string;
    buffer: Buffer;
  }): Promise<AssetEnviado> {
    const { mime, ext, sha256 } = this.validar(input.buffer);
    const key = this.chaveAsset(input.tipoMidia, input.midiaId, sha256, ext);
    const { url } = await this.storage.put({ key, body: input.buffer, contentType: mime });
    this.logger.log(`Asset validado e enviado (${this.storage.kind}): ${key}`);
    return { key, url, sha256, size: input.buffer.length, mime };
  }
}
