
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


