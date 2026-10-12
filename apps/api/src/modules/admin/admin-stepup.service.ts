import { createHash } from "node:crypto";
import { Injectable, Optional } from "@nestjs/common";
import { CacheService } from "../../common/cache.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PasswordService } from "../../common/password.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";

export const STEPUP_TTL_DEFAULT = 900; // 15 min (design T204 §5)
export const STEPUP_CACHE_PREFIX = "admin:stepup:";

export interface StepUpResultado {
  ok: boolean;
  /** TTL aplicado (segundos) quando ok. */
  ttl?: number;
}

/**
 * T205 Fase 1 — step-up por re-auth de senha para ações admin destrutivas
 * (design T204 §5; ADMIN_SECURITY). Fonte de verificação: PasswordService
 * existente (argon2id+pepper) — NÃO modificado. Marca TTL no store
 * COMPARTILHADO (CacheService: Redis com fallback memória) com chave
 * sha256(sessao_id) — nunca token/cookie/senha/e-mail/IP/UA.
 *
 * FAIL-CLOSED: falha ao LER a marca = sem marca (o guard nega); falha ao
 * GRAVAR propaga (o controller sanitiza e NENHUMA marca é concedida).
 */
@Injectable()
export class AdminStepUpService {
  private readonly cache: CacheService;
  private readonly prisma: PrismaService;
  private readonly password: PasswordService;
  private readonly audit?: AuditLogService;

  constructor(
    cache: CacheService,
    prisma: PrismaService,
    password: PasswordService,
    @Optional() audit?: AuditLogService,
  ) {
    this.cache = cache;
    this.prisma = prisma;
    this.password = password;
    this.audit = audit;
  }

  private chave(sessaoId: string): string {
    return STEPUP_CACHE_PREFIX + createHash("sha256").update(sessaoId).digest("hex").slice(0, 32);
  }

  private ttl(): number {
    const v = Number.parseInt(process.env.ADMIN_STEPUP_TTL_SECONDS ?? "", 10);
    return Number.isFinite(v) && v > 0 ? v : STEPUP_TTL_DEFAULT;
  }

  /** Verifica a senha do admin e, válida, grava a marca TTL. Audita os dois caminhos. */
  async stepUp(usuarioId: string, sessaoId: string, senha: string): Promise<StepUpResultado> {
    const registro = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { password_hash: true },
    });
    const ok =
      typeof registro?.password_hash === "string" &&
      registro.password_hash.length > 0 &&
      (await this.password.verify(senha, registro.password_hash));

    if (!ok) {
      await this.audit?.log({
        entidade: "Admin",
        entidadeId: "step-up",
        acao: "ADMIN_STEPUP_FAIL",
        usuarioId,
      });
      return { ok: false };
    }

    const ttl = this.ttl();
    await this.cache.set(this.chave(sessaoId), Date.now(), ttl);
    await this.audit?.log({
      entidade: "Admin",
      entidadeId: "step-up",
      acao: "ADMIN_STEPUP_SUCCESS",
      usuarioId,
    });
    return { ok: true, ttl };
  }

  /** Marca vigente para a sessão? Falha de store = false (fail-closed). */
  async temMarca(sessaoId: string): Promise<boolean> {
    try {
      const marca = await this.cache.get<number>(this.chave(sessaoId));
      return typeof marca === "number" && marca > 0;
    } catch {
      return false;
    }
  }

  /** Grava a marca (chamado pelo controller após verify bem-sucedido). */
  async marcar(sessaoId: string): Promise<number> {
    const ttl = this.ttl();
    await this.cache.set(this.chave(sessaoId), Date.now(), ttl);
    return ttl;
  }
}
