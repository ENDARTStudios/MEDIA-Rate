# Proposta: Integrar codebase-memory-mcp ao Graft do MEDIA Rate

D-497 (P012 verificado, P013 GHAS pendente, T043 PENDENTE, T045 candidato, F10 PARCIAL)

## Opções de integração (não implementadas — para decisão do Operador/Thinker)

1) Indexar o repo MEDIA Rate no codebase-memory-mcp (grafo local de símbolos)
2) Usar o grafo para navegar antes de grep/glob (GRAFT-FIRST do AGENTS.md)
3) Validar dependências do image-policy (isUnoptimizedSource → callers)
4) Documentar diffs de PR #74 (feat/f10-image-optimization) em grafo

## Risco de integração
- Requer instalação local (npx @agentmemory/agentmemory@latest) — pode ser feita sem billing
- Não interfere com código de produto (docs, specs, CI apenas)
- Não expõe segredos (grafo só indexa código, não .env)

## Recomendação
Não bloquear F10 por este item. Executar após merge #74 como melhoria de workflow.
