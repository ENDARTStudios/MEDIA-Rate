-- T195: popula gêneros do Baldur's Gate 3 (fix de dado — auditoria 4).
-- Idempotente: ON CONFLICT garante re-execução segura.

INSERT INTO genero (nome, slug)
VALUES
  ('RPG', 'rpg'),
  ('Fantasia', 'fantasia'),
  ('Aventura', 'aventura')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO midia_genero (midia_id, genero_id)
SELECT m.id, g.id
FROM midia m
JOIN genero g ON g.slug IN ('rpg', 'fantasia', 'aventura')
WHERE m.titulo = 'Baldur''s Gate 3'
  AND NOT EXISTS (
    SELECT 1 FROM midia_genero mg
    WHERE mg.midia_id = m.id AND mg.genero_id = g.id
  );
