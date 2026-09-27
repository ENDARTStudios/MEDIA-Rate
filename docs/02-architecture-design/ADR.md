# ADR — Architecture Decision Records

**Registro canônico:** [`DECISOES.md`](../DECISOES.md) na raiz (append-only, IDs
`D-NNN`). Este arquivo explica o formato e indexa as decisões estruturantes.

## Formato de uma entrada (obrigatório)

```markdown
## D-NNN — Título curto da decisão
**Data:** AAAA-MM-DD · **Fase:** <fase/tarefa> · **Status:** PROPOSTA|APROVADA|DECIDIDO
**Contexto:** qual problema/debito motivou (com issue/PR/erro de produção).
**Decisão:** o que se decide, numerado, com caminhos de código.
**Testes/Evidência:** specs, runs de CI, smokes — D-505: "step verde ≠ artefato".
```

Fluxo: nasce **PROPOSTA** (no PR) → **APROVADA/DECIDIDO** no merge, com a evidência.
Colisão de ID: registrada (caso D-459→D-491) — nunca reusar ID.

## Índice das decisões estruturantes

| ID | Decisão | Efeito prático |
|---|---|---|
| D-210 | Guard BOM/mojibake i18n | CI reprova encoding quebrado |
| D-224 | tsvector + translate() IMMUTABLE | busca com paridade de acentos |
| D-233 | ANIME deprecated = SERIE; MANGA próprio | enum e taxonomia |
| D-295 | Termos obrigatórios no registro (422) | T306 |
| D-309/T320 | Coluna do Kanban dirige status da interação | fonte única de verdade |
| D-339/T360 | Verificação de e-mail real (Resend) | login 403 até verificar |
| D-382/D-457/T459 | CI docs-gate; sem bypass em main | fluxo de merge |
| D-439 | Estratégia de imagens (Fase 10) | ladders, sharp, variantes |
| D-447 | Fidelidade de mocks do Prisma | D-447 tests |
| D-462/P009 | allowlist de audit (dev-only) | `audit:ci` governado |
| D-491/D-492 | (remap) sprint de CI/infra | histórico |
| D-503 | Sentry + sourcemaps | release por commit |
| D-505 | step verde ≠ artefato | verificação de artefato obrigatória |
| D-507 | túnel nunca URL pública; rollout flag | migração CF |
| D-515 | conferência de variável real (R2 truncado) | debugging de env |
| D-520s | kanban/projeção/estados (ver arquivo) | D-528/D-529/D-530/D-531 |
| D-525 | Envelope paginado `/interacoes` + biblioteca | contrato da API |
| D-527 | Verdade do deploy (migrations no boot; manual separado) | pipeline |
| D-528/D-529 | Máquina de estados + audit no Kanban | CONCLUIDO→ABANDONADO proibido |
| D-530 | Guard evidence-local anti-produção; URL preview via API | operação local |
| D-531 | Logger único + UuidParamPipe 404 pré-Prisma | robustez/observabilidade |
| D-532/D-535 | Guard migration-safety → required check | B1 |
| D-533 | T032: merge do guard + escalonamento seguro do P011 | inventário de PRs |
| D-534 | security.yml verde (audit:ci, Trivy SHA-pinned, CodeQL v4) | B2 |
| D-543+ | (mascaramento de PII em logs de auth, T049+) | LGPD |

> Ao indexar novas decisões, mantenha a tabela enxuta (uma linha por decisão) —
> o detalhe mora em `DECISOES.md`.
