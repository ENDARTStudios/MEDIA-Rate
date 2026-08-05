import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UsePipes,
  HttpCode,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { WatchlistService } from "./watchlist.service.js";
import { MetricsService } from "../metrics/metrics.service.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import {
  addToWatchlistSchema,
  moveWatchlistSchema,
  type AddToWatchlistDto,
} from "./dto/watchlist.dto.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";

type WatchlistRequest = FastifyRequest & { user?: { id: string } };

@ApiTags("watchlist")
@ApiBearerAuth()
@Controller("api/v1/watchlist")
@UseGuards(AuthGuard)
export class WatchlistController {
  constructor(
    private readonly service: WatchlistService,
    private readonly metrics: MetricsService,
  ) {}

  private userId(req: WatchlistRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException("Autenticação necessária.");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Lista a watchlist do usuário autenticado" })
  async list(@Req() req: WatchlistRequest) {
    return this.service.list(this.userId(req));
  }

  @Post()
  @ApiOperation({ summary: "Adiciona uma mídia à watchlist" })
  @UsePipes(new ZodValidationPipe(addToWatchlistSchema))
  async add(@Req() req: WatchlistRequest, @Body() body: AddToWatchlistDto) {
    this.metrics.incrementWatchlistAdd();
    return this.service.add(this.userId(req), body);
  }

  @Patch(":id/move")
  @ApiOperation({ summary: "Move um item entre colunas da watchlist" })
  async move(
    @Req() req: FastifyRequest & { user?: { id: string }; body?: unknown },
    @Param("id") id: string,
  ) {
    const body = req.body ?? {};
    const coluna = moveWatchlistSchema.parse(body).coluna;
    this.metrics.incrementWatchlistMove();
    return this.service.move(this.userId(req), id, coluna);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove um item da watchlist" })
  @HttpCode(204)
  async remove(@Req() req: WatchlistRequest, @Param("id") id: string) {
    this.metrics.incrementWatchlistRemove();
    await this.service.remove(this.userId(req), id);
  }
}
