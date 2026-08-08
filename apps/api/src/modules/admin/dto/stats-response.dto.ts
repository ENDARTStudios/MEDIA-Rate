/**
 * T221 (4.7) — resposta de GET /admin/stats. Apenas contagens agregadas —
 * nunca emails, senhas, tokens ou dados individuais.
 */
export interface AdminStatsResponse {
  usuarios: {
    total: number;
    ativos_7d: number; // com ultimo_login_em nos últimos 7 dias
  };
  midias: {
    total: number; // não deletadas (soft delete)
    por_tipo: Record<string, number>;
  };
  watchlists: {
    total_entries: number;
    usuarios_com_watchlist: number;
  };
  sessoes: {
    ativas: number; // expires_at > NOW() e revoked_at IS NULL
  };
  planos: {
    free: number;
    plus: number;
    premium: number;
  };
}
