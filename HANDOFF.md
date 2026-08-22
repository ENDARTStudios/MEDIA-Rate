# HANDOFF — MEDIA Rate (F14-polimento-final)

> Gerado para retomada limpa por outro agente/sessão. Estado íntegro em `main`,
> `git status` limpo. Último commit: **`06e1847`**.

---

## 1. Onde estamos

- **Fase:** F14 — polimento final (3ª rodada de crítica do Operador, 13 itens).
- **Lote A** (bugs visíveis) quase concluído: falta **T400 (localização)** + T398-restante + e2e/recapturas → então **STATUS único do Lote A**.
- **Lote B** (UX: T394–T397) inicia **somente após** APPROVED do Lote A + gate visual do Operador.

## 2. Tarefas concluídas no Lote A (commits em `main`)

| Commit | Tarefa | O quê |
|---|---|---|
| `807a886` | T390/T391 | score arredondado 1 casa (fim do `6.42258…`); badge PRÉVIA só sem fontes; sinopse sem HTML cru |
| `7cfa432` | (infra) | script de screenshots Playwright + 5 PNGs reais em `docs/screenshots/` |
| `eb07daa` | T398-dados | dedupe de slugs entre tipos: **25 renomeios → 0 duplicados** (sufixo `-<tipo>`) |
| `bac4765` | T393 | `titulo_original` de livros via mapa PT→EN commitado |
| `c8154c4` | T392 | menu "+" via **portal** (z-70, não cortado pelo overflow do carrossel) |
| `06e1847` | T399 | **opções do menu funcionam** — outside-click passou a checar `portalRef` além de `popoverRef` |

Estado de dados em produção (Fase C/F13): catálogo com **6 tipos** — capas 90–100%, sinopses 90–100%, slugs únicos, Google Books desbloqueado (chave 200).

## 3. Fila de execução (ordem obrigatória)

1. **T400 — localização consistente** (a peça grande; ver §4).
2. **T398-restante** — índice UNIQUE em `midia.slug` + `slug-service` com checagem de unicidade no create/backfill.
3. **e2e** `status-menu-funcional.spec.ts` (abrir menu → "Assistindo" persiste na watchlist → "Remover" some).
4. **Recapturas pós-deploy Ready** (menu "+" desktop+mobile, detail `/en-US`, catalog `/en-US`) em `docs/screenshots/`.
5. **STATUS único do Lote A** (checklist binário D-370) — não emitir STATUS intermediário.

## 4. T400 — plano detalhado (D-369)

- **Migração ADITIVA** (nullable): `titulo_en`, `titulo_es`, `sinopse_en`, `sinopse_es` em `midia`.
- **Backfill por fonte** (idempotente, produção via túnel): filmes/séries TMDB (`title`/`overview` EN+ES), games IGDB, mangás AniList (`title.english` + synopsis EN), livros Google Books/Wikipedia, HQs ComicVine. ES best-effort (null ok). Reportar contagens por tipo.
- **Cadeia canônica** de título: `pt-BR → titulo`; `en-US → titulo_en → titulo_original (se ≠ PT) → titulo`; `es-ES → titulo_es → titulo_en → titulo`.
- **Cadeia canônica** de sinopse: `sinopse_<locale> → sinopse_en → sinopse(pt)`.
- **e2e**: `/en-US/media/...` de "O Enigma de Outro Mundo" → "The Thing" + sinopse EN; `/pt-BR` mantém PT.
- **Meta visível**: em `/en-US` nunca PT quando há EN; idioma original só como último recurso.

## 5. Lote B (após Lote A aprovado) — T394–T397

- **T394** hero ícones protagonistas (tiles 96–120px que trocam o showcase) + stat "6 tipos".
- **T395** watchlist kanban horizontal compacto.
- **T396** dashboard denso (timeline/histograma/streak para todos os planos).
- **T397** descobertas reais (debug com a conta do Operador + fallback por gênero).

---

## 6. Fatos técnicos e procedimentos (essenciais)

### Deploy
- **Web → Vercel** (build automático no push para `main`).
- **API + Postgres → Railway** (projeto "MEDIA Rate").

### Banco de produção (via túnel)
```powershell
railway connect Postgres --tunnel-only -P 554xx   # em background; lê URL/creds do stdout
# rodar seed (workdir apps/api), com DATABASE_URL apontando o túnel:
$env:DATABASE_URL = "postgresql://postgres:<SENHA>@127.0.0.1:<porta>/railway"
node --import @swc-node/register/esm-register prisma/<script>.ts
```
- **psql NÃO instalado**; usar Node + PrismaClient (ou `npx prisma db execute`).
- `railway run` roda LOCAL (não alcança `postgres.railway.internal`) — usar o túnel.
- Seeds são **idempotentes** (skip por `fonte+fonte_id`; update só de campo vazio).

### Secrets (NUNCA imprimir valores)
- Ler de forma pontual: `$v = (railway variables --json | ConvertFrom-Json); $v.CHAVE`.
- **NÃO** rodar `railway variables --json` sem filtrar (já despejou segredos uma vez — lição D-344).
- Chaves relevantes já no Railway: `GOOGLE_BOOKS_API_KEY` (funcional, 200), `COMICVINE_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `DATABASE_URL` (privado `railway.internal`), `ADMIN_TOKEN` (rotacionado), `RESEND_API_KEY`, `MAIL_PROVIDER=resend`.

### Screenshots (gate visual D-364/D-365/D-366)
- Playwright + Chromium **já instalados** no repo.
- Script: `node apps/web/scripts/shot.cjs` (edita a lista `alvos`); saída em `docs/screenshots/`.
- **Modelo atual (`deepseek-v4-pro`) NÃO lê imagens** → quem valida visualmente é o **Operador** (abre PNGs no repo ou cola no chat) e o Thinker.
- Capturar **somente após o deploy Vercel ficar `Ready`** (PNG pré-deploy não vale como evidência do fix).
- Login em páginas privadas: gerar senha forte via CLI, manter só em env (`E2E_SHOT_PASSWORD`), **nunca** imprimir. Se seed tiver senha hardcoded com usuário em produção → `SECURITY_FINDING`, não usar.

### Regras de autonomia (NÃO re-perguntar go)
- **D-355 / D-362 / D-367 / D-370**: trabalho já especificado/autorizado **se executa e se reporta**; não re-perguntar. Na dúvida, executar.
- **§10.1**: se a janela esgotar, **checkpoint + PARCIAL** (commit + notas de retomada) — nunca abandonar sem estado.
- **D-364**: UI só fecha com screenshot de **fonte real** (Operador ou browser); fabricar evidência = violação.

### Pitfalls recorrentes
- `next build` regenera `apps/web/next-env.d.ts` → `git checkout -- apps/web/next-env.d.ts` antes de commit.
- `DECISOES.md` é **Latin-1** — ler/editar via `pwsh Get-Content -Encoding Default`, não com `read`/`edit`.
- Em `pwsh`, SQL inline com `COUNT(*)`/`::` quebra (PowerShell interpreta); usar script `.cjs` temporário em `apps/api/prisma/` e remover depois.
- PowerShell tem `$Host` reservado — não usar como nome de variável.
- Seed `.cjs`/scripts com `require()` → `/* eslint-disable */` no topo.

## 7. Arquivos-chave

- `apps/web/src/components/interaction/StatusReactionControl.tsx` — menu "+" (portal + `portalRef`/`popoverRef`).
- `apps/web/src/lib/score-utils.ts`, `apps/web/src/lib/i18n-content.ts` — score + sinopse (T390/T391).
- `apps/api/src/modules/recommendations/relation-graph.ts` + `recommendations.service.ts` — grafo de Descobertas (F13).
- `apps/api/prisma/seed-*.ts` — seeds idempotentes (Fase C, gêneros, títulos, slugs, sinopses).
- `apps/api/prisma/schema.prisma` — modelos `Midia`, `Genero`, `MidiaGenero`, `RelacaoObra`.
- `apps/web/scripts/shot.cjs` — capturas Playwright.

## 8. Estado de testes

- **307 testes web** verdes (`npm run test` em `apps/web`).
- API: suites de auth/dashboard/recommendations/relation-graph verdes.
- Gates: `tsc --noEmit`, `eslint`, `next build` verdes.
