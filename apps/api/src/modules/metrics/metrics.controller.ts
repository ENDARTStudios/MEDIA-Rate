import { Controller, Get, Req, Res, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { MetricsService } from "./metrics.service.js";
import { isAdminTokenValid } from "../../common/admin-token.util.js";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawHeaders = req.raw.headers ?? req.headers;
    const headerToken = Object.entries(rawHeaders).find(
      ([k]) => k.toLowerCase() === "x-admin-token",
    )?.[1] as string | undefined;

    if (!isAdminTokenValid(headerToken)) {
      throw new HttpException(
        { statusCode: 401, error: "Unauthorized", message: "Admin token required" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const metrics = await this.metricsService.getMetrics();
    return reply.status(200).send(metrics);
  }
}
