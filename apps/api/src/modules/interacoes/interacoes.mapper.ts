import type { Prisma } from "@prisma/client";
import type { InteracaoResponseDto, InteracoesPageResponseDto } from "./interacoes-response.dto.js";

/**
 * T036/B3 (D-536) — mapper ALLOWLIST do contrato público de interações.
 * Cada campo é copiado EXPLICITAMENTE: nenhuma coluna interna/legada vaza
 * (`usuario_id`, `tenant_id`, `created_at`, `tipo`, `rating`, `comentario`).
 */

/** Campos de mídia expostos no item (biblioteca/feed). */
export const MIDIA_INTERACAO_SELECT = {
  id: true,
  slug: true,
  titulo: true,
  tipo: true,
  ano_lancamento: true,
  imagem_url: true,
  score: true,
} satisfies Prisma.MidiaSelect;

export type InteracaoComMidia = Prisma.UsuarioMidiaInteracaoGetPayload<{
  include: { midia: { select: typeof MIDIA_INTERACAO_SELECT } };
}>;

export function mapearInteracaoResponse(i: InteracaoComMidia): InteracaoResponseDto {
  return {
    id: i.id,
    midia_id: i.midia_id,
    status: i.status,
    reacao: i.reacao,
    motivo_abandono: i.motivo_abandono,
    progresso_detalhe: i.progresso_detalhe,
    iniciado_em: i.iniciado_em,
    concluido_em: i.concluido_em,
    atualizado_em: i.atualizado_em,
    origem_relacao_id: i.origem_relacao_id,
    midia: {
      id: i.midia.id,
      slug: i.midia.slug,
      titulo: i.midia.titulo,
      tipo: i.midia.tipo,
      ano_lancamento: i.midia.ano_lancamento,
      imagem_url: i.midia.imagem_url,
      score: i.midia.score,
    },
  };
}

export function mapearPaginaResponse(entrada: {
  items: InteracaoComMidia[];
  total: number;
  porStatus: Record<string, number>;
  nextCursor: string | null;
}): InteracoesPageResponseDto {
  return {
    items: entrada.items.map(mapearInteracaoResponse),
    total: entrada.total,
    porStatus: entrada.porStatus,
    nextCursor: entrada.nextCursor,
  };
}
