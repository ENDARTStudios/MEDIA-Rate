---
name: design-review
description: >
  Revisão de design e UI/UX do MEDIA Rate com método repetível: crítica
  heurística (hierarquia, densidade, alinhamento, consistência), auditoria de
  contraste WCAG AA sobre os tokens reais, checagem de responsividade
  375/768/1024/1440, foco/teclado, estados (vazio/erro/loading) e verificação de
  anti-padrões de marca. Use ao revisar uma tela antes do PR, ao auditar design
  existente ou quando o pedido for "o visual está fraco/feio/confuso".
---

# Design Review (MEDIA Rate)

Crítica acionável, não opinião. Toda observação tem: evidência, impacto no
usuário e correção proposta em token/componente.

## Método (ordem fixa)

### 1. Contexto (2 min)

- Qual é o trabalho da tela? (converter, informar, decidir, operar)
- Quem chega e de onde? (visitante frio, usuário logado, admin)
- Qual é a ação primária? Existe **uma** só?

### 2. Inventário visual

Liste os blocos na ordem do DOM e classifique cada um:
`valor` (diz algo útil) / `prova` (valida) / `ação` (pede algo) / `ruído`.
Todo `ruído` vira item de remoção. Sem bloco sem função.

### 3. Hierarquia e ritmo

- Um único ponto focal? O olho vai H1 → CTA → prova, nessa ordem?
- Escala tipográfica com saltos claros (não 4 tamanhos vizinhos).
- Alinhamento numa grade única; nenhum elemento "quase alinhado".
- Respiro consistente da escala de spacing; densidade adequada à tarefa.

### 4. Anti-padrões (gates duros)

Rodar a lista de `media-rate-ui-ux/references/anti-patterns.md`. Qualquer um
presente = reprovado, independentemente de gosto.

### 5. Contraste e cor

```bash
node .zcode/skills/design-review/scripts/contrast-audit.mjs
```

O script extrai os tokens reais de `apps/web/src/lib/design-tokens.ts` e falha
com exit 1 se um par canônico cair abaixo de AA (4.5:1 texto normal, 3:1 texto
grande/ícone informativo). Também: cor nunca é o único portador de informação
(ex.: faixa de score precisa de número junto).

Em seguida rode o detector determinístico de anti-padrões (advisory — a triagem
completa, o baseline atual e a política de ignores estão em
[`references/design-linter.md`](references/design-linter.md)):

```bash
npm run design:detect        # 59 regras: AI tells, contraste, layout, movimento, toques
```

### 6. Responsividade

Checar 375 / 768 / 1024 / 1440 (e 1366×768, o notebook alvo da dobra):

- sem scroll horizontal; sem texto cortado/truncado errado;
- alvo de toque ≥ 44 px em mobile;
- ordem de leitura mantida quando a grade colapsa (não use `order` para
  esconder informação);
- conteúdo crítico acima da dobra em 1366×768.

### 7. Estados e movimento

Vazio, erro, carregando, sem permissão, dado insuficiente — todos desenhados.
Movimento: durações 150–300 ms, entrada > saída, `prefers-reduced-motion`
desliga; 3 camadas (primária/secundária/ambiente); sem loop > 8 px de
amplitude; sem animação que atrase leitura.

### 8. Acessibilidade

Rodar axe (skill `visual-qa`), navegar só com teclado, conferir foco visível,
`aria-label` em ícone-botão, `role="list"` explícito, contraste, e se o
conteúdo faz sentido lido linearmente por leitor de tela.

### 9. Consistência

Mesmo componente/rota/token do resto do app? Se inventou um padrão novo,
registrar em `DECISOES.md` e no design system — ou reverter.

## Formato do relatório

```markdown
# Design review — <tela> (<data>)
Veredito: APROVADO | APROVADO COM RESSALVAS | REPROVADO

## Bloqueadores (anti-padrão/AA/veracidade)
1. <arquivo:linha> — evidência → impacto → correção

## Melhorias (hierarquia, densidade, copy)
...

## Remover (ruído)
...

## Evidência
- screenshots 375/768/1024/1440
- saída do contrast-audit
- saída do axe
```

## Heurísticas rápidas que mais pegam neste projeto

- Hero com informação duplicada (número de fontes em 2 lugares com valores
  diferentes).
- CTA primária e secundária com o mesmo peso visual.
- Texto muted (`#80809B`) usado em corpo grande quando `#A0A0B8` caberia.
- Sequência de 6 tiles com hover que empurra layout (usar `transform`).
- `list-style: none` sem `role="list"`.
- Marquee/loop sem fallback estático para reduced-motion.
- Copy prometendo o que o produto não entrega.
