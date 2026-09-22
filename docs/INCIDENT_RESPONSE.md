# Plano de Resposta a Incidentes — MEDIA Rate

Data de criação: 2026-07-25 (T026/9.8)
Última revisão: 2026-07-25

---

## 1. Objetivo

Definir o processo de detecção, resposta, contenção, recuperação e pós-incidente para o MEDIA Rate. Este plano segue práticas de DevSecOps e está alinhado com o PROTOCOLO_MESTRE.md.

## 2. Escopo

- **Sistemas cobertos**: Frontend (Vercel), Backend API (Railway), Banco de dados (PostgreSQL), Redis, MinIO.
- **Tipos de incidente**: Indisponibilidade, violação de segurança, vazamento de dados, falha de deploy, corrupção de dados, ataque DDoS.

## 3. Níveis de Severidade

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| **P1 — Crítico** | Sistema fora do ar. Dados de usuário comprometidos. | API retorna 5xx > 10%. Vazamento de dados confirmado. |
| **P2 — Alto** | Funcionalidade principal degradada. | Watchlist inacessível. Login com latência > 5s. |
| **P3 — Médio** | Funcionalidade secundária afetada. | Upload de admin falhando. Swagger offline. |
| **P4 — Baixo** | Cosmético. Sem impacto funcional. | Erro de CSS. Texto de i18n faltando. |

## 4. Detecção

### 4.1 Monitoramento automático
- **Health check**: GitHub Actions verifica API e frontend a cada 5 minutos. Falhas abrem issue automaticamente.
- **Métricas**: (pendente — 9.5.1/9.5.2). Quando implementado: monitorar taxa de 5xx, latência p95, falhas de auth.
- **Logs**: Pino + nestjs-pino no backend. Logs do Vercel e Railway nos dashboards nativos.

### 4.2 Canais de alerta
- GitHub Issues com label `health-check`, `alert`, `production`.
- Email do Operador via notificações do GitHub.
- (Futuro) Alertas via Better Stack, Grafana OnCall, ou similar.

## 5. Resposta

### 5.1 Fluxo P1/P2 (Crítico/Alto)

1. **Reconhecimento** (0–5 min): Operador vê o alerta (issue GitHub, email). Confirma se é incidente real.
2. **Triagem** (5–15 min): Verifica health endpoint, logs recentes, status do Railway/Vercel.
3. **Contenção** (15–30 min):
   - Se deploy recente causou: `railway rollback` para a versão anterior.
   - Se ataque: bloquear IPs suspeitos via rate limit ou firewall.
   - Se dados comprometidos: revogar todas as sessões ativas (`DELETE FROM sessao WHERE revoked_at IS NULL`).
4. **Diagnóstico** (30–60 min): Analisar logs, métricas, trace de erro.
5. **Correção** (60 min–2h): Aplicar hotfix. Testar. Deploy.
6. **Verificação**: Confirmar que health check volta a 200.

### 5.2 Fluxo P3/P4 (Médio/Baixo)
- Criar issue no GitHub com label `bug` ou `incident`.
- Corrigir no próximo ciclo normal de desenvolvimento.

## 6. Contenção Imediata (Playbooks)

### 6.1 Rollback de deploy
```bash
# Railway
railway rollback --service <SERVICE_ID>

# Vercel
vercel rollback --prod
```

### 6.2 Revogação de sessões (suspeita de comprometimento)
```sql
-- Revoga TODAS as sessões ativas (usuários precisam fazer login novamente)
UPDATE "sessao" SET "revoked_at" = NOW() WHERE "revoked_at" IS NULL;

-- Revoga sessões de um usuário específico
UPDATE "sessao" SET "revoked_at" = NOW()
WHERE "usuario_id" = '<ID_DO_USUARIO>' AND "revoked_at" IS NULL;
```

### 6.3 Bloqueio de emergência
- Aumentar rate limit global via env: `RATE_LIMIT_API_PER_MIN=10`
- Lockout global por IP: > 50 falhas em 5 minutos ativa bloqueio de 1h automaticamente.

## 7. Recuperação

### 7.1 Restauração de banco de dados
```bash
# Listar backups disponíveis
ls -la backups/mediarate_*.dump

# Restaurar backup mais recente
pg_restore -d "$DATABASE_URL" backups/mediarate_<TIMESTAMP>.dump --clean --if-exists
```

### 7.2 Migração reversa
```bash
# Prisma não suporta down migration nativo. Usar:
npx prisma migrate diff --from-url "$DATABASE_URL" --to-migrations prisma/migrations/<VERSAO_ANTERIOR>
```

## 8. Comunicação

### 8.1 Durante o incidente
- Atualizar o issue de health check com status a cada 30 minutos.
- Se P1 com impacto externo: notificar usuários via página de status ou banner no site.

### 8.2 Pós-incidente (Postmortem)
- Criar issue `postmortem: <descrição curta>` no GitHub.
- Preencher:
  - Timeline do incidente (UTC)
  - Causa raiz
  - Impacto (usuários afetados, duração)
  - O que foi feito para corrigir
  - Ações preventivas (o que muda para não acontecer de novo)

## 9. Contatos

| Função | Contato | GitHub |
|--------|---------|--------|
| Operador | (preencher) | @operador |
| Desenvolvedor | (preencher) | @dev |

## 10. Revisão

Este plano deve ser revisado:
- Após cada incidente P1 (no postmortem).
- A cada 90 dias (revisão programada).
- Após mudanças significativas na infraestrutura.

## Alerta métrico automatizado (T040)

A issue com o label `alerta-metrico` é criada/atualizada pelo workflow
`alertas-metricos.yml` quando 5xx ou falhas de auth cruzam os thresholds.

- **5xx (CRITICAL):** seguir o playbook de erro 5xx.
- **auth_failures (WARNING):** investigar tentativas de brute-force (o rate limit
  de `/auth/login` já atua); considerar bloqueio temporário de IP.
- A issue é **fechada automaticamente** quando os valores normalizam.

Thresholds e como ativar a fonte live: `docs/OBSERVABILITY.md`.
