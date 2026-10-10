# Incidente de segurança — exposição de padrão de credencial em histórico (T182)

**Data:** 2026-10-10 · **Fase:** F08-tests-security · **Tarefa:** T182-secret-exposure-audit-and-ignore
**Classificação: `TRACKED_OR_HISTORICAL_SECRET_EXPOSURE_SUSPECTED` (confirmado)**
**Severidade: ALTA** — repositório **PÚBLICO** + ausência de secret scanning no GitHub.

> Este relatório é sanitizado: **nenhum valor de credencial, token, cookie ou chave foi
> impresso, colado ou registrado**. Todas as verificações usaram apenas listagem de
> arquivos (`-l`) e metadados (hash/data/sujeito).

## 1. Sumário executivo

O Docs Gate (secret scan) bloqueou o PR #512 ao detectar padrão de credencial em
`.claude/exchange_log.jsonl`. A auditoria read-only confirma que **o arquivo chegou a ser
versionado**: o commit `1e7801f3` (adicionado no escopo da T181) contém o padrão e é
**alcançável a partir da `main`** (merge de #512 = `49bb2fe9`). O arquivo foi removido no
commit seguinte da mesma PR (`5679cda4`), o que o tirou do HEAD, **mas não do histórico**.

Agravantes apurados:
1. **O repositório é PÚBLICO** (`visibility=PUBLIC`, branch default `main`);
2. **Secret scanning e push protection estão DESABILITADOS** no GitHub — não há alertas e
   futuros vazamentos não seriam detectados pela plataforma;
3. O conteúdo também ficou visível no diff da PR #512 enquanto ela esteve aberta.

**Consequência:** a rotação das credenciais envolvidas é **obrigatória e urgente** (não é
mais medida preventiva). A remediação de histórico (purge) exige autorização explícita do
Operador e **não** foi executada.

## 2. Metodologia (read-only)

Comandos executados (saída sanitizada neste relatório):

| Verificação | Comando (forma usada) |
|---|---|
| Estado do repo | `git fetch origin`, `git rev-parse HEAD`, `git status --short` |
| Rastreamento no HEAD | `git ls-files --error-unmatch .claude/exchange_log.jsonl` |
| Histórico do caminho | `git log --all --full-history --pretty='%h \| %ad \| %s' -- <path>` |
| Padrão em commit histórico | `git grep -I -l -E '<padroes>' <hash> -- <path>` |
| Padrão em arquivos rastreados do HEAD | `git grep -I -l -E '<padroes>' HEAD -- .claude` |
| Visibilidade e segurança do repo | `gh repo view … --json visibility` e `gh api repos/… --jq .security_and_analysis` |
| Alertas de secret scanning | `gh api repos/…/secret-scanning/alerts` |
| Cobertura de ignore | `git check-ignore -v .claude/exchange_log.jsonl` |

Nenhum comando com `git show -p`, `git diff` do arquivo suspeito, `cat`, `rg -n` de linha ou
impressão de variável foi usado.

## 3. Resultados

| Item | Resultado |
|---|---|
| `.claude/exchange_log.jsonl` rastreado no HEAD? | **NÃO** (`ls-files --error-unmatch` → exit 1) |
| Histórico do caminho | **2 commits**: `1e7801f3` (adiciona) e `5679cda4` (remove) |
| Padrão presente em `1e7801f3`? | **SIM** (`git grep -I -l` listou o arquivo — valor não impresso) |
| Padrão presente em `5679cda4` / `49bb2fe9` (HEAD)? | não |
| Arquivos rastreados em `.claude` no HEAD com o padrão | **nenhum** |
| Visibilidade do repositório | **PÚBLICO** |
| Secret scanning / push protection | **desabilitados** |
| Alertas de secret scanning | indisponíveis (scan desabilitado → sem alertas) |
| `.gitignore` já cobre o arquivo? | **SIM** — `.claude/` (linha 65) cobre; `check-ignore` confirma |

## 4. Causa raiz

O arquivo estava **corretamente ignorado** (`.claude/`). Ele entrou no histórico porque o
agente usou **`git add -f`** (força a inclusão de arquivo ignorado) durante a T181, ao tentar
versionar o log operacional junto do registro documental. O gate de CI pegou o problema no
mesmo PR; a remoção no commit seguinte tirou o arquivo do HEAD, mas o commit que o
adicionou permaneceu no histórico do merge — e o repositório é público.

**Lição:** `git add -f` em área ignorada é uma operação de risco de segurança. Logs
operacionais locais não são artefato de repositório.

## 5. Remediação aplicada (mínima e segura)

- **`.gitignore`**: adicionado comentário de prevenção junto ao bloco `.claude/` proibindo
  explicitamente `git add -f` para arquivos sob `.claude/` (logs), com referência a este
  incidente. Nenhuma regra de ignore foi removida; nenhum outro arquivo foi afetado.
- **Nada mais foi alterado**: nenhuma chave rotacionada, nenhum segredo/variável tocado,
  nenhum histórico reescrito, nenhuma infra alterada.

## 6. Escalonamento ao Operador (prioritário)

1. **Rotacionar as credenciais das integrações** (categorias: catálogo de filmes/séries;
   games + credencial Twitch associada; quadrinhos; e as demais integrações configuradas no
   projeto) — **IMEDIATO**, pois o padrão esteve em repositório público.
2. Atualizar os valores **apenas** em secret manager/Railway/Vercel; nunca no chat.
3. Extrair o **plano de remediação de histórico** (por exemplo BFG/`git filter-repo` seguido
   de rotação + force-push coordenado). **Requer autorização explícita** — não executado
   por envolver reescrita de histórico de repositório público.
4. **Habilitar `secret scanning` + `push protection`** no repositório (hoje desabilitados) —
   recomendação de configuração de repositório, não executada nesta tarefa.
5. Avaliar a necessidade de **tornar o repositório privado** enquanto a remediação ocorre.

Template de resposta em `PENDENCIAS_OPERADOR.md` (item elevado a INCIDENTE_ABERTO).

## 7. Riscos residuais

1. O blob permanece no histórico público — **a rotação é a única mitigação efetiva**
   enquanto o purge não for autorizado e executado.
2. Caches, forks e indexadores de terceiros podem reter o conteúdo mesmo após o purge.
3. Sem secret scanning habilitado, novos vazamentos não gerariam alerta.
4. O log operacional local continua existindo na máquina (não versionado) — deve ser
   tratado como material sensível e eventualmente rotacionado/apagado pelo Operador.

## 8. Follow-ups (fora deste escopo)

- **T183**: versionar o spec `apps/api/test/scrapers-t176.spec.ts` (untracked) — dívida
  técnica, **não** misturada a este incidente.
- Regra de processo: proibir `git add -f` em área ignorada; se um artefato de `.claude`
  precisar ser versionado, mover para `docs/` ou copiá-lo para um caminho rastreável.

## 9. Confirmação

Nenhum valor de segredo, token, cookie, `DATABASE_URL`, `ADMIN_TOKEN`, chave privada,
`sk_live`/`sk_test`/`whsec`/`AKIA` ou credencial foi impresso neste relatório, nos logs de
comandos ou no STATUS. As verificações usaram apenas listagem de nomes de arquivo e
metadados de commit; nenhum conteúdo do arquivo suspeito foi exibido ou copiado.
