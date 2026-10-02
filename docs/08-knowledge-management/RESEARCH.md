# RESEARCH — Pesquisas e pareceres

Índice dos materiais de pesquisa do projeto. Toda pesquisa relevante vira doc aqui
(ou link) com data — pesquisa sem data envelhece mal.

## Jurídico / LGPD

- `docs/05-security-compliance/PARECER_JURIDICO-2026-08-31.md` — parecer externo (v13 → `conformidade-v13.md`).
- `docs/05-security-compliance/legal/` — **pacote legal versionado (T464)**: Termos/Privacidade/rodapé;
  alteração de texto legal só via gate legal ([COMPLIANCE](../05-security-compliance/COMPLIANCE.md)).
- `docs/05-security-compliance/LGPD_DADOS.md` — mapa de dados pessoais por tabela/coluna.

## Técnicas

- `docs/07-operations-marketing/AVALIACAO_BACKEND_OTEL.md` — avaliação de OTEL no backend (código inerte,
  ativa por env; conclusões de custo/benefício).
- `docs/08-knowledge-management/proposta-codebase-memory-graft.md` — proposta de memória de codebase (grafo
  Graft); origem da regra GRAFT-FIRST do AGENTS.md.
- `docs/05-security-compliance/REVISAO_EXTERNA_TRIAGEM.md` + `docs/auditoria*/` — auditorias externas e
  triagem (itens viraram issues/PLANO).

## Operacionais (lições que viraram decisão)

- `docs/06-devops-deployment/diagnostico-ci-pr74.md`, `docs/08-knowledge-management/BUGFIX-graph-uuid.md`,
  `docs/05-security-compliance/MATRIZ-PROPAGACAO-OPERADORES.md` — diagnósticos pontuais com lição registrada.
- Padrão do projeto: **pesquisa vira decisão** (D-NNN) ou **pendência** (P0NN) —
  nunca fica só em conversa.

## Abertas / a fazer

- Feasibility de criptografia de coluna (email/telefone) — wiring pendente (PLANO
  2.10, B3): medir custo de backfill + performance antes de executar.
- Avaliação de PostHog EU vs US (residência de dados) — antes do Beta público.
