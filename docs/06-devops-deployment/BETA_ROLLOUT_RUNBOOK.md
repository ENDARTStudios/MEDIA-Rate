# Runbook — Rollout da Beta Fechada (convites controlados)

> **Status:** pronto para operação. **Beta GO técnico confirmado** (backlog T092–T104 encerrado).
> Este documento é **operacional**, não é engenharia: os gates técnicos já estão verdes.
> Campos marcados **[OPERADOR]** são decisão de negócio e devem ser preenchidos antes do 1º convite.

---

## 1. Pré-requisitos (conferir antes de convidar)

| Item | Como verificar | Esperado |
|---|---|---|
| Produção saudável | `curl -s -o /dev/null -w "%{http_code}" https://media-rate-production.up.railway.app/health` | `200` |
| Web nos 3 idiomas | `/pt-BR`, `/en-US`, `/es-ES` | `200` |
| Rotas principais | `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` | `200` |
| Métricas protegidas | `curl -s -o /dev/null -w "%{http_code}" .../metrics` (sem token) | `403` |
| Alertas métricos | Actions → "Alertas Metricos" (último run) | `success` |
| Uptime sintético | Actions → "Uptime Check" | `success` |
| CI na `main` | último run de `CI` e `Security` | `success` |

> Nunca executar smoke **autenticado** contra produção fora do workflow efêmero (`smoke-auth.yml`).

---

## 2. Coorte inicial **[OPERADOR]**

- Tamanho: **5 a 20 usuários**.
- Perfis: espectador, crítico, curador, mobile, desktop; idealmente alguns externos ao time.
- **Sem** exposição pública (sem marketing, sem indexação).
- Definir **quem** e por qual canal o convite será enviado.

---

## 3. Canal de feedback **[OPERADOR]**

Escolher **um** caminho primário e comunicá-lo no convite:

- formulário externo; e-mail dedicado; thread Slack/Discord; issue privada; widget in-app (se existir).

O usuário precisa saber **onde** reportar: bug, confusão de UX, erro de login, problema de idioma,
lentidão, dado errado, preocupação de privacidade.

---

## 4. Ritual de monitoramento (primeiros 7 dias)

| Janela | O que olhar | Onde (somente leitura) |
|---|---|---|
| **Primeiras 2h** | 5xx, falhas de login, rate limit, uptime | Sentry; `railway logs`; Actions (Alertas/Uptime) |
| **Dia 1** | funil acesso → login → biblioteca → watchlist | PostHog (eventos `user_*`) |
| **Dia 2–3** | feedback qualitativo, UX, i18n, mobile | canal de feedback |
| **Dia 7** | decidir manter / expandir / corrigir | este runbook |

---

## 5. Gatilhos objetivos de pause / rollback

### Pausar convites (imediato)
- erro recorrente de login;
- 5xx acima do baseline;
- vazamento de PII/segredo;
- corrupção de AuditLog;
- quebra de RLS/escopo de tenant;
- inconsistência de webhook/billing (se aplicável).

### Rollback técnico
1. Identificar o **merge commit** da regressão.
2. `gh pr ...`/git: **revert do merge commit** (`git revert -m 1 <sha>`) via PR — **nunca** `reset --hard`/force push.
3. Confirmar CI verde + smoke 7/7 após o revert.
4. Se houver migration incompatível: seguir `docs/runbooks/migration-manual.md` (**sem** auto-apply).

### Continuar Beta
- erros isolados; Sentry sem padrão crítico; smoke verde; feedback sem risco legal/segurança.

---

## 6. Triagem de feedback

`semi` → classificar: **bug** / **UX** / **i18n** / **performance** / **dados** / **privacidade**.
- Bug/privacidade → prioridade alta, issue com label.
- UX/i18n/performance → agrupar por tema e priorizar no ciclo seguinte.
- Registrar volume e temas no fechamento da janela de 7 dias.

---

## 7. Template de convite (ajustar tom) **[OPERADOR]**

```
Olá! Você foi convidado(a) para a Beta fechada do MEDIA Rate.
• Acesso: https://mediarate.app
• Como entrar: <método definido: convite por e-mail / link>
• Encontrou algo estranho? Reporte em: <canal definido>
• É uma versão em teste — mudanças podem ocorrer.
```

---

## 8. Riscos residuais aceitos (não bloqueiam a Beta)

| Risco | Impacto | Mitigação atual |
|---|---|---|
| `ADMIN_TOKEN` não é dedicado só-leitura p/ métricas | médio-baixo | Secret de CI; `/metrics` protegido; sem exposição em logs |
| Uptime depende do GitHub Actions (sem monitor externo multi-região) | médio-baixo | retry, dedup, cron, smoke, Sentry/Railway/Vercel |
| Cifragem de colunas adiada (D-542) | aceito | PII masking, AuditLog sanitizado, DTO allowlist, guarda anti-regressão |
| Run `waiting` do head exige aprovação de reviewer | baixo | deploy nativo já ocorre por push; reconciliador cancela superseded |

---

## 9. Registro Go/No-Go comercial **[OPERADOR]**

| Campo | Valor |
|---|---|
| Data do GO comercial | |
| Coorte (nº usuários) | |
| Canal de feedback | |
| Responsável por incidente | |
| Critério de expansão | |
| Critério de encerramento da Beta | |
