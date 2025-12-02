# Migraciones de Base de Datos

## Agregar soporte para mensajes directos

Para habilitar la funcionalidad de chat directo, necesitas ejecutar la migración SQL.

### Pasos:

1. Conecta a tu base de datos PostgreSQL
2. Ejecuta el script de migración:

```bash
psql -U tu_usuario -d tu_base_de_datos -f add_direct_messages.sql
```

O desde psql:

```sql
\i add_direct_messages.sql
```

### Qué hace esta migración:

- Agrega el campo `recipientId` para mensajes directos
- Agrega el campo `readAt` para marcar mensajes como leídos
- Hace el campo `groupId` opcional (para permitir mensajes sin grupo)
- Agrega un constraint para asegurar que un mensaje tenga `groupId` o `recipientId`
- Crea índices para mejorar el rendimiento de las consultas

### Nota importante:

Si ya tienes datos en la tabla `messages`, la migración los preservará. Los mensajes existentes seguirán funcionando normalmente.

