import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CacheService } from "../../common/cache.service.js";
import { AuditLogService } from "../../common/audit-log.service.js";

const FLAGS_TTL = 60; // segundos
const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

interface UsuarioFlags {
  id: string;
  tenantId?: string | null;
  plano?: string | null;
}

interface OpcoesAvaliacao {
  ip?: string | null;
}

const RANK_PLANO: Record<string, number> = { FREE: 0, PLUS: 1, PREMIUM: 2 };

/**
 * T292 (Arquitetura §7) — feature flags leves. Avaliação server-side única,
 * determinística (mesmo usuário → mesmo bucket), com cache Redis 60s.
 * Nunca expõe flags no frontend.
 */
@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditLogService,
  ) {}

  private bucket(chave: string, usuario: UsuarioFlags | null, opcoes: OpcoesAvaliacao): number {
    const semente = usuario?.id ?? opcoes.ip ?? "anonimo";
    const hash = createHash("sha256").update(`${chave}:${semente}`).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % 100;
  }

  /** Avalia uma flag para um usuário (ou anônimo). Flag ausente = off. */
  async avaliavel(
    chave: string,
    usuario: UsuarioFlags | null,
    opcoes: OpcoesAvaliacao = {},
  ): Promise<boolean> {
    const flag = await this.cache.readThrough<{
      enabled: boolean;
      rollout_percent: number;
      plan_gate: string | null;
      tenant_overrides: Record<string, boolean> | null;
    } | null>(`flags:${chave}`, FLAGS_TTL, async () => {
      const f = await this.prisma.featureFlag.findUnique({ where: { key: chave } });
      if (!f) return null;
      return {
        enabled: f.enabled,
        rollout_percent: f.rollout_percent,
        plan_gate: f.plan_gate,
        tenant_overrides: (f.tenant_overrides as Record<string, boolean> | null) ?? null,
      };
    });

    if (!flag || !flag.enabled) return false;

    const tenant = usuario?.tenantId ?? DEFAULT_TENANT;
    const override = flag.tenant_overrides?.[tenant];
    if (override !== undefined) return override;

    if (flag.plan_gate) {
      const plano = usuario?.plano ?? "FREE";
      const rank = RANK_PLANO[plano] ?? 0;
      if (rank < (RANK_PLANO[flag.plan_gate] ?? 1)) return false;
    }

    if (flag.rollout_percent >= 100) return true;
    if (flag.rollout_percent <= 0) return false;
    return this.bucket(chave, usuario, opcoes) < flag.rollout_percent;
  }

  async listar() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  async criar(
    adminId: string,
    dto: {
      key: string;
      enabled?: boolean;
      rollout_percent?: number;
      plan_gate?: string | null;
      tenant_overrides?: Record<string, boolean>;
    },
  ) {
    const key = dto.key.trim();
    const existente = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (existente) throw new ConflictException("Flag já existe.");
    const flag = await this.prisma.featureFlag.create({
      data: {
        key,
        enabled: dto.enabled ?? true,
        rollout_percent: Math.min(100, Math.max(0, dto.rollout_percent ?? 100)),
        plan_gate: dto.plan_gate ?? null,
        tenant_overrides: dto.tenant_overrides ?? {},
        updated_by: adminId,
      },
    });
    await this.audit.log({
      entidade: "feature_flag",
      entidadeId: key,
      acao: "FLAG_CREATE",
      usuarioId: adminId,
    });
    await this.invalidar(key);
    return flag;
  }

  async atualizar(
    adminId: string,
    key: string,
    dto: {
      enabled?: boolean;
      rollout_percent?: number;
      plan_gate?: string | null;
      tenant_overrides?: Record<string, boolean>;
    },
  ) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException("Flag não encontrada.");
    const atualizada = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.rollout_percent !== undefined
          ? { rollout_percent: Math.min(100, Math.max(0, dto.rollout_percent)) }
          : {}),
        ...(dto.plan_gate !== undefined ? { plan_gate: dto.plan_gate } : {}),
        ...(dto.tenant_overrides !== undefined ? { tenant_overrides: dto.tenant_overrides } : {}),
        updated_by: adminId,
      },
    });
    await this.audit.log({
      entidade: "feature_flag",
      entidadeId: key,
      acao: "FLAG_UPDATE",
      usuarioId: adminId,
      dadosAntes: {
        enabled: flag.enabled,
        rollout_percent: flag.rollout_percent,
        plan_gate: flag.plan_gate,
      },
      dadosDepois: {
        enabled: atualizada.enabled,
        rollout_percent: atualizada.rollout_percent,
        plan_gate: atualizada.plan_gate,
      },
    });
    await this.invalidar(key);
    return atualizada;
  }

  private async invalidar(key: string): Promise<void> {
    await this.cache.del(`flags:${key}`);
  }
}
