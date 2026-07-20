import { Controller, Get } from "@nestjs/common";
import { RequirePlan } from "../../common/decorators/require-plan.decorator.js";

/**
 * Controller premium — rotas protegidas por @RequirePlan (T3.7).
 * Usado para testar que usuario FREE recebe 402 Payment Required.
 */
@Controller("api/v1/premium")
export class PremiumController {
  @Get("recommendations")
  @RequirePlan("PLUS")
  getAdvancedRecommendations(): { message: string; tier: string } {
    return {
      message: "Recomendações avançadas (PLUS+).",
      tier: "advanced",
    };
  }

  @Get("ml-personalized")
  @RequirePlan("PREMIUM")
  getMlRecommendations(): { message: string; tier: string } {
    return {
      message: "Recomendações ML personalizadas (PREMIUM only).",
      tier: "ml_personalized",
    };
  }
}
