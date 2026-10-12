# Agentes de UI/UX (ZCode + DSH)

Agentes de projeto para trabalho visual no MEDIA Rate. Complementam os agentes de
operação (`ci-pr-doctor`, `prod-inspector`, `docs-pr-ship`).

| Agente | Use quando | Escreve código? |
|---|---|---|
| `ui-ux-designer.md` | criar/redesenhar tela, seção, hero, componente visual, animação | sim |
| `ux-copywriter.md` | escrever/revisar texto de interface, headline, CTA, tradução | sim (JSONs i18n) |
| `design-reviewer.md` | revisar criticamente o visual/UX antes do PR | não (read-only) |
| `visual-qa-auditor.md` | gerar evidência visual (screenshots, axe, overflow, dobra) | não (read-only) |

## Skills que eles consomem

- `.zcode/skills/media-rate-ui-ux/` — contrato de design (tokens, anti-padrões,
  LCP, funil de marketing, hero-playbook).
- `.zcode/skills/ux-copywriting/` — voz e regras de copy.
- `.zcode/skills/design-review/` — método de crítica + `contrast-audit.mjs`.
- `.zcode/skills/visual-qa/` — harness Playwright `visual-qa.mjs`.
- `.agents/skills/motion-design/` — princípios de animação (já existia).
- `.agents/skills/media-rate-conventions/` — fluxo PR/CI, segredos, i18n.

## Como invocar

**ZCode**: os arquivos `.zcode/agents/*.md` são descobertos automaticamente.

**DSH (este harness)**: use a ferramenta de subagente passando o arquivo como
instrução — o agente não compartilha o contexto desta sessão:

```
subagent(prompt: "Siga .zcode/agents/design-reviewer.md e revise a home
(/pt-BR). Alvo: apps/web/src/components/HeroSection.tsx e
CategoryIconRow.tsx. Devolva o relatório no formato do arquivo.")
```

Para trabalho que depende do histórico desta conversa, use
`subagent_fork` com a mesma instrução.

## Pipeline recomendado para uma mudança visual

1. `ui-ux-designer` implementa (spec → código → testes → screenshots).
2. `ux-copywriter` revisa/adiciona copy nos 3 locales.
3. `design-reviewer` critica o diff (read-only) e classifica bloqueadores.
4. `visual-qa-auditor` gera a evidência final por viewport + axe.
5. PR com `docs/`/`DECISOES.md` atualizados se algum padrão visual mudou.

## Regras de segurança (valem para todos)

Nunca imprimir valores de segredo/PII; nunca `git add -f`; nunca aprovar
environment Production; nunca push/merge direto em `main`; nunca interagir com
alertas de code scanning.
