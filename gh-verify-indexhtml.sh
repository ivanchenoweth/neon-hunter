#!/bin/bash

# ==============================================================================
# verify-gh-pages-indexhtml.sh
# Script para verificar que el index.html en gh-pages corresponde correctamente
# con los directorios de releases que existen
# ==============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║       ✓ VERIFICACIÓN: index.html vs releases/ en gh-pages         ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Guardar rama actual
CURRENT_BRANCH=$(git branch --show-current)

# Cambiar a gh-pages
echo "🔀 Cambiando a rama gh-pages..."
git checkout gh-pages > /dev/null 2>&1
echo "✅ En rama gh-pages"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Obtener lista de versiones en releases/
# ─────────────────────────────────────────────────────────────────────────────

echo "📂 Escaneando directorios de releases/"
echo ""

declare -a releases_dirs
if [ -d "releases" ]; then
    for dir in releases/v[0-9]*.[0-9]*.[0-9]*; do
        if [ -d "$dir" ]; then
            version=$(basename "$dir")
            releases_dirs+=("$version")
        fi
    done
else
    echo "⚠️  Directorio releases/ no encontrado"
    git checkout "$CURRENT_BRANCH" > /dev/null 2>&1
    exit 1
fi

# Ordenar versiones
IFS=$'\n' sorted_releases=($(sort -rV <<<"${releases_dirs[*]}"))
unset IFS

if [ ${#sorted_releases[@]} -eq 0 ]; then
    echo "❌ No se encontraron versiones en releases/"
    git checkout "$CURRENT_BRANCH" > /dev/null 2>&1
    exit 1
fi

echo "📋 Versiones encontradas en releases/:"
for v in "${sorted_releases[@]}"; do
    echo "   ✓ $v"
done
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Validar contenido de cada versión
# ─────────────────────────────────────────────────────────────────────────────

echo "🔍 Validando contenido de cada versión..."
echo ""

declare -a validation_errors=()

for version in "${sorted_releases[@]}"; do
    version_dir="releases/$version"
    echo "   Verificando $version:"
    
    # Verificar que exista index.html en la versión
    if [ ! -f "$version_dir/index.html" ]; then
        echo "      ❌ Falta index.html"
        validation_errors+=("$version: Falta index.html")
    else
        echo "      ✓ index.html existe"
    fi
    
    # Verificar que exista .pet-name
    if [ ! -f "$version_dir/.pet-name" ]; then
        echo "      ⚠️  Falta .pet-name"
    else
        pet_name=$(cat "$version_dir/.pet-name")
        echo "      ✓ Pet name: $pet_name"
    fi
    
    # Verificar que existan archivos de código del juego
    game_files=("game.js" "main.js" "Player.js" "Enemy.js")
    missing_files=false
    for file in "${game_files[@]}"; do
        if [ ! -f "$version_dir/$file" ]; then
            echo "      ❌ Falta $file"
            validation_errors+=("$version: Falta $file")
            missing_files=true
        fi
    done
    
    if [ "$missing_files" = false ]; then
        echo "      ✓ Archivos de código presentes"
    fi
    
    echo ""
done

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Verificar que index.html lista todas las versiones
# ─────────────────────────────────────────────────────────────────────────────

echo "📄 Verificando index.html"
echo ""

if [ ! -f "index.html" ]; then
    echo "❌ No existe index.html"
    git checkout "$CURRENT_BRANCH" > /dev/null 2>&1
    exit 1
fi

echo "   ✓ index.html existe"
echo ""
echo "   Versiones listadas en index.html:"
echo ""

declare -a versions_in_html=()

# Extraer versiones del HTML usando grep
for version in "${sorted_releases[@]}"; do
    if grep -q "releases/$version" index.html; then
        versions_in_html+=("$version")
        echo "      ✓ $version"
    else
        echo "      ❌ $version NO está en index.html"
        validation_errors+=("$version: No está listado en index.html")
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 4: Verificar que todas las versiones en HTML existan en releases/
# ─────────────────────────────────────────────────────────────────────────────

echo "🔐 Verificando integridad referencial..."
echo ""

# Buscar referencias a releases/v*.*.* en HTML
html_versions=$(grep -oP 'releases/(v\d+\.\d+\.\d+)' index.html | cut -d/ -f2 | sort -u)

for html_version in $html_versions; do
    found=false
    for dir_version in "${sorted_releases[@]}"; do
        if [ "$html_version" = "$dir_version" ]; then
            found=true
            break
        fi
    done
    
    if [ "$found" = false ]; then
        echo "   ❌ index.html referencia $html_version pero no existe en releases/"
        validation_errors+=("index.html referencia $html_version que no existe")
    fi
done

if [ -z "$html_versions" ]; then
    echo "   ⚠️  No se encontraron referencias a releases/ en index.html"
    validation_errors+=("index.html no contiene referencias a releases/")
fi

echo "   ✓ Integridad referencial verificada"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Verificar que index.html tenga contenido HTML válido
# ─────────────────────────────────────────────────────────────────────────────

echo "📋 Validando estructura HTML..."
echo ""

# Verificar que tenga estructura básica
if grep -q "<!DOCTYPE html" index.html; then
    echo "   ✓ Declaración DOCTYPE presente"
else
    echo "   ❌ Falta declaración DOCTYPE"
    validation_errors+=("Falta DOCTYPE en index.html")
fi

if grep -q "<title>" index.html; then
    echo "   ✓ Elemento <title> presente"
else
    echo "   ❌ Falta elemento <title>"
    validation_errors+=("Falta <title> en index.html")
fi

if grep -q "<h1>" index.html; then
    echo "   ✓ Elemento <h1> presente"
else
    echo "   ❌ Falta elemento <h1>"
    validation_errors+=("Falta <h1> en index.html")
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Resumen final
# ─────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        RESUMEN FINAL                              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

total_releases=${#sorted_releases[@]}
total_in_html=${#versions_in_html[@]}

echo "📊 Estadísticas:"
echo "   Versiones en releases/: $total_releases"
echo "   Versiones en index.html: $total_in_html"
echo ""

if [ ${#validation_errors[@]} -eq 0 ]; then
    echo "✅ VERIFICACIÓN EXITOSA"
    echo ""
    echo "   ✓ Todos los releases existen en releases/"
    echo "   ✓ Todos los releases están listados en index.html"
    echo "   ✓ La integridad referencial es correcta"
    echo "   ✓ La estructura HTML es válida"
    echo ""
else
    echo "❌ VERIFICACIÓN FALLIDA"
    echo ""
    echo "   Errores encontrados:"
    for error in "${validation_errors[@]}"; do
        echo "      ❌ $error"
    done
    echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Comparación con deploy
# ─────────────────────────────────────────────────────────────────────────────

echo "🔄 Información del último deploy:"
echo ""

last_commit=$(git log -1 --pretty=format:"%h %s" 2>/dev/null)
echo "   Último commit: $last_commit"

last_deploy=$(git log --oneline --grep="Deploy:" -1 2>/dev/null | head -1)
if [ -n "$last_deploy" ]; then
    echo "   Último deploy: $last_deploy"
else
    echo "   Último deploy: No encontrado"
fi

echo ""

# Volver a la rama original
echo "🔀 Volviendo a rama $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH" > /dev/null 2>&1

echo ""
echo "✓ Verificación completada"
echo ""

# Retornar exit code
if [ ${#validation_errors[@]} -eq 0 ]; then
    exit 0
else
    exit 1
fi
