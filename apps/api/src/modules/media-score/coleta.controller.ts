import { Body, Controller, Post } from "@nestjs/common";
import { ColetaService } from "./coleta.service.js";
import { MediaScoreService } from "./media-score.service.js";
import type { ConsultaMedia } from "./adapters/fonte-adapter.interface.js";

/**
 * Rota de coleta/auditoria — desabilitada por padrão
 * (ENABLE_DEBUG_ROUTES=true ativa junto ao módulo).
 * Guardada: AuthGuard ignora APENAS quando o gate está ligado.
 */
@Controller("api/v1/_debug/coletar")
export class ColetaController {
  constructor(
    private readonly coleta: ColetaService,
    private readonly mediaScore: MediaScoreService,
  ) {}

  @Post()
  async coletar(@Body() consulta: ConsultaMedia) {
    const resultados = await this.coleta.coletarTudo(consulta);
    const avaliacoes = resultados
      .filter(
        (r): r is typeof r & { nota: NonNullable<(typeof r)["nota"]> } =>
          r.status === "ok" && !!r.nota,
      )
      .map((r) => r.nota);
    const score = this.mediaScore.calcularScoreV2(consulta.tipo, avaliacoes);
    return { resultados, score };
  }
}
