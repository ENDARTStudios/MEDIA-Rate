# Reestruturação do site — estado e continuação

> Documento de continuidade. Quem retomar o trabalho começa por aqui; ele existe porque
> erros de medição custaram rodadas inteiras e não devem ser repetidos.

## Estado (branch `feat/reestrutura-site`)

| Etapa | Entrega | Verificação |
|---|---|---|
| Bot v1 | `npm run audit:routes` — 38 rotas medidas | roda ✓ |
| Casca de página | `apps/web/src/components/ui/page-shell.tsx` (`PageShell` + `SectionBlock`) | `tsc` 0 · `design:detect` 0 · `eslint` 0 |
| Rodapé por intenção | `MotionFooter.tsx` — Produto / Conteúdo / Legal, 5 colunas | `tsc` 0 · `eslint` 0 · `detect` 0 · JSON ✓ |
| **Bot v2** | mede **página + componentes** (`--depth`, `--json`, `--all`); ignora comentários; rotas que só redirecionam saem das contas | roda ✓ · árvore limpa após rodar |
| **/discover** | `PageShell` + tokens; `Link` no lugar de `<a href>` | `tsc` 0 · `eslint` 0 · `detect` 0 · vitest 624/624 |
| **/compare** | `PageShell` + tokens; cor do score vinda de `design-tokens` | idem |
| **/catalog** | `PageShell`; `CatalogPageClient` nos tokens | idem |
| **/discoveries** | `PageShell`; `DiscoveriesFeed` nos tokens (41 literais) | idem |

Progresso numérico do bot v2 nesta branch: **hex cru 799 → 708**, **rotas com ZERO token
1 → 0**, **rotas sem `<h1>` 0**, **`rounded-2xl` (D-065) 3 → 3** (`/biblioteca`, `/settings`,
`/top` — pendências dos próximos clusters).

### Tokens novos (com justificativa)

- `accent.indigo.hover` `#A5B4FC` — o par "índigo no hover" existia como hex solto em ~20
  links/CTAs (`text-[#818CF8] hover:text-[#A5B4FC]`). Sem token, cada rota migrada repetiria
  o literal.
- `brand.hover` `#C31442` — rose escurecido do hover dos CTAs de marca.
- `#1C1C2E` (74 usos: fundo de skeleton, placeholder de pôster, borda de input, hover de item
  de menu) foi tratado como **duplicata de `surface.elevated` `#1B1B2C`** (delta 1,1,2 em
  RGB). Migrado em `/discoveries`; os ~71 pontos restantes são varredura mecânica.

## Escopo medido (o que o bot v1 escondia)

O v1 media `page.tsx`. Nas rotas abaixo **o conteúdo vive no componente**, então os números
de "zero token / sem h1" estavam **inflados** e migrar a página **não muda nada visível**:

| Rota | page.tsx | Componente |
|---|---|---|
| `/discover` | 51l | `DiscoverClient` — **migrado** |
| `/biblioteca` | 73l | `ProtectedPage`, `BibliotecaClient` |
| `/catalog` | 151l | `CatalogPageClient` — **migrado** |
| `/discoveries` | 33l | `DiscoveriesFeed` — **migrado** |
| `/compare` | 28l | `ComparePage` — **migrado** |
| `/top` | 60l | `TopPageClient` — 325l, 26 tokens, h1 presente: **já conforme** |

**O trabalho real está nos componentes.** O v2 resolve isso: mede a página e a cadeia de
componentes que ela importa.

## Armadilhas que já foram pagas (não repita)

1. **`[locale]` em caminho no PowerShell** — `[locale]` é **classe de caracteres**;
   `Get-Content`/`Select-String` falham em silêncio e devolvem vazio, o que se lê erroneamente
   como "não existe". Use `-LiteralPath` ou Node.
2. **`[locale]` também engana o `eslint` e o `git add`** — `eslint "apps/web/src/app/[locale]/x/page.tsx"`
   linta **zero arquivo e sai 0** (o glob não casa). Escape como `[[]locale[]]` ou rode de
   dentro do diretório; **confirme com `--format json` contando os arquivos**. `git add`
   aceitou o caminho literal, mas não confie: `git show --stat` depois de commitar.
3. **Escrever script/boilerplate via here-string do PowerShell** — regex com `/` se corrompe
   na travessia. **Use a ferramenta de escrita de arquivo**; here-string só para texto simples.
4. **Verificar HTML cru para i18n** — o Next serializa as mensagens no HTML, então **toda**
   chave aparece ali, renderizada ou não. Para "está na tela?" meça o **DOM**.
5. **Medir comentário como tela** — a docstring do `PageShell` dizia "14 sem `<h1>`" e "sem
   `rounded-2xl`"; o bot v2 contava as duas frases como atributo da rota. Corrigido: o texto
   medido passa por strip de comentário (de linha só quando `//` abre a linha ou vem depois de
   espaço, para não truncar `https://`).
6. **`PageShell` renderizava `<main>`** — o landmark já é do `[locale]/layout.tsx`
   (`<main id="main">`, alvo do skip-link); um `<main>` aninhado quebraria o skip-link em
   todas as rotas migradas. A raiz do shell é uma `div`. **Não "conserte" isso de volta.**

## Próximas etapas, na ordem

1. **Cluster conta**: `/biblioteca` (2 `rounded-2xl` em `BibliotecaClient`), `/watchlist`,
   `/profile`, `/settings` (2 `rounded-2xl` em `Settings`/`LgpdControls`), `/historico`,
   `/user/data`, `/listas`, `/listas/[slug]`, `/verificar-email`, `/billing/success`.
2. **Cluster institucional**: `/about`, `/methodology`, `/sources`, `/faq`, `/seguranca`,
   `/assistant`, `/welcome`, `/feedback`, `/design-system`.
3. **Cluster legal**: `/terms`, `/privacy`, `/cookies`, `/cookies/gerenciar`,
   `/direitos-do-titular`. **Não alterar texto legal** sem manter Termos + Política + rodapé
   coerentes e o gate legal.
4. **Cluster detalhe**: `/media/[slug]` (`MediaDetailClient`), `/user/[id]`, `/pricing`,
   `/checkout/[plan]`, `/login`, `/register`.
5. **Faixa final do rodapé**: idioma, status e identificação legal.
6. **Varredura do `#1C1C2E`** (`surface-elevated`) nos ~71 pontos restantes — mecânica, mas
   confirmar caso a caso quando o hexadecimal estiver em `style={{…}}` e não em classe.

## Decisões tomadas no caminho (não reabrir sem motivo)

- **`/top` mantém o `rounded-2xl`**: é o banner do Nº 1 (imagem de fundo, raio 16 do conceito).
  O D-065 proíbe raio grande **em bloco**; um elemento deliberado é permitido. O bot vai
  continuar sinalizando — é falso positivo conhecido.
- **Cada rota é um commit**, não o cluster inteiro: a revisão fica possível e o `git bisect`
  continua útil. O cluster é acompanhado aqui.
- **`scoreColor()` não serve para escalas 0-100 com limiares próprios** (ex.: comparador com
  70/40): ele tem limiares 9/8/7 na escala 0-10 e trocaria a cor exibida. Use `colors.score.*`.

## Verificação por rota (copiar)

`tsc` 0 · `eslint` nos arquivos alterados (com `[[]locale[]]`) · `design:detect` 0 ·
`design:contrast` · `design:hex` · `npm test --workspace apps/web` ·
`node scripts/bots/audit-routes.mjs` antes/depois · captura 375/1024/1440 quando houver
mudança visual.

## Regras que continuam valendo

`main` auto-deploya; merge só com CI verde e nunca push direto (D-457/T459). Branch dedicada
por item. Não tocar em `.zcode/` (território de outros agentes) — bots vão em `scripts/bots/`.
Deploy de `Production` é aprovação do Operador (gate P012).

## Aberto fora deste programa

- **#603** (`vitest` 4.1.10 → 4.1.11): hoisting corrigido; falta declarar os tipos de
  `toHaveStyle`/`toBeInTheDocument` em `apps/web/test/`.
