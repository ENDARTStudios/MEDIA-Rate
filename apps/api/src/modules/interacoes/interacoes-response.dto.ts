import type { StatusConsumo, ReacaoConsumo, MotivoAbandono } from "@prisma/client";

/**
 * T036/B3 (D-536) — contrato PÚBLICO do GET /api/v1/interacoes.
 *
 * ALLOWLIST explícita: apenas os campos consumidos pela biblioteca/feed
 * (`api-interacoes.ts`) e pelo `use-interaction-store` (que lê `reacao`/
 * `motivo_abandono` do payload). NÃO expõe colunas internas/legadas:
 * `usuario_id`, `tenant_id`, `created_at`, `tipo`, `rating` e `comentario`
 * (este último é plaintext e legado).
 */
export interface InteracaoMidiaResponseDto {
  id: string;
  slug: string | null;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score: number | null;
}

export interface InteracaoResponseDto {
  id: string;
  midia_id: string;
  status: StatusConsumo;
  reacao: ReacaoConsumo | null;
  motivo_abandono: MotivoAbandono | null;
  progresso_detalhe: string | null;
  iniciado_em: Date | null;
  concluido_em: Date | null;
  atualizado_em: Date;
  origem_relacao_id: string | null;
  midia: InteracaoMidiaResponseDto;
}

/** Envelope paginado (D-525): { items, total, porStatus, nextCursor }. */
export interface InteracoesPageResponseDto {
  items: InteracaoResponseDto[];
  /** Total do FILTRO atual (sem paginação). */
  total: number;
  /** Contagens GLOBAIS por status (ignoram filtros) — abas da biblioteca. */
  porStatus: Record<string, number>;
  /** Token opaco da próxima página; null = última. */
  nextCursor: string | null;
}
