import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import * as path from "node:path";
import { detectarImagem } from "../../common/utils/file-validation.util.js";
import { caminhoContidoNaBase } from "../../common/path-guard.js";
import { nomeVariante, VARIANT_WIDTHS } from "./variants.js";

export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "media");
const UPLOAD_MAX_POR_ADMIN = 10;
const UPLOAD_JANELA_MS = 60 * 60 * 1000; // 1h

/** Rótulo curto p/ log — nunca o valor bruto do parâmetro. */
function rotuloLog(midiaId: string): string {
  return String(midiaId)
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 36);
}

export interface UploadResultado {
  filename: string;
  path: string;
  url: string;
  mime: string;
  size: number;
  sha256: string;
}

/**
 * UploadService (T216, 6.8) — upload seguro de posters.
 *
 * - Validação por MAGIC BYTES (JPEG/PNG/WebP/GIF); ext derivada do conteúdo.
 * - Limite 5MB (413); tipo não suportado (415).
 * - Nome = crypto.randomUUID() + ext do magic (nunca filename do cliente).
 * - Storage local em uploads/media/:midiaId/ (fora do código executável);
 *   path sanitizado (sem ../).
 * - Rate limit por admin: 10 uploads/hora (janela deslizante).
 * - NUNCA executa o arquivo — apenas bytes armazenados.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadsPorAdmin = new Map<string, number[]>();

  /** Valida por magic bytes e gera o nome seguro (UUID + ext real). */
  validarEPreparar(buffer: Buffer): {
    filename: string;
    mime: string;
    ext: string;
    sha256: string;
  } {
    if (buffer.length > UPLOAD_MAX_SIZE) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          error: "Payload Too Large",
          message: "Arquivo excede o limite de 5MB.",
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    const detectada = detectarImagem(buffer);
    if (!detectada) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          error: "Unsupported Media Type",
          message:
            "Apenas imagens JPEG, PNG, WebP ou GIF são aceitas (validação por conteúdo, não extensão).",
        },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    const filename = `${randomUUID()}.${detectada.ext}`;
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    return { filename, mime: detectada.mime, ext: detectada.ext, sha256 };
  }

  /** Persiste os bytes em uploads/media/:midiaId/ (cria o diretório). */
  async salvar(midiaId: string, buffer: Buffer, filename: string): Promise<string> {
    // T192: caminho montado com o guard (segmentos validados + contenção
    // resolvida dentro de UPLOADS_DIR); filename é UUID.ext gerado por nós.
    const destino = caminhoContidoNaBase(UPLOADS_DIR, midiaId, filename);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, buffer);
    return destino;
  }

  /**
   * T031 — persiste a ladder de variantes (`<uuid>-w{w}.webp`).
   * Atômica: falha em um rung remove os já gravados (sem órfãos).
   */
  async salvarVariantes(
    midiaId: string,
    filename: string,
    ladder: Map<number, Buffer>,
  ): Promise<{ width: number; filename: string }[]> {
    // T192: dir e cada arquivo passam pelo guard (contenção em UPLOADS_DIR).
    const dir = caminhoContidoNaBase(UPLOADS_DIR, midiaId);
    await mkdir(dir, { recursive: true });
    const salvas: { width: number; filename: string }[] = [];
    try {
      for (const w of VARIANT_WIDTHS) {
        const buf = ladder.get(w);
        if (!buf) continue;
        const nome = nomeVariante(filename, w);
        await writeFile(caminhoContidoNaBase(UPLOADS_DIR, midiaId, nome), buf);
        salvas.push({ width: w, filename: nome });
      }
      return salvas;
    } catch (e) {
      for (const s of salvas) {
        await rm(caminhoContidoNaBase(UPLOADS_DIR, midiaId, s.filename), { force: true }).catch(
          () => undefined,
        );
      }
      this.logger.error(`falha persistindo variantes de ${rotuloLog(midiaId)}: ${e}`);
      throw e;
    }
  }

  /** Remove o original (rollback de upload cuja ladder falhou — sem órfãos). */
  async remover(midiaId: string, filename: string): Promise<void> {
    // T192: entrada fora do padrão é rejeitada pelo guard (não remove em silêncio).
    const destino = caminhoContidoNaBase(UPLOADS_DIR, midiaId, filename);
    await rm(destino, { force: true }).catch(() => undefined);
  }

  /** Rate limit por admin: 10 uploads/hora (janela deslizante). */
  registrarUpload(adminId: string): void {
    const agora = Date.now();
    const recentes = (this.uploadsPorAdmin.get(adminId) ?? []).filter(
      (t) => agora - t < UPLOAD_JANELA_MS,
    );
    if (recentes.length >= UPLOAD_MAX_POR_ADMIN) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Limite de uploads por hora atingido.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recentes.push(agora);
    this.uploadsPorAdmin.set(adminId, recentes);
  }

  /** Caminho absoluto de um arquivo servido (valida o nome gerado por nós + contenção). */
  caminhoArquivo(midiaId: string, filename: string): string | null {
    if (!/^[a-f0-9-]{36}(-w(320|640|960))?\.(jpg|png|gif|webp)$/.test(filename)) return null;
    try {
      return caminhoContidoNaBase(UPLOADS_DIR, midiaId, filename);
    } catch {
      return null;
    }
  }

  getUploadsDir(): string {
    return UPLOADS_DIR;
  }
}
