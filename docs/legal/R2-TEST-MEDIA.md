# R2-TEST-MEDIA — política e registro do media de teste para uploads E2E (D-506)

## Política

**Nenhum upload E2E em produção toca media real sem decisão documentada.**
Uploads de validação usam exclusivamente um **media de teste dedicado**
(`media-test-r2-upload`), isolado e auditável — o poster substituído é o do
próprio media de teste. Exceções (tocar media real) passam por ESCALATE.

## Estado

| Ambiente | Media de teste | Estado |
|---|---|---|
| **Produção** | `424e6a91-5b5c-4659-b805-bb06ed13547d` (fonte `r2-e2e-test`/`manual`, FILME, "R2 Upload Test — pode deletar") | ✅ criado 2026-09-16 via `railway ssh` (autorização P2/D-510), insert idempotente com contexto RLS tenant default + ADMIN |
| **Local (dev)** | `475eb2dd-ae7f-45bd-99b7-3cea13db806e` | ✅ fixture da perna dev |

## Causa raiz do bloqueio (2026-09-16) — corrigida no repo, pendente no Cloudflare

1. **`R2_ACCOUNT_ID` com dígitos duplicados**: o `.env`/Railway/wrangler
   carregavam `eceaf5017758d87a2bcdf777f2ce2238bc` (36 chars); a conta real do
   token é `eceaf501758d87a2bcdf7f2ce2238bc` (32 hex — confirmada via
   `GET /accounts`). **Corrigido** no `.env`, no Railway (`railway variables`,
   redeploy executado e saudável) e nos `wrangler.jsonc` deste PR.
2. **Mesmo com o id correto, o TLS para `*.r2.cloudflarestorage.com` falha
   (alert 40) na rede local E no egress do Railway** — e a API REST responde
   **7003** para `/accounts/{id}/r2/buckets` com o id correto. Diagnóstico:
   **R2 não está ativado na conta Cloudflare** (sem ativação não há rota SNI
   nem rota de API para o subdomínio). **Ação do Operador:** ativar R2 no
   dashboard (dash.cloudflare.com → R2 → ativar) e criar o bucket
   `media-rate-assets` — após isso a perna de upload roda sem mudança de
   código.
3. Hipótese anterior de "middlebox da rede local" está **desmentida**: o
   egress do Railway falha com o mesmo `EPROTO alert 40`.

## Cadeia já provada (local e produção)

- Cadastro → promoção ADMIN → login (cookie + CSRF) →
  `POST /api/v1/admin/assets/{midiaId}/FILME` passou por
  AuthGuard/RolesGuard/CSRF/magic-bytes/limite e chegou ao `R2Storage`
  (seleção correta do adapter com env R2 presente; sem warn de fail-closed
  no boot pós-P3 — log `[boot] listening`, nenhum `[storage]` warn).
- Falha restante apenas no TLS do PutObject (causa raiz acima).

## Verificação pós-correção do account_id (D-512, 2026-09-16)

Com o ID correto no endpoint (`eceaf501758d87a2bcdf7f2ce2238bc
.r2.cloudflarestorage.com`), a falha **persiste** — evidência por camada:

| Camada | Teste | Resultado |
|---|---|---|
| SDK S3 (PutObject/GetObject, `.env` corrigido) | `@aws-sdk/client-s3` | `EPROTO ssl alert handshake failure 40` |
| TLS bruto (openssl s_client, SNI correto) | ClientHello TLS 1.3 | **alert 40, Cipher is (NONE)** — servidor rejeita ANTES do certificado |
| REST (KV namespaces, id correto) | `POST /accounts/{id}/storage/kv/namespaces` | **7003 Could not route** |
| Produção (egress Railway, id correto) | upload 2026-09-16T02:28Z (correlationId `b82dc8d2…`) | mesmo `EPROTO` no log do container |

**Interpretação (D-512)**: alert 40 sem certificado no SNI correto = **rota
SNI inexistente para a conta = R2 não ativado** (a ativação provisiona a
rota no edge); 7003 no KV = produto Workers/KV também não roteado. **Não é
código** — a cadeia da aplicação está provada até o PutObject. **Escalado:
ativação de R2 e de Workers/KV no dashboard** (R2 → ativar; Workers &
Pages → plano gratuito). Perna (b) de produção roda o
`scripts/verify-prod/r2-upload-check.sh` logo após a ativação — o script já
está pronto e a causa foi demonstrada também no egress do Railway.

## Perna de upload (T467)

- **Método**: API (login `lgpd-test@mediarate.test` + cookie + `x-csrf-token`)
  contra `media-rate-production.up.railway.app` — via UI `/admin/upload`
  também atende (Operador seleciona o media-test).
- Ciclo de promoção/despromoção do ADMIN executado e registrado
  (promovido 2026-09-16T02:30Z; despromovido 2026-09-16T02:40Z — será
  repetido na tentativa final).
- Script de verificação manual: `scripts/verify-prod/r2-upload-check.sh`.

## Pós-validação

Media de teste pode ser **soft-deletado** (LGPD-friendly) ou mantido como
fixture — decisão do Operador. Registrar aqui o que foi decidido.
