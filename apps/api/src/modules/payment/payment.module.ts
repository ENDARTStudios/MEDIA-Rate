import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AnalyticsModule } from "../../common/analytics.module.js";
import { MailerModule } from "../mailer/mailer.module.js";
import { MockPaymentGateway } from "./adapter/mock-payment.gateway.js";
import { StripePaymentGateway } from "./adapter/stripe-payment.gateway.js";
import { PAYMENT_GATEWAY } from "./domain/gateway/payment-gateway.port.js";

/**
 * Módulo de pagamento (T4.8).
 *
 * - Em produção: usa StripePaymentGateway (requer STRIPE_SECRET_KEY).
 * - Em test/dev sem Stripe: usa MockPaymentGateway.
 * - Seleção automática baseada em STRIPE_SECRET_KEY env.
 */
@Module({
  imports: [PrismaModule, MailerModule, AnalyticsModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_GATEWAY,
      useFactory: () => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (secretKey && secretKey !== "SUA_CHAVE_AQUI" && secretKey.length > 0) {
          return new StripePaymentGateway();
        }
        return new MockPaymentGateway();
      },
    },
  ],
})
export class PaymentModule {}
