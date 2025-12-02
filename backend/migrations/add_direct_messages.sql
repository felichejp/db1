-- Migración: Agregar soporte para mensajes directos
-- Ejecutar este script en la base de datos para habilitar mensajes directos

-- Agregar campo recipientId (opcional, para mensajes directos)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "recipientId" INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Agregar campo readAt para marcar mensajes como leídos
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP;

-- Hacer groupId opcional (para permitir mensajes directos sin grupo)
-- Primero verificar si hay constraint NOT NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'groupId' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE messages ALTER COLUMN "groupId" DROP NOT NULL;
    END IF;
END $$;

-- Eliminar constraint anterior si existe (para evitar errores)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_message_target;

-- Agregar constraint para asegurar que un mensaje tenga groupId o recipientId
-- Solo si no existe ya
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_message_target'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT check_message_target 
        CHECK (("groupId" IS NOT NULL AND "recipientId" IS NULL) OR ("groupId" IS NULL AND "recipientId" IS NOT NULL));
    END IF;
END $$;

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages("recipientId");
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages("readAt");
CREATE INDEX IF NOT EXISTS idx_messages_direct ON messages("senderId", "recipientId", "createdAt");

