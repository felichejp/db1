# Sistema de Asesorías entre Pares

Sistema completo de gestión de asesorías entre estudiantes, desarrollado con TypeScript (backend) y vanilla JavaScript (frontend).

## Estructura del Proyecto

```
inicio/
├── backend/          # Backend TypeScript + Express
├── frontend/         # Frontend vanilla JavaScript (SPA)
└── database_schema.sql  # Esquema de base de datos PostgreSQL
```

## Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## Instalación

### Backend

1. Navegar a la carpeta backend:
```bash
cd inicio/backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=tu-clave-secreta-minimo-32-caracteres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=peer_tutoring_db
DB_USER=postgres
DB_PASSWORD=tu_password
CORS_ORIGIN=http://localhost:8080
```

4. Crear la base de datos:
```bash
createdb peer_tutoring_db
```

5. Ejecutar el esquema SQL:
```bash
psql -U postgres -d peer_tutoring_db -f ../database_schema.sql
```

6. Iniciar el servidor en desarrollo:
```bash
npm run dev
```

O compilar y ejecutar en producción:
```bash
npm run build
npm start
```

### Frontend

1. Navegar a la carpeta frontend:
```bash
cd inicio/frontend
```

2. El frontend no requiere instalación de dependencias (usa CDN para axios y socket.io).

3. Servir los archivos estáticos. Puedes usar cualquier servidor HTTP:

**Opción 1: Python**
```bash
python3 -m http.server 8080
```

**Opción 2: Node.js (http-server)**
```bash
npx http-server -p 8080
```

**Opción 3: VS Code Live Server**
- Instalar extensión "Live Server"
- Click derecho en `index.html` > "Open with Live Server"

4. Abrir en el navegador:
```
http://localhost:8080
```

## Configuración

### Variables de Entorno del Backend

- `NODE_ENV`: Entorno (development/production)
- `PORT`: Puerto del servidor (default: 3000)
- `JWT_SECRET`: Clave secreta para JWT (mínimo 32 caracteres)
- `DB_HOST`: Host de PostgreSQL
- `DB_PORT`: Puerto de PostgreSQL
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de PostgreSQL
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `CORS_ORIGIN`: Origen permitido para CORS
- `AWS_ACCESS_KEY_ID`: (Opcional) Para S3
- `AWS_SECRET_ACCESS_KEY`: (Opcional) Para S3
- `AWS_REGION`: (Opcional) Región de S3
- `S3_BUCKET_NAME`: (Opcional) Nombre del bucket S3
- `SOCKET_IO_PATH`: Path para Socket.IO (default: /socket.io)

### Configuración del Frontend

Editar `js/main.js` para cambiar:
- `window.API_BASE_URL`: URL del backend (default: http://localhost:3000)
- `window.SOCKET_IO_PATH`: Path de Socket.IO (default: /socket.io)

## Uso

### Roles del Sistema

- **Admin**: Acceso completo al sistema
- **Profesor**: Gestiona grupos y sesiones
- **Tutor**: Proporciona asesorías a grupos
- **Estudiante**: Recibe asesorías

### Flujo Principal

1. **Registro/Login**: Los usuarios se registran o inician sesión
2. **Dashboard**: Cada rol ve su dashboard personalizado
3. **Grupos**: Los profesores crean grupos (máximo 5 estudiantes)
4. **Sesiones**: Se programan sesiones de asesoría
5. **Matching**: Sistema empareja tutores con grupos según criterios
6. **Comunicación**: Mensajería en tiempo real vía Socket.IO
7. **Evaluaciones**: Estudiantes y profesores evalúan las sesiones

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual
- `GET /api/auth/verify` - Verificar token

### Grupos
- `GET /api/groups` - Listar grupos
- `POST /api/groups` - Crear grupo
- `GET /api/groups/:id` - Obtener grupo
- `PUT /api/groups/:id` - Actualizar grupo
- `DELETE /api/groups/:id` - Eliminar grupo

### Sesiones
- `GET /api/sessions` - Listar sesiones
- `POST /api/sessions` - Crear sesión
- `PUT /api/sessions/:id/start` - Iniciar sesión
- `PUT /api/sessions/:id/complete` - Completar sesión

Ver `promptFull.txt` para la lista completa de endpoints.

## Desarrollo

### Backend

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar tests
npm test

# Cobertura de tests
npm run test:coverage
```

### Frontend

El frontend es vanilla JavaScript, no requiere compilación. Los cambios se reflejan al recargar el navegador.

## Testing

Los tests están configurados con Jest y ts-jest. Ejecutar:

```bash
cd backend
npm test
```

## Estructura de Archivos

### Backend
- `server.ts` - Punto de entrada
- `config/` - Configuración (database, socket, s3)
- `controllers/` - Lógica de negocio
- `routes/` - Definición de rutas
- `middleware/` - Middlewares (auth, validation, etc.)
- `utils/` - Utilidades (JWT, password, logger, matching)
- `types/` - Tipos TypeScript

### Frontend
- `index.html` - HTML principal
- `css/` - Estilos (theme, main, components)
- `js/` - JavaScript
  - `main.js` - Punto de entrada
  - `router.js` - Sistema de routing
  - `api/` - Clientes API
  - `services/` - Servicios (auth, socket, storage)
  - `utils/` - Utilidades
  - `components/` - Componentes reutilizables
  - `views/` - Vistas de la aplicación

## Notas Importantes

1. **Base de Datos**: Las funciones de acceso a BD están implementadas en los controllers usando `query()` de `config/database.ts`. Las queries SQL están directamente en los controllers según las especificaciones.

2. **S3**: La configuración de S3 es opcional. Si no se configura, las funciones de archivos retornarán errores.

3. **Socket.IO**: Se conecta automáticamente al iniciar sesión. Los eventos se manejan en `main.js`.

4. **Seguridad**: 
   - JWT tokens con expiración de 7 días
   - Rate limiting configurado
   - Validación de datos con express-validator
   - CORS configurado

## Próximos Pasos

1. Implementar las vistas faltantes (GroupsView, SessionsView, ProfileView, AdminView, etc.)
2. Completar el algoritmo de matching en `utils/matching.ts`
3. Agregar más tests
4. Configurar S3 para almacenamiento de archivos
5. Implementar notificaciones por email (opcional)

## Licencia

ISC

