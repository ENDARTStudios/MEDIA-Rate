import { Module, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service.js";
import { WatchlistService } from "../watchlist/watchlist.service.js";
import { WatchlistModule } from "../watchlist/watchlist.module.js";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { AuthModule } from "../auth/auth.module.js";

/**
 * T286 — DiscoveryModule assina o hook onReacaoRegistrada da T285 para
 * derivar DiscoveryEvents (reação GOSTEI em obra com aresta no grafo).
 * O feed é servido por GET /api/v1/discoveries (T201) que faz UNION com
 * estes eventos. A assinatura é feita em onModuleInit e desfeita em
 * onModuleDestroy (sem vazar o handler entre instâncias/testes).
 */
@Module({
  imports: [PrismaModule, AuthModule, WatchlistModule],
  providers: [DiscoveryService],
})
export class DiscoveryModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly watchlist: WatchlistService,
    private readonly discovery: DiscoveryService,
  ) {}

  onModuleInit(): void {
    this.watchlist.onReacaoRegistrada = (evento) => this.discovery.processarReacao(evento);
  }

  onModuleDestroy(): void {
    this.watchlist.onReacaoRegistrada = undefined;
  }
}
