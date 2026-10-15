import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  avaliarSaudeBackup,
  renderPrometheusSaudeBackup,
  type EntradaSaudeBackup,
} from "./backup-health.js";

interface LinhaArquivador {
  archived_count: bigint | number;
  failed_count: bigint | number;
  last_archived_time: Date | null;
  last_failed_time: Date | null;
}

interface LinhaSettings {
  archive_mode: string;
}

/**
 * T227 — coleta read-only da saúde do backup e a serializa em Prometheus.
 *
 * Só lê: `current_setting('archive_mode')` e `pg_stat_archiver` (view de
 * sistema, sem PII). Nunca escreve, nunca expõe conexão/segredo. Falha de
 * coleta é **fail-closed**: devolve `probeOk=false` (→ `backup_health_ok 0`),
 * jamais um "saudável" fabricado.
 */
@Injectable()
export class BackupHealthService {
  private readonly logger = new Logger(BackupHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Texto Prometheus da saúde do backup (adicionado ao `/metrics`). */
  async textoPrometheus(agora: Date = new Date()): Promise<string> {
    const entrada = await this.coletar(agora);
    return renderPrometheusSaudeBackup(entrada, avaliarSaudeBackup(entrada));
  }

  /** Coleta best-effort; qualquer erro ⇒ estado desconhecido (não lança). */
  async coletar(agora: Date = new Date()): Promise<EntradaSaudeBackup> {
    const vazio: EntradaSaudeBackup = {
      probeOk: false,
      archiveMode: null,
      archivedCount: null,
      failedCount: null,
      idadeUltimoArquivamentoSegundos: null,
      idadeUltimaFalhaSegundos: null,
    };
    try {
      const settings = await this.prisma.$queryRaw<
        LinhaSettings[]
      >`SELECT current_setting('archive_mode') AS archive_mode`;
      const linhas = await this.prisma.$queryRaw<
        LinhaArquivador[]
      >`SELECT archived_count, failed_count, last_archived_time, last_failed_time FROM pg_stat_archiver`;
      const l = linhas[0];
      const idade = (d: Date | null): number | null =>
        d ? Math.max(0, Math.round((agora.getTime() - new Date(d).getTime()) / 1000)) : null;
      return {
        probeOk: true,
        archiveMode: settings[0]?.archive_mode ?? null,
        archivedCount: l ? Number(l.archived_count) : null,
        failedCount: l ? Number(l.failed_count) : null,
        idadeUltimoArquivamentoSegundos: idade(l?.last_archived_time ?? null),
        idadeUltimaFalhaSegundos: idade(l?.last_failed_time ?? null),
      };
    } catch (err) {
      // Fail-closed e não-bloqueante: `/metrics` continua respondendo.
      this.logger.warn(`coleta de saúde do backup falhou: ${String(err)}`);
      return vazio;
    }
  }
}
