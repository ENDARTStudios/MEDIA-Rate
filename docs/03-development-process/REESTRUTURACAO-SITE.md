# Reestruturação do site — estado e continuação

> Documento de continuidade. Quem retomar o trabalho começa por aqui; ele existe porque
> três erros custaram rodadas inteiras nesta sessão e não devem ser repetidos.

## Estado (branch `feat/reestrutura-site`, 3 commits)

| Etapa | Entrega | Verificação |
|---|---|---|
| Bot de auditoria | `npm run audit:routes` — 38 rotas medidas | roda ✓ |
| Casca de página | `apps/web/src/components/ui/page-shell.tsx` (`PageShell` + `SectionBlock`) | `tsc` 0 · `design:detect` 0 · `eslint` 0 |
| Rodapé por intenção | `MotionFooter.tsx` — Produto / Conteúdo / Legal, 5 colunas; `footer.groupProduct`/`groupContent` nos 3 locales | `tsc` 0 · `eslint` 0 · `detect` 0 · `JSON.parse` ✓ |

## Correção de escopo (medida, não suposta)

O bot mede `page.tsx`. Nas rotas abaixo **o conteúdo vive no componente**, então os números
de "zero token / sem h1" estão **inflados** e migrar a página **não muda nada visível**:

| Rota | page.tsx | Componente |
|---|---|---|
| `/discover` | 51l | `DiscoverClient` |
| `/biblioteca` | 73l | `ProtectedPage`, `BibliotecaClient` |
| `/catalog` | 151l | `CatalogPageClient` |
| `/discoveries` | 33l | `DiscoveriesFeed` |
| `/compare` | 28l | `ComparePage` |
| `/top` | 60l | `TopPageClient` — **325l, 14 tokens, h1 presente: já conforme** |

**O trabalho real está nos componentes.** A primeira tarefa é medir os componentes, não as páginas.

## Três armadilhas que já foram pagas (não repita)

1. **`[locale]` em caminho no PowerShell** — `[locale]` é **classe de caracteres**; `Get-Content`/`Select-String` falham em silêncio e devolvem vazio, o que se lê erroneamente como "não existe". Use `-LiteralPath` ou Node. Aconteceu **duas vezes** e a segunda produção foi uma `page.tsx` de `/faq` sobrescrevendo uma página institucional real (revertida).
2. **Escrever script/boilerplate via here-string do PowerShell** — regex com `/` atravessa PowerShell → here-string → arquivo e quebra de formas obscuras (`Invalid regular expression flags`, `\` duplo, constante apagada numa substituição de bloco). Quatro tentativas perdidas. **Use a ferramenta de escrita de arquivo** para o conteúdo do script; here-string só para texto simples.
3. **Verificar HTML cru para i18n** — o Next serializa as mensagens no HTML, então **toda** chave aparece ali, renderizada ou não. Para "está na tela?" meça o **DOM** (ex.: contar `h2`), não o HTML.

## Próximas etapas, na ordem

1. **Bot v2**: medir página **+ componente alvo**. Resolver os imports com `path.resolve(dirname(pagina), spec)` e filtrar com `String.includes("components/")` — **sem regex de caminho**. Comparar com `git diff` para garantir que a árvore ficou limpa.
2. **Migrar os componentes** que o bot apontar, com `PageShell`/`SectionBlock`, um cluster por commit: descoberta → conta → institucional → legal → detalhe.
3. **Faixa final do rodapé**: idioma, status e identificação legal.
4. **Verificação por cluster**: `tsc` 0 · `eslint` nos arquivos alterados · `design:detect` 0 · `design:contrast` · `npm run audit:routes` (o progresso é numérico) · captura 375/1024/1440 quando houver mudança visual.

## Regras que continuam valendo

`main` auto-deploya; merge só com CI verde e nunca push direto (D-457/T459). Branch dedicada
por item. Não tocar em `.zcode/` (território de outros agentes) — bots vão em `scripts/bots/`.
Deploy de `Production` é aprovação do Operador (gate P012).

## Aberto fora deste programa

- **#603** (`vitest` 4.1.10 → 4.1.11): hoisting corrigido (`2ff6be72`, vitest na raiz do monorepo); falta o segundo problema — `toHaveStyle`/`toBeInTheDocument` não existem no tipo `Assertion` do vitest novo → exige declaração de tipos própria em `apps/web/test/`.
