-- Tabla: advisor 
DROP TABLE IF EXISTS advisor CASCADE;

CREATE TABLE advisor (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(80)  NOT NULL,
  email      VARCHAR(120) UNIQUE,
  office     VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE advisor IS 'Asesores/Profesores responsables de clases';
