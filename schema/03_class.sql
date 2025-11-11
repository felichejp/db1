-- Tabla: class 
DROP TABLE IF EXISTS class CASCADE;

CREATE TABLE class (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(16)  NOT NULL UNIQUE,  -- p.ej. INF-101
  title       VARCHAR(120) NOT NULL,
  credits     SMALLINT     NOT NULL CHECK (credits BETWEEN 1 AND 10),
  advisor_id  INTEGER      REFERENCES advisor(id)
                           ON UPDATE CASCADE
                           ON DELETE SET NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE class IS 'Catálogo de clases/materias';
COMMENT ON COLUMN class.code IS 'Código único de la clase';
