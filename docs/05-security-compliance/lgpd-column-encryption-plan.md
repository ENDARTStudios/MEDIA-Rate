# Plano técnico pós-Beta — cifragem de colunas (D-557, T097)

**Decisão vigente:** cifragem de `email`/`telefone` em repouso **adiada para
pós-Beta** (D-557 em `DECISOES.md`). Este documento é o plano de execução técnica
para quando a decisão for retomada — nada dele está aplicado hoje.

## Por que NÃO cifrar agora (motivos técnicos)

1. **Busca determinística quebrada**: login/reset/verificação localizam usuário por
   `email = ?` (igualdade). AES-256-GCM com IV aleatório torna cada cifra de um
   mesmo email diferente → lookup por igualdade deixa de funcionar sem blind index.
2. **Risco operacional no caminho de auth**: qualquer bug na cifragem impede login/
   reset de TODOS os usuários — superfície de incidente maior que o benefício na Beta.
3. **Custo de migração**: migration + backfill em lotes + dual-read/dual-write +
   nova secret (`COLUMN_ENCRYPTION_KEY`) + rotação — tudo com o caminho de migration
   manual ainda dependente de P013.

## Compensações ativas (já implementadas e testadas)

| Controle | Onde |
|---|---|
| PII mask nos logs de auth | `pii-mask.ts` (T049/D-543) + `auth-pii-log.spec.ts` |
| AuditLog sanitizado (PII redigida, IP coarsenado p/ `@db.Inet`) | T055/D-545 + specs |
| Senhas | argon2id (custo ≥12) |
| Tokens de sessão/verificação/reset | SHA-256 hash (nunca valor cru) |
| Tráfego | TLS/HSTS (T1.1) |
| Direitos do titular | LGPD export/delete (T473) |
| Contrato | DTO allowlist + Swagger/DTO guard |
| Guarda anti-regressão | `schema-sensitive-columns.spec.ts` (nova coluna sensível falha o CI sem decisão) |

## Plano de implementação (pós-Beta, quando retomado)

1. **Blind index**: coluna `email_hash` = `HMAC-SHA-256(normalize(email), KEY_BLIND)`
   — lookup por igualdade via HMAC (determinístico); UNIQUE na coluna.
2. **Confidencialidade**: `email_enc` = AES-256-GCM(email, KEY_ENC, IV aleatório) —
   leitura pura (ex.: export LGPD, exibição) via decriptação.
3. **Chaves**: 2 secrets distintas (`KEY_BLIND`, `KEY_ENC`) em secret manager;
   rotação: blinding index re-computável offline; ENC re-cifrada em lote com dual-key.
4. **Migration expand/contract**:
   - Fase 1 (expand): adicionar colunas + dual-write (grava plano+hash+enc);
   - Fase 2: backfill em lotes (batelada por id, lote pequeno, monitorável);
   - Fase 3: dual-read com verificação de paridade;
   - Fase 4 (contract): índice/coluna antiga deprecada (com guarda T093: seção
     `## Expand/Contract` obrigatória no PR).
5. **Testes obrigatórios**: login (senha e Google), register/verificação, reset de
   senha, export LGPD, delete LGPD, unicidade de email (409), busca case-insensitive
   normalizada.
6. **Rollback**: revert do merge + restore do backup (7.7) + rollback do backfill
   (dual-write mantém coluna plana legível durante as fases 1-3).

**Guardas associados:** `schema-sensitive-columns.spec.ts` (coluna nova sem decisão
falha o CI) + guarda de migrations destrutivas (T093) para as fases contract.
