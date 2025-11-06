#!/bin/bash

# Script de configuración inicial para el proyecto de Asesorías
# Este script ayuda a configurar el entorno de desarrollo

echo "🚀 Configurando el proyecto de Asesorías..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar Node.js
echo "📦 Verificando Node.js..."
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/${NC}"
    exit 1
fi

# Verificar npm
echo "📦 Verificando npm..."
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm instalado: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm no está instalado.${NC}"
    exit 1
fi

# Verificar PostgreSQL
echo "🗄️  Verificando PostgreSQL..."
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✅ PostgreSQL instalado: $PSQL_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL no encontrado. Asegúrate de tenerlo instalado.${NC}"
fi

echo ""
echo "📥 Instalando dependencias del backend..."
cd backend
if [ ! -f "package-lock.json" ]; then
    npm install
else
    echo "Las dependencias ya están instaladas. Si necesitas reinstalar, ejecuta: npm install"
fi

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creando archivo .env para el backend..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita el archivo backend/.env con tus credenciales de PostgreSQL${NC}"
    else
        echo "DB_HOST=localhost" > .env
        echo "DB_PORT=5432" >> .env
        echo "DB_DATABASE=asesorias_db" >> .env
        echo "DB_USERNAME=postgres" >> .env
        echo "DB_PASSWORD=tu_contraseña" >> .env
        echo "BACKEND_PORT=3000" >> .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita el archivo backend/.env con tus credenciales de PostgreSQL${NC}"
    fi
else
    echo -e "${GREEN}✅ Archivo .env ya existe${NC}"
fi

cd ..

echo ""
echo "📥 Instalando dependencias del frontend..."
cd frontend
if [ ! -f "package-lock.json" ]; then
    npm install
else
    echo "Las dependencias ya están instaladas. Si necesitas reinstalar, ejecuta: npm install"
fi
cd ..

echo ""
echo -e "${GREEN}✅ Configuración inicial completada!${NC}"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. 📝 Configura la base de datos PostgreSQL:"
echo "   - Crea la base de datos: CREATE DATABASE asesorias_db;"
echo "   - Ejecuta el schema: psql -U postgres -d asesorias_db -f backend/schema.sql"
echo ""
echo "2. 🔧 Edita backend/.env con tus credenciales de PostgreSQL"
echo ""
echo "3. 🚀 Inicia el backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. 🎨 Inicia el frontend (en otra terminal):"
echo "   cd frontend && npm start"
echo ""
echo "📖 Lee INICIO.md para más detalles"



