import { Writable } from "node:stream";

interface LinhaLog {
  level?: number;
  time?: number;
  [chave: string]: unknown;
}

/**
 * LokiStream (T217, 9.5.1) — destino de logs para Loki (URL configurada em
 * LOKI_URL). Faz batch das linhas (máx 200 ou 2s) e envia via HTTP POST a
 * /loki/api/v1/push (JSON) com label job=media-rate-api.
 *
 * - Pino já aplicou redact antes do stream — nunca chega segredo aqui.
 * - Falhas de envio são silenciosas (log não pode derrubar a app).
 * - Sem LOKI_URL, os logs vão apenas para o console (Railway captura
 *   stdout — logs nativos).
 */
export class LokiStream extends Writable {
  private fila: LinhaLog[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly url: string;
  private static readonly BATCH_MAX = 200;
  private static readonly FLUSH_MS = 2_000;

  constructor(private readonly lokiUrl?: string) {
    super({ objectMode: true });
    this.url = (lokiUrl ?? process.env.LOKI_URL ?? "").replace(/\/$/, "");
  }

  override _write(
    chunk: LinhaLog,
    _enc: BufferEncoding,
    callback: (err?: Error | null) => void,
  ): void {
    this.fila.push(chunk);
    if (this.fila.length >= LokiStream.BATCH_MAX) {
      void this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, LokiStream.FLUSH_MS);
      this.timer.unref?.();
    }
    callback();
  }

  override _final(callback: (err?: Error | null) => void): void {
    void this.flush().finally(() => callback());
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.fila.length === 0) return;
    const batch = this.fila;
    this.fila = [];
    if (!this.url) return; // sem Loki → console apenas (Railway nativo)

    const streams = batch.map((linha) => ({
      stream: { job: "media-rate-api", level: String(linha.level ?? "info") },
      values: [[(Number(linha.time ?? Date.now()) * 1_000_000).toString(), JSON.stringify(linha)]],
    }));
    const corpo = { streams };

    try {
      await fetch(`${this.url}/loki/api/v1/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
    } catch {
      // Silencioso: falha de log não derruba a aplicação.
    }
  }
}

/**
 * Configuração do logger (T217): mantém a config existente (Pino + redact) e,
 * se LOKI_URL estiver definida, adiciona um stream Loki (batched).
 */
export function buildLokiStream(): LokiStream | null {
  const url = process.env.LOKI_URL ?? "";
  return url.length > 0 ? new LokiStream(url) : null;
}
