import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AlertsService, type AlertaInfo } from "./alerts.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";

/**
 * GET /api/v1/admin/alerts/status — status dos alertas (T218, 9.5.3).
 * Protegido por @Roles('ADMIN'); non-admin → 403. Não expõe dados de
 * usuários — apenas métricas agregadas + estado.
 */
@ApiTags("admin")
@ApiBearerAuth()
@Controller("api/v1/admin/alerts")
@UseGuards(AuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get("status")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Status dos alertas (5xx rate, auth failures)" })
  async status(): Promise<{ alertas: AlertaInfo[]; atualizadoEm: string }> {
    return {
      alertas: await this.alerts.calcular(),
      atualizadoEm: new Date().toISOString(),
    };
  }
}
