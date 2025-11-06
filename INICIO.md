# 🚀 Guía de Inicio Rápido - Sistema de Asesorías

Esta guía te ayudará a configurar y ejecutar el proyecto desde cero.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 16 o superior) - [Descargar](https://nodejs.org/)
- **PostgreSQL** (versión 12 o superior) - [Descargar](https://www.postgresql.org/download/)
- **npm** (viene con Node.js)

## 🗄️ Paso 1: Configurar la Base de Datos

### 1.1 Crear la base de datos PostgreSQL

```bash
# Conéctate a PostgreSQL
psql -U postgres

# Crea la base de datos
CREATE DATABASE asesorias_db;

# Sal de psql
\q
```

### 1.2 Crear las tablas necesarias

Conéctate a la base de datos creada:

```bash
psql -U postgres -d asesorias_db
```

Ejecuta el siguiente SQL para crear las tablas:

```sql
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
```

## 🔧 Paso 2: Configurar el Backend

### 2.1 Instalar dependencias

```bash
cd backend
npm install
```

### 2.2 Configurar variables de entorno

Copia el archivo de ejemplo y edítalo con tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus datos de PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=asesorias_db
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña_aqui
BACKEND_PORT=3000
```

### 2.3 Ejecutar el backend

```bash
# Modo desarrollo (con recarga automática)
npm run dev

# O modo producción
npm run build
npm start
```

El backend estará disponible en `http://localhost:3000`

## 🎨 Paso 3: Configurar el Frontend

### 3.1 Instalar dependencias

En una nueva terminal:

```bash
cd frontend
npm install
```

### 3.2 Configurar variables de entorno (opcional)

El frontend por defecto se conecta al backend en `http://localhost:3000`. Si tu backend está en otro puerto, puedes crear un archivo `.env`:

```bash
BACKEND_URL=http://localhost:3000
PORT=8000
```

### 3.3 Ejecutar el frontend

```bash
# Modo desarrollo
npm run dev

# O modo producción
npm start
```

El frontend estará disponible en `http://localhost:8000`

## ✅ Verificar que todo funciona

### Verificar el Backend

Abre tu navegador o usa curl:

```bash
curl http://localhost:3000/health
```

Deberías ver una respuesta JSON con `status: "OK"`

### Verificar el Frontend

Abre tu navegador en: `http://localhost:8000`

Deberías ver la página de inicio de la aplicación.

## 📁 Estructura del Proyecto

```
db1-felix-db/
├── backend/          # Servidor API en TypeScript
│   ├── src/
│   │   ├── index.ts      # Servidor principal
│   │   ├── database.ts   # Conexión a PostgreSQL
│   │   └── struct.ts     # Interfaces TypeScript
│   └── package.json
│
├── frontend/         # Interfaz web
│   ├── public/
│   │   ├── index.html    # Página principal
│   │   ├── script.js     # Lógica del frontend
│   │   └── styles.css    # Estilos
│   ├── server.js         # Servidor Express para servir archivos estáticos
│   └── package.json
│
└── crypt/           # Utilidades de encriptación
```

## 🔍 Endpoints del Backend

- `GET /health` - Verificar estado del servidor
- `POST /api/send-code` - Enviar código de verificación
- `POST /api/verify-code` - Verificar código y registrar usuario

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"

- Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
- Verifica las credenciales en el archivo `.env`
- Asegúrate de que la base de datos existe

### Error: "Port already in use"

- Cambia el puerto en el archivo `.env` (BACKEND_PORT o PORT)
- O mata el proceso que está usando el puerto:
  ```bash
  # Para el puerto 3000
  lsof -ti:3000 | xargs kill -9
  ```

### Error: "Module not found"

- Ejecuta `npm install` en la carpeta correspondiente (backend o frontend)
- Verifica que estás en la carpeta correcta

## 📝 Notas Importantes

- El sistema de envío de WhatsApp está pendiente de implementación (marcado como TODO en el código)
- El frontend tiene un modo de desarrollo que simula respuestas si el backend no está disponible
- Las contraseñas se hashean con bcrypt antes de almacenarse

## 🎯 Próximos Pasos

1. Implementar el envío de códigos por WhatsApp
2. Completar la lógica de verificación de códigos
3. Agregar más funcionalidades según el prompt original

¡Listo! Ahora puedes empezar a desarrollar. 🚀



