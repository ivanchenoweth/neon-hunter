#!/bin/bash

# ==============================================================================
# GUÍA DE PRODUCCIÓN - NEON HUNTER DEPLOYMENT
# Instrucciones para usar los scripts en producción en ivanchenoweth
# ==============================================================================

cat << 'PRODUCTIONGUIDEOF'

╔══════════════════════════════════════════════════════════════════════════╗
║          🚀 GUÍA DE PRODUCCIÓN - NEON HUNTER DEPLOYMENT                 ║
║                       ivanchenoweth/neon-hunter                          ║
╚══════════════════════════════════════════════════════════════════════════╝


📋 ESTADO ACTUAL
════════════════════════════════════════════════════════════════════════════

✅ SCRIPTS DISPONIBLES:
   1. reset-tags.sh
   2. reset-and-create-gh-pages-update-indexhtml.sh
   3. deploy-version.sh
   4. verify-gh-pages-indexhtml.sh

✅ SISTEMA DE VERSIONING:
   - SemVer implementado (v1.0.0, v1.1.0, etc.)
   - Pet names únicos generados automáticamente
   - Versiones históricas disponibles en GitHub Pages

✅ RELEASES DISPONIBLES:
   - v1.1.0 through v1.8.0
   - Cada release tiene su URL en GitHub Pages
   - Código completo del juego en cada versión

⚠️  CONOCIDOS:
   - El script deploy-version.sh genera un index.html con template vacío
   - Se proporciona index.html funcional que lista dinámicamente todas las versiones
   - Solución: usar el index.html que generamos (ya en gh-pages branch)


🎯 FLUJO DE DEPLOYMENT RECOMENDADO
════════════════════════════════════════════════════════════════════════════

OPCIÓN 1: Deployment Normal (Recomendado)
─────────────────────────────────────────

1. Hacer cambios en main branch
2. Ejecutar:
   
   $ ./deploy-version.sh
   
   Esto:
   ├─ Calcula próxima versión SemVer
   ├─ Genera pet name único
   ├─ Copia código a releases/v*.*.*/
   ├─ Crea tag Git
   ├─ Actualiza index.html (con template)
   └─ Hace push a gh-pages y origin

3. Verificar:
   
   $ ./verify-gh-pages-indexhtml.sh
   
   Esto valida:
   ├─ Que todas las versiones existan en releases/
   ├─ Que index.html liste todas las versiones
   ├─ Que no haya referencias rotas
   └─ Genera reporte detallado


OPCIÓN 2: Limpiar Tags Antiguos
────────────────────────────────

Si necesitas limpiar versiones antiguas:

1. Eliminar tags viejos:
   
   $ ./reset-tags.sh
   
   Esto:
   ├─ Elimina tags localmente
   ├─ Elimina tags de GitHub
   └─ Prepara para nuevo versioning

2. Limpiar gh-pages:
   
   $ ./reset-and-create-gh-pages-update-indexhtml.sh
   
   Esto:
   ├─ Limpia rama gh-pages
   ├─ Elimina releases/ viejos
   ├─ Actualiza index.html
   └─ Hace push a gh-pages


📌 INSTRUCCIONES PASO A PASO
════════════════════════════════════════════════════════════════════════════

PRIMER DEPLOY EN NUEVA MÁQUINA:
───────────────────────────────

1. Clonar repositorio:
   
   $ git clone https://github.com/ivanchenoweth/neon-hunter.git
   $ cd neon-hunter

2. Hacer cambios al código (opcional)

3. Ejecutar deploy:
   
   $ chmod +x *.sh
   $ ./deploy-version.sh

4. Verificar:
   
   $ ./verify-gh-pages-indexhtml.sh

5. Revisar en GitHub Pages:
   
   https://ivanchenoweth.github.io/neon-hunter/


DEPLOYMENT SUBSECUENTE:
──────────────────────

1. Hacer cambios en main:
   
   $ git add .
   $ git commit -m "your changes"

2. Ejecutar deploy:
   
   $ ./deploy-version.sh

3. El script:
   ├─ Calcula automáticamente la siguiente versión
   ├─ Genera pet name único
   ├─ Crea release en gh-pages
   ├─ Actualiza index.html
   └─ Hace push


🔍 VERIFICACIÓN EN PRODUCCIÓN
════════════════════════════════════════════════════════════════════════════

ANTES DE HACER PUSH A MAIN:

$ ./verify-gh-pages-indexhtml.sh

Debería mostrar:
├─ ✅ Versiones encontradas en releases/
├─ ✅ index.html existe
├─ ✅ Todas las versiones listadas en index.html
├─ ✅ Integridad referencial correcta
└─ ✅ Estructura HTML válida


📊 MONITOREO
════════════════════════════════════════════════════════════════════════════

URLs DE MONITOREO:

1. Página Principal:
   https://ivanchenoweth.github.io/neon-hunter/

2. Última Versión (v1.8.0):
   https://ivanchenoweth.github.io/neon-hunter/releases/v1.8.0/

3. Listar Todas las Versiones:
   https://github.com/ivanchenoweth/neon-hunter/tags


🐛 TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════════

PROBLEMA: "index.html no muestra versiones"
──────────────────────────────────────────

CAUSA: El template del deploy-version.sh genera un HTML vacío

SOLUCIÓN:
├─ Opción 1: Usar el index.html que proporcionamos
│  └─ Ya está en gh-pages branch y es dinámico
│
├─ Opción 2: Corregir deploy-version.sh
│  └─ Ver líneas 372-415 del script


PROBLEMA: "verify-gh-pages-indexhtml.sh falla"
────────────────────────────────────────────────

CAUSAS POSIBLES:
├─ No hay versiones en releases/ (ejecutar deploy-version.sh primero)
├─ index.html está vacío (ver solución arriba)
└─ Falta algún archivo en una versión

SOLUCIÓN:
$ ./verify-gh-pages-indexhtml.sh
# Revisa el reporte de errores detallado


PROBLEMA: "deploy-version.sh falla"
────────────────────────────────────

CAUSAS POSIBLES:
├─ No has hecho git push con tus cambios
├─ No tienes permisos en GitHub
├─ La rama gh-pages no existe

SOLUCIÓN:
1. Asegurate de tener cambios:
   $ git status

2. Haz commit:
   $ git add .
   $ git commit -m "your message"

3. Intenta de nuevo:
   $ ./deploy-version.sh


⚡ REFERENCIAS RÁPIDAS
════════════════════════════════════════════════════════════════════════════

Hacer deploy de nueva versión:
  $ ./deploy-version.sh

Verificar consistencia:
  $ ./verify-gh-pages-indexhtml.sh

Ver todas las versiones:
  $ git tag --list 'v*'

Ver releases en gh-pages:
  $ git ls-tree -r gh-pages releases/ | head -20

Cambiar a gh-pages para verificar:
  $ git checkout gh-pages
  $ ls releases/
  $ cat index.html


📚 DOCUMENTACIÓN COMPLETA
════════════════════════════════════════════════════════════════════════════

SCRIPTS DISPONIBLES:

1. reset-tags.sh
   Descripción: Elimina tags viejos del repositorio
   Uso: ./reset-tags.sh
   Funciones:
   ├─ Elimina tags viejos localmente
   ├─ Elimina tags de GitHub
   └─ Prepara para nuevo versioning

2. reset-and-create-gh-pages-update-indexhtml.sh
   Descripción: Limpia gh-pages y actualiza index.html
   Uso: ./reset-and-create-gh-pages-update-indexhtml.sh
   Funciones:
   ├─ Limpia rama gh-pages
   ├─ Elimina releases viejos
   ├─ Actualiza index.html con diseño moderno
   └─ Hace push a gh-pages

3. deploy-version.sh
   Descripción: Deployea nueva versión a GitHub Pages
   Uso: ./deploy-version.sh
   Funciones:
   ├─ Calcula próxima versión SemVer
   ├─ Genera pet name único
   ├─ Copia código a releases/v*.*.*/
   ├─ Crea tag Git
   ├─ Actualiza index.html
   └─ Hace push a gh-pages

4. verify-gh-pages-indexhtml.sh
   Descripción: Verifica consistencia de deployments
   Uso: ./verify-gh-pages-indexhtml.sh
   Funciones:
   ├─ Escanea directorios en releases/
   ├─ Valida contenido de cada versión
   ├─ Verifica que index.html liste todas las versiones
   ├─ Valida integridad referencial
   ├─ Verifica estructura HTML
   └─ Genera reporte detallado


✅ CHECKLIST PRE-PRODUCCIÓN
════════════════════════════════════════════════════════════════════════════

Antes de ir a producción, verificar:

├─ ✓ Todos los scripts tienen permisos de ejecución
├─ ✓ El repositorio está clonado en la máquina de producción
├─ ✓ Tienes acceso a GitHub (permisos en el repositorio)
├─ ✓ git está configurado (git config user.name/email)
├─ ✓ gh CLI (opcional pero recomendado para releases)
├─ ✓ Ejecutaste verify-gh-pages-indexhtml.sh sin errores
├─ ✓ Las versiones se ven en https://ivanchenoweth.github.io/neon-hunter/
└─ ✓ El juego carga correctamente en cada release

Si todo está ✓, ¡ESTÁS LISTO PARA PRODUCCIÓN!


🎉 READY FOR PRODUCTION
════════════════════════════════════════════════════════════════════════════

PRODUCTIONGUIDEOF
