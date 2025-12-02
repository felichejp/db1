# Script para guardar cambios y crear tu propia rama basada en la del profesor
# IMPORTANTE: Este script NO modifica la rama del profesor, crea tu propia rama
# Ejecuta este script desde PowerShell en la carpeta del proyecto

Write-Host "=== Guardando cambios y creando tu rama personal ===" -ForegroundColor Cyan
Write-Host "IMPORTANTE: No se modificará la rama del profesor" -ForegroundColor Yellow

# Paso 1: Verificar estado actual
Write-Host "`n1. Verificando estado actual..." -ForegroundColor Yellow
$status = git status --short
if ($status) {
    Write-Host "Cambios detectados:" -ForegroundColor Green
    git status --short
} else {
    Write-Host "No hay cambios sin guardar" -ForegroundColor Yellow
}

# Paso 2: Ver rama actual
Write-Host "`n2. Rama actual:" -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Estás en la rama: $currentBranch" -ForegroundColor Cyan

# Paso 3: Guardar cambios (commit)
Write-Host "`n3. Guardando cambios en la rama actual..." -ForegroundColor Yellow
git add .
$commitMessage = "Limitar grado a máximo 10"
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Cambios guardados exitosamente" -ForegroundColor Green
} else {
    Write-Host "⚠ No se pudieron guardar los cambios (puede que no haya cambios nuevos)" -ForegroundColor Yellow
}

# Paso 4: Verificar si existe la rama de pedro (del profesor)
Write-Host "`n4. Verificando ramas disponibles..." -ForegroundColor Yellow
git fetch origin 2>&1 | Out-Null
$branches = git branch -a
$pedroBranch = $branches | Select-String -Pattern "pedro"

if ($pedroBranch) {
    Write-Host "Rama del profesor encontrada:" -ForegroundColor Green
    $pedroBranch | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
    
    # Obtener el nombre exacto de la rama del profesor
    $pedroBranchName = ""
    if ($pedroBranch -match "remotes/origin/(pedro.*)") {
        $pedroBranchName = $matches[1]
    } else {
        $pedroBranchName = ($pedroBranch -split '/')[-1].Trim()
    }
    
    Write-Host "`n5. Creando TU PROPIA rama basada en la del profesor..." -ForegroundColor Yellow
    Write-Host "Esto NO modificará la rama del profesor" -ForegroundColor Cyan
    
    # Pedir nombre para la rama personal
    Write-Host "`n¿Cómo quieres llamar a tu rama?" -ForegroundColor Cyan
    Write-Host "Ejemplos: tu-nombre/pedro, mi-rama, cambios-grado, etc." -ForegroundColor Gray
    $miRama = Read-Host "Nombre de tu rama"
    
    if ([string]::IsNullOrWhiteSpace($miRama)) {
        $miRama = "mi-rama-pedro"
        Write-Host "Usando nombre por defecto: $miRama" -ForegroundColor Yellow
    }
    
    # Crear rama local basada en la rama remota del profesor
    Write-Host "`nCreando rama '$miRama' basada en '$pedroBranchName'..." -ForegroundColor Yellow
    git checkout -b $miRama origin/$pedroBranchName
    
    if ($LASTEXITCODE -ne 0) {
        # Si falla, intentar crear desde la rama local si existe
        Write-Host "Intentando crear desde rama local..." -ForegroundColor Yellow
        git checkout $pedroBranchName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            git checkout -b $miRama
        } else {
            Write-Host "✗ Error: No se pudo acceder a la rama del profesor" -ForegroundColor Red
            Write-Host "Los cambios están guardados en: $currentBranch" -ForegroundColor Yellow
            exit 1
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Tu rama '$miRama' creada y activada" -ForegroundColor Green
        
        # Paso 5: Aplicar los cambios de la rama anterior (felix/proyecto)
        Write-Host "`n6. Aplicando tus cambios de '$currentBranch' a '$miRama'..." -ForegroundColor Yellow
        git merge $currentBranch
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Tus cambios aplicados exitosamente en tu rama personal" -ForegroundColor Green
            Write-Host "`nIMPORTANTE: La rama del profesor NO fue modificada" -ForegroundColor Green
            Write-Host "Tus cambios están solo en tu rama: $miRama" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ Hubo conflictos al hacer merge. Revísalos manualmente." -ForegroundColor Red
        }
    }
} else {
    Write-Host "No se encontró una rama de pedro del profesor." -ForegroundColor Yellow
    Write-Host "`n¿Quieres crear tu propia rama con los cambios actuales? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "`n¿Cómo quieres llamar a tu rama?" -ForegroundColor Cyan
        $miRama = Read-Host "Nombre de tu rama"
        
        if ([string]::IsNullOrWhiteSpace($miRama)) {
            $miRama = "mi-rama"
        }
        
        Write-Host "Creando nueva rama '$miRama'..." -ForegroundColor Yellow
        git checkout -b $miRama
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Nueva rama '$miRama' creada y activada" -ForegroundColor Green
            Write-Host "Los cambios ya están en esta rama" -ForegroundColor Green
        }
    } else {
        Write-Host "Operación cancelada. Los cambios están guardados en: $currentBranch" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Proceso completado ===" -ForegroundColor Cyan
Write-Host "Rama actual:" -ForegroundColor Yellow
git branch --show-current

Write-Host "`n=== Resumen ===" -ForegroundColor Cyan
Write-Host "✓ Tus cambios están guardados en tu rama personal" -ForegroundColor Green
Write-Host "✓ La rama del profesor NO fue modificada" -ForegroundColor Green
Write-Host "`nPara subir tus cambios a GitHub (en tu rama):" -ForegroundColor Yellow
Write-Host "  git push -u origin $(git branch --show-current)" -ForegroundColor White

