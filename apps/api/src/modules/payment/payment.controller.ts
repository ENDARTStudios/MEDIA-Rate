import { Body, Controller, Headers, HttpCode, Post, Req, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- PaymentService precisa ser import como valor para NestJS DI
import { PaymentService } from "./payment.service.js";
import { CreateCheckoutDto } from "./dto/payment.dto.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { Idempotent } from "../../common/decorators/idempotent.decorator.js";
import type { AuthenticatedUser } from "../../common/guards/auth.guard.js";

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
    const dto = body as { plano: "PLUS" | "PREMIUM"; success_url: string; cancel_url: string };
    const user = req.user;
    if (!user) {
      throw new Error("Usuário não autenticado.");
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

  @Post("webhooks/stripe")
  @HttpCode(200)
  @ApiOperation({ summary: "Webhook Stripe — processa eventos de pagamento" })
  @ApiHeader({ name: "Stripe-Signature", description: "Assinatura do webhook", required: true })
  @ApiResponse({ status: 200, description: "Webhook processado ou ignorado (idempotência)." })
  async webhook(
    @Req() req: FastifyRequest,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ processed: boolean; event_id: string; type: string }> {
    // Body raw — não usar @Body() que parseia JSON. Lê do raw body do Fastify.
    const rawBody =
      typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "";
    return this.paymentService.processWebhook(rawBody, signature ?? "");
  }
}
