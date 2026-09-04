import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

export interface RegistrarConsentInput {
  categorias: { analytics: boolean; monitoring: boolean; necessary?: boolean };
  versao: string;
  ts: number;
  idioma: string;
  pais: string;
  device_hash?: string;
}

/**
 * Serviço de consentimento (T443 / D-430) — trilha AUDITÁVEL append-only.
 *
 * - `registrar` é INSERÇÃO apenas (nenhum update/delete) — a prova de que o
 *   titular autorizou o quê, quando e em qual idioma/país.
 * - `historico` é owner-only (o próprio usuário vê o histórico).
 * - Rate limit simples por usuário (evita abuso em POST /consent).
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly LIMIT = 5;
  private readonly WINDOW_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  private verificarRateLimit(chave: string): void {
    const now = Date.now();
    const h = this.hits.get(chave);
    if (!h || h.resetAt <= now) this.hits.set(chave, { count: 1, resetAt: now + this.WINDOW_MS });
    else {
      h.count++;
      if (h.count > this.LIMIT) {
        throw new HttpException(
          { statusCode: 429, error: "Too Many Requests", message: "Muitas requisições." },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private hashIp(ip: string): string {
    return createHash("sha256").update(ip).digest("hex").slice(0, 64);
  }

  async registrar(
    usuarioId: string,
    input: RegistrarConsentInput,
    ip?: string,
  ): Promise<{ registrado: boolean }> {
    this.verificarRateLimit(usuarioId);
    // Append-only: só create. Idempotência natural por (usuario_id, versao, ts).
    await this.prisma.consentLog.create({
      data: {
        usuario_id: usuarioId,
        categorias: input.categorias as unknown as Prisma.InputJsonValue,
        versao: input.versao,
        ts: BigInt(input.ts),
        idioma: input.idioma,
        pais: input.pais,
        device_hash: input.device_hash ?? null,
        ip_hash: ip ? this.hashIp(ip) : null,
      },
    });
    this.logger.log(`Consentimento registrado p/ usuário ${usuarioId} (v${input.versao})`);
    return { registrado: true };
  }

  async historico(usuarioId: string): Promise<unknown[]> {
    this.verificarRateLimit(usuarioId);
    return this.prisma.consentLog.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { criado_em: "desc" },
      take: 100,
    });
  }
}
