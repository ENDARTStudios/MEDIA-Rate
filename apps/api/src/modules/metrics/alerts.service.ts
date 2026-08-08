import { Injectable, Logger } from "@nestjs/common";
import { AuditLogService } from "../../common/audit-log.service.js";

export interface AlertaInfo {
  nome: string;
  estado: "active" | "resolved";
  threshold: number;
  valorAtual: number;
  janela: string;
  ultimoDisparo: string | null;
}

/**
 * AlertsService (T218, 9.5.3) — alertas sobre as métricas existentes:
 *
 * - 5xx > 1% do total em janela deslizante de 5min → CRITICAL (active).
 * - Falhas de auth > 50 em janela de 1min → WARNING (active).
 * - Histerese de 10%: resolve apenas quando cair abaixo de 90% do threshold
 *   (evita flapping).
 * - Janelas: ring buffers de timestamps em memória (sem dependência externa).
 * - Transição: log Pino error (active) / info (resolved) + audit_log
 *   (ALERT_TRIGGERED / ALERT_RESOLVED). NUNCA loga dados de usuário.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  static readonly JANELA_5XX_MS = 5 * 60 * 1000;
  static readonly JANELA_AUTH_MS = 60 * 1000;
  static readonly THRESHOLD_5XX = 0.01; // 1%
  static readonly HISTERESE_5XX = 0.009; // 90% do threshold
  static readonly THRESHOLD_AUTH = 50;
  static readonly HISTERESE_AUTH = 45; // 90% do threshold

  private eventosReq: number[] = [];
  private eventos5xx: number[] = [];
  private eventosAuth: number[] = [];
  private estado5xx: "active" | "resolved" = "resolved";
  private estadoAuth: "active" | "resolved" = "resolved";
  private ultimo5xx: number | null = null;
  private ultimoAuth: number | null = null;

  constructor(private readonly auditLog: AuditLogService) {}

  /** Feed de requisições (denominador + 5xx) — chamado pelo interceptor. */
  registrarRequisicao(status: number, agora: number = Date.now()): void {
    this.eventosReq.push(agora);
    if (status >= 500) this.eventos5xx.push(agora);
  }

  /** Feed de falhas de autenticação — chamado pelo AuthService. */
  registrarFalhaAuth(agora: number = Date.now()): void {
    this.eventosAuth.push(agora);
  }

  private limparJanelas(agora: number): void {
    this.eventosReq = this.eventosReq.filter((t) => agora - t < AlertsService.JANELA_5XX_MS);
    this.eventos5xx = this.eventos5xx.filter((t) => agora - t < AlertsService.JANELA_5XX_MS);
    this.eventosAuth = this.eventosAuth.filter((t) => agora - t < AlertsService.JANELA_AUTH_MS);
  }

  /** Avalia os alertas e retorna o status atual de cada um. */
  async calcular(): Promise<AlertaInfo[]> {
    const agora = Date.now();
    this.limparJanelas(agora);

    const total = this.eventosReq.length;
    const cinco = this.eventos5xx.length;
    const ratio = total > 0 ? cinco / total : 0;
    const auth = this.eventosAuth.length;

    // 5xx (CRITICAL) com histerese.
    if (this.estado5xx === "resolved" && ratio > AlertsService.THRESHOLD_5XX) {
      this.estado5xx = "active";
      this.ultimo5xx = agora;
      await this.disparar("5xx_rate", ratio, AlertsService.THRESHOLD_5XX, "5min");
    } else if (this.estado5xx === "active" && ratio < AlertsService.HISTERESE_5XX) {
      this.estado5xx = "resolved";
      await this.resolver("5xx_rate");
    }

    // Auth failures (WARNING) com histerese.
    if (this.estadoAuth === "resolved" && auth > AlertsService.THRESHOLD_AUTH) {
      this.estadoAuth = "active";
      this.ultimoAuth = agora;
      await this.disparar("auth_failures", auth, AlertsService.THRESHOLD_AUTH, "1min");
    } else if (this.estadoAuth === "active" && auth < AlertsService.HISTERESE_AUTH) {
      this.estadoAuth = "resolved";
      await this.resolver("auth_failures");
    }

    return [
      {
        nome: "5xx_rate",
        estado: this.estado5xx,
        threshold: AlertsService.THRESHOLD_5XX,
        valorAtual: Number(ratio.toFixed(4)),
        janela: "5min",
        ultimoDisparo: this.ultimo5xx ? new Date(this.ultimo5xx).toISOString() : null,
      },
      {
        nome: "auth_failures",
        estado: this.estadoAuth,
        threshold: AlertsService.THRESHOLD_AUTH,
        valorAtual: auth,
        janela: "1min",
        ultimoDisparo: this.ultimoAuth ? new Date(this.ultimoAuth).toISOString() : null,
      },
    ];
  }

  private async disparar(
    nome: string,
    valor: number,
    threshold: number,
    janela: string,
  ): Promise<void> {
    this.logger.error(
      `ALERTA ${nome} disparado — valor ${valor} acima do threshold ${threshold} (janela ${janela}).`,
    );
    await this.auditLog.log({
      entidade: "Alerta",
      entidadeId: nome,
      acao: "ALERT_TRIGGERED",
      dadosDepois: { threshold, valorAtual: valor, janela },
    });
  }

  private async resolver(nome: string): Promise<void> {
    this.logger.log(`Alerta ${nome} resolvido (abaixo do threshold com histerese).`);
    await this.auditLog.log({
      entidade: "Alerta",
      entidadeId: nome,
      acao: "ALERT_RESOLVED",
      dadosDepois: { estado: "resolved" },
    });
  }
}
