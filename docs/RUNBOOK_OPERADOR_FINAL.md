# RUNBOOK DO OPERADOR — FINAL (F11)

> Consolidado em 2026-08-15 (T347). Um único documento, passo a passo, com
> comando copiável, saída esperada e troubleshooting de 1 linha por passo.
> Executar na ordem (1 → 6). Nenhum segredo está neste arquivo — só
> placeholders `<COLE_AQUI>`.

---

## Passo 1 — Postgres de teste local (destrava T344/T345 do Doer)

> D-315: este passo é executado pelo **Doer**, não pelo Operador.

**Por quê:** as tarefas de RLS (`usuario_plano` com `FORCE ROW LEVEL SECURITY` e
o teste de isolamento A≠B) exigem um PostgreSQL real.

**Conflito de porta conhecido:** o projeto "Almanaque" (docker) ocupa a `5432`
e um Postgres nativo do Windows ocupa a `5433`. Por isso o `docker-compose.yml`
está parametrizado e o `.env` local usa **5434/6380**.

**Comando:**
```bash
docker compose up -d postgres
```

**Saída esperada:**
```
[+] Running 1/1
 ✔ Container mediarate-db  Started
```

**Critério de sucesso:**
```bash
docker compose ps
# → mediarate-db  postgres:16-alpine  Up (healthy)  0.0.0.0:5434->5432/tcp
```

**Variável de ambiente local** (`apps/api/.env.local`, valores do
`docker-compose.yml`):
```
DATABASE_URL=postgresql://mediarate:mediarate_dev@localhost:5434/mediarate?schema=public
```

**Validar o banco:**
```bash
cd apps/api
npx prisma migrate deploy   # aplica as migrations no banco 5434
npx prisma migrate status   # → Database schema is up to date!
```

**Se falhar (conflito de porta):** outra coisa já usa 5434 → edite `POSTGRES_PORT`
no `.env` raiz para outra porta livre (ex.: `55432`) e repita. **Nunca** pare os
containers do Almanaque nem o Postgres nativo do Windows.

**Depois de feito:** o Doer segue imediatamente para T344/T345 (sem nova ordem).

---

## Passo 2 — Produção: aplicar a migration `trial_used_at`

**Por quê:** a coluna `trial_used_at` (T327, trial único) já está no código e no
`schema.prisma`, mas a migration ainda não foi aplicada no banco de produção.

**Comando (via Railway CLI):**
```bash
railway run npx prisma migrate deploy
```
(Se o projeto tiver mais de um serviço: `railway run --service <NOME_DO_SERVICO> npx prisma migrate deploy`)

**Saída esperada:**
```
Applying migration `20260815_trial_used_at`
The following migration(s) have been applied:
migrations/
  └─ 20260815_trial_used_at/
```

**Critério de sucesso:**
```bash
railway run npx prisma migrate status
# → Database schema is up to date!
```

**Se falhar:** "P1001/connection" → o `DATABASE_URL` no Railway está inacessível;
use o túnel (`railway connect Postgres`) ou verifique a variável.

**Depois de feito:** responda "feito o passo 2".

---

## Passo 3 — Produção: rodar o reparo de órfãos curtidos (T322)

**Por quê:** o reparo re-vincula mídias órfãs que o usuário curtiu, para nunca
exibir "Título indisponível" como estado final. É idempotente e não-destrutivo.

**Comando (via Railway CLI):**
```bash
railway run npm run db:reparo:orfaos
```

**Saída esperada (contagens antes/depois):**
```
[t322-reparo] total entries=NNNN
[t322-reparo] órfãs não-UUID=X | órfãs UUID inexistentes=Y
[t322-reparo] órfãs COM reação (curtidas)=Z
[t322-reparo] re-linkadas (fonte_id/título → canônica): A
[t322-reparo] colisões (merge não-destrutivo): B
[t322-reparo] irreconciliáveis (ficam p/ "Buscar substituta"): C
```

**Critério de sucesso:** `re-linkadas + colisões ≥ 0` e `irreconciliáveis` ficam
visíveis no app com o CTA "Buscar substituta" (nunca "Título indisponível"
estático).

**Se falhar:** erro de RLS/tabela → confirme que o `prisma migrate deploy` (passo
2) rodou primeiro.

**Depois de feito:** responda "feito o passo 3" com os números (A/B/C).

---

## Passo 4 — Conferir deploys de T341/T342 verdes + health

**Por quê:** o mailer transacional (pagamento T341 + auth T342) precisa estar
deployado antes do passo 5.

**Conferir backend (Railway):**
```bash
curl -i https://media-rate-production.up.railway.app/health
# → HTTP/1.1 200 ... {"status":"ok"}
```

**Conferir frontend (Vercel):** abrir `https://media-rate-web.vercel.app` e
verificar que a landing carrega (sem erro no console).

**Critério de sucesso:** health 200 + o último commit (`3aaad1d`) visível no
deploy (Railway/Vercel). Se o deploy for automático via push na `main`, apenas
confirme que o CI do commit `3aaad1d` ficou verde.

**Se falhar:** health 502/503 → ver os logs do Railway (deploy quebrado); reverter
com `railway up` do commit anterior ou re-deploy.

**Depois de feito:** responda "feito o passo 4".

---

## Passo 5 — Mailer real (fecha o último achado HIGH)

**⚠️ Estado atual (honesto):** o mailer de T341/T342 usa `MockMailTransport` —
NÃO há transporte SMTP/Resend implementado ainda. Ou seja, **não existe variável
de ambiente de provedor para colar hoje**; o transporte real é uma tarefa de
implementação pendente do Doer.

**O que fazer (ordem):**
1. **Escolha o provedor:** Resend (mais simples, API HTTP), SendGrid ou SMTP
   genérico (ex.: Postmark/Mailgun).
2. **Crie a conta** e valide um domínio remetente (ex.: `mediarate.app`).
3. **Informe ao Doer** qual provedor escolheu + as credenciais (na UI do
   Railway/Vercel, **nunca no chat**). O Doer implementa o transport
   (`T348-mailer-real`) que lerá os nomes de env abaixo.
4. **Cole as variáveis** no Railway (Settings → Variables):

| Variável proposta | Provider | Exemplo |
|---|---|---|
| `MAIL_PROVIDER` | todos | `resend` \| `smtp` \| `sendgrid` |
| `MAIL_FROM` | todos | `no-reply@mediarate.app` |
| `RESEND_API_KEY` | Resend | `<COLE_AQUI>` |
| `SENDGRID_API_KEY` | SendGrid | `<COLE_AQUI>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP | `<COLE_AQUI>` |

5. **Teste de entrega real:** após o Doer implementar o transport, dispare um
   reset de senha (`POST /api/v1/auth/forgot-password`) com o seu próprio email
   e confirme que chega no inbox.

**Critério de sucesso:** um email de verificação/reset chega na sua caixa de
entrada (não apenas no `dev-mailbox.log`).

**Se falhar:** "email não chega" → ver `MAIL_FROM` + domínio validado no provedor
+ logs do Railway (o mailer loga `Email <tipo> enviado para <destino>`).

**Depois de feito:** responda "feito o passo 5" (ou "provider escolhido: X" para
o Doer implementar o transport).

---

## Passo 6 — Validar fluxo de verificação de novo usuário

**Por quê:** o objetivo final é o novo usuário NÃO ficar preso em
`EMAIL_NOT_VERIFIED`.

**Teste:**
1. Registre um usuário novo pelo site (`/register`).
2. Receba o email de verificação (passo 5 já configurado).
3. Siga o link/código → conta fica `email_verificado_em` preenchido.
4. Faça login → deve entrar sem `403 EMAIL_NOT_VERIFIED`.

**Critério de sucesso:** login funciona após verificar o email; o admin
(`GET /api/v1/admin/stats`) mostra o usuário com `email_verificado_em` preenchido.

**Se falhar:** "403 EMAIL_NOT_VERIFIED" → o token expirou (TTL 24h) ou o email
não foi recebido (volte ao passo 5).

**Depois de feito:** responda "feito o passo 6" — encerra o runbook.

---

## Resumo de destravamento

| Passo | Destrava |
|---|---|
| 1 | T344/T345 (RLS `usuario_plano` + teste A≠B) |
| 2 | `trial_used_at` em produção (trial único) |
| 3 | Fim dos "Título indisponível" (reparo T322) |
| 4 | Deploys T341/T342 no ar |
| 5 | Mailer real (último achado HIGH) — exige `T348-mailer-real` do Doer |
| 6 | Fim do beco `EMAIL_NOT_VERIFIED` |
