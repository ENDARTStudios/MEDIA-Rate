import { Controller, Get } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator.js";

/**
 * Controller admin — rotas protegidas por RBAC @Roles('ADMIN') (T3.4/T3.5).
 */
@Controller("api/v1/admin")
export class AdminController {
  @Get("stats")
  @Roles("ADMIN")
  getStats(): { message: string; timestamp: string } {
    return {
      message: "Acesso admin concedido — estatísticas do sistema.",
      timestamp: new Date().toISOString(),
    };
  }
}
