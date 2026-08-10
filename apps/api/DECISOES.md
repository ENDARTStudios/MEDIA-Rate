
## D-224 unaccent() e STABLE — incompativel com colunas geradas STORED (T223)
O Postgres rejeita funcoes STABLE em GENERATED ALWAYS AS (...) STORED (erro
42P17: generation expression is not immutable). A migration
20260808_add_search_vector usava to_tsvector('portuguese', unaccent(...)) e
falhava em producao. SOLUCAO: usar translate() (built-in IMMUTABLE do
Postgres, sem unaccent, sem wrapper/ALTER FUNCTION global) para remover
acentos ANTES do stemming — testado em Postgres dev: 'acao' encontra
'acao'/'acao' nos dois sentidos. ATENCAO: o dictionary 'portuguese' NAO
normaliza acentos (testado: 'historia' -> lexema 'histor' vs 'historia' ->
'histór'; 'acao' -> 'aca' vs 'acao' -> 'aça' — lexemas distintos, busca nao
cruza); a hipotese inicial (D-223) de que o dictionary bastava foi refutada
por teste. translate() e aplicado TANTO na coluna gerada (migration
20260809_fix_search_vector) QUANTO no termo de busca (discover.service,
plainto_tsquery('portuguese', translate(q, ...))). A original foi
desabilitada (movida para migrations-disabled/).

## D-225 seeds no container: tsconfig standalone + bugs de dados pre-existentes (T224)
Causa raiz: o @swc-node/register (ESM) deriva TSCONFIG_PATH de
join(cwd, 'tsconfig.json') e o oxc-resolver FALHA a resolucao de imports
relativos .js->.ts quando o arquivo nao existe — a imagem de producao nao
tinha tsconfig.json (tsconfig.base.json tambem nao esta na imagem, entao
extends quebraria). SOLUCAO A (minima): apps/api/tsconfig.seeds.json
(versao FLAT, sem extends, module/moduleResolution NodeNext) copiado para
/app/tsconfig.json no estagio runner do Dockerfile. Validado com docker
build + docker run local: os 4 seeds resolvem e executam no container.
ACHADOS ADICIONAIS (bugs de dados pre-existentes de T180/T222, descobertos
pela validacao docker obrigatoria — nao e resolucao, e impediam execucao
real): (1) seed-lib.ts usava prisma.midiaScore (nao existe; o correto e
mediaScore) — crashava no recalculo; (2) seed-games/novas-midias passavam
`slug` ao midia.create, mas Midia NAO tem coluna slug (slug e derivado
client-side via slugify no discover.service); (3) seed-novas-midias omitia
fonte/fonte_id obrigatorios no create (agora fonte = primeira fonte
curada, fonte_id = slug); (4) logs usavam score.score etc. sobre retorno
number de recalcularScoreSeed (ajustado para number). Nenhuma logica de
negocio alterada. Seeds validados no container: games 51 titulos/190
avaliacoes/51 scores (exit 0), novas-midias 3 titulos (exit 0), relacoes
(exit 0, 0 arestas sem rede), tmdb (exit 1 no guard de TMDB_API_KEY ausente
— comportamento esperado, NAO erro de resolucao).

## D-227 curadorias de seed resolvem por (fonte, fonte_id); titulo e fallback (T225)
O seed-relacoes casava pares por TITULO EXATO e o catalogo usa titulos
localizados pt-BR (seed-tmdb language=pt-BR grava "Duna") enquanto a
curadoria conhecia os nomes originais ("Dune") — resultado: grafo
cross-midia com 2 arestas em producao (feature flagship invisivel).
REGRA: cada par curado referencia a IDENTIDADE (fonte, fonte_id) que os
proprios seeds gravam (seed-tmdb: "tmdb"/"tmdb_tv" + id numerico da API;
seed-novas-midias: primeira fonte curada + slug); titulo normalizado
(lowercase, sem acentos, slug de titulo/titulo_original) e APENAS fallback
para pares sem ids, com log de unmatched sempre explicito (nunca
silencioso) e self-pair registrado. IDs TMDB verificados na API: Dune
438631, Dune: Part Two 693134, Watchmen 13183, Matrix 603, Breaking Bad
1396, Better Call Saul 82856. ACHADO CHIP ANIMES 0: seed-novas-midias
pulava por titulo (`findFirst({ titulo })`) e o seed-tmdb ja tinha criado
"Berserk" como SERIE (tmdb_tv/2509) — o ANIME (jikan/berserk) nunca era
gravado; skip agora e por (fonte, fonte_id). Wikidata tbm casa
titulo_original. Validado com docker local (padrao T224).

## D-228 busca: um unico comportamento normalizado (T227)
A searchbox da web chamava /api/v1/search (pg_trgm somente no titulo) —
'acao' retornava zero e 'acao' resultado fraco. REGRA: nao pode existir
dois comportamentos de busca em producao. /search (consumido pelo
catalogo web) agora DELEGA ao discover (mesma busca normalizada T223:
tsvector + translate() nos dois lados para q>=3; pg_trgm para q<3),
mantendo o formato antigo (items/total/ano_lancamento/imagem_url). A
searchbox passa a usar /api/v1/discover?q=. Paridade de acentos e
criterio BINARIO: 'acao' e 'acao' retornam o mesmo conjunto. ACHADO:
discover.service.ts consultava "midia_score" (tabela inexistente — o
correto e "media_score"); nunca exercitado em producao porque a searchbox
usava /search; corrigido junto (500 em /discover). Validado com docker
local: /discover e /search retornam John Wick 4 para 'acao' e 'acao';
titulo exato 'Um Sonho de Liberdade' sem regressao.

## D-229 score x fontes: numero exibido = lista exibida (T228)
A ficha mostrava 'consolidado a partir de 2 fontes' (num_fontes do
media_score) com a lista FONTES vazia e 'atualizado ha 4 dias' apos re-run
de seeds. CAUSA: o seed gravava media_score.detalhes como OBJETO
({origem:"seed"}) enquanto o controller so expoe array (Array.isArray) —
a lista nascia vazia; e o upsert do seed nao atualizava calculado_em.
CORRECAO: (1) seed-lib recalcularScoreSeed grava detalhes como ARRAY com
UMA entrada por avaliacao real ({fonte, rating_original, rating_100} via
fator de escala por fonte) — num_fontes deriva da MESMA lista; (2) o
upsert inclui calculado_em: new Date() a cada run; (3) regra de display no
frontend: explanation/sampleSize derivam de sources.length (a lista
exibida), nunca de num_fontes solto. Fonte sem fator de escala conhecido
nao entra em detalhes (display nunca inventa nota). Validado com docker
local: ficha Terraria score 90.75 + num_fontes 4 +   detalhes array 4
entradas + fontes (avaliacoes) 4 + calculado_em do run atual.

## D-230 verificacao em producao obrigatoria antes de fechar (T229)
Segunda ocorrencia de 'validacao local verde, producao diferente' (1a:
tsconfig no container, T224; 2a: paridade de busca, T227/T229). REGRA:
tarefa que altera comportamento visivel ao usuario so fecha com evidencia
EM PRODUCAO: curl nos endpoints afetados + confirmacao do build servido
(hash/commit no Vercel) anexados ao STATUS. Sem evidencia de producao o
Thinker nao aprova. DIAGNOSTICO T229: os 3 endpoints de producao
(/discover?q=acao, ?q=acao, /search?q=acao) ja retornavam o MESMO conjunto
nao-vazio (5 titulos) e o JS servido no Vercel ja continha as marcas do
c5b355a (searchbox -> /discover) — o print do Operador era pre-deploy ou
cache; nenhuma correcao de busca necessaria na API.

## D-231 ListaViewPage consumia /search com formato inexistente (T229)
ListaViewPage.buscar() esperava { data: ResultadoBusca[] } (camelCase) mas
/api/v1/search retorna { items: [{id, titulo, tipo, ano_lancamento,
imagem_url, slug}] } — a busca de 'adicionar item' da pagina de lista
nunca retornava resultados (ou quebrava em silencio). Corrigido para o
formato real; herda a normalizacao de acentos do /search delegado (T227).

## D-232 CI deterministico + docs health /health (T230)
Os 5 testes falhos do run 641/646 eram do exception-filter.e2e: o
beforeAll monta o AppModule COMPLETO (import dinamico pesado) e, sob
contenda de 80 arquivos paralelos, estourava o timeout default de 5s do
vitest → testes skipped + crash do afterAll em app.close(). CORRECAO:
timeout explicito de 60s no beforeAll + afterAll defensivo (app pode nao
existir; teardown falho nunca derruba o arquivo) aplicado aos 8 e2e que
montam AppModule (exception-filter dev/prod, health, https-redirect,
cors, rate-limit, zod-validation, admin-stats). Suite completo 649/649 em
5 execucoes consecutivas — deterministico, sem skip silencioso. DOCS:
caminho real do healthcheck e GET /health (monitor UptimeRobot ativo em
producao usa /health); removidas todas as mencões ao caminho com prefixo
api/v1 em OBSERVABILITY, MANUAL_DO_OPERADOR, PLANO_MESTRE e worklog.

## D-234 mangas como categoria propria; ANIME deprecated (T231)
Regra de dominio do Operador (D-233): anime (animacao japonesa) NAO e
categoria — classifica como SERIE; manga (quadrinho japones) e categoria
propria 'Mangas' (chip distinto de 'Quadrinhos'). IMPLEMENTACAO:
- enum TipoMidia: ADD VALUE 'MANGA' (migration 20260809_add_manga_tipo);
  'ANIME' fica DEPRECATED no banco (remover enum Postgres e destrutivo) —
  nunca exposto em API/filtros/frontend.
- dados: UPDATE midia SET tipo='MANGA' WHERE tipo='ANIME' AND fonte='jikan'
  (Berserk); demais ANIME -> SERIE.
- API: filtro tipo=MANGA no /midias; /discover e DTO aceitam MANGA e
  REJEITAM ANIME (400); tipo=ANIME vira alias para MANGA no /midias
  (compatibilidade); dominioDoTipo(ANIME|MANGA) -> anime_manga (fontes
  jikan/anilist/kitsu/mangadex); CONFIG_V3 MANGA = config ANIME antiga.
- seeds: Berserk -> MANGA; skip por (fonte,fonte_id) com update de tipo em
  re-run (ANIME antigo vira MANGA); SUBGENEROS shonen/seinen/isekai ->
  MANGA.
- frontend: MediaType 'anime' -> 'manga' em toda a cadeia (chips, carrossel,
  mocks de animes viram series, pricing, watchlist, i18n 'Mangás'/'Manga'
  nos 3 locales); mocks de animacao japonesa (Jujutsu Kaisen etc.) viram
  SERIE. LIÇÃO DE PROCESSO: Set-Content no PowerShell reescreve arquivos
  Latin-1 como UTF-8 e quebra o parser do Turbopack (rope) — editar com
  ferramenta que preserva encoding.
- validado com docker local: migration reclassifica 2 linhas (jikan->MANGA,
  tmdb_tv->SERIE), 0 ANIME restantes; /midias?tipo=MANGA e ?tipo=ANIME
  retornam Berserk; discover?tipo=ANIME -> 400; seed-novas-midias faz
  update-tipo; aresta Berserk MANGA <-> SERIE preservada.

## D-236 ADD VALUE de enum exige migration separada dos UPDATEs (T232)
Falha de healthcheck dos deploys pós-T231 (produção presa no T230; Vercel
no T231 -> mismatch). CAUSA RAIZ reproduzida localmente com docker: o
Prisma envolve cada migration em UMA transação e o Postgres proíbe USAR
valor de enum na MESMA transação em que o ADD VALUE ocorreu:
  ERROR: unsafe use of new value "MANGA" of enum type "TipoMidia"
  hint: New enum values must be committed before they can be used.
A migration 20260809_add_manga_tipo original fazia ADD VALUE + UPDATEs no
mesmo arquivo; a validação do T231 usou psql -f (autocommit por
statement), por isso passou — lição: validar migrations SEMPRE com
`prisma migrate deploy`, nunca psql cru. CORREÇÃO: duas migrations —
20260809_add_manga_tipo (SÓ o ADD VALUE, commita sozinho) +
20260809_add_manga_tipo_dados (UPDATEs de reclassificação, transação
separada). VALIDAÇÃO docker local (boot real): DB pós-T230 + deploy exit
0; entrypoint completo sobe; /health 200; re-run idempotente ("No pending
migrations"); Berserk ANIME -> MANGA e Berserk (1997) ANIME -> SERIE;
/midias?tipo=MANGA retorna Berserk. O Operador deve rodar `npx prisma
migrate resolve --rolled-back 20260809_add_manga_tipo` no Console ANTES
do novo deploy (linha failed do deploy anterior). ACHADO PRÉ-EXISTENTE
(não bloqueante): DB virgem falha em 20260803_media_score_v3 (ordem
lexicográfica antes de 20260803_persistencia_avaliacoes que cria
avaliacao_fonte) — produção nunca sofreu porque o banco foi migrado
incrementalmente; documentado para correção futura.

## D-235 re-coleta de critica exige SCRAPE_NUMERICO_ENABLED no Railway (T231 pos)
Diagnostico do Passo 2 (critica 'Sem critica' em producao): a ficha do
Coringa mostra criticosScore=null com 2 fontes publico (tmdb/trakt) — os
adaptadores de CRITICA (metacritic, rottentomatoes, letterboxd,
rogerebert) sao gateados por SCRAPE_NUMERICO_ENABLED=true (ativo() ->
false sem o gate -> 'pulada: inativa' no coletarTudo). SEM o gate no
Railway, NEM o job diario (03:05 UTC) NEM o gatilho POST
/api/v1/midias/score-job coletam critica — re-coleta sozinha nao resolve.
ACAO necessaria do Operador: setar SCRAPE_NUMERICO_ENABLED=true no Railway
e re-disparar o job (ou aguardar o ciclo). Confirmado tambem que o deploy
Railway do 739f565 (T231) NAO subiu (uptime ~11.7h = ultimo deploy
ed30b9d): API ainda sem filtro MANGA e Berserk como ANIME — pendente de
redeploy.

## D-237 searchbox renderiza so a resposta da API; fallback mock removido (T233)
O print do Operador ('acao'->zero; 'acao'->'Coração Partido') foi do
/search antigo (pg_trgm, pre-T227) — o codigo atual ja usava /discover
normalizado e a producao (Vercel rewrite) responde 5 == 5 titulos para
acao/acao. MAS restava o fallback mock por SUBSTRING client-side em
searchMedia (MOCK_MEDIA.filter(includes)) e no getCatalog com search
(applyCatalogFilters) — comportamento divergente do backend normalizado.
REGRA (T233): a searchbox renderiza EXCLUSIVAMENTE a resposta do
/api/v1/discover; fallback offline foi REMOVIDO do caminho de busca (API
fora -> lista vazia + 'Nenhum resultado', nunca resultados falsos de
mock); mock permanece apenas para catalogo sem busca (demo/offline).
Testes: search-box.spec.tsx (4 cenarios: q sem acento renderiza os itens
da API; q com acento mesmo conjunto; API vazia -> 'Nenhum resultado';
API 500 -> sem fallback mock). Verificacao em producao (D-230): curl via
Vercel rewrite /api/v1/discover?q=acao e ?q=ação -> 5 itens identicos.
Web 240/240, tsc + build exit 0.

## D-238 deploy Railway ACTIVE com linha rolled-back — cenarios (a)+(b) (T235)
Diagnóstico com evidência: uptime da API resetou para ~40min e os
endpoints novos respondem — o deploy do 3231115 SUBIU após o Operador
rodar o resolve --rolled-back. CENÁRIO OCORRIDO: (a) os deploys T231/D-235
falharam PRÉ-resolve (P3009: linha failed bloqueia) — resolvido pelo
resolve do Operador; (b) REPRODUZIDO em docker que a linha rolled-back com
CHECKSUM ANTIGO NÃO bloqueia o migrate deploy (Prisma valida checksum
apenas de migrations APPLIED, não de rolled-back): DB pos-T230 com enum
sem MANGA + Berserk ANIME + linha rolled-back + checksum antigo →
migrate deploy exit 0 reaplicando as migrations irmãs; boot real do
entrypoint sobe; /health 200; /midias?tipo=MANGA retorna Berserk. NENHUMA
escrita em produção foi necessária além do resolve já feito — não houve
delete de linha. VALIDAÇÃO FINAL em produção (D-230): /midias?tipo=MANGA
→ 200 total=1 (Berserk MANGA); /discover?tipo=MANGA → 200; contagens por
tipo 225/225/52/1/1/1 (0 ANIME); ficha berserk tipo=MANGA score 72.1;
busca acao≡ação 5 itens idênticos. LIMITAÇÃO registrada: Railway CLI não
instalada na máquina do Doer — retrigger/status de deployment ficam com o
Operador (painel).

## D-240 posters backfill: fonte por tipo + graceful degradation (T226)
Seed novo `npm run db:seed:posters` preenche poster_url apenas onde
NULL/vazio (NUNCA sobrescreve — TMDB cobre filmes/séries). Fontes por
tipo: GAME → IGDB cover (OAuth client-credentials Twitch,
TWITCH_CLIENT_ID/SECRET; fonte_id é o id numérico IGDB); LIVRO → Google
Books (GOOGLE_BOOKS_API_KEY) com fallback OpenLibrary covers (sem chave,
por cover_i); MANGA → Jikan (público, busca por título); COMIC →
OpenLibrary. POLÍTICA: delay ≥300ms por fonte; máx. 1 retry; falha → log
do título e continua (nunca aborta lote); só URLs https armazenadas;
nenhum segredo em logs; resumo final com contadores
(preenchidos/falhos/sem fonte). VALIDAÇÃO: 12 testes unitários com fetch
mockado por fonte (sucesso/404/timeout/sem chave/fonte_id não-numérico);
docker local SEM chaves → exit 0 com skips graciosos; OpenLibrary
preencheu Duna e Watchmen mesmo sem chaves; re-run idempotente (só vê o
que ainda está NULL); pôsteres existentes (TMDB/IGDB) intocados. Script
excluído do caminho de boot (não roda no entrypoint) — só via Console.

## D-242 Quero consumir funcional: ficha usa WatchlistButton completo (T238)
CAUSA RAIZ: a ficha de mídia definia um WatchlistButton LOCAL (no
MediaDetailClient) que retornava null quando a mídia NÃO estava na
watchlist — o botão de adicionar nunca aparecia; e quando estava, o
clique REMOVIA (comportamento inverso). O componente importado
(WatchlistButton.tsx, com add/move/remove/dropdown/feedback) existia mas
era sombreado pelo local. CORREÇÃO: removido o local morto; a ficha usa o
importado. NO COMPONENTE: 401 (anônimo) → redirect /login?callbackUrl=
(com retorno à ficha), nunca silencioso; 409 (duplicata) → estado "já
está na watchlist" (justAdded), não erro; feedback visual (coração cheio +
animação + tooltip). Testes: consume-button.spec.tsx (4 cenários: 201
adiciona e muda estado; 401 redireciona com callback; 409 sem crash/sem
redirect; dropdown move via PATCH /move). Verificação produção (D-230):
POST/GET /api/v1/watchlist anônimo → 401 (contrato T207 correto; o
frontend redireciona). Web 244/244, tsc + build exit 0.

## D-243 filtro de catalogo: input local + debounce (T237)
CAUSA RAIZ: o input de busca do CatalogFiltersClient era controlado por
sp.get("q") (URL) e cada tecla fazia router.replace — o replace e
assincrono e o re-render com a URL antiga 'voltava' o input, perdendo
caracteres na digitacao rapida. CORRECAO: (1) input 100% estado local
(draftQuery); (2) debounce 300ms antes de commitar q para a URL (que
alimenta o react-query do catalogo); (3) guarda de hidratacao — a URL so
sobrescreve o draft quando o valor commitado difere (back/forward/link),
nunca durante digitacao; (4) sem chamada por tecla (so apos pausa).
Testes catalog-search.spec.tsx (3 cenarios: rajada 0ms preserva texto
inteiro e commita uma vez; rajada dentro do debounce nao gera chamadas
intermediarias; hidratacao da URL nao sobrescreve digitacao em andamento).
Verificacao producao (D-230): /search?q=sonho -> 27 (Um Sonho de
Liberdade 1o); ?q=cavaleiro -> 7 (O Cavaleiro dos Sete Reinos).
Web 247/247, tsc + build exit 0.

## D-245 watchlist fala a lingua de cada midia (T239)
Regra de produto: filmes/series -> ver; games -> jogar; livros/HQs/mangas
-> ler; DROPPED -> 'Abandonei' comum. Enums da API inalterados (so
rotulos). IMPLEMENTACAO: modulo central lib/watchlist-labels.ts com
conjugacaoPorTipo + colunaLabelKey (retorna chave i18n), aplicado em
WatchlistCard (select por-card), WatchlistButton (dropdown da ficha) e
WatchlistClient (lista); StatusReactionControl ja usava statusLabelKey por
tipo. i18n: chaves queroLer/lendo/li/zerei/abandonei adicionadas ao
namespace watchlist nos 3 locales (antes so existiam em interaction).
Testes: watchlist-labels.spec.ts — matriz 12 casos tipo x coluna x 3
locales + conjugacaoPorTipo + fallback (14 testes). E2E watchlist-labels:
ficha de game carrega com botao de watchlist (UI producao, D-230). LICAO:
registerAndLogin contra producao da redirect loop (registro nao disponivel
em prod) — a verificacao UI logada do popover fica com o Operador; a
matriz por tipo esta coberta pelos unitarios. Web 261/261, tsc + build
exit 0.

## D-244 buscador do topo e os 3 sintomas da auditoria: VIVOS em producao (T240)
DIAGNOSTICO com evidencia UI real (Playwright contra media-rate-web.vercel.app,
nao so curl): os 3 sintomas da auditoria do Operador estao CORRIGIDOS em
producao — (1) paleta do topo: 'acao' lista os 5 titulos (Em Movimento,
Coringa, Os SUPERtontos, Taxi Driver, Mortal Kombat Legends) e 'acao' o
mesmo conjunto (paridade); (2) 'Quero consumir': botao de watchlist visivel
na ficha (T238 vivo, aria-label 'Add to watchlist'); (3) filtro lateral:
digitacao rapida 'cavaleiro' preservada e 'O Cavaleiro dos Sete Reinos'
filtrado (T237 vivo). O bundle Vercel NAO estava stale — os prints do
Operador eram pre-deploy do af5b271 (T233) ou cache de browser. LIÇAO
METODOLOGICA (terceira variante do 'validou onde nao era o lugar'): testes
web de producao devem ser UI (Playwright), nunca so curl — o e2e
search-topo.spec.ts (paleta) e crosscheck-auditoria.spec.ts (T237/T238)
passam a fazer parte da suite e2e permanente (PLAYWRIGHT_BASE_URL aponta
producao).

## D-247 auditoria tri-idioma: diagnostico com fonte unica (T242)
DIAGNOSTICO com evidencia UI (Playwright contra producao): pagina
/pricing mostra R$ 0/4,90/9,90/49,98/100,98 identicos em pt-BR/en-US/
es-ES — os achados II da auditoria (precos quebrados '(R,90)', '8,90/
14,90', 'ENDART' so em pt-BR, contadores '14 vs 11'/'8 vs 11') NAO se
reproduzem no bundle atual (artefato de build antigo, mesmo padrao T240).
Fonte de verdade ja existia por construcao: lib/pricing.ts (PLANS +
formatPlanPrice BRL) e lib/sources.ts (NUM_FONTES_ATIVAS derivado). 
CORRECOES REAIS aplicadas: (1) footer.lgpd neutro por locale (pt 'Seus
dados (LGPD)', en 'Your data', es 'Sus datos') — antes 'LGPD' cru nos 3;
(2) meta es-ES home 'juegos y filmes' -> 'películas, series y juegos'.
PENDENTE da DECISAO 1 (RGPD): a meta de privacy es-ES cita apenas LGPD —
aplicar enquadramento legal conforme escolha do Operador. Testes:
site-config.spec.ts (4: valores PLANS unicos; formatPlanPrice sem
'(R,90)' nos 3 locales; terms.s3b com 4,90/9,90 e marca 'END ART
Studios'; footer.lgpd neutro). Web 265/265, tsc + build exit 0.

## D-248 i18n estrutural: categorias por locale (T243)
Menu/ícones de categorias e a paleta de busca exibiam rótulos PT
hardcoded em EN/ES ('Filmes/Séries/HQs & Mangás'). CORRECOES:
- HeroIconCluster (home/hero): labels via chaves i18n catalog.filme/serie/
  game/livro/comic/manga — comic agora é 'Quadrinhos'/'Comics'/'Cómics'
  (não mais 'HQs & Mangás' — alinhado ao T231 em que mangá é categoria
  própria).
- SearchCommand (paleta): tipoLabel usa chaves singulares
  catalog.typeMovie/typeSerie/typeGame/typeBook/typeComic/typeManga
  (adicionadas nos 3 locales); agrupamento por r.type traduzido.
- ComparePage: TIPO_LABEL PT (com mojibake) -> chaves catalog; MANGA
  adicionado.
- typeSerie/typeBook/typeComic/typeManga adicionados aos 3 locales.
TESTES: i18n-estrutural.spec.ts (6: chaves singulares/plurais presentes,
EN/ES sem termos PT, EN Movies/Series/..., ES Películas/Series/...,
footer.lgpd sem 'LGPD' cru). hero-icons.spec atualizado (comic ->
Quadrinhos). e2e t243-i18n-home valida as 3 homes (pós-deploy).
Web 271/271, tsc + build exit 0.

## D-249/D-250 diretrizes do Operador: Ctrl+K, moeda por locale, RGPD (T246-T248)
Diretrizes de negocio (2026-08-09, autoridade do Operador):
(1) MOEDA (D-249): mesmo valor numerico sem conversao (0/4,90/9,90) com
simbolo por locale — pt-BR 'R$', en-US '$', es-ES '€'; separador decimal
por locale (pt/es '4,90', en '4.90'). lib/pricing.ts: symbolForLocale +
formatPlanPrice; PricingCards importa PLANS de pricing.ts (fonte unica);
toggle mensal/anual agora rotula 'mes' e 'ano' distintos (antes ambas
'mes'); terms.s3b com simbolo por locale. Substitui a politica 'BRL
explicito' do T242.
(2) RGPD (D-250): es-ES privacy com RGPD completo (bases art. 6,
direitos arts. 15-22, reclamacao a AEPD, aplicacao art. 3.2) SEM LGPD;
pt-BR mantem LGPD pura sem RGPD; en-US neutro (lei brasileira, sem
siglas); Terms com foro Osasco/SP nos 3 locales (lei regente Brasil).
(3) CTRL+K (T246): handler ja aceitava ctrlKey||metaKey; adicionado
case-insensitive ('K' caps), guarda de nao-disparar com foco em input/
textarea/contentEditable, e hint por plataforma (⌘ K no Mac, Ctrl K no
Windows/Linux).
TESTES: ctrlk.spec.tsx (4), site-config.spec atualizado (simbolos por
locale), rgpd-locale.spec.ts (6). Web 281/281, tsc + build exit 0.
OPERADOR: preencher placeholder de representante/DPO na UE no es-ES
quando aplicavel (secao 1 da privacy es-ES).

## D-251 fechamento da auditoria: UI/i18n, rotas, juridico (T249-T251)
T249 (C1+C2+M3): o rotulo principal do botao da watchlist usava
interaction.addStatus generico ('Quero consumir'/'Want to consume'/
'Quiero consumir') — agora usa statusLabelKey(mediaType,
'QUERO_CONSUMIR') que resolve por tipo (Quero Jogar/Ver/Ler, 3 locales);
checkout page tinha beneficios hardcoded PT -> chaves i18n; CatalogFilters
'Filtro avancado'/'Ano'/'Genero' etc. -> chaves catalogFilters; es-ES
catalog.cast 'Elenco' -> 'Reparto'.
T251 (C3): colisao de slug real (Berserk MANGA e SERIE, Duna LIVRO e
FILME com o mesmo slug) — /media/duna-livro e /media/berserk-manga davam
404 porque o sufixo de tipo nao era suportado. CORRECAO: parseSlugDiscriminado
(common/slugify.ts) — slug '{slug}-{tipo}' (filme/serie/game/livro/comic/
manga/hq) filtra por tipo na resolucao; slugs puros continuam resolvendo o
primeiro (compatibilidade com URLs indexadas). Validado em docker: 6
variantes de slug retornam o tipo correto. 9 testes unitarios do parser.
T250 (I1-I4): privacy ganhou secoes 9-12 nos 3 locales — transferencias
internacionais (safeguards: contratos/subprocessadores/criptografia),
autoridade de protecao (ANPD pt, AEPD es, FTC en), direito de reclamar,
disclaimer informativo; es-ES tem secao de representante na UE (art.
27.2.a com placeholder). 6 testes privacy-compliance.
Web 297/297, API tests 34/34, tsc + builds exit 0.

## D-252 auditoria de producao automatizada (T252)
Playwright + curl contra producao (3 locales x paginas publicas), relatorio
em docs/AUDITORIA-PRODUCAO-2026-08.md + screenshots em docs/auditoria/.
REGISSAO DO DEPLOY d4ba1f8: tudo verde em producao — /media/duna-livro e
/berserk-manga 200 (T251); ficha game com botao (T249); pricing simbolo por
locale R$/$/€ + toggle mes/ano (T247); privacy 12 secoes (T248/T250);
?type=movie/manga/book = 12/1/1 cards; home 20 imgs; nav traduzida.
UNICO ACHADO REAL: LockedComingSoonCard (home secoes Livros/Quadrinhos/
Mangas) com rotulos PT hardcoded em EN/ES — 'Livros'/'HQs & Mangas'/
'Romances' — confirma o T241 pendente (corrigir via i18n). FALSOS
POSITIVOS descartados: nav es-ES 'Catalogo'/'Entrar' (chaves ES legitimas,
palavras identicas PT/ES); catalog-movie=0 e home-imgs=0 (timing RSC, diag
confirmou 12 cards/20 imgs); request-failed ?_rsc (aborts RSC normais);
console 401 /auth/me e /watchlist (esperados p/ anonimo). LIÇAO: checklist
de i18n deve excluir termos PT/ES compartilhados para evitar falsos
positivos.
 Faixa 'em alta' com titulo_original em
EN/ES: depende de expor titulo_original no discover (API change) —
deixado como melhoria futura documentada; titleForLocale já cobre via
SEED_I18N para os títulos mapeados.

## D-246 seed-posters: OAuth Twitch exigia POST, seed usava GET (T236)
Check booleano do Operador (twitch: true, gbooks: true) provou que as
chaves EXISTEM no env do Railway — o seed-posters reportava 'sem
TWITCH_CLIENT_ID/SECRET' por OUTRA causa. CAUSA RAIZ: o fluxo OAuth do
Twitch exige POST form-urlencoded com header accept: application/json; o
seed usava getJson (GET) no endpoint de token → o token nunca era emitido
mesmo com chaves válidas (o adapter real do app usa postJson). CORRECAO:
novo postForm no seed-posters (POST + body form-urlencoded + accept),
usado no obterTokenTwitch; warn agora DISTINGUE 'chaves ausentes' de
'OAuth falhou (credenciais presentes, token não emitido)' — o diagnóstico
anterior confundia os dois. Log de presença de chaves (booleanos, nunca
valores) no resumo do seed. Testes: caso de sucesso agora assere method
POST + body com grant_type (mock); caso 401 do token → null graceful.
Validado em docker com chaves fake: env twitch=true e warn correto
(OAuth falhou, não 'sem chaves'). API 661+ testes, tsc exit 0. Operador
deve re-rodar npm run db:seed:posters no Console (env real) — resumo deve
mostrar preenchidos>0 para GAME.



## D-253 auditoria de fichas (6 tipos x 3 locales): manga breadcrumb + generos compostos
Auditoria Playwright das 6 fichas (filme/serie/game/livro/HQ/manga) x 3
locales. ACHADOS CORRIGIDOS: (1) breadcrumb do MANGA (Berserk) mostrava
'Livros' � o tipoLabel do MediaDetailClient nao tinha caso 'manga',
caindo em t('livro'); adicionado caso manga (Mangas/Manga/Manga). (2)
generos compostos ('Acao e Aventura', 'Animacao e Aventura') retornavam
label PT em EN/ES � slug 'acaoeaventura'/'animacaoeaventura' sem chave no
namespace genres; adicionadas 6 chaves compostas x 3 locales. CONFIRMADOS
OK: rotulo por tipo (Quero jogar/ver/ler), abas traduzidas (Synopsis/
Cast/Reviews/Metadata), Share, cross-midia (Duna livro -> Duna: Parte
Dois), footer/banner cookies. DIVIDA conhecida (D-248): sinopse em PT nas
fichas EN/ES (dados TMDB gravados so em pt-BR; exigiria re-coleta
multi-idioma, nao e bug de UI); game (Terraria) e manga (Berserk) sem
poster (imagem_url vazio � T245 pendente, credencial IGDB/Jikan). TESTES:
fichas-auditoria.spec.ts (4). Web 301/301, tsc + build exit 0.
