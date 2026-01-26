#!/bin/bash

# ==============================================================================
# gh-remove-releases-files.sh
# Script para limpiar archivos de releases de la rama gh-pages 
# y permitir desploys desde cero
# ==============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║    🧹 CLEANUP: Remover releases de gh-pages                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Confirmar que el usuario desea continuar
# ─────────────────────────────────────────────────────────────────────────────

echo "⚠️  ADVERTENCIA: Este script:"
echo "   1. Cambiará a rama gh-pages"
echo "   2. Eliminará TODOS los archivos en releases/"
echo "   3. Realizará push a origin"
echo ""
read -p "¿Deseas continuar? (sí/no): " confirm

if [[ "$confirm" != "sí" && "$confirm" != "si" && "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Operación cancelada."
    exit 0
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Guardar rama actual y cambiar a gh-pages
# ─────────────────────────────────────────────────────────────────────────────

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "💾 Rama actual: $CURRENT_BRANCH"
echo ""

echo "🔀 Cambiando a rama gh-pages..."
if ! git fetch origin gh-pages 2>/dev/null; then
    echo "⚠️  No se pudo hacer fetch de origin/gh-pages"
fi

if ! git checkout gh-pages 2>/dev/null; then
    echo "⚠️  No se pudo cambiar a gh-pages, intentando crear rama huérfana..."
    git checkout --orphan gh-pages
fi

echo "✅ En rama gh-pages"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Limpiar directorios de releases
# ─────────────────────────────────────────────────────────────────────────────

echo "🗑️  Limpiando releases..."
echo ""

if [ -d "releases" ]; then
    # Contar archivos antes
    COUNT_BEFORE=$(find releases/ -type f 2>/dev/null | wc -l)
    echo "   Archivos encontrados: $COUNT_BEFORE"
    
    # Remover todo el contenido
    rm -rf releases/*
    
    # Verificar que está vacío
    COUNT_AFTER=$(find releases/ -type f 2>/dev/null | wc -l)
    echo "   Archivos después de limpieza: $COUNT_AFTER"
    
    if [ $COUNT_BEFORE -gt 0 ]; then
        echo "   ✅ Directorio releases/ limpiado"
    else
        echo "   ℹ️  Directorio releases/ ya estaba vacío"
    fi
else
    echo "   ⚠️  Directorio releases/ no existe"
    mkdir -p releases
    echo "   ✅ Directorio releases/ creado"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 4: Limpiar archivos generados
# ─────────────────────────────────────────────────────────────────────────────

echo "🧹 Limpiando archivos generados..."

# Remover index.html si es necesario
if [ -f "index.html" ]; then
    rm -f index.html
    echo "   ✅ Removido: index.html"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Preparar cambios para commit
# ─────────────────────────────────────────────────────────────────────────────

echo "📦 Preparando cambios..."

git add -A

# Verificar si hay cambios
if git diff-index --quiet HEAD --; then
    echo "   ℹ️  No hay cambios para hacer commit"
    echo ""
else
    echo "   ✅ Cambios detectados"
    git status --short
    echo ""
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Hacer commit (si hay cambios)
# ─────────────────────────────────────────────────────────────────────────────

echo "💾 Guardando cambios en gh-pages..."

if ! git diff-index --quiet HEAD --; then
    git commit -m "cleanup: remove all releases, prepare for fresh deployments

- Remove all files in releases/ directory
- Remove generated index.html
- Reset gh-pages for new SemVer deployments" || true
    echo "✅ Commit realizado"
else
    echo "ℹ️  No había cambios para hacer commit"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Push a GitHub
# ─────────────────────────────────────────────────────────────────────────────

echo "☁️  Subiendo cambios a origin/gh-pages..."

if git push origin gh-pages 2>&1 | tee /tmp/git_push.log; then
    echo "✅ Push realizado exitosamente"
else
    echo "⚠️  Hubo un problema con el push"
    echo "   Intenta nuevamente con: git push origin gh-pages"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Volver a la rama main
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Volviendo a rama main..."

git checkout main 2>/dev/null || git checkout -b main

echo "✅ En rama main"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 8: Volver a la rama original
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Volviendo a rama $CURRENT_BRANCH..."

if [ "$CURRENT_BRANCH" != "gh-pages" ]; then
    if ! git checkout "$CURRENT_BRANCH" 2>/dev/null; then
        echo "⚠️  No se pudo cambiar a $CURRENT_BRANCH"
        echo "   Estás en rama gh-pages. Usa: git checkout $CURRENT_BRANCH"
    else
        echo "✅ Vuelta a rama: $CURRENT_BRANCH"
    fi
else
    echo "✅ Permaneciendo en rama: gh-pages"
fi
