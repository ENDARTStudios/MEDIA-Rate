/**
 * T453 — porta de armazenamento de assets (hexagonal). A implementação real é
 * o Cloudflare R2 (S3-compatível); em dev/test usa-se InMemoryStorage.
 * O domínio (AssetUploadService) depende só desta interface.
 */
export const STORAGE_ADAPTER = "STORAGE_ADAPTER";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageAdapter {
  readonly kind: "r2" | "memory";
  put(input: PutObjectInput): Promise<{ key: string; url: string }>;
}
