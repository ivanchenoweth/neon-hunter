#!/bin/bash

# ==============================================================================
# fix-gh-pages-indexhtml.sh
# Script para reparar index.html en gh-pages cuando las versiones no están
# listadas (útil en producción cuando el index.html queda vacío)
# ==============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║      🔧 REPARACIÓN: Regenerando index.html con versiones           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Guardar rama actual
CURRENT_BRANCH=$(git branch --show-current)

# Cambiar a gh-pages
echo "🔀 Cambiando a rama gh-pages..."
git checkout gh-pages > /dev/null 2>&1
echo "✅ En rama gh-pages"
echo ""

# Verificar que exista releases/
if [ ! -d "releases" ]; then
    echo "❌ Directorio releases/ no encontrado"
    git checkout "$CURRENT_BRANCH" > /dev/null 2>&1
    exit 1
fi

# Obtener list de versiones
echo "📂 Escaneando versiones en releases/"
declare -a versions_array=()
for dir in releases/v[0-9]*.[0-9]*.[0-9]*; do
    if [ -d "$dir" ]; then
        version=$(basename "$dir")
        versions_array+=("$version")
    fi
done

# Ordenar versiones en orden descendente (más nueva primero)
IFS=$'\n' sorted_versions=($(sort -rV <<<"${versions_array[*]}"))
unset IFS

if [ ${#sorted_versions[@]} -eq 0 ]; then
    echo "❌ No se encontraron versiones en releases/"
    git checkout "$CURRENT_BRANCH" > /dev/null 2>&1
    exit 1
fi

echo "✅ Encontradas ${#sorted_versions[@]} versiones:"
for v in "${sorted_versions[@]}"; do
    echo "   • $v"
done
echo ""

# Generar contenido del index.html
echo "📝 Generando index.html con todas las versiones..."
echo ""

# Crear el contenido HTML
cat > index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Neon Hunter - Versiones Disponibles</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #0a0e27, #1a1f3a);
            color: #00ff00;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            width: 100%;
            background: rgba(10, 14, 39, 0.8);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
        }
        
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
            text-shadow: 0 0 10px #00ff00;
            animation: glow 2s ease-in-out infinite;
        }
        
        .subtitle {
            text-align: center;
            color: #00aa00;
            margin-bottom: 30px;
            font-size: 0.9em;
        }
        
        .versions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .version-card {
            background: rgba(0, 255, 0, 0.05);
            border: 1px solid #00ff00;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .version-card:hover {
            background: rgba(0, 255, 0, 0.1);
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
            transform: translateY(-5px);
        }
        
        .version-number {
            font-size: 1.3em;
            color: #00ff00;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .pet-name {
            color: #00aa00;
            font-size: 0.9em;
            margin-bottom: 15px;
            font-style: italic;
        }
        
        .play-btn {
            display: inline-block;
            background: #00ff00;
            color: #0a0e27;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .play-btn:hover {
            background: #00dd00;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.7);
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #00ff00;
            color: #00aa00;
            font-size: 0.8em;
        }
        
        @keyframes glow {
            0%, 100% { text-shadow: 0 0 10px #00ff00; }
            50% { text-shadow: 0 0 20px #00ff00; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 NEON HUNTER</h1>
        <div class="subtitle">Versiones Disponibles</div>
        
        <div class="versions-grid">
HTMLEOF

# Agregar cada versión al HTML
for version in "${sorted_versions[@]}"; do
    pet_name="Unknown"
    if [ -f "releases/$version/.pet-name" ]; then
        pet_name=$(cat "releases/$version/.pet-name")
    fi
    
    cat >> index.html << HTMLEOF
            <div class="version-card">
                <div class="version-number">$version</div>
                <div class="pet-name">🌟 $pet_name</div>
                <a href="releases/$version/" class="play-btn">▶ JUGAR</a>
            </div>
HTMLEOF
done

# Cerrar el HTML
cat >> index.html << 'HTMLEOF'
        </div>
        
        <div class="footer">
            <p>🚀 Neon Hunter - Versiones Históricas</p>
            <p>Última versión: <span id="latest-version"></span></p>
        </div>
    </div>
    
    <script>
        document.getElementById('latest-version').textContent = document.querySelector('.version-number').textContent;
    </script>
</body>
</html>
HTMLEOF

echo "✅ index.html regenerado"
echo ""

# Mostrar versiones agregadas
echo "📋 Versiones listadas en index.html:"
for version in "${sorted_versions[@]}"; do
    if grep -q "releases/$version" index.html; then
        echo "   ✓ $version"
    fi
done
echo ""

# Hacer commit y push
echo "📦 Haciendo commit de cambios..."
git add index.html
git commit -m "🔧 fix: regenerate index.html with static version listings from releases" || true

echo "🚀 Pusheando cambios a gh-pages..."
git push origin gh-pages > /dev/null 2>&1 || {
    echo "⚠️  No se pudo push automáticamente. Intenta: git push origin gh-pages"
}

echo "✅ Push completado"
echo ""

# Volver a rama original
echo "🔀 Volviendo a rama $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH" > /dev/null 2>&1

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ REPARACIÓN COMPLETADA                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "El index.html en gh-pages ha sido regenerado con todas las versiones."
echo ""
echo "Próximo paso: Ejecuta verify-gh-pages-indexhtml.sh para confirmar"
echo ""
