# Política de Segurança — MEDIA Rate

## Reportando Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança no MEDIA Rate, pedimos que a reporte de forma responsável.

**NÃO abra uma issue pública no GitHub.**

Em vez disso, envie um email para `security@mediarate.app` com:

- Descrição detalhada da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestão de correção (se houver)

Responderemos em até 48 horas com a confirmação do recebimento e um plano de ação.

## Escopo

O programa de divulgação responsável cobre:

| Escopo | Descrição |
|---|---|
| `apps/api/` | Backend Fastify + Prisma + PostgreSQL |
| `apps/web/` | Frontend Next.js 16 App Router |
| `packages/domain/` | Tipos e validações compartilhadas |
| `docs/` | Documentação do projeto |

## Fora do Escopo

- Vulnerabilidades em dependências de terceiros já reportadas publicamente
- Ataques de engenharia social
- Ataques de força bruta em ambientes de desenvolvimento local
- Vulnerabilidades teóricas sem prova de conceito

## Práticas de Segurança do Projeto

1. **Segredos**: Chaves de API, tokens e senhas NUNCA são commitados. Use `.env` (excluído pelo `.gitignore`).
2. **Dependências**: `npm audit` é executado em CI. Vulnerabilidades high/critical quebram o build.
3. **Autenticação**: Senhas usam argon2id (custo ≥ 12). Sessões via cookie httpOnly.
4. **Validação**: Todos os endpoints de escrita usam validação Zod. Payloads não validados são rejeitados.
5. **CSP**: Content Security Policy restritiva aplicada via middleware.
6. **Dependabot**: Atualizações automáticas de segurança configuradas em `.github/dependabot.yml`.

## Versões Suportadas

| Versão | Suporte |
|---|---|
| `main` (latest) | ✅ Suporte completo |
| `beta` | ✅ Correções críticas |
| `< 1.0` | ❌ Não suportado |

## Reconhecimento

Pesquisadores que reportarem vulnerabilidades válidas serão creditados nesta página (com consentimento).

---

*Última atualização: 2026-07-25*
