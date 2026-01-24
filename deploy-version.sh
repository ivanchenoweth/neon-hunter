#!/bin/bash

# ==============================================================================
# deploy-version.sh
# Automatiza el release de cualquier rama:
#   1. Calcula el próximo tag (v3.0, v4.0, etc.)
#   2. Genera un pet name único basado en el hash del commit
#   3. Actualiza index.html con la versión y pet name
#   4. Crea el tag de Git
#   5. Despliega a GitHub Pages
# ==============================================================================

set -e

# ─────────────────────────────────────────────────────────────────────────────
# PET NAME GENERATOR - Genera nombres memorables a partir del hash del commit
# ─────────────────────────────────────────────────────────────────────────────

# Listas de palabras para generar pet names
ADJECTIVES=(
    "swift" "brave" "cosmic" "neon" "cyber" "stellar" "quantum" "turbo"
    "mystic" "blazing" "electric" "atomic" "hyper" "ultra" "mega" "super"
    "shadow" "crystal" "golden" "silver" "crimson" "azure" "emerald" "violet"
    "phantom" "thunder" "storm" "frost" "flame" "lunar" "solar" "astral"
)

NOUNS=(
    "phoenix" "dragon" "hunter" "falcon" "panther" "tiger" "wolf" "hawk"
    "cobra" "viper" "raptor" "specter" "nova" "comet" "nebula" "quasar"
    "ninja" "samurai" "warrior" "knight" "guardian" "sentinel" "ranger" "pilot"
    "spark" "pulse" "bolt" "wave" "surge" "blast" "strike" "flash"
)

# Función para generar pet name a partir del hash
generate_pet_name() {
    local hash=$1
    # Usar los primeros 4 caracteres del hash para el adjetivo
    local adj_index=$((16#${hash:0:2} % ${#ADJECTIVES[@]}))
    # Usar los siguientes 4 caracteres para el sustantivo
    local noun_index=$((16#${hash:2:2} % ${#NOUNS[@]}))
    
    echo "${ADJECTIVES[$adj_index]}-${NOUNS[$noun_index]}"
}

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────────────────

BRANCH="gh-pages"
WORKTREE_DIR="../neon-hunter-pages-temp"
CURRENT_BRANCH=$(git branch --show-current)

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║           🎮 NEON HUNTER - DEPLOY VERSION SCRIPT                    ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📌 Rama actual: $CURRENT_BRANCH"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Calcular el siguiente tag automáticamente
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "🔍 Buscando versiones existentes..."

# Obtener el último tag que sigue el patrón vX.0
LAST_TAG=$(git tag --list 'v*.0' --sort=-version:refname | head -1)

if [ -z "$LAST_TAG" ]; then
    # Si no hay tags, empezar desde v1.0
    NEXT_VERSION="v1.0"
    NEXT_NUMBER=1
else
    # Extraer el número de versión y sumar 1
    CURRENT_NUMBER=$(echo "$LAST_TAG" | sed 's/v\([0-9]*\).*/\1/')
    NEXT_NUMBER=$((CURRENT_NUMBER + 1))
    NEXT_VERSION="v${NEXT_NUMBER}.0"
fi

echo "📦 Último tag encontrado: ${LAST_TAG:-ninguno}"
echo "🆕 Próxima versión: $NEXT_VERSION"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Generar pet name a partir del hash del commit actual
# ─────────────────────────────────────────────────────────────────────────────

COMMIT_HASH=$(git rev-parse HEAD)
SHORT_HASH=$(git rev-parse --short HEAD)
PET_NAME=$(generate_pet_name "$COMMIT_HASH")

echo ""
echo "🐾 Pet Name generado: $PET_NAME"
echo "🔑 Commit: $SHORT_HASH"

# Crear el identificador completo
RELEASE_ID="${NEXT_VERSION}-${PET_NAME}"
echo "🏷️  Release ID: $RELEASE_ID"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Actualizar index.html con la información de la versión
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "📝 Actualizando index.html con la versión..."

# Buscar si ya existe un elemento de versión, si no, agregarlo
if grep -q "version-badge" index.html; then
    # Actualizar el badge existente
    sed -i.bak "s|<span id=\"version-badge\"[^>]*>[^<]*</span>|<span id=\"version-badge\" class=\"version-badge\">${RELEASE_ID}</span>|g" index.html
else
    # Agregar el badge de versión después del h2 en input-card
    sed -i.bak "s|<h2>Select control mode</h2>|<h2>Select control mode</h2>\n            <span id=\"version-badge\" class=\"version-badge\">${RELEASE_ID}</span>|g" index.html
fi

# Agregar CSS para el version badge si no existe
if ! grep -q "\.version-badge" index.html; then
    sed -i.bak 's|</style>|        .version-badge {\n            display: inline-block;\n            background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,200,100,0.1));\n            border: 1px solid rgba(0,255,136,0.3);\n            color: #00ff88;\n            padding: 4px 12px;\n            border-radius: 20px;\n            font-size: 11px;\n            font-weight: 600;\n            letter-spacing: 0.5px;\n            margin-bottom: 10px;\n            text-shadow: 0 0 10px rgba(0,255,136,0.5);\n        }\n    </style>|g' index.html
fi

# Limpiar archivo de backup
rm -f index.html.bak

echo "✅ index.html actualizado con: $RELEASE_ID"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 4: Commit de los cambios y crear el tag
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "💾 Guardando cambios..."

git add index.html
git commit -m "🏷️ Release ${RELEASE_ID}: ${PET_NAME}" || echo "ℹ️  No hay cambios nuevos en index.html"

# Crear el tag con mensaje descriptivo
echo "🏷️  Creando tag $NEXT_VERSION..."
git tag -a "$NEXT_VERSION" -m "Release ${RELEASE_ID}
Pet Name: ${PET_NAME}
Branch: ${CURRENT_BRANCH}
Commit: ${COMMIT_HASH}"

echo "✅ Tag $NEXT_VERSION creado exitosamente"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Push del tag y cambios
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "☁️  Subiendo cambios y tag a origin..."

git push origin "$CURRENT_BRANCH" --follow-tags

echo "✅ Tag y commits subidos a origin"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Desplegar a GitHub Pages
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "📂 Preparando despliegue a GitHub Pages..."

# Verificar/crear rama gh-pages
git fetch origin $BRANCH > /dev/null 2>&1 || {
    echo "⚠️  Rama $BRANCH no detectada en remoto."
    git show-ref --verify --quiet refs/heads/$BRANCH || {
        echo "✨ Creando rama huérfana $BRANCH..."
        git checkout --orphan $BRANCH
        git rm -rf .
        echo "# Neon Hunter Releases" > README.md
        git add README.md
        git commit -m "Initial commit for gh-pages"
        git checkout "$CURRENT_BRANCH"
    }
}

# Preparar worktree
if [ -d "$WORKTREE_DIR" ]; then
    rm -rf "$WORKTREE_DIR"
    git worktree prune
fi

git worktree add "$WORKTREE_DIR" $BRANCH 2>/dev/null || {
    git checkout $BRANCH
    git worktree add "$WORKTREE_DIR" $BRANCH
    git checkout "$CURRENT_BRANCH"
}

# Crear directorio para este release
TARGET_DIR="$WORKTREE_DIR/releases/$NEXT_VERSION"
mkdir -p "$TARGET_DIR"

echo "📦 Copiando archivos a releases/$NEXT_VERSION..."

# Copiar archivos necesarios
rsync -av \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.DS_Store' \
    --exclude 'deploy-version.sh' \
    --exclude 'server.js' \
    --exclude 'package*.json' \
    --include '*.html' \
    --include '*.js' \
    --include '*.css' \
    --include 'assets***' \
    --exclude '*' \
    ./ "$TARGET_DIR/"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Generar índice de versiones
# ─────────────────────────────────────────────────────────────────────────────

echo "📝 Generando índice de versiones..."

INDEX_FILE="$WORKTREE_DIR/index.html"

cat > "$INDEX_FILE" << 'EOF'
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Neon Hunter - Versions</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: linear-gradient(135deg, #0d0d12 0%, #1a1a24 50%, #0d0d12 100%);
            color: #fff; 
            font-family: 'Outfit', sans-serif; 
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { 
            color: #00ff88; 
            text-shadow: 0 0 20px rgba(0,255,136,0.5); 
            margin-bottom: 10px;
            font-size: 2.5rem;
            text-align: center;
        }
        .subtitle {
            color: rgba(255,255,255,0.6);
            text-align: center;
            margin-bottom: 40px;
            font-size: 1rem;
        }
        .version-list { list-style: none; }
        .version-item { margin: 15px 0; }
        .version-link { 
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px; 
            background: rgba(255,255,255,0.03); 
            border: 1px solid rgba(0,255,136,0.15); 
            color: #fff; 
            text-decoration: none; 
            border-radius: 12px; 
            transition: all 0.3s ease;
        }
        .version-link:hover { 
            background: rgba(0,255,136,0.08); 
            border-color: #00ff88; 
            transform: translateY(-3px); 
            box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,136,0.1);
        }
        .version-name {
            font-size: 1.3rem;
            font-weight: 700;
            color: #00ff88;
        }
        .version-pet-name {
            font-size: 0.9rem;
            color: rgba(255,255,255,0.6);
            text-transform: capitalize;
        }
        .play-btn {
            background: linear-gradient(135deg, #00ff88, #00cc6f);
            color: #0d0d12;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Neon Hunter</h1>
        <p class="subtitle">Select a version to play</p>
        <ul class='version-list'>
EOF

# Agregar versiones (ordenadas de más reciente a más antigua)
for d in $(ls -rd "$WORKTREE_DIR/releases"/*/ 2>/dev/null); do
    if [ -d "$d" ]; then
        dir_name=$(basename "$d")
        # Intentar extraer el pet name del index.html de esa versión
        pet_name=""
        if [ -f "$d/index.html" ]; then
            pet_name=$(grep -oP 'version-badge">[^<]*-\K[^<]+' "$d/index.html" 2>/dev/null || echo "")
        fi
        if [ -z "$pet_name" ]; then
            pet_name="classic"
        fi
        cat >> "$INDEX_FILE" << ENTRY
            <li class='version-item'>
                <a class='version-link' href='releases/$dir_name/index.html'>
                    <div>
                        <div class='version-name'>$dir_name</div>
                        <div class='version-pet-name'>$pet_name</div>
                    </div>
                    <span class='play-btn'>▶ PLAY</span>
                </a>
            </li>
ENTRY
    fi
done

cat >> "$INDEX_FILE" << 'EOF'
        </ul>
    </div>
</body>
</html>
EOF

# ─────────────────────────────────────────────────────────────────────────────
# PASO 8: Push a gh-pages
# ─────────────────────────────────────────────────────────────────────────────

echo "☁️  Subiendo a GitHub Pages..."

cd "$WORKTREE_DIR"
git add .
git commit -m "🚀 Deploy: ${RELEASE_ID} from $CURRENT_BRANCH"
git push origin $BRANCH

# Limpieza
cd - > /dev/null
git worktree remove "$WORKTREE_DIR"
git worktree prune

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOY COMPLETADO                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  📦 Versión:    $NEXT_VERSION"
echo "  🐾 Pet Name:   $PET_NAME"
echo "  🏷️  Release ID: $RELEASE_ID"
echo "  🌿 Rama:       $CURRENT_BRANCH"
echo "  🔑 Commit:     $SHORT_HASH"
echo ""
echo "  🌐 URL del release:"
echo "     https://ivanchenoweth.github.io/neon-hunter/releases/$NEXT_VERSION/"
echo ""
echo "  📋 Índice de versiones:"
echo "     https://ivanchenoweth.github.io/neon-hunter/"
echo ""
