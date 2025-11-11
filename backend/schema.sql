
-- Tabla: student (alumno)

CREATE TABLE IF NOT EXISTS student (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula         VARCHAR(16)  NOT NULL,            -- identificador escolar
  nombre            VARCHAR(64)  NOT NULL,
  primer_apellido   VARCHAR(64)  NOT NULL,
  segundo_apellido  VARCHAR(64)  NULL,
  email             VARCHAR(128) NULL,                -- puede ser NULL; UNIQUE si existe
  telefono          VARCHAR(20)  NULL,                -- teléfono de contacto
  whatsapp          VARCHAR(20)  NULL,                -- número con WhatsApp (opcional)
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_student_matricula (matricula),
  UNIQUE KEY uq_student_email     (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: advisor (asesor)

CREATE TABLE IF NOT EXISTS advisor (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave             VARCHAR(16)  NOT NULL,            -- clave interna del asesor (evita reutilizar 'matricula')
  nombre            VARCHAR(64)  NOT NULL,
  primer_apellido   VARCHAR(64)  NOT NULL,
  segundo_apellido  VARCHAR(64)  NULL,
  carrera           VARCHAR(64)  NULL,                -- programa/departamento
  email             VARCHAR(128) NULL,
  telefono          VARCHAR(20)  NULL,
  whatsapp          VARCHAR(20)  NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_advisor_clave (clave),
  UNIQUE KEY uq_advisor_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Tabla: class (clase)

CREATE TABLE IF NOT EXISTS class (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(64)  NOT NULL,
  horario           VARCHAR(64)  NULL,                -- formato libre; si luego necesitas normalizar, se separa
  advisor_id        BIGINT UNSIGNED NOT NULL,         -- FK al asesor responsable
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX  idx_class_advisor_id (advisor_id),
  CONSTRAINT fk_class_advisor
    FOREIGN KEY (advisor_id) REFERENCES advisor(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
