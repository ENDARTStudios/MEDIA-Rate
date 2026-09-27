# CODE_REVIEW — Checklist de review

O review neste projeto é gate formal do protocolo (REVIEW APPROVED autoriza merge).
Checklist mínimo — item faltando = APPROVED_CONDITIONAL com a dívida nomeada.

## Corretude e contrato

- [ ] CI **verde no head final** (não no commit anterior — lição T028/T032).
- [ ] Comportamento novo tem teste (TDD quando o gap veio de review/smoke) —
      vermelho→verde documentado no worklog quando aplicável.
- [ ] Endpoint novo/alterado: Swagger coerente com o REAL (`@Api*Response` para
      cada status que o código emite — lição T028: 404 novo sem anotação).
- [ ] Mocks com tipos reais do driver (D-447) + teste que `JSON.stringify` a resposta.
- [ ] Envelope/erro segue [ERROR_HANDLING](ERROR_HANDLING.md) (correlationId etc.).

## Segurança (ver [SECURITY_REVIEW](SECURITY_REVIEW.md))

- [ ] Query de usuário dentro de `comContextoRls` (owner-only).
- [ ] Sem `tenant_id`/PII/segredo em resposta, log ou evidência.
- [ ] Entrada validada (Zod body+query; `UuidParamPipe` em param UUID).
- [ ] Rate limit definido para rota nova (`rate-limit.config.ts`).
- [ ] STRIDE do payload da TAREFA foi honrado (spoofing/tampering/…).

## Frontend

- [ ] i18n: chave nova nas **3 línguas** com paridade; sem chave crua possível
      (helpers para label dinâmico).
- [ ] Cores só via CATEGORY_TOKENS/tokens semânticos; convenção real-vs-demo
      (sem dado → "—"; demo com badge).
- [ ] Estados de erro/loading/carregar-mais tratados; deep links validados.

## Processo

- [ ] Commits atômicos `type(TNNN): msg`; branch curta; sem rename de head.
- [ ] Migration no PR? Contrato B1 completo (label + `## Rollback` + `Migration:`).
- [ ] Docs no MESMO PR: `docs/` da suíte quando muda comportamento, PLANO com
      evidência, worklog, DECISOES quando muda regra.
- [ ] `[x]` no PLANO só com artefato citável (D-505).
- [ ] Critério de pronto da TAREFA endereçado ponto a ponto; o que ficou fora =
      registrado (issue/pendência), não silenciado.

## Pós-merge (quem mergeia)

Monitorar deploy + smoke obrigatório ([QA_TESTING](QA_TESTING.md)) + evidência no
PR/issue; se mudança visível, conferir produção. Ver [ITERATION](ITERATION.md).
