import { Injectable, Logger } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { PutObjectInput, StorageAdapter } from "./storage.port.js";

export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Domínio público/CDN do bucket (opcional; senão usa o endpoint R2). */
  publicBaseUrl?: string;
}

/**
 * Lê a config do R2 do ambiente. Retorna null se qualquer credencial faltar —
 * o provider então cai para InMemoryStorage (no-op claro em dev).
 */
export function r2ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const bucket = env.R2_BUCKET?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL?.trim() || undefined,
  };
}

/**
 * T453 — Cloudflare R2 via API S3 (@aws-sdk/client-s3). As credenciais vêm
 * SEMPRE do ambiente (nunca em código/log). Objetos são imutáveis
 * (content-addressed) → Cache-Control imutável.
 */
@Injectable()
export class R2Storage implements StorageAdapter {
  readonly kind = "r2" as const;
  private readonly logger = new Logger(R2Storage.name);
  private readonly client: S3Client;

  constructor(private readonly cfg: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async put(input: PutObjectInput): Promise<{ key: string; url: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    this.logger.log(`Asset enviado ao R2: ${input.key} (${input.contentType})`);
    return { key: input.key, url: this.urlPublica(input.key) };
  }

  /** URL pública do objeto (CDN custom domain, se configurado). */
  urlPublica(key: string): string {
    if (this.cfg.publicBaseUrl) {
      return `${this.cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    return `https://${this.cfg.accountId}.r2.cloudflarestorage.com/${this.cfg.bucket}/${key}`;
  }
}
