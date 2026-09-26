# Runbook — Direitos do Titular LGPD (canal, prazos, legal hold e propagação)

**Versão:** 1.0 · **Criado em:** 20 de setembro de 2026 · **Tarefa:** T473 (F20-compliance-corretiva, D-536)
**Dono:** Operador (END ART Studios) · **Canal de privacidade:** endart.studios@gmail.com

> Este documento é **procedimento operacional**, não código (decisão D-536, item 4:
> nesta escala, legal hold e execução de exclusão são procedimentos manuais com
> registro em trilha imutável). Evidência executável dos endpoints:
> `apps/api/test/lgpd-rights.e2e.spec.ts` (401/200/429/carência/cancelamento/
> correlation_id). Matriz de retenção/transferências: `docs/PRIVACY_MATRIX.md`.

## 1. Canal, prazo e protocolo

| Item | Regra |
|---|---|
| Canal de privacidade | endart.studios@gmail.com (canal designado; **não há DPO formal nomeado** — declaração honesta da Política) |
| Prazo de resposta (LGPD art. 19) | **Até 15 dias** corridos desde a solicitação; se mais tempo for necessário, informar o titular com justificativa antes do 15º dia |
| Protocolo verificável | Toda resposta de `/user/data` carrega `correlation_id` (corpo + headers `X-Request-Id`/`X-Correlation-Id`). Citar o protocolo ao titular em qualquer acompanhamento |
| Registro | Toda solicitação recebida pelo canal gera registro em `audit_log` (ação `direito_solicitado`, entidade `usuario`, id do titular ou protocolo) |

## 2. Direitos e como exercer (endpoints)

| Direito | Como | Evidência |
|---|---|---|
| Acesso/portabilidade | `GET /api/v1/user/data` (autenticado; JSON com as 9 relações) | 200 + correlation_id; teste T473 |
| Eliminação | `DELETE /api/v1/user/data` (CSRF double-submit) → **carência de 30 dias**; todas as sessões revogadas imediatamente | 202 + `agendado_para`; teste T473 |
| Cancelamento da eliminação | `POST /api/v1/user/data/cancel-exclusion` (dentro da carência; requer novo login — sessões foram revogadas) | 200 `{cancelado}`; teste T473 |
| Revogação de consentimento | Configurações → Privacidade (toggles Analytics/Monitoramento); anônimo: banner → Gerenciar | trail em `mr_consent_v2` + espelho em `consent_log`; e2e 5º estado |
| Correção | Configurações (nome) / fluxo de e-mail | — |
| Oposição / revisão de decisão automatizada | Canal de privacidade (não há decisão automatizada de alto impacto no produto — ver Política §Recomendações e IA) | registro em `audit_log` |

Rate limiting dos endpoints: global 100/min por usuário+rota; **exportação com limite dedicado de 6/min** (`RATE_LIMIT_USER_RIGHTS_PER_MIN`).

## 3. Execução da eliminação ao fim da carência (procedimento manual)

> Não há job automático (afirmado com honestidade na Política). Este é o passo
> operacional que cumpre o prazo.

1. **Diariamente (ou ao menos 2×/semana)**, consultar usuários com
   `dados_para_exclusao_at <= now()`:
   ```sql
   SELECT id, email, dados_para_exclusao_at FROM usuario
   WHERE dados_para_exclusao_at IS NOT NULL AND dados_para_exclusao_at <= now();
   ```
2. **Verificar legal hold** (seção 4): se houver registro de hold ativo para o
   titular, NÃO executar — registrar o adiamento e retomar após liberação.
3. Executar a eliminação **hard delete do `usuario`** (cascata do schema remove
   sessões, watchlist, interações, preferências, discovery_event, uso_diario,
   listas, notificações; `consent_log.usuario_id` vira NULL — o registro
   append-only permanece como prova, sem vínculo).
4. Registrar em `audit_log` (entidade `usuario`, ação `exclusao_executada`,
   `dados_antes` contendo apenas `dados_para_exclusao_at` cumprido — **sem PII
   além do necessário**; a cadeia de hash torna o registro imutável).
5. Propagar aos operadores conforme a seção 5.
6. Responder ao titular (se houver protocolo/solicitação por e-mail) confirmando
   a eliminação, dentro do prazo do art. 19 quando aplicável.

**Backups:** dumps têm retenção de 30 dias (`scripts/backup-db.sh`); dados de um
titular eliminado podem persistir em backup por até essa janela, com acesso
restrito — communicated na Política (§Retenção, linha Backups).

## 4. Legal hold manual (suspensão de eliminação)

1. Ao receber solicitação legal válida (ordem judicial, notificação da ANPD,
   demanda investigativa) que exija preservação de dados de um titular:
2. **Suspender**: adiar a execução da seção 3 para o titular (o passo 2 da
   consulta diária verifica isso).
3. **Registrar em `audit_log`**: entidade `usuario`, ação `legal_hold`,
   `dados_depois` = `{ motivo: "<natureza da ordem, sem conteúdo sigiloso>",
   libera_em: "<data ou null>", protocolo: "<correlation_id ou nº do caso>" }`.
   A cadeia de hash (`hash_cadeia`/`hash_anterior`) garante imutabilidade.
4. **Retomar após liberação** formal: registrar `legal_hold_liberado` em
   `audit_log` e reiniciar o fluxo da seção 3.
5. Evolução futura (se o volume exigir): flag `legal_hold` no schema — decisão
   D-536 item 4.

## 5. Propagação de exclusão/revogação por operador

Base: `docs/MATRIZ-PROPAGACAO-OPERADORES.md` (T433) e `docs/PRIVACY_MATRIX.md`
(transferências, verificação 2026-09-20).

| Operador | O que retém do titular | Como acionar a exclusão/revogação |
|---|---|---|
| **Railway** (API + Postgres) | Fonte de verdade — todos os dados pessoais | Hard delete do `usuario` (seção 3) remove em cascata; sem ação extra no painel |
| **Stripe** | Cliente/assinatura e dados fiscais vinculados | Painel Stripe → Customer do titular → excluir (dados fiscais retidos por obrigação legal própria do processador; sem dado de cartão no MEDIA Rate) |
| **Vercel** | Logs técnicos de requisição/CDN (curto ciclo) | Sem ação individual — ciclo de log curto expira; conteúdo do site é público |
| **Cloudflare** (canário: CDN/KV/R2) | Cache público (TTL 3600s), dados técnicos de edge | Sem PII direta; se necessário, purge de cache do domínio no painel |
| **Sentry** (região US) | Eventos de erro com ID técnico (PII redigida no beforeSend) | Sentry → Organization → GDPR/Delete request pelo e-mail do titular; retenção padrão 90 dias expira sozinha |
| **PostHog** (Cloud US) | Eventos de uso anônimos (distinctId técnico) | PostHog → person do titular → delete (API/UI); coleta só ocorreu com consentimento |
| **Google** (Identity Services) | Perfil OAuth autorizado (nome, e-mail) | O vínculo OAuth morre com a conta; revogação de app é feita pelo próprio titular na conta Google |

Regra geral: **nenhum operador recebe dado que o titular não tenha gerado no
produto**; a propagação é registrada (passo 5 da seção 3) no mesmo `audit_log`.

## 6. Regras de evidência

- Nunca registrar PII desnecessária em logs/evidências; segredos (`sk_`,
  `whsec_`, senhas) jamais em chat/log/commit.
- Toda mudança neste runbook deve refletir a Política (`/privacy`) — os dois
  afirmam o mesmo comportamento (princípio de honestidade, D-536 item 3).

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-09-20 | Criação (T473): canal/prazo/protocolo, execução de eliminação, legal hold manual, propagação por operador |
