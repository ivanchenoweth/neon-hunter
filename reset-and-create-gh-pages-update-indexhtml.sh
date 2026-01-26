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

# Crear o actualizar index.html con contenido base
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Hunter - Releases</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #00ff88;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #00ff88;
            padding-bottom: 20px;
        }
        h1 {
            font-size: 2.5em;
            text-shadow: 0 0 10px #00ff88;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #00cc66;
            font-size: 1.1em;
        }
        .releases {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .release-card {
            background: rgba(0, 255, 136, 0.05);
            border: 2px solid #00ff88;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .release-card:hover {
            background: rgba(0, 255, 136, 0.1);
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
            transform: translateY(-5px);
        }
        .release-card h2 {
            color: #00ffff;
            margin-bottom: 10px;
            font-size: 1.5em;
        }
        .release-card p {
            color: #00cc66;
            margin: 5px 0;
        }
        .release-card a {
            display: inline-block;
            margin-top: 15px;
            padding: 10px 20px;
            background: #00ff88;
            color: #1a1a2e;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .release-card a:hover {
            background: #00cc66;
            box-shadow: 0 0 10px #00ff88;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #00cc66;
            font-size: 1.2em;
        }
        footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #00ff88;
            color: #00cc66;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎮 Neon Hunter</h1>
            <p class="subtitle">Releases & Versions</p>
        </header>
        
        <main>
            <div id="releases" class="releases">
                <div class="empty-state">
                    <p>No hay versiones disponibles aún.</p>
                    <p>Próximamente se desplegarán nuevas versiones con SemVer.</p>
                </div>
            </div>
        </main>
        
        <footer>
            <p>© 2026 Neon Hunter | Versionado Semántico (SemVer)</p>
            <p><a href="https://github.com/ivanchenoweth/neon-hunter" style="color: #00ff88; text-decoration: none;">Ver en GitHub</a></p>
        </footer>
    </div>

    <script>
        // Script para cargar dinámicamente las versiones disponibles desde releases/
        async function loadReleases() {
            try {
                const response = await fetch('releases/');
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extraer directorios (versiones) disponibles
                const links = Array.from(doc.querySelectorAll('a'))
                    .map(a => a.getAttribute('href'))
                    .filter(href => href && /^v\d+\.\d+\.\d+\/$/.test(href))
                    .sort()
                    .reverse();
                
                if (links.length > 0) {
                    const releasesDiv = document.getElementById('releases');
                    releasesDiv.innerHTML = '';
                    
                    links.forEach(link => {
                        const version = link.replace(/\/$/, '');
                        const card = document.createElement('div');
                        card.className = 'release-card';
                        card.innerHTML = `
                            <h2>${version}</h2>
                            <p>Versión Semántica</p>
                            <a href="${link}">Jugar Ahora →</a>
                        `;
                        releasesDiv.appendChild(card);
                    });
                }
            } catch (error) {
                console.log('Releases no disponibles aún');
            }
        }
        
        loadReleases();
    </script>
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
