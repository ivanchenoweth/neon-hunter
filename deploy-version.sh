#!/bin/bash

# Usage: ./deploy-version.sh v1
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Debes especificar una versión."
  echo "Uso: ./deploy-version.sh v1"
  exit 1
fi

# Configuration
REPO_URL=$(git config --get remote.origin.url)
WORKTREE_DIR="../neon-hunter-pages-temp"
BRANCH="gh-pages"

echo "🚀 Iniciando despliegue de versión: $VERSION"

# 1. Check if gh-pages branch exists remotely
git fetch origin $BRANCH > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Rama $BRANCH no detectada en remoto."
    # Check locally
    git show-ref --verify --quiet refs/heads/$BRANCH
    if [ $? -ne 0 ]; then
        echo "✨ Creando rama huérfana $BRANCH..."
        git checkout --orphan $BRANCH
        git rm -rf .
        echo "# Neon Hunter Releases" > README.md
        git add README.md
        git commit -m "Initial commit for gh-pages"
        git checkout -
    fi
fi

# 2. Prepare Worktree
echo "📂 Preparando área de trabajo temporal..."
if [ -d "$WORKTREE_DIR" ]; then
    rm -rf "$WORKTREE_DIR"
    git worktree prune
fi
# Add worktree (create branch if needed from origin or local)
git worktree add "$WORKTREE_DIR" $BRANCH 2>/dev/null || (git checkout $BRANCH && git worktree add "$WORKTREE_DIR" $BRANCH && git checkout -)

# 3. Copy files
TARGET_DIR="$WORKTREE_DIR/releases/$VERSION"
mkdir -p "$TARGET_DIR"

echo "📦 Copiando archivos a releases/$VERSION..."
# Use rsync to copy only necessary files (html, js, css, assets)
# Exclude server side files or heavy node_modules
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

# 4. Generate/Update Index
echo "📝 Actualizando índice de versiones..."
INDEX_FILE="$WORKTREE_DIR/index.html"

# Simple HTML generation listing folders in releases
echo "<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Neon Hunter - Versions</title>
    <style>
        body { background: #0d0d12; color: #fff; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        h1 { color: #00ff88; text-shadow: 0 0 10px rgba(0,255,136,0.5); margin-bottom: 2rem; }
        .version-list { list-style: none; padding: 0; width: 100%; max-width: 400px; }
        .version-item { margin: 10px 0; }
        .version-link { display: block; padding: 15px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,255,136,0.2); color: #fff; text-decoration: none; border-radius: 8px; transition: all 0.3s; text-align: center; font-size: 1.2rem; }
        .version-link:hover { background: rgba(0,255,136,0.1); border-color: #00ff88; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <h1>Neon Hunter Releases</h1>
    <ul class='version-list'>" > "$INDEX_FILE"

# List directories in releases/ and create links
for d in "$WORKTREE_DIR/releases"/*; do
    if [ -d "$d" ]; then
        dir_name=$(basename "$d")
        echo "        <li class='version-item'><a class='version-link' href='releases/$dir_name/index.html'>$dir_name</a></li>" >> "$INDEX_FILE"
    fi
done

echo "    </ul>
</body>
</html>" >> "$INDEX_FILE"

# 5. Push changes
echo "☁️  Subiendo cambios a GitHub Pages..."
cd "$WORKTREE_DIR"
git add .
git commit -m "Deploy: Release $VERSION"
git push origin $BRANCH

# 6. Cleanup
echo "🧹 Limpiando..."
cd - > /dev/null
git worktree remove "$WORKTREE_DIR"
git worktree prune

echo "✅ Completado! Tu versión está disponible (en unos minutos) en:"
echo "   https://ivanchenoweth.github.io/neon-hunter/releases/$VERSION/"
