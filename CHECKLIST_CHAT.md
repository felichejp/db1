# Checklist: Verificar que el Chat Funcione

## ✅ Pasos a seguir:

### 1. Ejecutar la migración SQL
```bash
psql -U tu_usuario -d tu_base_de_datos -f db1/backend/migrations/add_direct_messages.sql
```

O desde psql:
```sql
\i db1/backend/migrations/add_direct_messages.sql
```

**IMPORTANTE:** Sin esta migración, el chat NO funcionará.

### 2. Verificar que la migración se ejecutó correctamente

Ejecuta en psql:
```sql
\d messages
```

Debes ver:
- `recipientId` (integer, nullable)
- `readAt` (timestamp, nullable)
- `groupId` debe ser nullable (no debe decir NOT NULL)

### 3. Reiniciar el servidor backend

```bash
cd db1/backend
npm run dev
# o
npm start
```

### 4. Verificar en el navegador

1. Abre la consola del navegador (F12)
2. Inicia sesión en la aplicación
3. Busca el botón de chat en la esquina inferior derecha
4. Si no aparece, revisa la consola por errores

### 5. Probar funcionalidades

- ✅ Buscar usuarios (escribe al menos 2 caracteres en el buscador)
- ✅ Iniciar conversación (click en un usuario de los resultados)
- ✅ Enviar mensaje
- ✅ Ver conversaciones en la lista izquierda

## 🔍 Si algo no funciona:

### El botón de chat no aparece:
- Verifica que estés autenticado
- Revisa la consola del navegador por errores
- Verifica que `ChatWidget.updateVisibility()` se esté llamando

### Error al cargar conversaciones:
- Verifica que la migración SQL se ejecutó
- Revisa los logs del backend
- Verifica que el endpoint `/api/messages/conversations` responda

### Error al buscar usuarios:
- Verifica que el endpoint `/api/users/search?q=...` funcione
- Revisa la consola del navegador

### Error al enviar mensajes:
- Verifica que la migración SQL se ejecutó (especialmente el campo `recipientId`)
- Revisa los logs del backend
- Verifica que el constraint `check_message_target` existe

## 📝 Notas:

- Si ya tienes mensajes en la tabla `messages` con `groupId`, estos seguirán funcionando normalmente
- Los mensajes directos requieren que `recipientId` esté presente y `groupId` sea NULL
- Los mensajes de grupo requieren que `groupId` esté presente y `recipientId` sea NULL

