# Guía para Conectarse a GitHub

## Repositorio: https://github.com/felichejp/db1.git

### Paso 1: Instalar Git

1. Descarga Git desde: https://git-scm.com/download/win
2. Instala Git con las opciones por defecto
3. **Reinicia PowerShell o tu terminal** después de la instalación

### Paso 2: Verificar Instalación

Abre una nueva terminal y ejecuta:
```bash
git --version
```

### Paso 3: Configurar Git (Primera vez)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@ejemplo.com"
```

### Paso 4: Conectarse al Repositorio

Tienes dos opciones:

#### Opción A: Clonar el Repositorio (Recomendado si no tienes código local)

```bash
cd "C:\Users\captu\OneDrive\Escritorio\Escuela\Base de datos"
git clone https://github.com/felichejp/db1.git
cd db1
```

#### Opción B: Inicializar Repositorio Local y Conectarlo (Si ya tienes código)

```bash
cd "C:\Users\captu\OneDrive\Escritorio\Escuela\Base de datos\Insersiondedatos18noviembre\db1-felix-proyecto"
git init
git remote add origin https://github.com/felichejp/db1.git
git branch -M main
```

### Paso 5: Ver Ramas Disponibles

```bash
git fetch origin
git branch -a
```

### Paso 6: Trabajar con Ramas

**Ver rama actual:**
```bash
git branch
```

**Cambiar a la rama main:**
```bash
git checkout main
# O
git switch main
```

**Crear una nueva rama:**
```bash
git checkout -b nombre-de-tu-rama
```

**Subir cambios a GitHub:**
```bash
git add .
git commit -m "Descripción de los cambios"
git push -u origin nombre-de-tu-rama
```

**Obtener cambios de GitHub:**
```bash
git pull origin main
```

### Comandos Útiles

- `git status` - Ver el estado de tus archivos
- `git log` - Ver el historial de commits
- `git remote -v` - Ver los remotos configurados
- `git branch -a` - Ver todas las ramas (locales y remotas)


