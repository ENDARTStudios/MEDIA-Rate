# CONTENT — Catálogo, curadoria e conteúdo

## Tipos de mídia (enum `TipoMidia`)

`FILME · SERIE · GAME · LIVRO · MANGA · COMIC` (+ `ANIME` **deprecated** no banco:
animação japonesa = SERIE, D-233 — nunca exposto em API/filtros/frontend).
Vocabulário conjugado por tipo de mídia no front: vocabulário T239 +
`consumoParaColuna()` (`watchlist-labels`).

## Fontes de catálogo (integrações de coleta)

IGDB (jogos), OMDB (filmes/séries), ComicVine (quadrinhos), Google Books (livros),
MAL (mangás), OpenCritic (scores de crítica). Chaves em env `*_API_KEY`/`*_CLIENT_*`
(secrets, `docs/BOAS_PRATICAS_SECRETS.md`). Unicidade por `(fonte, fonte_id)`.
Seed idempotente por `(fonte, fonte_id)` — T276 (games lookup-driven via IGDB por slug).

## Curadoria

- Módulo `curadoria` + `POST /api/v1/midias` admin (criação/edição manual).
- Score da obra no instante da adição à watchlist é preservado (`score_at_add`, T190)
  — permite indicador "score mudou" sem fabricar dado.
- Estado real do catálogo de produção: **esparso** (curadoria dirige; busca/trending
  vazias são estado válido — smoke usa `/api/v1/midias?limit=5` para achar UUID).

## Conteúdo i18n

- `apps/web/src/messages/{pt-BR,en-US,es-ES}.json` — paridade estrutural obrigatória
  (guard no CI testa as 3 línguas; chaves ausentes quebram o build do review).
- Texto legal (Termos/Privacidade): `docs/legal/` (pacote T464) — alteração só com o
  gate legal e consistência entre Termos, Política e rodapé.
- Rótulos de status de consumo vêm do vocabulário T239 (nunca hardcode no componente).

## Regras de conteúdo

1. Nunca inventar dado: sem dado → "—" (demo explícita com badge).
2. Score exibido: 0-100 para todos os tipos (não formatar "/10" em não-games).
3. Imagens de obra: R2/CDN com variantes sharp (Fase 10, D-439); sem hotlink externo.
4. Moderação: novo conteúdo externo passa pela curadoria (sem auto-publicação).
