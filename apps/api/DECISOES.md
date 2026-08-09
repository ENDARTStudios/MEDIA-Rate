
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

