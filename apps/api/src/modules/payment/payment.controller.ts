import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";

import { PaymentService } from "./payment.service.js";
import { CreateCheckoutDto } from "./dto/payment.dto.js";
import { currencyForRegion } from "./currency-region.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { Idempotent } from "../../common/decorators/idempotent.decorator.js";
import { AuthenticatedUser } from "../../common/guards/auth.guard.js";

/**
 * Controller de pagamento (T4.8).
 *
 * - POST /api/v1/checkout — cria sessão Stripe (idempotente).
 * - POST /api/v1/webhooks/stripe — recebe webhook Stripe.
 */
@ApiTags("payment")
@Controller("api/v1")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("checkout")
  @HttpCode(200)
  @Idempotent()
  @UsePipes(new ZodValidationPipe(CreateCheckoutDto))
  @ApiOperation({ summary: "Cria sessão de checkout Stripe para upgrade de plano" })
  @ApiHeader({
    name: "Idempotency-Key",
    description: "UUID único por tentativa (T4.3)",
    required: true,
  })
  @ApiResponse({ status: 200, description: "Sessão criada com URL de checkout." })
  async createCheckout(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: AuthenticatedUser },
  ): Promise<{
    checkout_session_id: string;
    url: string;
    plano: string;
  }> {
    const dto = body as {
      plano: "PLUS" | "PREMIUM";
      success_url: string;
      cancel_url: string;
      currency?: "BRL" | "USD" | "EUR";
      periodo?: "month" | "year";
    };
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }
    // T419 (D-389): moeda derivada no server — geo da Vercel + locale do
    // cliente (header). Nunca aceita moeda arbitrária do body.
    const country = (req.headers["x-vercel-ip-country"] as string | undefined) ?? null;
    const locale = (req.headers["x-locale"] as string | undefined) ?? "pt-BR";
    dto.currency = currencyForRegion(locale, country);
    dto.periodo = dto.periodo ?? "month";

    // T447: guarda defensiva do plano anual — nunca inicia checkout anual sem
    // um price_ anual configurado (STRIPE_PRICE_<PLANO>_YEAR_<MOEDA>). Se ausente,
    // responde 422 (gracioso) em vez de quebrar o checkout.
    if (dto.periodo === "year") {
      const annualKey = `STRIPE_PRICE_${dto.plano}_YEAR_${dto.currency}`;
      if (!process.env[annualKey]) {
        throw new BadRequestException(
          "O plano anual ainda não está configurado para este plano/moeda.",
        );
      }
    }

    // Busca email do usuário no banco.
    const session = await this.paymentService.createCheckout(dto, {
      id: user.id,
      email: user.email,
    });
    return {
      checkout_session_id: session.id,
      url: session.url,
      plano: dto.plano,
    };
  }

  @Post("billing/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancela a assinatura ativa no fim do período (mantém acesso até lá)" })
  @ApiResponse({ status: 200, description: "Cancelamento agendado ou no-op (sem assinatura)." })
  async cancelar(@Req() req: FastifyRequest & { user?: AuthenticatedUser }) {
    const user = req.user;
    if (!user) throw new Error("Usuário não autenticado.");
    return this.paymentService.cancelar({ id: user.id });
  }

  @Post("webhooks/stripe")
  @HttpCode(200)
  @ApiOperation({ summary: "Webhook Stripe — processa eventos de pagamento" })
  @ApiHeader({ name: "Stripe-Signature", description: "Assinatura do webhook", required: true })
  @ApiResponse({ status: 200, description: "Webhook processado ou ignorado (idempotência)." })
  async webhook(
    @Req() req: FastifyRequest,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ processed: boolean; event_id: string; type: string }> {
    // Body raw — a assinatura do Stripe é calculada sobre os bytes originais.
    // O parser JSON registrado em main.ts preserva os bytes em req.rawBody.
    const rawBody = (req as unknown as { rawBody?: string | Buffer }).rawBody ?? "";
    return this.paymentService.processWebhook(rawBody, signature ?? "");
  }
}
