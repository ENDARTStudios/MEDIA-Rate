# TASK_BREAKING_DOWN — Como quebrar tarefas

Princípio do projeto (provado em T027): **inventário antes de construção**. A premissa
do payload era "implementar CRUD watchlist/discover/métricas" — o inventário mostrou
que 80% já existia; os gaps reais eram outros (validação de transição, audit, logs).
Quebrar mal = construir o que já existe e deixar o gap de pé.

## Passo a passo

### 1. Inventário (antes de qualquer código)

- Graft/grep dos módulos e rotas envolvidos: o que JÁ existe?
- Quem consome? (`callers`/grep de importadores — mudança sem mapa de consumidores =
  refactor às cegas, proibido pelo AGENTS.md)
- O que a produção já prova (smokes recentes) vs o que só existe em teste?

### 2. Cortar pelo critério de pronto (não pelo tamanho)

Exemplos reais de quebra:

- **T027** → gaps: (a) validar transição no move do Kanban, (b) audit trail,
  (c) logger estruturado, (d) p95 provado — NÃO "implementar CRUD".
- **T028** → 2 itens cirúrgicos (#148 13-14): pipe de UUID + logger único. Micro-task
  com TDD; NÃO "melhorar robustez da API".
- **T031** → guard + docs de decisão; explícito o que NÃO fazer (staging/migration
  manual = decisão do Operador, documentada, não executada).

### 3. Regras de corte

- **Restrições explícitas** da TAREFA viram fronteira do escopo (o que está fora é
  tão importante quanto o que está dentro).
- **Um PR = uma intenção** (atômico por commit). Se a tarefa tem duas intenções,
  são duas branches (padrão T027: código em `chore/t027`, docs de pós-merge em PR
  próprio).
- **Dependência de decisão humana** (secrets, infra, legal) → registrar em
  `PENDENCIAS_OPERADOR.md` com passos exatos e SEGUIR sem executar.
- **Risco de produção** → a tarefa pede smoke específico no critério de pronto
  (ex.: "move inválido retorna 400" no T027).

### 4. Ordem dentro da tarefa

1. Vermelho (spec que falha pelo motivo certo) → 2. verde mínimo → 3. suítes →
4. lint/tsc → 5. docs → 6. PR (CI no head final) → 7. merge autorizado → 8. smoke →
9. evidência (`worklog`/`DECISOES`/`PLANO`).

## Anti-padrões (rejeitados em review)

- "Melhorar X" sem gap nomeado e sem spec.
- Refactor sem mapa de consumidores.
- Tarefa que muda produção sem critério de smoke.
- Marcar `[x]` sem artefato (D-505).
