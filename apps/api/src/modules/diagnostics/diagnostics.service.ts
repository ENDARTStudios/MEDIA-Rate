import { Injectable } from "@nestjs/common";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { PrismaService } from "../../prisma/prisma.service.js";
import { FeatureFlagService } from "../flags/feature-flags.service.js";
import { comContextoRls, DEFAULT_TENANT } from "../../common/rls-context.js";

/** T329 — resposta de diagnóstico operacional (somente leitura, sem PII). */
export interface DiagnosticsResponse {
  server: {
    node_env: string;
    versao: string;
    uptime_segundos: number;
    agora: string;
  };
  database: { ok: boolean; latencia_ms: number | null };
  feature_flags: { key: string; enabled: boolean; rollout_percent: number }[];
  contagens: { midias: number; usuarios: number };
}

function lerVersao(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "desconhecida";
  } catch {
    return "desconhecida";
  }
}

/**
 * T329 — diagnóstico operacional interno (ADMIN, somente leitura).
 *
 * Expõe APENAS estado operacional e contagens agregadas — nunca PII, tokens
 * ou segredos. O DB check usa `SELECT 1` (não toca tabelas, sem RLS).
 */
@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagService,
  ) {}

  async diagnosticar(): Promise<DiagnosticsResponse> {
    const [db, flags, contagens] = await Promise.all([
      this.checarBanco(),
      this.listarFlags(),
      this.contagens(),
    ]);

    return {
      server: {
        node_env: process.env.NODE_ENV ?? "development",
        versao: lerVersao(),
        uptime_segundos: Math.floor(process.uptime()),
        agora: new Date().toISOString(),
      },
      database: db,
      feature_flags: flags,
      contagens,
    };
  }

  /** Latência de um round-trip mínimo — não toca tabelas. */
  private async checarBanco(): Promise<{ ok: boolean; latencia_ms: number | null }> {
    const inicio = Date.now();
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
      return { ok: true, latencia_ms: Date.now() - inicio };
    } catch {
      return { ok: false, latencia_ms: null };
    }
  }

  /** Flags expostas sem campos internos (updated_by, tenant_overrides). */
  private async listarFlags(): Promise<DiagnosticsResponse["feature_flags"]> {
    const flags = await this.flags.listar();
    return flags.map((f) => ({
      key: f.key,
      enabled: f.enabled,
      rollout_percent: f.rollout_percent,
    }));
  }

  /** Contagens agregadas sob contexto ADMIN (read-only). */
  private async contagens(): Promise<DiagnosticsResponse["contagens"]> {
    return comContextoRls(this.prisma, { tenantId: DEFAULT_TENANT, role: "ADMIN" }, async (tx) => {
      const [midias, usuarios] = await Promise.all([
        tx.midia.count({ where: { deleted_at: null } }),
        tx.usuario.count({ where: { dados_para_exclusao_at: null } }),
      ]);
      return { midias, usuarios };
    });
  }
}
