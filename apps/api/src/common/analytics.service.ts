import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

/**
 * Eventos de negocio instrumentados (T1.9 / Discovery Q7).
 * Manter lista sincronizada com o frontend (apps/web).
 */
export const AnalyticsEvents = {
  // Ativacao
  USER_REGISTERED: "user_registered",
  USER_EMAIL_VERIFIED: "user_email_verified",
  USER_FIRST_SEARCH: "user_first_search",
  // Retencao (cohort D1/D7/D30 medido no PostHog a partir destes)
  USER_SESSION_START: "user_session_start",
  USER_RETURNED_D1: "user_returned_d1",
  USER_RETURNED_D7: "user_returned_d7",
  USER_RETURNED_D30: "user_returned_d30",
  // Conversao Free -> Plus -> Premium
  PLAN_CHECKOUT_STARTED: "plan_checkout_started",
  PLAN_CHECKOUT_COMPLETED: "plan_checkout_completed",
  PLAN_DOWNGRADED: "plan_downgraded",
  PLAN_CHURNED: "plan_churned",
  // Engajamento com recomendacoes
  RECOMMENDATION_SHOWN: "recommendation_shown",
  RECOMMENDATION_CLICKED: "recommendation_clicked",
  RECOMMENDATION_DISMISSED: "recommendation_dismissed",
  // Media Score
  MEDIA_SCORE_VIEWED: "media_score_viewed",
  // Metricas financeiras (tambem calculadas no PostHog, mas evento para audit)
  MRR_RECALCULATED: "mrr_recalculated",
  LTV_CAC_RECALCULATED: "ltv_cac_recalculated",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Servico de analytics (T1.9).
 *
 * - Usa PostHog Cloud free tier (decisao DECIDE-01).
 * - Bufferiza eventos em memoria quando ANALYTICS_WRITE_KEY ausente
 *   (dev/test), apenas loga em debug — nao quebra a request.
 * - PII: nunca passar email/cpf/telefone como propriedade. Usar
 *   distinctId (UUID do usuario, hasheado se necessario em v2).
 * - Em teste, instantiate com { enabled: false } para no-op.
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly client: PostHog | null;
  private readonly enabled: boolean;

  constructor(options: { enabled?: boolean } = {}) {
    const writeKey = process.env.ANALYTICS_WRITE_KEY;
    const host = process.env.POSTHOG_HOST ?? "https://app.posthog.com";
    this.enabled = options.enabled ?? Boolean(writeKey);

    if (this.enabled && writeKey) {
      this.client = new PostHog(writeKey, { host });
    } else {
      this.client = null;
      if (writeKey === undefined) {
        this.logger.warn("ANALYTICS_WRITE_KEY ausente — analytics desabilitado (modo dev/test).");
      }
    }
  }

  /**
   * Captura um evento de analytics.
   * NUNCA passar PII em properties — usar apenas distinctId.
   */
  capture(
    distinctId: string,
    event: AnalyticsEventName,
    properties: AnalyticsProperties = {},
  ): void {
    if (!this.enabled || !this.client) {
      this.logger.debug(`[analytics:disabled] ${event} for ${distinctId}`, properties);
      return;
    }

    // Sanitizacao defensiva: remove chaves suspeitas de PII.
    const safe = this.sanitize(properties);
    try {
      this.client.capture({ distinctId, event, properties: safe });
    } catch (err) {
      // Analytics nunca deve quebrar a request principal.
      this.logger.error(`Falha ao capturar evento ${event}: ${(err as Error).message}`, {
        distinctId,
        event,
      });
    }
  }

  /**
   * Identifica usuario com propriedades publicas (nao-sensiveis).
   * NUNCA passar email, cpf, telefone, endereco.
   */
  identify(distinctId: string, setProperties: AnalyticsProperties = {}): void {
    if (!this.enabled || !this.client) {
      this.logger.debug(`[analytics:disabled] identify ${distinctId}`, setProperties);
      return;
    }
    const safe = this.sanitize(setProperties);
    try {
      this.client.identify({ distinctId, properties: safe });
    } catch (err) {
      this.logger.error(`Falha ao identificar ${distinctId}: ${(err as Error).message}`);
    }
  }

  /**
   * Sanitiza properties removendo chaves que parecem PII.
   * Lista em PII_SUSPECT_KEYS.
   */
  sanitize(props: AnalyticsProperties): AnalyticsProperties {
    const cleaned: AnalyticsProperties = {};
    for (const [key, value] of Object.entries(props)) {
      if (PII_SUSPECT_KEYS.test(key)) {
        this.logger.warn(`Property '${key}' parece PII — removida do evento de analytics.`);
        continue;
      }
      cleaned[key] = value;
    }
    return cleaned;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }

  /** Expoto para teste. */
  isEnabled(): boolean {
    return this.enabled;
  }
}

const PII_SUSPECT_KEYS =
  /^(email|cpf|cnpj|phone|telefone|endereco|address|password|senha|token|secret|cartao|card|cvv|cep)$/i;
