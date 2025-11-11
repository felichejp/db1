-- Tabla: student
DROP TABLE IF EXISTS student CASCADE;

CREATE TABLE student (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(50)  NOT NULL,
  last_name   VARCHAR(50)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  phone       VARCHAR(20),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE student IS 'Catálogo de estudiantes';
COMMENT ON COLUMN student.email IS 'Correo único del estudiante';
