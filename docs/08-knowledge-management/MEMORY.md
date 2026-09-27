# MEMORY — Onde o estado do projeto vive

O projeto é operado por agentes (Thinker/Doer) + Operador humano. A "memória" é
arquivo-versionada — nada vive só na conversa.

## Arquivos de memória (raiz e .claude/)

| Arquivo | Guarda | Quem atualiza |
|---|---|---|
| `worklog.md` | Log append-only de cada tarefa: Task ID, o que foi feito, evidência, commit | Doer, ao fim de TODA tarefa |
| `DECISOES.md` | Decisões (ADRs D-NNN) com contexto/decisão/evidência | Doer, em toda mudança de regra |
| `PLANO_MESTRE.md` | Fases 0-11 com status `[x]/[~]/[ ]` + evidência por item | Doer, ao concluir item |
| `PENDENCIAS_OPERADOR.md` | Ações que só o Operador pode fazer (P0NN, com passos exatos) | Doer, ao escalar |
| `.claude/exchange_log.jsonl` | Eventos SYNC/STATUS do protocolo (JSONL append-only) | Doer, por tarefa |
| `.claude/reports/*.md` | Relatórios de auditoria (ex.: `beta-blockers.md`) | Doer, em reconciliações |
| `HANDOFF.md`, `SPRINT.md` | Contexto de continuidade entre sessões | Doer/Thinker |

## Regras de memória

1. **Append-only**: nunca remover histórico de worklog/DECISOES/PLANO (correções
   entram como nova entrada/nota).
2. **Evidência ou não aconteceu** (D-505): status só muda com commit/run/smoke citado.
3. **Sem segredos**: memória é commitada — nada de tokens/URLs de conexão.
4. **Data absoluta** sempre ("2026-09-22", nunca "ontem").
5. Colisão de ID de decisão (D-459→D-491): nunca reusar; registrar a colisão.

## Memória do agente (fora do repo)

O assistente também mantém memória por-projeto (`~/.zcode/cli/memories/`) para
preferências e armadilhas operacionais — é **cache de conveniência**, nunca fonte de
verdade: o repo manda. Exemplos: quirks de tooling do Windows, padrão de smoke de
produção, receita posthog-cli.

## Como recuperar contexto de uma sessão anterior

1. `worklog.md` (últimas entradas) → 2. `git log --oneline -20` → 3. issues/PRs
abertas (#148 é o tracker de dívidas) → 4. `SPRINT.md`/`HANDOFF.md`.
