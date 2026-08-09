
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

