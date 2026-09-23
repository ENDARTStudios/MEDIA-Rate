# LGPD — Inventário de dados pessoais e viabilidade de cifragem (T048 / F02-dados)

**Data:** 2026-09-22 · **Fase:** F02-dados · **Tarefa:** T048-lgpd-encryption-feasibility
**Status:** análise **docs-only** — **nenhuma** cifragem implementada (bloqueios abaixo).

> Este documento é um **mapa factual** (sem PII real; só nomes de colunas e
> máscaras). Não contém valores de usuários, e-mails, tokens ou segredos.

## 1. Objetivo

Mapear os dados pessoais presentes no schema, nas APIs, nos logs e nos jobs;
avaliar se o `ColumnEncryptionService` (AES-256-GCM, T2.6) pode ser aplicado
**sem migration, sem novo segredo e sem quebrar autenticação/busca/exportação**.

## 2. Inventário de campos pessoais (schema Prisma)

| Campo | Modelo | Classificação | Observação |
|---|---|---|---|
| `email` | `Usuario` | **buscável (exact match)** | `@unique`; usado em login, registro (unicidade), Google login, `forgot/reset`, verificação e **lookup** `where: { email }`. |
| `nome` | `Usuario` | não-buscável (texto livre) | Devolvido em respostas (`usuario.nome`) e no export LGPD. |
| `email_verificado_em` | `Usuario` | derivado (timestamp) | Não é conteúdo pessoal em si (metadado de estado). |
| `email_verification_token_hash` | `Usuario` | derivado (**hash**) | Já é SHA-256 — nunca plaintext. |
| `password_reset_token` | `Usuario` | derivado (**hash**) | Já é hash (64 chars). |
| `senha_hash` | `Usuario` | derivado (**argon2**) | Já é hash de senha. |
| `token_hash`, `refresh_token_hash`, `refresh_token_hash_anterior` | `Sessao` | derivado (**hash**) | Já são SHA-256. |
| `user_agent` | `Sessao` | PII (dispositivo) | Text; gravado no login. |
| `ip_criacao` | `Sessao` | PII (rede) | Inet; gravado no login. |
| `ip_aceite` | `ConsentimentoUsuario` | PII (rede) | Inet; prova de aceite. |
| `ip_hash` | `ConsentLog` | derivado (**hash**) | Já é hash (LGPD-by-design). |
| `comentario` | `UsuarioMidiaInteracao` | PII (conteúdo do usuário) | Text; **não** exposto no DTO público (B3/D-536). |
| `dados_antes` / `dados_depois` | `AuditLog` | PII (contém `email`/`userAgent`) | Json; ex.: registro grava `{ email, userAgent }`. |
| `ip_origem` | `AuditLog` | PII (rede) | Inet. |

**Fora de escopo (não é PII do titular):** catálogo (`Midia`, `Genero`, …),
scores, gêneros, planos, faturas (IDs de cobrança).

## 3. Superfície de exposição

1. **Respostas de API** — `usuario { id, email, nome }` em auth (`/register`,
   `/login`, `/google`); export LGPD `GET /api/v1/user/data` (por design).
2. **Logs estruturados** — o logger tem `redact` (password, `authorization`,
   `x-csrf-token`) e o Sentry tem `redactEvent`. **Porém** o lockout de login
   interpola o **e-mail** na mensagem: `Lockout aplicado para <email> (IP: <ip>)`
   (`apps/api/src/modules/auth/auth.service.ts:261`) — redact **não** cobre PII
   embutida na string da mensagem.
3. **Audit log** — `dados_depois` pode conter `email`/`userAgent` (cadeia de hash
   íntegra; retenção legal).
4. **Exports LGPD** — `LgpdService.exportarDados()` devolve os dados pessoais em
   JSON (direito do titular; exclui `senha_hash` e `dados_para_exclusao_at`).
5. **Backups** — dumps do Postgres contêm as colunas acima em plaintext.

## 4. Avaliação do `ColumnEncryptionService`

`apps/api/src/common/column-encryption.service.ts`:
- AES-256-GCM, chave de `COLUMN_ENCRYPTION_KEY` (32 bytes, base64), formato
  `<iv>:<authTag>:<ciphertext>`; `isEncrypted()` heurístico.
- **IV aleatório por operação → cifragem NÃO determinística** (o mesmo plaintext
  gera ciphertexts diferentes). Logo **não** viabiliza igualdade/busca por valor.
- O construtor **lança** se `COLUMN_ENCRYPTION_KEY` faltar/tamanho errado.
- **Não está wired** em nenhum módulo (0 usos; PLANO 2.10 `[~]`).

## 5. Decisão de viabilidade — **não implementar agora**

Cifrar colunas neste momento **não é seguro** dentro das restrições (sem
migration, sem segredo novo, sem quebrar login/busca):

1. **`email` é buscável por igualdade** (login/registro/reset/Google). AES-GCM com
   IV aleatório **não** permite exact-match. Cifrar quebraria a autenticação; o
   caminho exigiria **cifragem determinística** (ex.: AES-SIV ou HMAC de busca)
   — decisão de arquitetura **não trivial** → **parar** (cláusula da tarefa).
2. **Dados existentes estão em plaintext** → cifrar exige **migration + backfill**
   (proibido neste escopo).
3. **Segredo**: wiring exige `COLUMN_ENCRYPTION_KEY` presente no runtime; o
   serviço **lança** sem ela → risco de indisponibilidade. Criar/alterar
   variável sensível é proibido aqui.
4. **Não-buscáveis** (`comentario`, `user_agent`, `ip_*`, `AuditLog`) poderiam ser
   cifrados em teoria, mas ainda exigiriam **backfill** e um read-path que
   tolerasse plaintext legado + ciphertext novo.

**Conclusão:** AES-256-GCM em nível de aplicação é adequado apenas a colunas
**não buscáveis**; a adoção exige um plano com migration, gestão de chave e
estratégia determinística para identificadores. Nada foi alterado em código.

## 6. Exposição de PII em log — **CORRIGIDA (T049/D-543)**

- **Achado (T048):** `auth.service.ts` interpelava o e-mail cru no log de lockout;
  `lockout.service.ts` logava `${k}` = `lockout:<ip>:<email>` (e-mail + IP) e o IP
  cru. O `redact` do Pino **não** cobre PII embutida na string da mensagem.
- **Correção (T049):** novo helper `apps/api/src/common/pii-mask.ts`
  (`mascararEmail`, `mascararIp`) aplicado **antes** de logar nos pontos do módulo
  `auth`: `auth.service.ts` (lockout e reuse de refresh) e `lockout.service.ts`
  (global/threshold/local). Nenhum comportamento de auth/lockout/sessão mudou —
  só o texto do log.
- **Regressão:** `apps/api/test/auth-pii-log.spec.ts` (roundtrip do mask, captura
  do `Logger` no lockout com fixture `usuario@example.invalid`, e guarda de fonte).
- Valores passam a sair como `u***@***.invalid` e `203.0.x.x`.

**Varredura ampla (T053/D-544):** todo `apps/api/src` foi escaneado por PII crua em
`logger.*`/`console.*`. Fora de `auth`, o único ponto era `common/mock-mail.service.ts`
(2 logs `debug` com `email=${email}`) — corrigido com `mascararEmail`. Guarda de
regressão em `apps/api/test/pii-log-scan.spec.ts`.

## 7. Follow-ups e pendências

- **P017 (Operador):** decidir o caminho de cifragem (aprovar secret
  `COLUMN_ENCRYPTION_KEY` + migration/backfill + estratégia de busca
  determinística para `email`). Enquanto não decidido, mantém-se o status quo.
- Follow-up de código (sem bloqueio): mascarar PII em logs (`auth.service.ts:261`)
  + teste de ausência de PII.
- Revisar `AuditLog.dados_depois` (minimização: não gravar `email`/`userAgent` se
  desnecessário).
- Ver `docs/SECURITY_TRIAGE.md` (§ T048) e `DECISOES.md` (D-542).
