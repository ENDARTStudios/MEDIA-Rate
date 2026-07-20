import { Controller, Get } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- HealthService precisa ser import como valor para NestJS DI (design:paramtypes metadata)
import { HealthService, type HealthResponse } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
