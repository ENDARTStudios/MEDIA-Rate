# Matriz de Propagação a Operadores (LGPD/GDPR) — MEDIA Rate

**Data:** 2026-09-01 · **Fase:** F17-compliance-juridico · **T433**

A Política de Privacidade (T431) declara os operadores/subprocessadores reais.
Esta matriz registra, por operador, o que retém e como a exclusão do titular é
propagada.

| Operador | Função | Dados que retém | Acionamento de exclusão |
|---|---|---|---|
| **Stripe** | Pagamentos/assinaturas | Dados de pagamento (identificadores de assinatura/cliente em modo TEST; não armazena número completo de cartão no MEDIA Rate) | Exclusão de dados de pagamento só é acionável **via Painel Stripe / API** (dados fiscais retidos por obrigação legal). No MEDIA Rate não há dados de cartão. |
| **Vercel** | Hospedagem frontend | Logs de requisição/CDN (técnicos, anônimos na prática) | Exclusão do site/domínio (fora do fluxo usuario; logs de CDN têm ciclo curto). |
| **Railway** | Backend + banco de dados | **Fonte de verdade** — todos os dados pessoais do titular no banco/servidor | **É o operador de retenção primário**: o `DELETE /user/data` do MEDIA Rate (soft delete +30 dias) remove/anonimiza os dados no banco. |
| **Google Identity Services** | Login social (Gmail) | Perfil autorizado (nome, e-mail) via OAuth | Exclusão do vínculo OAuth no MEDIA Rate; revogação de acesso ao app pelo próprio usuário no Google (painel de segurança). |
| **Sentry** | Monitoramento de erros (T432: atrás de consentimento) | Eventos de erro técnico (dados anonimizados/redigidos via beforeSend) | Retenção segundo retenção/política do Sentry; o MEDIA Rate configura redação de PII (sentry-redact). |
| **PostHog** | Analytics (T432: atrás de consentimento) | Eventos/telemetria de uso (anônimos) | Retenção segundo política do PostHog; dispara apenas com consentimento (T432). |
| **E-mail transacional** | Notificações (trial/confirmação) | E-mail do usuário p/ envio | Exclusão da fila/registro de envio conforme provedor; não tratado como dado principal. |

## Fluxo de exclusão do titular (banco — Railway)

1. `DELETE /api/v1/user/data` → **soft delete**: agenda `dados_para_exclusao_at` (+30 dias) (LGPD art. 15).
2. Sessões ativas são **revogadas** (subsequente `/auth/me` → 401).
3. `POST /api/v1/user/data/cancel-exclusion` → **restaura** dentro da carência de 30 dias (sem cobrança/penalidade).
4. Após 30 dias: dado eliminado ou anonimizado, salvo obrigação legal (auditoria/backups com acesso restrito).

## Status do teste ao vivo (T433)

- **Exportação/exclusão/cancel-exclusion:** endpoints implementados e **auditados por código**
  (exportarDados/solicitarExclusao/cancelarExclusao em `lgpd.service.ts`). Teste HTTP ao vivo
  **exige conta verificada + login** (o login recusa conta não verificada; verificação por token
  de email ou acesso ao banco). Provisionar conta de teste verificada ficou **bloqueado pela
  mesma fricção de DB** do T434 (DATABASE_URL local é SQLite stale; sem acesso ao banco para
  marcar `email_verificado_em`). **Recomendação:** usar conta de teste existente
  (`free@mediarate.test`/`plus@mediarate.test`) com credencial de env, ou desbloquear o DB,
  para rodar o teste HTTP ao vivo.
