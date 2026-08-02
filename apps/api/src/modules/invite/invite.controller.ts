import { Controller, Post, Req, Res, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { isAdminTokenValid } from "../../common/admin-token.util.js";

const validInvites = new Set<string>();

@Controller("api/v1/invite")
export class InviteController {
  @Post()
  async generateInvite(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
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

    const code = randomUUID();
    validInvites.add(code);

    setTimeout(() => validInvites.delete(code), 7 * 24 * 60 * 60 * 1000);

    return reply
      .status(201)
      .send({ code, expiresIn: "7 days", remaining: 100 - validInvites.size });
  }
}

export { validInvites };
