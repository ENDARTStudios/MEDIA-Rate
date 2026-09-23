# COMPLIANCE — LGPD e conformidade

Papel do projeto: **controlador** dos dados dos usuários. Aprofundamentos:
`docs/LGPD_DADOS.md` (mapa de dados por tabela) · `docs/legal/` (pacote jurídico
versionado, T464) · `docs/conformidade-v13.md` · `docs/PARECER_JURIDICO-2026-08-31.md`.

## Pilares implementados (com evidência)

| Pilar LGPD | Implementação | Evidência |
|---|---|---|
| Base legal/consentimento | Consentimento **granular v2** (finalidades separadas), registro de aceite, espelho server-side | T432/T470 |
| Direitos do titular | Export (portabilidade) e exclusão; **revogação testada e2e** | módulo `lgpd` + T473 |
| Retenção | **Matriz de retenção por categoria de dado** | T472 |
| Transferência internacional | Matriz por operador/transferência | `docs/MATRIZ-PROPAGACAO-OPERADORES.md` (T472) |
| Segurança | RLS, argon2id, redaction de logs, **mascaramento de PII em logs de auth** (T049), audit chain SHA-256 | D-543 e outros |
| Trilha de auditoria | `audit_log` append-only com `verificarIntegridade()` | smoke T027 (AuditLog em produção) |
| Canal do titular | Canal de privacidade com runbook | T473 |
| Incidents | Processo com linha do tempo LGPD/ANPD | `docs/INCIDENT_RESPONSE.md` |

## Débitos conscientes (B3, antes da Beta pública)

- **Criptografia de coluna** (email/telefone em repouso): `ColumnEncryptionService`
  (AES-256-GCM) existe e **não está wired** (PLANO 2.10) — wiring exige migration
  aditiva + backfill.
- DTO explícito em `GET /interacoes` (higiene de contrato — #148 item 1).

## Regras duras

1. **Texto legal** (Termos/Privacidade/rodapé): só via **gate legal** (pacote T464),
   mantendo consistência Termos↔Política↔rodapé — nunca editar direto.
2. Analytics só com consentimento `analytics` (T432); `identify` sem PII.
3. Dado pessoal novo no schema → atualizar `docs/LGPD_DADOS.md` + matriz de
   retenção **no mesmo PR** + avaliar necessidade de base legal.
4. Requisição de titular (acesso/exclusão): usar os endpoints do módulo LGPD e
   registrar a atendimento; PRA conforme parecer jurídico.
5. Incidente com dado pessoal: seguir `INCIDENT_RESPONSE.md` (comunicação ANPD/
   titular nos prazos do parecer).
