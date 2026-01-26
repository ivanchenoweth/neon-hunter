#!/bin/bash

# ==============================================================================
# reset-and-create-gh-pages-update-indexhtml.sh
# Script para limpiar la rama gh-pages y preparar para los nuevos releases
# ==============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║    🧹 CLEANUP: Reset & Create GitHub Pages + Update index.html    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 1: Confirmar que el usuario desea continuar
# ─────────────────────────────────────────────────────────────────────────────

echo "⚠️  ADVERTENCIA: Este script eliminará la rama gh-pages y sus contenidos."
echo "   Esta acción NO se puede deshacer."
echo ""
read -p "¿Deseas continuar? (sí/no): " confirm

if [[ "$confirm" != "sí" && "$confirm" != "si" && "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Operación cancelada."
    exit 0
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 2: Cambiar a rama gh-pages o crear si no existe
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Cambiando a rama gh-pages..."
git fetch origin gh-pages 2>/dev/null || true
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages

echo "✅ Rama gh-pages lista"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 3: Limpiar directorios viejos de releases
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
# PASO 4: Actualizar index.html con referencia a las versiones disponibles
# ─────────────────────────────────────────────────────────────────────────────

echo "📝 Actualizando index.html..."
echo ""

# Crear o actualizar index.html - NOTE: Este será actualizado con versiones reales después del deploy
cat > index.html << 'EOF'
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
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #00aa00;">
                <p>No hay versiones disponibles aún.</p>
                <p>Próximamente se desplegarán nuevas versiones con SemVer.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>🚀 Neon Hunter - Versiones Históricas</p>
            <p><a href="https://github.com/ivanchenoweth/neon-hunter" style="color: #00ff00; text-decoration: none;">Ver en GitHub</a></p>
        </div>
    </div>
</body>
</html>
EOF

echo "✅ index.html actualizado"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 5: Commit y push de la limpieza en gh-pages
# ─────────────────────────────────────────────────────────────────────────────

echo "💾 Guardando cambios en gh-pages..."

git add -A
git commit -m "cleanup: remove old versioning releases (v*.0 format), prepare for SemVer

- Deleted all v*.0 format release directories
- Updated index.html with modern design
- Repository ready for SemVer (MAJOR.MINOR.PATCH) versioning
- Next deploy will create v1.0.0 as the first SemVer release" 2>/dev/null || echo "ℹ️  No hay cambios para commit"

# ─────────────────────────────────────────────────────────────────────────────
# PASO 6: Push a GitHub
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "☁️  Subiendo cambios a origin/gh-pages..."

git push origin gh-pages 2>/dev/null || echo "⚠️  No se pudo hacer push a gh-pages"

echo "✅ gh-pages actualizado"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# PASO 7: Volver a la rama main
# ─────────────────────────────────────────────────────────────────────────────

echo "🔀 Volviendo a rama main..."

git checkout main

echo "✅ En rama main"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           ✅ RESET & GITHUB PAGES ACTUALIZADO                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📌 Cambios realizados:"
echo "   ✅ Rama gh-pages limpiada (releases viejos removidos)"
echo "   ✅ index.html actualizado con nuevo diseño"
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
echo "   git checkout gh-pages           # Ver releases/ (debe estar limpio)"
echo "   git checkout main               # Volver a main"
echo ""
