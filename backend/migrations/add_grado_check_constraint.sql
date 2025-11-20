-- =====================================================
-- Migración: Agregar restricción CHECK para grado máximo 10
-- Fecha: 2024
-- Descripción: Limita el grado a valores entre 1 y 10
-- =====================================================

-- Eliminar restricción si existe
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_grado_check;

-- Agregar nueva restricción CHECK para grado (1-10)
ALTER TABLE users ADD CONSTRAINT users_grado_check 
  CHECK (grado IS NULL OR (grado >= 1 AND grado <= 10));

-- Verificar si hay registros con grado inválido (mayor a 10)
-- NOTA: Si hay registros con grado > 10, necesitarás actualizarlos primero:
-- UPDATE users SET grado = NULL WHERE grado > 10;
-- o
-- UPDATE users SET grado = 10 WHERE grado > 10;

