# Script para conectar con el repositorio de GitHub
# Repositorio: https://github.com/felichejp/db1.git

Write-Host "=== Conectando con GitHub ===" -ForegroundColor Cyan

# Verificar si Git está instalado
try {
    $gitVersion = git --version
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala Git desde: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Después de instalar, reinicia PowerShell y ejecuta este script nuevamente." -ForegroundColor Yellow
    exit 1
}

# Verificar si estamos en un repositorio Git
$isGitRepo = Test-Path .git

if ($isGitRepo) {
    Write-Host "`nRepositorio Git encontrado en el directorio actual" -ForegroundColor Green
    
    # Verificar remotos
    $remotes = git remote -v
    if ($remotes -match "felichejp/db1") {
        Write-Host "Ya estás conectado al repositorio correcto!" -ForegroundColor Green
        Write-Host "`nRemotos configurados:" -ForegroundColor Cyan
        git remote -v
    } else {
        Write-Host "`nConfigurando remoto 'origin'..." -ForegroundColor Yellow
        git remote add origin https://github.com/felichejp/db1.git
        Write-Host "Remoto configurado correctamente!" -ForegroundColor Green
    }
} else {
    Write-Host "`nNo se encontró un repositorio Git en el directorio actual" -ForegroundColor Yellow
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Inicializar repositorio aquí (git init)" -ForegroundColor White
    Write-Host "2. Clonar el repositorio en otro directorio" -ForegroundColor White
    Write-Host "`n¿Deseas inicializar un repositorio aquí? (S/N)" -ForegroundColor Yellow
    $respuesta = Read-Host
    
    if ($respuesta -eq "S" -or $respuesta -eq "s") {
        git init
        git remote add origin https://github.com/felichejp/db1.git
        Write-Host "Repositorio inicializado y remoto configurado!" -ForegroundColor Green
    } else {
        Write-Host "Para clonar el repositorio, ejecuta:" -ForegroundColor Cyan
        Write-Host "git clone https://github.com/felichejp/db1.git" -ForegroundColor White
    }
}

# Mostrar información de ramas
Write-Host "`n=== Información de Ramas ===" -ForegroundColor Cyan
try {
    git fetch origin 2>&1 | Out-Null
    Write-Host "Ramas locales:" -ForegroundColor Yellow
    git branch
    Write-Host "`nRamas remotas:" -ForegroundColor Yellow
    git branch -r
} catch {
    Write-Host "No se pudieron obtener las ramas remotas" -ForegroundColor Yellow
}

Write-Host "`n=== Comandos Útiles ===" -ForegroundColor Cyan
Write-Host "Ver estado: git status" -ForegroundColor White
Write-Host "Ver ramas: git branch -a" -ForegroundColor White
Write-Host "Cambiar rama: git checkout nombre-rama" -ForegroundColor White
Write-Host "Subir cambios: git push origin nombre-rama" -ForegroundColor White
Write-Host "Bajar cambios: git pull origin main" -ForegroundColor White


