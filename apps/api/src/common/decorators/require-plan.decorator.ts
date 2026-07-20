import { SetMetadata } from "@nestjs/common";

/**
 * Decorator @RequirePlan('PLUS') — marca rota como exigindo plano mínimo.
 * Combinado com PlanGuard (T3.7).
 *
 * Uso:
 *   @RequirePlan('PLUS')
 *   @Get('advanced-recommendations')
 *   advanced() { ... }
 *
 * Hierarquia: FREE < PLUS < PREMIUM. Rota marcada 'PLUS' exige PLUS ou
 * PREMIUM. Rota marcada 'PREMIUM' exige PREMIUM.
 *
 * Ordem FASE-3: retorna 402 Payment Required (não 403) para diferenciar
 * "sem permissão de papel" (403) de "sem plano pago" (402 — convite para
 * upgrade). PLANO_MESTRE.md T3.7 cita 403 mas a ordem FASE-3 é mais
 * específica; decidi pela ordem (mais acionável para o cliente).
 */
export const PLAN_KEY = "require_plan";
export const RequirePlan = (plan: "PLUS" | "PREMIUM"): MethodDecorator & ClassDecorator =>
  SetMetadata(PLAN_KEY, plan) as MethodDecorator & ClassDecorator;

/**
 * Hierarquia de planos para comparação.
 */
export const PLAN_RANK: Record<string, number> = {
  FREE: 0,
  PLUS: 1,
  PREMIUM: 2,
};
