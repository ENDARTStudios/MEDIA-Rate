
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


