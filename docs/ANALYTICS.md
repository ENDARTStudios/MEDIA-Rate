# ANALYTICS — Analytics de produto e flags

Ferramenta: **PostHog** (cloud US). Princípio: analytics é **consent-gated** e
**sem PII** — produto, não vigilância.

## Consentimento (regra dura — T432)

- Nada é enviado sem consentimento granular `analytics` (consent v2 por finalidade).
- Sem consentimento/env → SDK inerte (no-op) — a UI nunca quebra por analytics.

## Identificação

- `identify` envia **apenas `id` + `plan`** (nunca e-mail/nome/IP).
- Eventos de domínio emitidos no servidor (`PaymentService`) — o cliente não é
  fonte de verdade de funil.

## Funis canônicos (definição estável)

```
user_registered → trial_started | checkout_completed → subscription_activated
```

Não renomear eventos canônicos sem atualizar dashboards/relatórios que os usam
(registrar em DECISOES se mudar).

## Feature flags

- Avaliação **server-side com local_evaluation** (`platform-routing.ts`) — o cliente
  não decide sozinho; helper `flagAtiva(posthog, FLAG)` **nunca lança** (fallback OFF).
- Flag ativa hoje: `cloudflare_migration` (PostHog id **886344**, criada via CLI;
  default OFF). Rollout gradual 0→10→50→100 com **gate ≥24h entre degraus** (D-507).
- Ajustar rollout (Operador; scope `feature_flag:write`):
  ```bash
  posthog-cli --host https://us.posthog.com --dotenv-file .env api call \
    update-feature-flag '{"id":886344,"filters":{"groups":[{"properties":[],"rollout_percentage":50}]}}'
  ```

## Segmentos de aquisição (AIO/SEO)

Canal separado para referenciadores de IA (`chatgpt.com`, `perplexity.ai`,
`copilot.microsoft.com` e fontes observadas) — ver [AIO](AIO.md); novas fontes com
tráfego entram no segmento (não no bloqueio de robots).

## Métricas × analytics (não confundir)

- `/metrics` (Prometheus) = **infra** (latência, status, erros) — zero PII
  (ver [MONITORING](MONITORING.md)).
- PostHog = **produto** (funis, retenção, flags) — consentido e anonimizado.
