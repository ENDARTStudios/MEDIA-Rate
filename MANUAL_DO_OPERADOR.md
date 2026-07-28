# MANUAL DO OPERADOR — MEDIA Rate

## 1. Arquitetura

- **Frontend**: Next.js 16 (App Router) hospedado no Vercel (`media-rate-web.vercel.app`)
- **Backend**: NestJS + Fastify + Prisma hospedado no Railway (`media-rate-production.up.railway.app`)
- **Banco**: PostgreSQL no Railway
- **Autenticação**: Cookie httpOnly `sess` + CSRF double-submit (`csrf_token`)
- **i18n**: 3 locales (pt-BR, en-US, es-ES) via next-intl
- **Proxy**: Vercel Rewrites (`/api/*` → Railway) para cookies first-party (T098)

## 2. Como fazer deploy

### Frontend (Vercel)
```bash
cd apps/web
npm run build
vercel --prod --yes
```

### Backend (Railway)
```bash
cd apps/api
railway up --service "MEDIA Rate"
```

### Variáveis de ambiente críticas
- `DATABASE_URL` — PostgreSQL connection string (Railway)
- `ALLOWED_ORIGINS` — CORS origins (comma-separated): `https://media-rate-web.vercel.app,https://media-rate-end-art-studios.vercel.app`
- `ADMIN_TOKEN` — token para /metrics e geração de convites
- `SESSION_SECRET` — secret para cookies de sessão
- `COOKIE_SECRET` — secret para @fastify/cookie

## 3. Como monitorar

### Health check
```bash
curl https://media-rate-web.vercel.app/health
# → {"status":"ok","uptime":...,"version":"0.1.0","timestamp":"..."}
```

### Métricas (requer X-Admin-Token)
```bash
curl -H "X-Admin-Token: media-rate-admin-2026" https://media-rate-web.vercel.app/metrics
# → {"uptime_seconds":..., "requests_total":..., "watchlist_adds":..., ...}
```

### Logs
```bash
railway logs --service "MEDIA Rate" --lines 100
```

### SEO Audit (Screaming Frog)
```bash
node apps/web/scripts/seo-crawl.mjs https://media-rate-web.vercel.app
```

### Testes E2E (Playwright)
```bash
cd apps/web
npx playwright test e2e/teste-fechado.spec.ts
```

## 4. Como fazer backup/restauração

### Backup (Railway PostgreSQL)
O Railway faz backups automáticos diários do banco. Para backup manual:
```bash
railway connect --service "MEDIA Rate"
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restauração
```bash
railway connect --service "MEDIA Rate"
psql $DATABASE_URL < backup_20260727.sql
```

## 5. Plano de Resposta a Incidentes

### Nível 1: Erro 5xx esporádico (< 10/min)
- Verificar logs: `railway logs --service "MEDIA Rate" --lines 200`
- Causas comuns: Prisma timeout, validação Zod, body não parseado
- Ação: Nenhuma — monitorar

### Nível 2: Erro 5xx sustentado (> 10/5min OU latência p95 > 2s)
- Verificar /metrics para contagem de erros
- Verificar status do Railway: `railway status`
- Ação: Rollback se deploy recente; verificar DB

### Nível 3: Site fora do ar (uptime < 99%)
- Verificar Vercel: https://vercel.com/end-art-studios/media-rate
- Verificar Railway: `railway status`
- Ação: Escalar para equipe; restaurar último backup se necessário

### Comunicação
- Status: atualizar status page (se configurada)
- Email: notificar usuários beta via email cadastrado

### Post-mortem
- Documentar causa raiz em DECISOES.md
- Criar tarefa de correção (Txxx)
- Prevenir recorrência com teste automatizado

## 6. Como gerenciar usuários (Beta Fechada)

### Gerar convite (admin)
```bash
curl -X POST https://media-rate-web.vercel.app/api/v1/invite \
  -H "X-Admin-Token: <token>" \
  -H "Content-Type: application/json"
# → {"code": "uuid-aqui"}
```

### Registrar com convite
Usuário acessa `/pt-BR/register` e preenche nome + email + senha + código de convite.

### Listar usuários registrados
```bash
curl -H "X-Admin-Token: <token>" https://media-rate-web.vercel.app/metrics
# → auth_registers: N
```

### Taxa de ativação
Comparar `invites gerados` vs `auth_registers` nos /metrics.

## 7. Como configurar billing

Planos atuais:
- Free: R$0/mês
- Plus: R$4,90/mês ou R$49,98/ano (15% off)
- Premium: R$9,90/mês ou R$100,98/ano (15% off)

Para alterar preços: editar `apps/web/src/components/PricingCards.tsx` (constante PLANS) + i18n em `apps/web/src/messages/*.json`.

Stripe: configurar via `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` no Railway.

## 8. Checklist de deploy

- [ ] `npm run build` (frontend e backend) → 0 erros
- [ ] `npx vitest run` → todos passam
- [ ] `npx playwright test e2e/teste-fechado.spec.ts` → 21+/22 passam
- [ ] `node apps/web/scripts/seo-crawl.mjs` → 0 4xx, 0 noindex
- [ ] `curl /health` → 200
- [ ] `vercel --prod --yes` / `railway up`
- [ ] Verificar site no browser (home, catálogo, login, register, planos)
