# Verificações Operacionais — MEDIA Rate (T354)

> Status verificado em 2026-08-19 via CLI/dashboard do Operador.

## 1. Billing Railway — ✅ Online

- Projeto "MEDIA Rate" (`46372876-ced1-45c7-ad71-10f7998351a7`), ambiente
  **production**, serviço **Online** (região `sfo`).
- URL: `https://media-rate-production.up.railway.app`.
- Nota: o plano/credit do Railway (Starter $5/mês) e a data de vencimento do
  cartão não são visíveis via `railway status` — confirmar no dashboard
  (railway.app → Billing) se o crédito/cartão está em dia.

## 2. Domínio mediarate.app — ✅ Válido

- Registrado via **Vercel**, expira **13 ago 2027** (359 dias restantes).
- DNS `A` resolve para IPs da Vercel (`216.198.79.x`, `64.29.17.x`) — apontando
  corretamente. `www` também resolve.
- Domínio legado `almanaquedosclubes.com` e `almanaque-dos-clubes.app` ainda
  existem (limpeza opcional).

## 3. UptimeRobot — ⚠️ Não configurado

Não há API key do UptimeRobot nesta máquina. Setup manual (free tier, 50 monitores):

1. Criar conta em https://uptimerobot.com.
2. Adicionar monitores (tipo HTTP(S), intervalo 5 min, alertas por e-mail):
   - `https://mediarate.app` (keyword: presença do título/landing)
   - `https://media-rate-production.up.railway.app/api/v1/health` (keyword: `"status":"ok"`)
3. Alertas para o e-mail do Operador.

## 4. Cron do backup — ⚠️ Script pronto, cron ausente

- `scripts/backup-db.sh` já validado (fail-fast sem `pg_dump` + validação
  `pg_restore --list`).
- **Sem cron real** — o backup atual roda no runner efêmero do CI (`deploy.yml`),
  que não é durável (T332).
- Recomendação (zero custo): workflow GitHub Actions agendado + armazenamento
  em objeto (Cloudflare R2 free / S3). Esboço:

```yaml
# .github/workflows/backup.yml
on:
  schedule: [{ cron: "0 3 * * *" }]   # diário 03:00 UTC
  workflow_dispatch: {}
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y postgresql-client
      - name: pg_dump
        env: { DATABASE_URL: "${{ secrets.DATABASE_URL }}" }
        run: bash scripts/backup-db.sh
      - name: Upload (R2/S3)
        run: aws s3 cp ./backups/ s3://mediarate-backups/ --recursive
```

- Necessário: segredo `DATABASE_URL` (já existe no GitHub) + bucket R2/S3
  (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) + retenção (30 dias já no script).
