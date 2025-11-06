-- ============================================
-- Esquema de Base de Datos
-- Sistema de Asesorías entre Pares Universitarios
-- ============================================

-- Tabla de leads (contactos/usuarios)
CREATE TABLE IF NOT EXISTS lead (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(50) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de contraseñas de leads
CREATE TABLE IF NOT EXISTS "leadPassword" (
    id SERIAL PRIMARY KEY,
    "idLead" INTEGER NOT NULL REFERENCES lead(id) ON DELETE CASCADE,
    password VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de códigos de verificación
CREATE TABLE IF NOT EXISTS "codeLead" (
    id SERIAL PRIMARY KEY,
    "idLead" INTEGER NOT NULL REFERENCES lead(id) ON DELETE CASCADE,
    code VARCHAR(5) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_lead_phone ON lead(phone);
CREATE INDEX IF NOT EXISTS idx_lead_password_id ON "leadPassword"("idLead");
CREATE INDEX IF NOT EXISTS idx_code_lead_id ON "codeLead"("idLead");
CREATE INDEX IF NOT EXISTS idx_code_lead_code ON "codeLead"(code);

-- Comentarios para documentación
COMMENT ON TABLE lead IS 'Almacena información de contactos/usuarios del sistema';
COMMENT ON TABLE "leadPassword" IS 'Almacena contraseñas hasheadas de los leads';
COMMENT ON TABLE "codeLead" IS 'Almacena códigos de verificación por WhatsApp';

