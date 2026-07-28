import { Controller, Get, Req, Res, UseGuards, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { MetricsService } from "./metrics.service.js";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const adminToken = process.env.ADMIN_TOKEN || "media-rate-admin-2026";
    const headerToken = req.headers["x-admin-token"] as string | undefined;

    if (!headerToken || headerToken !== adminToken) {
      throw new HttpException({ statusCode: 401, error: "Unauthorized", message: "Admin token required" }, HttpStatus.UNAUTHORIZED);
    }

    const metrics = await this.metricsService.getMetrics();
    return reply.status(200).send(metrics);
  }
}
