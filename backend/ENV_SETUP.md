# Configuración del archivo .env

## Ubicación
El archivo `.env` debe estar en: `BASES_DE_DATOS/db1/db1/backend/.env`

## Contenido requerido

Copia y pega esto en tu archivo `.env` y reemplaza los valores con tus credenciales reales:

```env
# ============================================
# CONFIGURACIÓN DE BASE DE DATOS POSTGRESQL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=peer_tutoring_db
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_DE_POSTGRESQL_AQUI

# ============================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080

# ============================================
# JWT SECRET (IMPORTANTE: Cambiar en producción)
# ============================================
JWT_SECRET=tu_jwt_secret_super_seguro_minimo_32_caracteres_cambiar_en_produccion_123456789

# ============================================
# SOCKET.IO
# ============================================
SOCKET_IO_PATH=/socket.io

# ============================================
# AWS S3 (Opcional - para almacenamiento de archivos)
# ============================================
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
```

## Pasos para configurar

### 1. Crear el archivo .env
Si no existe, créalo en la carpeta `backend/`:
- Windows: Crea un nuevo archivo de texto llamado `.env` (sin extensión)
- Asegúrate de que no se llame `.env.txt`

### 2. Configurar la contraseña de PostgreSQL
Reemplaza `TU_CONTRASEÑA_DE_POSTGRESQL_AQUI` con tu contraseña real de PostgreSQL.

**Para encontrar tu contraseña:**
- Es la contraseña que configuraste al instalar PostgreSQL
- O la que usas cuando te conectas con `psql -U postgres`
- O la que usas en pgAdmin

### 3. Verificar la configuración
Ejecuta el script de prueba:
```bash
cd BASES_DE_DATOS/db1/db1/backend
npm run test:db
```

Este script te dirá si:
- ✅ El archivo .env está configurado
- ✅ La contraseña es correcta
- ✅ La base de datos existe
- ✅ Las tablas están creadas

### 4. Si la base de datos no existe

**Crear la base de datos:**
```bash
createdb -U postgres peer_tutoring_db
```

**O con psql:**
```bash
psql -U postgres
CREATE DATABASE peer_tutoring_db;
\q
```

**Ejecutar el esquema SQL:**
```bash
cd BASES_DE_DATOS/db1/db1
psql -U postgres -d peer_tutoring_db -f database_schema.sql
```

## Solución de problemas

### Error: "password authentication failed"
- Verifica que `DB_PASSWORD` en el `.env` sea correcta
- Prueba conectarte manualmente: `psql -U postgres`
- Si no recuerdas la contraseña, puedes resetearla en PostgreSQL

### Error: "database does not exist"
- Crea la base de datos con: `createdb -U postgres peer_tutoring_db`
- O ejecuta: `psql -U postgres -c "CREATE DATABASE peer_tutoring_db;"`

### Error: "connection refused"
- Verifica que PostgreSQL esté corriendo
- En Windows: Servicios > Busca "PostgreSQL" > Iniciar
- Verifica que `DB_HOST` y `DB_PORT` sean correctos

## Notas importantes

1. **NUNCA** subas el archivo `.env` a Git (ya está en .gitignore)
2. **CAMBIA** el `JWT_SECRET` en producción por uno seguro y aleatorio
3. El archivo `.env` debe estar en la misma carpeta que `server.ts`
4. Después de modificar el `.env`, reinicia el servidor


