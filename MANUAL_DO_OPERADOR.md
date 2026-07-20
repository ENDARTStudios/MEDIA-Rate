# MANUAL_DO_OPERADOR.md

Manual de operação do **MEDIA Rate** — plataforma de descoberta de mídia com MEDIA Score™.

Linguagem simples, sem jargão técnico. Se algo aqui não estiver claro, é erro do manual — avise.

---

## 1. Como saber se está no ar

### Site (frontend)
- Acesse: **https://media-rate.example.com**
- Se a página carregar com o logo "MEDIA Rate" e o botão "Começar grátis", está no ar.
- Se aparecer erro 500 ou página em branco, veja "O que fazer se parar" abaixo.

### API (backend)
- Acesse: **https://api.media-rate.example.com/health**
- Se retornar `{"status":"ok","uptime":...}`, está funcionando.
- Se retornar erro ou não carregar, veja "O que fazer se parar" abaixo.

### Monitoramento automático
- O GitHub Actions verifica o site e a API a cada 5 minutos.
- Se algo parar, ele abre automaticamente um "issue" no GitHub avisando.
- Você recebe email se configurar notificações do GitHub.

---

## 2. O que fazer se parar

### Frontend parou (site não carrega)
1. Acesse https://vercel.com/dashboard
2. Clique no projeto "media-rate-web"
3. Vá em "Deployments"
4. Se o último deploy tem status "Error", clique nele e veja os logs
5. Se não souber resolver, clique "Redeploy" no último deploy que funcionou
6. Se persistir, contate o desenvolvedor

### Backend parou (API não responde)
1. Acesse https://railway.app/dashboard
2. Clique no projeto "media-rate-api"
3. Vá em "Deployments"
4. Se o último deploy tem status "Failed", clique nele e veja os logs
5. Se não souber resolver, clique "Rollback" para voltar à versão anterior
6. Se persistir, contate o desenvolvedor

### Banco de dados parou
1. Acesse https://railway.app/dashboard (ou https://neon.tech se usar Neon)
2. Verifique se o PostgreSQL está com status "Running"
3. Se estiver "Crashed" ou "Stopped", clique "Restart"
4. Se persistir, verifique se o plano gratuito não atingiu limite de uso

### Tudo parou (deploy quebrou tudo)
1. Não entre em pânico.
2. Acesse o GitHub → Actions → procure o workflow "Deploy"
3. Se o deploy falhou, o código anterior continua no ar (deploy é atômico)
4. Se precisa voltar à versão anterior:
   - Vercel: Deployments → clique no penúltimo deploy → "Promote to Production"
   - Railway: Deployments → clique em um deploy anterior → "Rollback"
5. Contate o desenvolvedor descrevendo o que aconteceu

---

## 3. Como pedir alteração futura

### Mudança simples (texto, cor, imagem)
1. Descreva o que quer mudar em linguagem simples
2. Exemplo: "Mudar a cor do botão de azul para verde"
3. Envie para o desenvolvedor

### Nova funcionalidade
1. Descreva o que quer e por quê
2. Exemplo: "Quero que os usuários possam marcar filmes como 'já assisti'"
3. O desenvolvedor vai avaliar, planejar e implementar

### Correção de bug
1. Descreva o que aconteceu (passo a passo)
2. Exemplo: "Quando clico em 'Assinar Plus', a tela fica branca"
3. Inclua: qual navegador, se estava no celular ou computador

---

## 4. Segredos e senhas (importante)

### Onde estão os segredos de produção
- **Vercel:** Dashboard → Settings → Environment Variables
- **Railway:** Dashboard → Variables
- **GitHub:** Settings → Secrets and Variables → Actions
- **PostgreSQL:** A connection string está no Railway/Neon dashboard

### Nunca faça
- **Nunca** cole uma senha ou chave de API no chat
- **Nunca** commite um arquivo `.env` com valores reais
- **Nunca** compartilhe o link do Vercel/Railway com tokens visíveis

### Se precisar rotacionar um segredo
1. Gere nova chave no painel do provedor (Stripe, PostHog, etc.)
2. Atualize no Vercel/Railway/GitHub Secrets
3. Faça redeploy (push para `main` ou clique "Redeploy")
4. Revogue a chave antiga no painel do provedor

---

## 5. Backup do banco de dados

### Backup manual (antes de mudanças importantes)
1. Acesse o Railway/Neon dashboard
2. Ou rode: `cd apps/api && ./scripts/migrate-safe.sh`
3. O backup fica em `apps/api/backups/backup-YYYYMMDD-HHMMSS.sql`

### Restaurar backup
1. `psql "$DATABASE_URL" < backup-YYYYMMDD-HHMMSS.sql`

---

## 6. Deploy (como o site vai ao ar)

### Deploy automático
- Toda vez que alguém faz `git push` para a branch `main`:
  1. GitHub Actions roda lint + testes + audit
  2. Se tudo passa, faz migration do banco
  3. Deploy do frontend no Vercel
  4. Deploy do backend no Railway
  5. Health check pós-deploy

### Deploy manual (se precisar)
- GitHub → Actions → "Deploy" → "Run workflow"

---

## 7. Monitoramento

### Health check automático
- A cada 5 minutos, o GitHub Actions verifica se o site e a API estão no ar
- Se falhar, abre um "issue" no GitHub automaticamente
- Você pode ver os alertas em: GitHub → Issues → label "health-check"

### Logs
- **Frontend:** Vercel Dashboard → projeto → "Logs"
- **Backend:** Railway Dashboard → projeto → "Logs"
- **Banco:** Railway/Neon dashboard

### Métricas de negócio (PostHog)
- Acesse: https://app.posthog.com
- Login com a conta configurada no setup
- Veja: ativação, retenção D1/D7/D30, conversão Free→Plus→Premium, MRR

---

## 8. Planos gratuitos (limites)

| Serviço | Plano | Limite | O que acontece ao atingir |
|---|---|---|---|
| Vercel | Hobby | 100GB bandwidth/mês | Site para de carregar |
| Railway | Starter | $5 crédito/mês | API para de responder |
| Neon (PostgreSQL) | Free | 0.5GB storage | Inserções falham |
| PostHog | Cloud Free | 1M events/mês | Eventos novos são descartados |
| GitHub Actions | Free (repo público) | 2000 min/mês | Workflows param de rodar |

Se atingir qualquer limite, o site pode parar. Monitore uso nos dashboards.

---

## 9. Contatos

- **Desenvolvedor:** END ART Studios
- **Email:** endart.studios@gmail.com

---

*Última atualização: 2026-07-18*
