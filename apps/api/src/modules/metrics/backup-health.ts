/**
 * T227 — saúde do backup do PostgreSQL a partir do arquivador de WAL.
 *
 * Fonte: `pg_stat_archiver` (view de sistema, **read-only**, sem PII) lida pela
 * conexão que o app já tem. O PITR gerenciado do Railway depende do arquivamento
 * contínuo de WAL; se o arquivador parar em silêncio, a janela de recuperação
 * deixa de avançar — é exatamente a falha que precisa de alerta.
 *
 * Módulo **puro** (sem I/O): `avaliarSaudeBackup` decide `ok|warn|crit` e
 * `renderPrometheusSaudeBackup` serializa o texto Prometheus. A coleta (DB)
 * vive em `BackupHealthService`. Testes: `test/backup-health.spec.ts`.
 *
 * NUNCA expõe PII/segredo: apenas contadores, idades (segundos) e nomes de
 * motivo fixos (enums) usados como label.
 */

export interface EntradaSaudeBackup {
  /** A coleta no banco funcionou? (false ⇒ estado desconhecido, alerta) */
  probeOk: boolean;
  /** `current_setting('archive_mode')` — esperado `on`. */
  archiveMode: string | null;
  archivedCount: number | null;
  failedCount: number | null;
  /** Idade do último arquivamento bem-sucedido, em segundos. */
  idadeUltimoArquivamentoSegundos: number | null;
  /** Idade da última falha de arquivamento, em segundos (null = nunca falhou). */
  idadeUltimaFalhaSegundos: number | null;
}

export interface ThresholdsSaudeBackup {
  /** Atraso a partir do qual o arquivamento é suspeito (WARNING). */
  warnSegundos: number;
  /** Atraso a partir do qual o arquivamento está parado (CRITICAL). */
  critSegundos: number;
  /** Falha de arquivamento dentro desta janela é CRITICAL. */
  falhaRecenteSegundos: number;
}

/**
 * Defaults conservadores (D-594/T242): com `archive_timeout=1min` o intervalo
 * normal é de segundos, então 2 h já é anômalo e 12 h é parada clara. Os limiares
 * são deliberadamente folgados para não gerar falso positivo.
 */
export const THRESHOLDS_SAUDE_BACKUP: ThresholdsSaudeBackup = {
  warnSegundos: 2 * 3600,
  critSegundos: 12 * 3600,
  falhaRecenteSegundos: 3600,
};

export type NivelSaudeBackup = "ok" | "warn" | "crit";
export type MotivoSaudeBackup =
  | "ok"
  | "probe_indisponivel"
  | "archive_mode_off"
  | "sem_arquivamento_registrado"
  | "arquivamento_atrasado_crit"
  | "arquivamento_atrasado_warn"
  | "falha_recente"
  | "falha_apos_ultimo_sucesso"
  | "falhas_historicas";

export interface AvaliacaoSaudeBackup {
  nivel: NivelSaudeBackup;
  /** true somente quando `nivel === "ok"`. */
  ok: boolean;
  motivos: MotivoSaudeBackup[];
}

const NIVEL_LEVEL: Record<NivelSaudeBackup, number> = { ok: 0, warn: 1, crit: 2 };

/** Avalia a entrada → { nível, ok, motivos[] }. Puro e determinístico. */
export function avaliarSaudeBackup(
  entrada: EntradaSaudeBackup,
  t: ThresholdsSaudeBackup = THRESHOLDS_SAUDE_BACKUP,
): AvaliacaoSaudeBackup {
  const motivos: MotivoSaudeBackup[] = [];
  let nivel: NivelSaudeBackup = "ok";

  const agravar = (n: NivelSaudeBackup, m: MotivoSaudeBackup) => {
    motivos.push(m);
    if (NIVEL_LEVEL[n] > NIVEL_LEVEL[nivel]) nivel = n;
  };

  if (!entrada.probeOk) {
    // Fail-closed: sem conseguir medir, NÃO declaramos saudável.
    return { nivel: "crit", ok: false, motivos: ["probe_indisponivel"] };
  }

  if (entrada.archiveMode !== "on") {
    agravar("crit", "archive_mode_off");
  }

  const idade = entrada.idadeUltimoArquivamentoSegundos;
  if (idade === null) {
    agravar("crit", "sem_arquivamento_registrado");
  } else if (idade >= t.critSegundos) {
    agravar("crit", "arquivamento_atrasado_crit");
  } else if (idade >= t.warnSegundos) {
    agravar("warn", "arquivamento_atrasado_warn");
  }

  const idadeFalha = entrada.idadeUltimaFalhaSegundos;
  if (idadeFalha !== null) {
    if (idadeFalha < t.falhaRecenteSegundos) {
      agravar("crit", "falha_recente");
    } else if (idade === null || idadeFalha < idade) {
      // Falhou depois do último sucesso ⇒ o arquivamento está quebrado agora.
      agravar("crit", "falha_apos_ultimo_sucesso");
    } else {
      agravar("warn", "falhas_historicas");
    }
  }

  if (motivos.length === 0) motivos.push("ok");
  return { nivel, ok: nivel === "ok", motivos };
}

/**
 * Texto Prometheus (convenção: exposição plana, uma métrica por linha).
 * `idadeUltimaFalhaSegundos` ausente é exposta como `-1` (nunca falhou) para
 * que a série não desapareça. Cada motivo vira uma série `{reason="..."}`.
 */
export function renderPrometheusSaudeBackup(
  entrada: EntradaSaudeBackup,
  avaliacao: AvaliacaoSaudeBackup,
): string {
  const b = (v: boolean) => (v ? 1 : 0);
  const n = (v: number | null, ausente = -1) => (v === null ? ausente : v);
  const linhas: string[] = [
    "# HELP backup_health_probe_ok 1 se a coleta de saúde do backup funcionou.",
    "# TYPE backup_health_probe_ok gauge",
    `backup_health_probe_ok ${b(entrada.probeOk)}`,
    "# HELP backup_health_ok 1 se o backup está saudável (probe + limiares).",
    "# TYPE backup_health_ok gauge",
    `backup_health_ok ${b(avaliacao.ok)}`,
    "# HELP backup_health_level 0=ok, 1=warn, 2=crit.",
    "# TYPE backup_health_level gauge",
    `backup_health_level ${NIVEL_LEVEL[avaliacao.nivel]}`,
    "# HELP backup_health_reason Motivo da classificação (enum fixo, sem PII).",
    "# TYPE backup_health_reason gauge",
    ...avaliacao.motivos.map((m) => `backup_health_reason{reason="${m}"} 1`),
    "# HELP backup_archive_mode_on 1 se archive_mode=on.",
    "# TYPE backup_archive_mode_on gauge",
    `backup_archive_mode_on ${b(entrada.archiveMode === "on")}`,
    "# HELP backup_archiver_archived_total Total de WALs arquivados com sucesso.",
    "# TYPE backup_archiver_archived_total gauge",
    `backup_archiver_archived_total ${n(entrada.archivedCount, 0)}`,
    "# HELP backup_archiver_failed_total Total de falhas de arquivamento.",
    "# TYPE backup_archiver_failed_total gauge",
    `backup_archiver_failed_total ${n(entrada.failedCount, 0)}`,
    "# HELP backup_archiver_last_archived_age_seconds Idade do último arquivamento.",
    "# TYPE backup_archiver_last_archived_age_seconds gauge",
    `backup_archiver_last_archived_age_seconds ${n(entrada.idadeUltimoArquivamentoSegundos)}`,
    "# HELP backup_archiver_last_failed_age_seconds Idade da última falha (-1 = nunca).",
    "# TYPE backup_archiver_last_failed_age_seconds gauge",
    `backup_archiver_last_failed_age_seconds ${n(entrada.idadeUltimaFalhaSegundos)}`,
  ];
  return `${linhas.join("\n")}\n`;
}
