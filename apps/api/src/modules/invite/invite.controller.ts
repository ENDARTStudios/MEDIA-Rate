import { Controller, Post, Req, Res, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";

const validInvites = new Set<string>();

@Controller("api/v1/invite")
export class InviteController {

  @Post()
  async generateInvite(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const adminToken = process.env.ADMIN_TOKEN || "media-rate-admin-2026";
    const rawHeaders = (req as any).raw?.headers ?? req.headers;
    const headerToken = Object.entries(rawHeaders).find(([k]) => k.toLowerCase() === "x-admin-token")?.[1] as string | undefined;

    if (!headerToken || headerToken !== adminToken) {
      throw new HttpException({ statusCode: 401, error: "Unauthorized", message: "Admin token required" }, HttpStatus.UNAUTHORIZED);
    }

    const code = randomUUID();
    validInvites.add(code);

    setTimeout(() => validInvites.delete(code), 7 * 24 * 60 * 60 * 1000);

    return reply.status(201).send({ code, expiresIn: "7 days", remaining: 100 - validInvites.size });
  }
}

export { validInvites };
