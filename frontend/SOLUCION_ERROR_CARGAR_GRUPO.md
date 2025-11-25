# 🔧 Solución: Error al Cargar Datos del Grupo

## 🔍 Diagnóstico del Error

Si ves el mensaje **"Error al cargar datos del grupo"**, sigue estos pasos para identificar y solucionar el problema:

---

## ✅ Checklist de Verificación

### 1. **Verificar que el Backend esté Corriendo**

Abre la consola del navegador (F12) y revisa:

**Si ves errores de red (CORS, conexión rechazada):**
```
❌ Error: Network Error
❌ Error: Failed to fetch
❌ CORS policy error
```

**Solución:**
```bash
# Asegúrate de que el backend esté corriendo
cd BASES_DE_DATOS/db1/db1/backend
npm run dev
```

Deberías ver:
```
✅ Servidor corriendo en puerto 3000
✅ Conexión a PostgreSQL establecida
```

---

### 2. **Verificar la URL del Backend**

En la consola del navegador, verifica que las peticiones vayan a:
```
http://localhost:3000/api/groups/[ID]
```

**Si la URL es incorrecta:**
- Abre `js/main.js`
- Verifica que `window.API_BASE_URL` esté configurado correctamente

---

### 3. **Verificar que el Grupo Exista**

**En la consola del navegador, busca:**
```
GET http://localhost:3000/api/groups/1 404 (Not Found)
```

**Solución:**
- El grupo con ese ID no existe
- Crea un grupo nuevo desde la vista de Grupos
- O verifica que el ID en la URL sea correcto

---

### 4. **Verificar Autenticación**

**En la consola del navegador, busca:**
```
GET http://localhost:3000/api/groups/1 401 (Unauthorized)
```

**Solución:**
- Tu sesión expiró
- Cierra sesión y vuelve a iniciar sesión
- Verifica que el token JWT sea válido

---

### 5. **Verificar Permisos**

**Si eres Estudiante o Tutor:**
- Solo puedes ver grupos donde eres miembro
- Si no eres miembro, verás "Grupo no encontrado"

**Solución:**
- Pide al Profesor o Admin que te agregue al grupo
- O crea un nuevo grupo si eres Profesor/Admin

---

### 6. **Verificar la Base de Datos**

**Si el backend muestra errores de PostgreSQL:**
```
❌ Error: password authentication failed
❌ Error: database does not exist
```

**Solución:**
1. Verifica el archivo `.env` en `backend/.env`
2. Asegúrate de que las credenciales sean correctas
3. Verifica que la base de datos exista:
   ```bash
   psql -U postgres -l | grep peer_tutoring_db
   ```

---

## 🛠️ Pasos de Solución Rápida

### **Paso 1: Abrir la Consola del Navegador**
1. Presiona `F12` o `Ctrl+Shift+I`
2. Ve a la pestaña **"Console"**
3. Ve a la pestaña **"Network"** (Red)

### **Paso 2: Intentar Cargar el Grupo**
1. Intenta abrir un grupo
2. Observa los errores en la consola
3. Observa las peticiones en la pestaña Network

### **Paso 3: Identificar el Error Específico**

**Copia el mensaje de error completo** y busca aquí:

#### **Error: "Network Error" o "Failed to fetch"**
- ✅ Backend no está corriendo
- ✅ URL incorrecta
- ✅ Problema de CORS

**Solución:**
```bash
# Iniciar backend
cd BASES_DE_DATOS/db1/db1/backend
npm run dev
```

#### **Error: 404 Not Found**
- ✅ El grupo no existe
- ✅ La ruta del API es incorrecta

**Solución:**
- Verifica que el grupo exista en la base de datos
- Crea un nuevo grupo

#### **Error: 401 Unauthorized**
- ✅ Token expirado
- ✅ No estás autenticado

**Solución:**
- Cierra sesión y vuelve a iniciar sesión

#### **Error: 403 Forbidden**
- ✅ No tienes permisos para ver ese grupo

**Solución:**
- Verifica que seas miembro del grupo
- O que tengas permisos de Admin/Profesor

#### **Error: 500 Internal Server Error**
- ✅ Error en el servidor
- ✅ Problema con la base de datos

**Solución:**
- Revisa los logs del backend
- Verifica la conexión a la base de datos

---

## 🔬 Diagnóstico Avanzado

### **Verificar en la Consola del Navegador:**

Abre la consola (F12) y ejecuta:

```javascript
// Verificar configuración
console.log('API URL:', window.API_BASE_URL);
console.log('Usuario:', authService.getCurrentUser());
console.log('Token:', authService.getToken() ? 'Presente' : 'Ausente');

// Probar conexión manual
axios.get('http://localhost:3000/api/groups')
  .then(res => console.log('✅ Backend conectado', res))
  .catch(err => console.error('❌ Error:', err));
```

### **Verificar en el Backend:**

Revisa los logs del servidor. Deberías ver:
```
✅ Query ejecutada: SELECT * FROM groups WHERE id = $1
✅ Conexión a PostgreSQL establecida
```

Si ves errores de PostgreSQL:
- Revisa el archivo `.env`
- Ejecuta: `npm run test:db` para probar la conexión

---

## 📋 Resumen de Soluciones Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Network Error | Backend no corriendo | `npm run dev` en backend |
| 404 Not Found | Grupo no existe | Crear grupo o verificar ID |
| 401 Unauthorized | Token inválido | Cerrar sesión y volver a iniciar |
| 403 Forbidden | Sin permisos | Verificar membresía del grupo |
| 500 Error | Error del servidor | Revisar logs del backend |
| CORS Error | Configuración CORS | Verificar `CORS_ORIGIN` en `.env` |

---

## 🆘 Si Nada Funciona

1. **Reinicia todo:**
   ```bash
   # Detener backend (Ctrl+C)
   # Reiniciar backend
   cd BASES_DE_DATOS/db1/db1/backend
   npm run dev
   
   # Recargar frontend (F5)
   ```

2. **Limpia el caché:**
   - Presiona `Ctrl+Shift+R` para recargar sin caché
   - O abre en modo incógnito

3. **Verifica los logs:**
   - Consola del navegador (F12)
   - Terminal del backend
   - Logs de PostgreSQL (si aplica)

4. **Revisa la configuración:**
   - Archivo `.env` en backend
   - Variables en `js/main.js`
   - Rutas en `router.js`

---

## 💡 Tips de Prevención

- ✅ Siempre verifica que el backend esté corriendo antes de usar el frontend
- ✅ Mantén la consola del navegador abierta para ver errores
- ✅ Verifica los logs del backend regularmente
- ✅ Asegúrate de estar autenticado antes de acceder a grupos

---

## 📞 Información para Reportar el Error

Si el problema persiste, proporciona:

1. **Mensaje de error completo** de la consola
2. **Código de estado HTTP** (404, 500, etc.)
3. **URL de la petición** que falla
4. **Logs del backend** (si hay)
5. **Rol del usuario** (Admin, Profesor, Tutor, Estudiante)

