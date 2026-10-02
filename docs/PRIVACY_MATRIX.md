# Matriz de Privacidade — Retenção e Transferências Internacionais

**Versão:** 1.0 · **Data de verificação:** 20 de setembro de 2026 · **Tarefa:** T472 (F20-compliance-corretiva, decisão D-536)

> **Fonte única de verdade.** A página `/privacy` renderiza, nos 3 idiomas, uma
> tradução fiel das duas matrizes abaixo. O guard `apps/web/test/i18n-parity.spec.ts`
> garante paridade estrutural (mesmas categorias, mesmos operadores) entre esta
> matriz e as chaves i18n — texto duplicado divergente é proibido.
>
> **Princípio de honestidade** (item 7 da auditoria de 2026-09-04): a Política só
> afirma o que o sistema demonstra. Cada prazo abaixo aponta a evidência de código
> ou configuração que o comprova. Os dados de operadores foram verificados nas
> documentações públicas em **2026-09-20**.

---

## 1. Matriz de retenção por categoria de dado

| Categoria | Prazo / base de retenção | Onde reside | Evidência (código/config) |
|---|---|---|---|
| Dados de conta (nome, e-mail, credenciais com hash) | Enquanto a conta existir; exclusão a pedido com carência de **30 dias** para cancelamento; ao fim da carência, eliminação por procedimento operacional documentado | Postgres (Railway) | `lgpd.service.ts` (`EXCLUSAO_DELAY_DIAS = 30`); execução via `docs/PRIVACY_RIGHTS_RUNBOOK.md` (não há job automático — a execução é procedural) |
| Assinatura e faturas | Enquanto a conta existir + 30 dias após exclusão (cascata); dados fiscais do processador de pagamento retidos por obrigação legal própria | Postgres + Stripe | `schema.prisma` (`Fatura`, `EventoPagamento`, cascade); MATRIZ-PROPAGACAO-OPERADORES.md |
| Uso/analytics (**somente se consentido**) | Eventos no PostHog conforme política do plano; contadores diários no banco enquanto a conta existir + 30 dias | PostHog Cloud US + Postgres (`uso_diario`) | Coleta condicionada a consentimento granular (`use-consent-store.ts` v2); `UsoDiario` cascade |
| Monitoramento/erros (**somente se consentido**) | Retenção padrão do plano Sentry (**90 dias**); carregamento condicionado a consentimento; PII redigida no `beforeSend` | Sentry região US | DSN `ingest.us.sentry.io`; `SentryClientInit.tsx` (gate por consentimento) |
| Perfil de gosto e features derivadas | Enquanto a conta existir + 30 dias após exclusão (cascata). **Não há prompts nem embeddings** — a recomendação é algorítmica, não generativa, e nada é armazenado para esses fins | Postgres (`usuario_midia_interacao`, `preferencia_usuario`, `discovery_event`) | `schema.prisma` (cascade em todas); inexistência de modelos de embedding/vector confirmada no schema |
| Caches | Transitório: TTL de **3600 s** no KV do canário (ISR); sem dado pessoal direto (conteúdo público de catálogo) | Cloudflare KV + CDN/edge | `apps/web/wrangler.jsonc` (ISR revalidate 3600) |
| Registros de consentimento | **Append-only, sem exclusão** — mantidos como prova do consentimento/revogação; sem PII direta (ip_hash/device_hash, país derivado do idioma) | Postgres (`consent_log`) | `schema.prisma` (`ConsentLog`); `consent.service.ts` (append) |
| Registros de auditoria e contestação/legal hold | **Imutáveis** (cadeia de hash), mantidos sem exclusão como trilha de auditoria; legal hold é procedimento manual registrado aqui | Postgres (`audit_log`) | `schema.prisma` (`AuditLog` com `hash_cadeia`/`hash_anterior`); `docs/PRIVACY_RIGHTS_RUNBOOK.md` |
| Sessões | TTL de **7 dias** (sliding renewal); revogadas **imediatamente** quando exclusão é solicitada | Postgres (`sessao`) + cookie `sess` httpOnly | `session.service.ts` (`SESSION_TTL_HOURS = 168`); `lgpd.service.ts` (revogação) |
| Backups | **30 dias**, com acesso restrito; backups antigos removidos automaticamente | Dumps Postgres | `scripts/backup-db.sh` (`RETENTION_DAYS = 30`, purge automático) |

### Notas de honestidade (retenção)

- **Prompts e embeddings:** inexistentes no sistema — nada a reter. A recomendação
  de títulos é computada por algoritmo determinístico sobre dados do próprio
  usuário (watchlist, avaliações, histórico), sem IA generativa e sem armazenar
  embeddings.
- **Exclusão ao fim da carência:** não há job automático; a eliminação é executada
  por procedimento operacional (runbook) com registro em `audit_log`. A Política
  afirma exatamente isso.
- **Legal hold:** nesta escala, é procedimento manual (suspender exclusão mediante
  solicitação legal + registro em `audit_log`) — decisão D-536, item 4.

---

## 2. Matriz de transferências internacionais por operador

Quadro-resumo por operador (país/região de processamento, categorias de dados
transferidas, mecanismo legal e salvaguardas). Datas de consulta: **2026-09-20**.

| Operador | Serviço no MEDIA Rate | País/região do processamento | Categorias de dados | Mecanismo | Salvaguardas (doc pública) |
|---|---|---|---|---|---|
| **Stripe** | Pagamentos e assinaturas | EUA e demais países onde opera (global) | Dados de faturamento/assinatura (sem número de cartão no MEDIA Rate) | DPA do fornecedor com SCCs 2021/914 incorporadas | Criptografia em repouso e trânsito; DPA GDPR art. 28 — stripe.com/legal/privacy-center |
| **Vercel** | Hospedagem do frontend (produção) | EUA (infraestrutura principal) | Dados técnicos de requisição/CDN; conteúdo público | SCCs e/ou certificação EU-US Data Privacy Framework | DPF certificado junto ao Dept. of Commerce — vercel.com/legal/privacy-policy |
| **Railway** | API backend + banco Postgres (fonte de verdade) | EUA (processamento primário; infra em GCP) | Todos os dados pessoais do titular (conta, preferências, watchlist, interações) | DPA do fornecedor com SCCs 2021/914 + UK/Swiss Addendum + DPF | DPA seção 9 — railway.com/legal/dpa |
| **Cloudflare** | CDN/edge + Workers/R2/KV (canário de migração) | Rede global (edge próximo ao usuário; armazenamento padrão EUA) | Dados técnicos de requisição; conteúdo público em cache (TTL 3600s) | DPA v6.4 (abr-2026) com SCCs 2021/914 (Módulos 2/3) + DPF + CBPR | ISO 27001/27701, SOC 2 Type II, PCI DSS L1; contestação judicial de pedidos governamentais — cloudflare.com/cloudflare-customer-dpa |
| **Sentry** | Monitoramento de erros (região US; atrás de consentimento) | EUA (instância `ingest.us.sentry.io`; opção EU existe, não usada) | Eventos de erro técnicos com PII redigida (beforeSend) | DPA do fornecedor: DPF + SCCs 2021/914 como fallback | Retenção padrão 90 dias; EU = Frankfurt — sentry.io/legal/dpa |
| **PostHog** | Analytics de produto (região US; atrás de consentimento) | EUA (PostHog Cloud US em AWS; opção EU/Alemanha existe, não usada) | Eventos de uso anônimos (sem PII direta; disparo só com consentimento) | DPA do fornecedor com SCCs (EU/UK) | Lista de subprocessadores pública — posthog.com/privacy |
| **Google** | Login social (Google Identity Services) | Servidores globais, EUA incluídos | Perfil OAuth autorizado (nome, e-mail) | Frameworks de transferência do Google (DPF/SCCs) | policies.google.com (Data Transfer Frameworks) |

### Notas de honestidade (transferências)

- **Enquadramento LGPD:** as transferências acima são garantidas contratualmente
  pelos DPA/SCCs de cada fornecedor, enquadráveis como cláusulas contratuais
  específicas (LGPD art. 33, III; Resolução CD/ANPD nº 19/2024). Não há
  transferência para destinatários sem mecanismo identificado.
- **Retenção dos operadores pode mudar:** esta matriz é versionada; a data de
  verificação por operador registra quando a documentação pública foi consultada
  (todas em 2026-09-20). Revisão programática a cada revisão legal da Política.
- **E-mail transacional** (notificações) trafega pelo provedor designado apenas
  para envio; não é armazenado como dado principal pelo provedor.

---

## 3. Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-09-20 | Criação (T472): matriz de retenção por categoria + transferências por operador, com evidências e datas de verificação |
