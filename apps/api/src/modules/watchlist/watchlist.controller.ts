import { Controller, Get, Post, Delete, Patch, Body, Param, Req, UseGuards, UsePipes, HttpCode } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { WatchlistService } from "./watchlist.service.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { addToWatchlistSchema, moveWatchlistSchema, type AddToWatchlistDto, type MoveWatchlistDto } from "./dto/watchlist.dto.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";

@Controller("api/v1/watchlist")
@UseGuards(AuthGuard)
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}

  @Get()
  async list(@Req() req: FastifyRequest & { user?: { id: string } }) {
    const usuarioId = req.user!.id;
    return this.service.list(usuarioId);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(addToWatchlistSchema))
  async add(@Req() req: FastifyRequest & { user?: { id: string } }, @Body() body: AddToWatchlistDto) {
    return this.service.add(req.user!.id, body);
  }

  @Patch(":id/move")
  @UsePipes(new ZodValidationPipe(moveWatchlistSchema))
  async move(@Req() req: FastifyRequest & { user?: { id: string } }, @Param("id") id: string, @Body() body: MoveWatchlistDto) {
    return this.service.move(req.user!.id, id, body.coluna);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Req() req: FastifyRequest & { user?: { id: string } }, @Param("id") id: string) {
    await this.service.remove(req.user!.id, id);
  }
}
