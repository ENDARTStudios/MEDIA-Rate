# MANUAL DO OPERADOR — MEDIA Rate

## 0. Runbook de destravamento (F11)

As 6 pendências atuais do Operador estão consolidadas, passo a passo, em um
único documento: **`docs/RUNBOOK_OPERADOR_FINAL.md`**. Ordem e destrava:

1. **Postgres de teste local** (`docker compose up -d postgres`) → destrava T344/T345 (RLS).
2. **`prisma migrate deploy`** em produção → aplica `trial_used_at`.
3. **`db:reparo:orfaos`** em produção → fim dos "Título indisponível" (T322).
4. **Conferir deploys T341/T342** → health 200 + commit `3aaad1d` no ar.
5. **Mailer real** → escolher provedor e colar credenciais (exige `T348-mailer-real` do Doer).
6. **Validar verificação de novo usuário** → fim do beco `EMAIL_NOT_VERIFIED`.

> Comandos copiáveis, saída esperada e troubleshooting de 1 linha por passo estão
> no runbook completo. Este manual mantém o restante (deploy, operação, runbooks
> antigos) abaixo.

## 1. Arquitetura

- **Frontend**: Next.js 16 (App Router) hospedado no Vercel (`media-rate-web.vercel.app`)
- **Backend**: NestJS + Fastify + Prisma hospedado no Railway (`media-rate-production.up.railway.app`)
- **Banco**: PostgreSQL no Railway
- **Autenticação**: Cookie httpOnly `sess` + CSRF double-submit (`csrf_token`)
- **i18n**: 3 locales (pt-BR, en-US, es-ES) via next-intl
- **Proxy**: Vercel Rewrites (`/api/*` → Railway) para cookies first-party (T098)

## 2. Como fazer deploy

### Frontend (Vercel)

**Opção recomendada** (atualiza o domínio de produção automaticamente):
```bash
cd apps/web
npm run deploy:with-alias
```

**Opção manual** (requer atualizar o alias separadamente):
```bash
cd apps/web
npm run build
npm run deploy
# ⚠️ Após o deploy, o domínio media-rate-web.vercel.app NÃO é atualizado
# automaticamente. Execute o comando abaixo para atualizar:
npx vercel alias ls | Select-String "media-rate-web"  # veja o alias antigo
npx vercel alias set <DEPLOY_URL> media-rate-web.vercel.app
```

**Por que o alias precisa ser atualizado manualmente**: O domínio `media-rate-web.vercel.app`
está configurado como um alias manual na Vercel (não como Production Domain do projeto
`end-art-studios/web`). Isso faz com que `vercel --prod` atualize apenas os aliases
automáticos (`web-ten-iota-34.vercel.app`) e NÃO o domínio de produção principal. O script
`deploy:with-alias` resolve isso executando `vercel alias set` após o deploy.

**Como verificar que o domínio tem o código novo**:
```bash
# Compare os hashes dos chunks JS (devem ser iguais):
curl -s "https://media-rate-web.vercel.app/pt-BR" | grep -oP '/_next/static/chunks/\K[a-z0-9]+-[a-f0-9]+' | head -1
curl -s "https://web-ten-iota-34.vercel.app/pt-BR" | grep -oP '/_next/static/chunks/\K[a-z0-9]+-[a-f0-9]+' | head -1
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
O token admin é definido pela variável `ADMIN_TOKEN` no ambiente da API (Railway).
Use o valor real (NUNCA commitar; gerar com `openssl rand -hex 32`).
```bash
curl -H "X-Admin-Token: <TOKEN_DO_AMBIENTE>" https://media-rate-web.vercel.app/metrics
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

---

## Status dos diferenciais competitivos (V1.3 �8)

**NENHUM diferencial � comunicado externamente como "pronto" sem gate.** Status real documentado em DECISOES.md D-131:

- **Transpar�ncia de fontes**: Especificado, n�o verificado no backend
- **Confidence Score**: Constantes s�o valores iniciais, n�o calibrados
- **F�rmula v2**: Proposta, pendente sign-off formal de governan�a
- **Outlier detection**: Limiar 3.0 � valor inicial, n�o calibrado
- **"Metodologia unificada"**: IMPRECISO � estrutura assim�trica (criticsScore null para Filme/S�rie)

**algorithmVersion/confidenceScore**: S� em tooltip t�cnico (<details>Detalhes t�cnicos</details> no MediaScoreModule). NUNCA na UI principal.

## SECURITY GATE (T294/T302) — como rodar e o que fazer se falhar

- Local: `npm run security:gate` (repo) e `npm run security:gate -- --bundle .next/static` (bundle buildado).
- O que faz: varre arquivos commitados por padrões de segredo real; valida que NEXT_PUBLIC_* são placeholders; modo bundle cobre o env real embutido no build.
- No CI: passo bloqueante no job lint-audit + bundle scan no build + job security-rls (RLS isolation A≠B com postgres service).
- Compliance: tests/security/compliance.spec.ts (HSTS max-age >= 1 ano, LGPD/RGPD/AEPD nas páginas de privacidade, matriz CURATOR/ADMIN).
- Se FALHAR: o output lista o arquivo/padrão mascarado (nunca o segredo). Remova o segredo do repo, rotacione se foi exposto, e rode o gate de novo até OK. Não bypass com --no-verify.

## Sessão — duração e renovação (T316)

- **Duração**: a sessão (`sess` cookie httpOnly/Secure/SameSite=Lax) dura **7 dias** (Max-Age=604800), configurável via `SESSION_TTL_HOURS` (default 168). O refresh (`refresh` cookie) dura 30 dias.
- **Renovação (sliding)**: enquanto o usuário está ativo, quando faltam < 50% do TTL a sessão é estendida para +7 dias no banco e o cookie é re-setado no browser. Fechar o navegador NÃO desloga mais; a sessão ativa não expira por inatividade curta.
- **Logout**: revoga a sessão no banco e limpa os cookies (mantido).
- **Como verificar em produção**: logar → o Set-Cookie de `sess` traz `Max-Age=604800`; fazer login e, após ~4 dias, o cookie é renovado automaticamente no próximo request autenticado.

## Como testar o Sentry (T315)

**O que é o "sample event":** ao abrir um projeto novo, o Sentry cria um evento de demonstração (tag `sample_event=yes`, url example.com, breadcrumbs antigos). Ele NÃO é erro do MEDIA Rate — arquive-o (botão Archive no issue) e ignore.

**Teste real em 3 passos (após um deploy com o SDK ativo):**
1. Ligar a flag de teste: `POST /api/v1/admin/flags` com `{ "key": "admin-sentry-test", "enabled": true, "rollout_percent": 100 }` (autenticado como admin).
2. Abrir `GET /api/v1/admin/sentry-test` (logado como admin). A resposta é 500 proposital com `sentryEventId` (32 chars) e `correlationId` — o eventId não-vazio prova que o SDK enviou.
3. Abrir o painel do Sentry → Issues: o erro real do MEDIA Rate aparece em segundos (com correlationId). Depois, desligar a flag: `PATCH /api/v1/admin/flags/admin-sentry-test` com `{ "enabled": false, "rollout_percent": 0 }`.

**Envs:** `SENTRY_DSN` (Railway) e `NEXT_PUBLIC_SENTRY_DSN` (Vercel) — identificadores públicos do projeto (vão no bundle do cliente por design). NUNCA colá-los em logs/chat além da exceção única D-306.
**Verificação do bundle web (sem segredos):** após o deploy, grep no JS de produção pelo host `ingest*.sentry.io` — presença prova que o `NEXT_PUBLIC_SENTRY_DSN` foi embutido no build (rebuild via commit+push se ausente).
**Nota:** ao setar `NEXT_PUBLIC_SENTRY_DSN` via CLI, usar `vercel env add ... --value "<dsn>"` (não stdin — o stdin grava placeholder `[SENSITIVE]`).


## Como funciona a coleta do MEDIA Score (cadência semanal — D-410/T426)

**Regra:** TODAS as fontes externas de score/metadados (OpenCritic, TMDB, IMDb,
Metacritic, IGDB, MAL, Jikan, AniList, Kitsu, MangaDex, OpenLibrary, ComicVine,
Google Books…) refrescam no máximo **1x por semana por mídia**. Escolha do
Operador para não estourar cotas de API (ex.: OpenCritic/RapidAPI) — o catálogo
é de títulos antigos e ainda sem usuários.

**Como o job decide o que atualizar (staleness-check):**
- O score-job re-consulta apenas mídias com `avaliacoes_atualizadas_em` **NULL**
  (nunca coletadas) ou **anterior a `REFRESH_INTERVAL_DAYS`** (default 7).
- Mídias frescas são **puladas** (0 chamadas externas). Log mostra
  `total/refreshadas/puladas` — ex.: `Job concluído: 12 processadas, 0 com erro,
  612 puladas (frescas) de 624 mídias`.
- **Falha graciosa:** se uma coleta volta 0 fontes para uma mídia que JÁ tem
  avaliações, o job mantém o último score (não apaga nem regride ao prior).

**Config:**
- `REFRESH_INTERVAL_DAYS` (env, default **7**): intervalo entre refrescos.
- `MEDIA_SCORE_JOB_TIME` (env, default `03:05` horário local): hora do run semanal.
- `MEDIA_SCORE_JOB_ENABLED=false`: desativa o job (fora de produção já é desativado).
- `MEDIA_SCORE_JOB_DELAY_MS` (env, default 1200): throttle entre mídias (rate limits).

**Rotina (execução semanal):** o job roda sozinho na hora configurada
(`MEDIA_SCORE_JOB_TIME`, a cada `REFRESH_INTERVAL_DAYS` dias). Para rodar sob
demanda: `POST /api/v1/midias/score-job` com header `x-admin-token`. Para uma
mídia específica: `POST /api/v1/midias/:id/coletar` (mesmo header).

**Nenhuma requisição de usuário consulta fonte externa** — o site/API servem
sempre de `media_score` (banco). A coleta externa é estritamente um job de
bastidor.
