# ACCESSIBILITY — Acessibilidade

## Estado real

- **Teste automatizado**: `npm run test:a11y` (axe) — `apps/web/e2e/a11y.spec.ts`
  roda no fluxo de QA; violações quebram o teste.
- **Contraste AA** das 6 cores canônicas (`CATEGORY_TOKENS`) testado (PR #143).
- **i18n em todo controle** — rótulo traduzido, nunca chave crua (guard no CI).
- Auditoria manual completa (teclado/leitor de tela em todas as telas):
  **pendente** — registrar antes da Beta pública (dívida honesta).

## Regras para código novo

1. **Interativo = teclado**: todo botão/ação tem caminho por teclado com foco
   visível (drag do Kanban tem alternativa por menu/seletor — `podeMoverPara`
   também vale para o caminho de teclado).
2. **Rótulo sempre**: `aria-label`/texto visível i18nizado em ícone-botão;
   campos com `<label>` associado.
3. **Cor nunca é o único sinal**: estado (demo/erro/sucesso) tem texto ou ícone
   (o `demoBadge` é textual; setas de score têm título).
4. **Sem dado → "—"** (não inventa número; também é acessibilidade cognitiva).
5. Respeitar `prefers-reduced-motion` em animações (o projeto tem skill de
   motion-design com esses princípios).
6. Widget novo: rodar `test:a11y` na tela antes do PR.

## Mudanças visuais

Mudou token/cor/contraste → atualizar [DESIGN](DESIGN.md) no mesmo PR e re-verificar
AA (ferramenta de contraste; alvo 4.5:1 texto normal / 3:1 texto grande e UI).
