#!/bin/bash

# ==============================================================================
# reset-tags-and-gh-pages.sh
# Script para limpiar tags viejos y la rama gh-pages antes de migrar a SemVer
# Esto permite empezar de cero con versionado semántico (v1.0.0, v1.1.0, etc.)
# ==============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         🧹 CLEANUP: Reset Tags & GitHub Pages                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Listar y confirmar los tags viejos a eliminar
# ─────────────────────────────────────────────────────────────────────────────

echo "📋 Tags actuales (formato viejo v*.0 o vX.0):"
echo ""
git tag --list 'v*' --sort=-version:refname | head -20 || echo "   (Sin tags)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Confirmar que el usuario desea continuar
# ─────────────────────────────────────────────────────────────────────────────

echo "⚠️  ADVERTENCIA: Este script eliminará TODOS los tags viejos."
echo "   Esta acción NO se puede deshacer."
echo ""
read -p "¿Deseas continuar? (sí/no): " confirm

if [[ "$confirm" != "sí" && "$confirm" != "si" && "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Operación cancelada."
    exit 0
fi

echo ""
echo "🗑️  Eliminando tags viejos..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Eliminar tags viejos localmente
# ─────────────────────────────────────────────────────────────────────────────

# Generar lista dinámica de tags a eliminar
OLD_TAGS=$(git tag --list 'v[0-9]*' --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]?$' || true)

if [ -z "$OLD_TAGS" ]; then
    echo "ℹ️  No se encontraron tags con formato viejo (v*.0)"
else
    echo "📍 Eliminando localmente:"
    for tag in $OLD_TAGS; do
        echo "   - Eliminando $tag (local)"
        git tag -d "$tag" 2>/dev/null || true
    done
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 4: Eliminar tags viejos del remoto (GitHub)
# ─────────────────────────────────────────────────────────────────────────────

if [ -z "$OLD_TAGS" ]; then
    echo "ℹ️  No hay tags remotos para eliminar"
else
    echo "☁️  Eliminando del remoto (origin):"
    for tag in $OLD_TAGS; do
        echo "   - Eliminando $tag (remoto)"
        git push origin ":$tag" 2>/dev/null || git push --delete origin "$tag" 2>/dev/null || true
    done
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Cambiar a rama gh-pages
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Cambiando a rama gh-pages..."
git fetch origin gh-pages 2>/dev/null || true
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages

echo "✅ Rama gh-pages lista"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Limpiar directorios viejos de releases
# ─────────────────────────────────────────────────────────────────────────────

echo "🗑️  Limpiando directorios viejos en releases/..."
echo ""

if [ -d "releases" ]; then
    # Listar lo que se va a eliminar
    echo "📋 Directorios a eliminar:"
    ls releases/ | while read dir; do
        # Solo mostrar directorios que sigan el patrón viejo (v*.0 o vX)
        if [[ $dir =~ ^v[0-9]+\.?0?$ ]]; then
            echo "   - releases/$dir"
        fi
    done
    echo ""
    
    # Eliminar solo los directorios viejos
    find releases/ -maxdepth 1 -type d -name "v[0-9]*" ! -name "v[0-9]*.[0-9]*.[0-9]*" -exec rm -rf {} + 2>/dev/null || true
    
    echo "✅ Directorios viejos eliminados"
    echo ""
    echo "📋 Directorios restantes en releases/:"
    ls releases/ 2>/dev/null | sort -rV || echo "   (vacío)"
else
    echo "ℹ️  Directorio releases/ no existe"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Commit y push de la limpieza en gh-pages
# ─────────────────────────────────────────────────────────────────────────────

echo "💾 Guardando cambios en gh-pages..."

git add -A
git commit -m "cleanup: remove old versioning releases (v*.0 format), prepare for SemVer

- Deleted all v*.0 format release directories
- Repository ready for SemVer (MAJOR.MINOR.PATCH) versioning
- Next deploy will create v1.0.0 as the first SemVer release" 2>/dev/null || echo "ℹ️  No hay cambios para commit"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 8: Push a GitHub
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "☁️  Subiendo cambios a origin/gh-pages..."

git push origin gh-pages 2>/dev/null || echo "⚠️  No se pudo hacer push a gh-pages"

echo "✅ gh-pages actualizado"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 9: Volver a la rama main
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Volviendo a rama main..."

git checkout main

echo "✅ En rama main"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ CLEANUP COMPLETADO                           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📌 Cambios realizados:"
echo "   ✅ Tags viejos (v*.0) eliminados localmente"
echo "   ✅ Tags viejos eliminados de GitHub (origin)"
echo "   ✅ Rama gh-pages limpiada (releases viejos removidos)"
echo "   ✅ Commit y push realizados"
echo ""
echo "🚀 Próximo paso:"
echo "   Ejecuta: ./deploy-version.sh"
echo ""
echo "   Esto creará:"
echo "   - Versión: v1.0.0 (primer SemVer)"
echo "   - Release con pet name único"
echo "   - Tag en GitHub"
echo "   - Despliegue a GitHub Pages"
echo ""
echo "📊 Verificación:"
echo "   git tag --list                  # Ver tags (debe estar vacío)"
echo "   git checkout gh-pages           # Ver releases/ (debe estar limpio)"
echo ""
