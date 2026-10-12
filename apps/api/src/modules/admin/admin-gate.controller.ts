import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator.js";

/**
 * T206 — probe DEDICADO do gate admin (design T204/Opção B; T202/T203 como base).
 *
 * Contrato mínimo: GET /api/v1/admin/gate → { ok: true } sob a cadeia global de
 * guards (Auth → CSRF → Roles → Plan) com @Roles("ADMIN"). Payload deliberadamente
 * mínimo — nunca papel, e-mail, id, sessão, IP, user-agent, token ou cookie.
 * Idempotente e sem efeito colateral; coberto pelo rate limit admin de leitura
 * (aplicarRateLimitAdmin, 60/min). Consumido por apps/web/src/lib/admin-auth-server.ts
 * (probe primário, com fallback ao /admin/backfills/status para compatibilidade).
 */
@Controller("api/v1/admin")
export class AdminGateController {
  @Get("gate")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Probe do gate admin (payload mínimo; uso interno do frontend)" })
  @ApiBearerAuth()
  gate(): { ok: true } {
    return { ok: true };
  }
}
