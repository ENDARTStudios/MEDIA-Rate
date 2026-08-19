-- T333: índice dedicado para detecção de reuse do refresh token.
-- Antes: seq scan em sessao.refresh_token_hash_anterior a cada /auth/refresh.
CREATE INDEX "sessao_refresh_token_hash_anterior_idx"
  ON "sessao"("refresh_token_hash_anterior");
