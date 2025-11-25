-- Migración para agregar soporte de mensajes privados
-- Hacer groupId nullable y agregar recipientId

-- Primero, eliminar la restricción NOT NULL de groupId
ALTER TABLE messages ALTER COLUMN "groupId" DROP NOT NULL;

-- Agregar columna recipientId para mensajes privados
ALTER TABLE messages ADD COLUMN "recipientId" INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Agregar índice para búsquedas por recipientId
CREATE INDEX idx_messages_recipient ON messages("recipientId");

-- Agregar constraint para asegurar que un mensaje tenga groupId O recipientId (pero no ambos)
ALTER TABLE messages ADD CONSTRAINT check_message_type 
  CHECK (
    ("groupId" IS NOT NULL AND "recipientId" IS NULL) OR 
    ("groupId" IS NULL AND "recipientId" IS NOT NULL)
  );

-- Agregar índice compuesto para búsquedas de conversaciones
CREATE INDEX idx_messages_conversation ON messages(
  LEAST("senderId", "recipientId"), 
  GREATEST("senderId", "recipientId")
) WHERE "recipientId" IS NOT NULL;

