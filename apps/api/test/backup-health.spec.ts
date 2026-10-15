/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  avaliarSaudeBackup,
  renderPrometheusSaudeBackup,
  THRESHOLDS_SAUDE_BACKUP,
  type EntradaSaudeBackup,
} from "../src/modules/metrics/backup-health.js";
import { BackupHealthService } from "../src/modules/metrics/backup-health.service.js";

/**
 * T227 — saúde do backup (pg_stat_archiver): avaliação pura, renderização
 * Prometheus, fail-closed na coleta e ausência de PII/segredo no texto.
 */

const SAUDAVEL: EntradaSaudeBackup = {
  probeOk: true,
  archiveMode: "on",
  archivedCount: 2662,
  failedCount: 0,
  idadeUltimoArquivamentoSegundos: 14,
  idadeUltimaFalhaSegundos: null,
};

describe("avaliarSaudeBackup (T227)", () => {
  it("ok quando arquiva recentemente e nunca falhou", () => {
    const r = avaliarSaudeBackup(SAUDAVEL);
    expect(r.ok).toBe(true);
    expect(r.nivel).toBe("ok");
    expect(r.motivos).toEqual(["ok"]);
  });

  it("warn (não ok) quando o último arquivamento passa de 2h", () => {
    const r = avaliarSaudeBackup({
      ...SAUDAVEL,
      idadeUltimoArquivamentoSegundos: THRESHOLDS_SAUDE_BACKUP.warnSegundos + 1,
    });
    expect(r.ok).toBe(false);
    expect(r.nivel).toBe("warn");
    expect(r.motivos).toContain("arquivamento_atrasado_warn");
  });

  it("crit quando o último arquivamento passa de 12h", () => {
    const r = avaliarSaudeBackup({
      ...SAUDAVEL,
      idadeUltimoArquivamentoSegundos: THRESHOLDS_SAUDE_BACKUP.critSegundos + 1,
    });
    expect(r.nivel).toBe("crit");
    expect(r.ok).toBe(false);
  });

  it("crit quando archive_mode está desligado", () => {
    const r = avaliarSaudeBackup({ ...SAUDAVEL, archiveMode: "off" });
    expect(r.nivel).toBe("crit");
    expect(r.motivos).toContain("archive_mode_off");
  });

  it("crit quando não há arquivamento registrado (idade nula)", () => {
    const r = avaliarSaudeBackup({ ...SAUDAVEL, idadeUltimoArquivamentoSegundos: null });
    expect(r.nivel).toBe("crit");
    expect(r.motivos).toContain("sem_arquivamento_registrado");
  });

  it("crit quando há falha recente (< 1h)", () => {
    const r = avaliarSaudeBackup({ ...SAUDAVEL, idadeUltimaFalhaSegundos: 60 });
    expect(r.nivel).toBe("crit");
    expect(r.motivos).toContain("falha_recente");
  });

  it("crit quando a falha é mais nova que o último sucesso", () => {
    const r = avaliarSaudeBackup({
      ...SAUDAVEL,
      idadeUltimoArquivamentoSegundos: 7200,
      idadeUltimaFalhaSegundos: 3600,
    });
    expect(r.nivel).toBe("crit");
    expect(r.motivos).toContain("falha_apos_ultimo_sucesso");
  });

  it("warn (não crit) quando a falha é antiga e posterior foi bem-sucedido", () => {
    const r = avaliarSaudeBackup({
      ...SAUDAVEL,
      idadeUltimoArquivamentoSegundos: 30,
      idadeUltimaFalhaSegundos: 7200,
    });
    expect(r.nivel).toBe("warn");
    expect(r.ok).toBe(false);
    expect(r.motivos).toContain("falhas_historicas");
  });

  it("fail-closed: probe indisponível ⇒ crit e nunca 'ok'", () => {
    const r = avaliarSaudeBackup({ ...SAUDAVEL, probeOk: false });
    expect(r.ok).toBe(false);
    expect(r.nivel).toBe("crit");
    expect(r.motivos).toEqual(["probe_indisponivel"]);
  });
});

describe("renderPrometheusSaudeBackup (T227)", () => {
  it("saudável: health_ok=1, probe_ok=1 e motivo ok", () => {
    const texto = renderPrometheusSaudeBackup(SAUDAVEL, avaliarSaudeBackup(SAUDAVEL));
    expect(texto).toContain("backup_health_ok 1");
    expect(texto).toContain("backup_health_probe_ok 1");
    expect(texto).toContain('backup_health_reason{reason="ok"} 1');
    expect(texto).toContain("backup_archiver_archived_total 2662");
    expect(texto).toContain("backup_archiver_last_failed_age_seconds -1");
  });

  it("probe falhou: health_ok=0 e probe_ok=0 (série não desaparece)", () => {
    const entrada: EntradaSaudeBackup = {
      ...SAUDAVEL,
      probeOk: false,
      archiveMode: null,
      idadeUltimoArquivamentoSegundos: null,
    };
    const texto = renderPrometheusSaudeBackup(entrada, avaliarSaudeBackup(entrada));
    expect(texto).toContain("backup_health_ok 0");
    expect(texto).toContain("backup_health_probe_ok 0");
    expect(texto).toContain('backup_health_reason{reason="probe_indisponivel"} 1');
  });

  it("nunca contém PII/segredo (@, password, token, DATABASE_URL)", () => {
    const texto = renderPrometheusSaudeBackup(SAUDAVEL, avaliarSaudeBackup(SAUDAVEL));
    expect(texto).not.toMatch(/@/);
    expect(texto.toLowerCase()).not.toContain("password");
    expect(texto.toLowerCase()).not.toContain("token");
    expect(texto).not.toContain("DATABASE_URL");
    expect(texto).not.toContain("postgres://");
  });
});

describe("BackupHealthService (T227)", () => {
  const agora = new Date("2026-10-15T00:00:00.000Z");

  it("coleta read-only: archive_mode=on + arquivador fresco ⇒ health_ok=1", async () => {
    const prisma = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join("");
        if (sql.includes("archive_mode")) return [{ archive_mode: "on" }];
        return [
          {
            archived_count: BigInt(2662),
            failed_count: BigInt(0),
            last_archived_time: new Date(agora.getTime() - 14_000),
            last_failed_time: null,
          },
        ];
      }),
    } as any;
    const svc = new BackupHealthService(prisma);
    const texto = await svc.textoPrometheus(agora);
    expect(texto).toContain("backup_health_ok 1");
    expect(texto).toContain("backup_archiver_last_archived_age_seconds 14");
    const sqls = prisma.$queryRaw.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.every((s: string) => /select/i.test(s))).toBe(true); // só SELECT
  });

  it("falha de coleta ⇒ fail-closed (health_ok=0), sem lançar", async () => {
    const prisma = {
      $queryRaw: vi.fn(async () => {
        throw new Error("permission denied");
      }),
    } as any;
    const svc = new BackupHealthService(prisma);
    const texto = await svc.textoPrometheus(agora);
    expect(texto).toContain("backup_health_ok 0");
    expect(texto).toContain("backup_health_probe_ok 0");
  });
});
