# 📍 Cómo Ver la Vista de Detalle de Grupo con Chat

## 🎯 Ubicación de la Vista

La vista de detalle de grupo con chat está disponible en la ruta:
```
#/groups/[ID_DEL_GRUPO]
```

Por ejemplo: `#/groups/1`, `#/groups/2`, etc.

---

## 🚀 Formas de Acceder

### **Opción 1: Desde el Dashboard** ⭐ (Más fácil)

1. **Inicia sesión** en la aplicación
2. En el **Dashboard** verás una sección con tus grupos
3. Haz clic en el botón **"Ver"** de cualquier grupo
4. Se abrirá la vista de detalle con el chat

### **Opción 2: Desde la Vista de Grupos** 📋

1. En el **menú lateral (Sidebar)**, haz clic en:
   - **"Grupos"** (si eres Admin)
   - **"Mis Grupos"** (si eres Profesor, Tutor o Estudiante)
2. Verás una tabla con todos los grupos
3. Haz clic en el botón **"Ver Detalles"** de cualquier grupo
4. Se abrirá la vista de detalle con el chat

### **Opción 3: Directamente por URL** 🔗

Escribe en la barra de direcciones:
```
http://localhost:8080/#/groups/1
```
(Reemplaza `1` con el ID del grupo que quieras ver)

---

## 🎨 Qué Verás en la Vista

La vista de detalle de grupo muestra:

### **Panel Izquierdo:**
- ✅ **Información del Grupo**
  - Nombre del grupo
  - Descripción
  - Estado (Activo, Inactivo, Completado)
  - Fecha de creación

- ✅ **Lista de Miembros**
  - Nombre de cada miembro
  - Email
  - Rol (Admin, Profesor, Tutor, Estudiante)
  - Contador: X/5 miembros

### **Panel Derecho:**
- ✅ **Chat en Tiempo Real**
  - Mensajes existentes cargados automáticamente
  - Campo de texto para escribir mensajes
  - Botón "Enviar"
  - Auto-scroll al final del chat
  - Timestamps en cada mensaje
  - Nombres de los remitentes
  - Diferenciación visual: tus mensajes aparecen a la derecha con color diferente

---

## 🔧 Requisitos para que Funcione

1. ✅ **Backend corriendo** en `http://localhost:3000`
2. ✅ **Frontend corriendo** en `http://localhost:8080`
3. ✅ **Socket.IO configurado** (se conecta automáticamente)
4. ✅ **Base de datos con grupos creados**
5. ✅ **Usuario autenticado** (debes estar logueado)

---

## 🐛 Si No Ves la Vista

### Problema: "No hay grupos disponibles"
**Solución:**
- Si eres **Profesor o Admin**: Crea un grupo desde la vista de Grupos
- Si eres **Estudiante o Tutor**: Asegúrate de estar agregado a un grupo

### Problema: "Grupo no encontrado"
**Solución:**
- Verifica que el ID del grupo sea correcto
- Asegúrate de tener permisos para ver ese grupo

### Problema: El chat no carga
**Solución:**
1. Verifica que el backend esté corriendo
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que Socket.IO se haya conectado (deberías ver "Socket.IO conectado" en la consola)

### Problema: No puedo enviar mensajes
**Solución:**
- Asegúrate de estar autenticado
- Verifica que seas miembro del grupo
- Revisa la consola del navegador para errores

---

## 📝 Notas Importantes

- El chat funciona en **tiempo real**: cuando alguien envía un mensaje, todos los miembros del grupo lo ven instantáneamente
- Los mensajes se guardan en la base de datos
- Solo los miembros del grupo pueden ver y enviar mensajes
- El chat se actualiza automáticamente cuando recibes nuevos mensajes vía WebSocket

---

## 🎬 Flujo Completo de Uso

1. **Inicia sesión** → `#/login`
2. **Ve al Dashboard** → `#/dashboard`
3. **Haz clic en "Grupos"** en el menú lateral
4. **Haz clic en "Ver Detalles"** de cualquier grupo
5. **¡Listo!** Ya puedes ver el chat y enviar mensajes

---

## 💡 Tips

- Puedes abrir la misma vista en múltiples pestañas para probar el chat en tiempo real
- Los mensajes propios aparecen a la derecha con un color diferente
- El chat hace scroll automático cuando recibes nuevos mensajes
- Puedes usar el botón "← Volver" para regresar a la lista de grupos

