# T057 — Diagnóstico do drift de timestamp na cadeia de hash do AuditLog

**Data:** 2026-09-24 · **Autor:** Doer · **Base:** `origin/main` @ `2acdb1e`
**Status:** diagnóstico **docs/test-only** — **nenhum código de produto alterado**.
**Método:** leitura estática + teste determinístico (`apps/api/test/audit-integrity-drift.spec.ts`).
**Limitação:** Docker **indisponível** neste runner (`docker version` → daemon não acessível),
então a reprodução é via mock determinístico (não banco real). Registrado como pendência.

---

## 1. Causa raiz (confirmada por leitura)

| Etapa | Fonte do timestamp |
|---|---|
| `AuditLogService.log()` → `hash_cadeia` | `new Date().toISOString()` — **relógio do APP**, tomado **antes** do INSERT |
| `AuditLogService.verificarIntegridade()` → recálculo | `log.created_at.toISOString()` — **relógio do BANCO**, `@default(now())` no INSERT |

O payload do hash é
`{anterior, entidade, entidade_id, acao, usuario_id, timestamp}`. Se o instante do
app **diferir** do `created_at` persistido (clock skew app↔banco + latência de rede
até o banco), o hash recalculado **não** confere com o `hash_cadeia` armazenado →
`verificarIntegridade()` reporta **violação falso-positiva**, mesmo **sem qualquer
adulteração**.

## 2. Reprodução determinística (teste)

`apps/api/test/audit-integrity-drift.spec.ts` (mock; timers congelados em `NOW`):

| Cenário | `created_at` vs instante do hash | `verificarIntegridade()` |
|---|---|---|
| Controle | iguais (±0 ms) | `{integro: true, violacoes: 0}` |
| Drift de ms | `+2 ms` | `{integro: false, violacoes: 1}` |
| Clock skew | `-3000 ms` | `{integro: false, violacoes > 0}` |
| Payload fora do hash (T055) | alterar `dados_depois` | continua `{integro: true}` |

**Conclusão:** o drift é **REAL e reprodutível**; a verificação depende
exclusivamente do timestamp e **não** de adulteração. Resultado: **4/4 verde**.

## 3. Inventário de chamadores (quem sofre o impacto)

`verificarIntegridade()` **não tem chamador em runtime** (`grep` em `apps/api/src`
= 0; nenhum endpoint/cron/script). É referenciada em **documentação/runbook**:

- `docs/ARCHITECTURE.md`, `docs/COMPLIANCE.md` — descrevem a trilha.
- `docs/BACKUP_DR.md` — passo de validação pós-restore: “validar: `/health` 200 +
  contagens + `verificarIntegridade()`”.
- Testes: `apps/api/test/audit-log-integridade.spec.ts` (T055), `audit-integrity-drift.spec.ts` (T057).

**Risco real:** **baixo em runtime** (nenhum alerta automático hoje); **médio em
procedimento** — o passo de DR pode acusar violações falsas e minar a confiança
numa recuperação. Não há risco de segurança imediato.

## 4. Opções de correção (sem migration) — matriz

| # | Opção | Migration? | Altera histórico? | Prós | Contras |
|---|---|---|---|---|---|
| A | **Não incluir `timestamp` no payload do hash** (novos registros) + verificador tolerante | Não | Não | Elimina a dependência do relógio; simples | Enfraquece levemente a prova temporal no hash; novos registros usam esquema diferente (a cadeia precisa aceitar dois formatos) |
| B | **Persistir o timestamp do app** (`created_at` explícito) no INSERT e usar o mesmo no hash | Não | Não | Fonte única de tempo; preserva prova temporal | Requer `data.created_at = new Date()` no `log()` (mudança de produto, fora do T057) |
| C | **Tolerância na verificação** (ex.: aceitar timestamp dentro de ±N s) | Não | Não | Não muda o hashing | Mascara adulterações temporais dentro da janela; complexo e frágil |
| D | Verificar comparando **apenas `hash_anterior`** (encadeamento) sem recomputar payload | Não | Não | Simples | Perde a detecção de adulteração de conteúdo |

> Nenhuma exige migration/coluna/backfill. Todas exigem **PR de código** (não feita
> nesta tarefa, por restrição explícita).

## 5. Recomendação (única)

**Opção B** — gravar `created_at` **explicitamente** no `log()` com o **mesmo
`new Date()`** usado no hash (fonte única de tempo app-side). É a correção mínima
que **preserva** a semântica da cadeia e a prova temporal, sem migration e sem
tocar histórico; a verificação passa a ser determinística para novos registros.
Requer: (a) `data.created_at = <mesmo Date>` em `AuditLogService.log()`; (b) teste
de integração confirmando `integro: true` com DB real (pendente: Docker).

**Alternativa mais fraca:** Opção A (remover `timestamp` do payload) se o time
preferir não gravar `created_at` explícito.

## 6. Pendências e próximos passos

- **Pendência de ambiente:** reproduzir com **Postgres local** (Docker) para
  confirmar o comportamento end-to-end — bloqueado neste runner (daemon off).
- Implementar a Opção B em PR de código dedicado (T058 sugerida), **sem** tocar
  histórico, com migration-free e testes.
- Enquanto não corrigido: **não confiar** em `verificarIntegridade()` como sinal
  isolado no runbook de DR (`docs/BACKUP_DR.md`) — documentar a limitação.

---

*Sem PII/segredos. Fixtures apenas sintéticas. Nenhum código de produto alterado;
apenas o teste de caracterização.*
