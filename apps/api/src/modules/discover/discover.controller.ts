import { Controller, Get, Query } from "@nestjs/common";
import { DiscoverService } from "./discover.service.js";

@Controller("api/v1")
export class DiscoverController {
  constructor(private readonly service: DiscoverService) {}

  @Get("search")
  async search(@Query("q") q: string, @Query("tipo") tipo?: string, @Query("limit") limit?: string) {
    return this.service.search(q, { tipo: tipo as any, limit: limit ? parseInt(limit) : undefined });
  }

  @Get("discover")
  async discover(@Query("tipo") tipo?: string, @Query("limit") limit?: string) {
    return this.service.discover({ tipo: tipo as any, limit: limit ? parseInt(limit) : undefined });
  }

  @Get("trending")
  async trending(@Query("limit") limit?: string) {
    return this.service.trending({ limit: limit ? parseInt(limit) : undefined });
  }
}
