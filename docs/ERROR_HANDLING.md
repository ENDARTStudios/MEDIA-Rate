# ERROR_HANDLING — Erros da API

## Envelope de erro (contrato)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "…",
  "correlationId": "9f3442f9-…",
  "timestamp": "2026-09-21T22:15:12.982Z"
}
```

`correlationId` permite cruzar erro↔log↔Sentry (mesmo id no log da request).

## Camadas (da borda para dentro)

| Camada | O que faz | O que NUNCA faz |
|---|---|---|
| **Fastify** (parser/body/method) | 400 de body malformado, 405 de método, bodyLimit 413 | — |
| **CSRF/AuthGuard** | 403 CSRF (double-submit ausente/divergente), 401 sem sessão | não diferencia malformado de válido (constante-time) |
| **ZodValidationPipe** | 400 com detalhe do schema (body E query) | — |
| **UuidParamPipe** | **404 pré-Prisma** para param UUID malformado | nunca deixa P2023 virar 500 |
| **Services** | BusinessException semântica: 404 (NotFound), 409 (Conflict/duplicata), 400 (regra de domínio ex.: D-528), 403 (plano/limite), 422 (Termos) | mensagem com dado de outro usuário/PII |
| **GlobalExceptionFilter** | 500 genérico em produção ("Ocorreu um erro interno inesperado…"), captura Sentry com `correlation_id`/`http_*`/`user.id` | vazar stack/mensagem crua de erro interno |

## Códigos de domínio (exemplos reais)

- `EMAIL_NOT_VERIFIED` (403, login sem verificação) · `TERMS_NOT_ACCEPTED` (422).
- D-528: `400 "Transição de status inválida: CONCLUIDO → ABANDONADO (D-528)…"` —
  mensagens de regra de domínio PODEM ser específicas (ajudam o usuário).
- Idempotência Stripe: `Idempotency-Key` + `stripe_event_id` UNIQUE → replay seguro.

## Regras

1. **Erro de entrada do usuário** (4xx): mensagem clara e acionável, no idioma do
   usuário quando fizer sentido.
2. **Erro interno** (5xx): genérico para fora, rastro completo para dentro
   (log estruturado + Sentry + correlationId).
3. **Nunca** logar/responder: senha, hash, token, cookie, DATABASE_URL,
   `tenant_id`, dado de outro usuário.
4. Erro novo de domínio? Swagger `@Api*Response` correspondente + teste.
5. 500 observado em produção: reproduzir com curl exato (sem credenciais no log!),
   triar em `docs/SECURITY_TRIAGE.md` se for classe de segurança.

## Comportamentos conhecidos (não são bugs)

- `DELETE` com `content-type: application/json` e body vazio → 400 do Fastify
  ("Body cannot be empty") — clients devem omitir o header.
- Cursor inválido em `/interacoes` → 400 (nunca 500), por design do envelope.
