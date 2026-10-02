# Política de Privacidade — tabela afirmação × evidência (T423)

> A página /privacy (3 locales) espelha SOMENTE práticas implementadas. Cada
> afirmação aponta o módulo que a implementa — sem prometer o que não existe.

| Afirmação na política | Evidência (módulo/código) |
|---|---|
| Export de dados em JSON (portabilidade/acesso) | `GET /api/v1/user/data` → `lgpd.controller.ts:59` + `lgpd.service.exportarDados` |
| Exclusão com carência de 30 dias (soft delete) | `DELETE /api/v1/user/data` → `lgpd.controller.ts:78` (`agendado_para` +30d) |
| Cancelar exclusão agendada | `POST /api/v1/user/data/cancel-exclusion` → `lgpd.controller.ts` |
| Cookies de sessão httpOnly/Secure/SameSite=Lax | `session-cookie.service.ts` + `cors.config.ts` |
| Senhas com hash forte (argon2id) | `password.service.ts` (argon2id) |
| HTTPS exclusivo | `https-redirect.guard.ts` + Vercel TLS |
| Criptografia de campos sensíveis (column encryption) | `column-encryption.service.ts` |
| Registros de auditoria append-only (imutáveis) | `audit-log.service.ts` + `eventoPagamento` |
| Fontes públicas (TMDB/IMDb/IGDB/OpenCritic) p/ MEDIA Score | `media-score/source-registry.ts` (FONTES) |
| Sem cookies de publicidade/rastreamento de terceiros | `next.config.ts` (sem scripts de terceiros além de PostHog/Sentry) — conferir opt-out PostHog |
| Pagamento via Stripe (nunca número completo do cartão) | `stripe-payment.gateway.ts` (redirect; `payment_method_types`) |
| Transferências internacionais com mecanismo LGPD/ANPD | `payment.service.ts` + `currency-region.ts` + contratos de operadores (Railway/Vercel) |
| Reclamação à ANPD | `/privacy` seção 10 (link gov.br/anpd) |

## Não-promessas (qualificadas, não marketing)
- **"logs retidos 6 anos"** — removido prazo genérico; agora "prazo legal/fiscal por categoria, com acesso restrito" (sem fonte normativa específica).
- **"cláusulas padrão quando aplicável"** — qualificado para "hipóteses e mecanismos da LGPD e da Resolução CD/ANPD nº 19/2024, com contratos e salvaguardas documentadas".
- **"criptografia de ponta a ponta"** — NUNCA afirmado; apenas "criptografia em nível de aplicação (column encryption)".

> Gate legal (D-405/D-406): a redação final deve ser revisada por advogado habilitado antes de publicação definitiva como instrumento contratual.
