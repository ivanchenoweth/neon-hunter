#!/bin/bash

# ==============================================================================
# PRODUCTION-HOTFIX-GUIDE.sh
# Guía rápida para solucionar problemas en producción
# ==============================================================================

cat << 'GUIDE'

╔══════════════════════════════════════════════════════════════════════════╗
║                  🔧 GUÍA DE CORRECCIÓN EN PRODUCCIÓN                    ║
║                     ivanchenoweth/neon-hunter                           ║
╚══════════════════════════════════════════════════════════════════════════╝


📋 PROBLEMA: verify-gh-pages-indexhtml.sh falla - Las versiones no están en index.html
════════════════════════════════════════════════════════════════════════════

SÍNTOMAS:
  ❌ Verificación FALLIDA
  ❌ Versiones en releases/: X
  ❌ Versiones en index.html: 0
  ❌ Errores: "No está listado en index.html"

CAUSA:
  El index.html en la rama gh-pages está vacío o no tiene las versiones
  listadas de forma estática. Esto puede ocurrir cuando:
  
  1. El deploy no regeneró correctamente el index.html
  2. Se borraron versiones pero el índice no se actualizó
  3. El JavaScript dinámico de carga de versiones no funciona


═══════════════════════════════════════════════════════════════════════════
🚀 SOLUCIÓN RÁPIDA (5 MINUTOS)
═══════════════════════════════════════════════════════════════════════════

PASO 1: Descargar el código actualizado
  $ git pull origin main
  
  Esto descargará los scripts de reparación incluidos en main.

PASO 2: Ejecutar el script de reparación
  $ chmod +x fix-gh-pages-indexhtml.sh
  $ ./fix-gh-pages-indexhtml.sh
  
  Este script:
  ✓ Cambia a rama gh-pages
  ✓ Escanea los directorios de releases/ existentes
  ✓ Genera un index.html ESTÁTICO con todas las versiones
  ✓ Hace commit y push a origin/gh-pages

PASO 3: Verificar que la solución funcionó
  $ chmod +x verify-gh-pages-indexhtml.sh
  $ ./verify-gh-pages-indexhtml.sh
  
  Resultado esperado:
  ✅ VERIFICACIÓN EXITOSA
  
  Si el script reporta:
     Versiones en releases/: 3
     Versiones en index.html: 3
     ✅ VERIFICACIÓN EXITOSA
  
  Entonces está todo correcto.

PASO 4: Verificar en el navegador
  Abre: https://ivanchenoweth.github.io/neon-hunter/
  
  Deberías ver todas las versiones listadas como tarjetas verdes.


═══════════════════════════════════════════════════════════════════════════
🔄 REGENERAR ÍNDICE DESPUÉS DE CADA DEPLOY (RECOMENDADO)
═══════════════════════════════════════════════════════════════════════════

Después de ejecutar ./deploy-version.sh, ejecuta INMEDIATAMENTE:

  $ ./regenerate-indexhtml-after-deploy.sh
  
Este script garantiza que:
  ✓ El index.html se regenere correctamente
  ✓ Todas las versiones estén listadas
  ✓ Los cambios se pusheen a gh-pages


═══════════════════════════════════════════════════════════════════════════
📦 FLUJO DE DEPLOY COMPLETO (NUEVO)
═══════════════════════════════════════════════════════════════════════════

1. Hacer cambios en main:
   $ git add .
   $ git commit -m "tu mensaje"
   $ git push origin main

2. Crear nuevo deploy (ejecutar desde directorio del repo):
   $ ./deploy-version.sh
   
   Sigue las instrucciones. Esto:
   ✓ Calcula la versión (v1.X.0)
   ✓ Genera un pet name único
   ✓ Copia código a gh-pages releases/
   ✓ Crea tags de Git

3. IMPORTANTE: Regenerar índice (ejecutar inmediatamente después)
   $ ./regenerate-indexhtml-after-deploy.sh
   
   Esto:
   ✓ Regenera index.html con TODAS las versiones
   ✓ Hace push a gh-pages
   ✓ Garantiza visibilidad en https://ivanchenoweth.github.io/neon-hunter/

4. Verificar que todo está correcto:
   $ ./verify-gh-pages-indexhtml.sh


═══════════════════════════════════════════════════════════════════════════
⚠️  PROBLEMAS COMUNES Y SOLUCIONES
═══════════════════════════════════════════════════════════════════════════

PROBLEMA 1: fix-gh-pages-indexhtml.sh dice "Directorio releases/ no encontrado"
  ├─ CAUSA: No estás en la rama gh-pages cuando se ejecuta
  ├─ SOLUCIÓN: El script lo hace automáticamente
  └─ ACCIÓN: Si persiste, ejecuta:
     $ git checkout gh-pages
     $ ls -la releases/

PROBLEMA 2: Cambios en index.html pero no aparecen en el navegador
  ├─ CAUSA: Cache del navegador o GitHub Pages no actualizó
  ├─ SOLUCIÓN: Esperar 2-5 minutos para GitHub Pages
  └─ ACCIÓN: 
     - Limpiar cache del navegador (Ctrl+Shift+Del)
     - Verificar en navegador privado
     - Ver source en GitHub: https://github.com/ivanchenoweth/neon-hunter

PROBLEMA 3: Error "fatal: not a git repository" al ejecutar scripts
  ├─ CAUSA: No estás en el directorio del repositorio
  ├─ SOLUCIÓN: Navega al directorio correcto
  └─ ACCIÓN:
     $ cd /path/to/neon-hunter
     $ pwd  # Debe mostrar el path del repo
     $ ls -la  # Debe mostrar .git/

PROBLEMA 4: El script dice "No se pudo push automáticamente"
  ├─ CAUSA: Problema con autenticación de Git
  ├─ SOLUCIÓN: Verificar configuración SSH/HTTPS
  └─ ACCIÓN:
     $ git remote -v  # Ver URLs configuradas
     $ git config user.name  # Verificar usuario
     $ git push origin gh-pages -v  # Ver detalles del error

PROBLEMA 5: verify-gh-pages-indexhtml.sh falla después del fix
  ├─ CAUSA: El index.html generado tiene problema de formato
  ├─ SOLUCIÓN: Ejecutar de nuevo el fix
  └─ ACCIÓN:
     $ ./fix-gh-pages-indexhtml.sh  # Volver a ejecutar
     $ ./verify-gh-pages-indexhtml.sh  # Verificar


═══════════════════════════════════════════════════════════════════════════
📊 CHECKLIST PRE-PRODUCCIÓN
═══════════════════════════════════════════════════════════════════════════

ANTES de hacer cualquier deploy en producción:

  ☐ Descargar última versión de main
    $ git pull origin main
    
  ☐ Verificar que todos los scripts están presentes
    $ ls -la *.sh
    
    Debe ver:
    • deploy-version.sh
    • reset-tags.sh
    • reset-and-create-gh-pages-update-indexhtml.sh
    • verify-gh-pages-indexhtml.sh
    • fix-gh-pages-indexhtml.sh
    • regenerate-indexhtml-after-deploy.sh
    
  ☐ Hacer que los scripts sean ejecutables
    $ chmod +x *.sh
    
  ☐ Verificar estado actual
    $ ./verify-gh-pages-indexhtml.sh
    
  ☐ Verificar en navegador
    https://ivanchenoweth.github.io/neon-hunter/


═══════════════════════════════════════════════════════════════════════════
🔗 REFERENCIAS RÁPIDAS
═══════════════════════════════════════════════════════════════════════════

Scripts disponibles:

  deploy-version.sh
    Uso: ./deploy-version.sh
    Efecto: Crea nuevo release (v1.X.0) con pet name único
    
  verify-gh-pages-indexhtml.sh
    Uso: ./verify-gh-pages-indexhtml.sh
    Efecto: Verifica que releases/ e index.html estén sincronizados
    
  fix-gh-pages-indexhtml.sh
    Uso: ./fix-gh-pages-indexhtml.sh
    Efecto: Repara index.html - USAR EN EMERGENCIA
    
  regenerate-indexhtml-after-deploy.sh
    Uso: ./regenerate-indexhtml-after-deploy.sh
    Efecto: Regenera index.html (ejecutar DESPUÉS de deploy)
    
  reset-tags.sh
    Uso: ./reset-tags.sh
    Efecto: Limpia tags viejos de Git
    
  reset-and-create-gh-pages-update-indexhtml.sh
    Uso: ./reset-and-create-gh-pages-update-indexhtml.sh
    Efecto: Limpia gh-pages completamente - USAR CON CUIDADO


═══════════════════════════════════════════════════════════════════════════
📞 SOPORTE Y DEBUGGING
═══════════════════════════════════════════════════════════════════════════

Para obtener más información sobre qué está mal:

  $ git status              # Ver estado actual de Git
  $ git log --oneline -5    # Ver últimos 5 commits
  $ git branch -a           # Ver todas las ramas
  
En gh-pages:
  $ git checkout gh-pages
  $ ls -la releases/        # Ver directorios de releases
  $ head -20 index.html     # Ver primeras líneas de index.html

═══════════════════════════════════════════════════════════════════════════

AYUDA RÁPIDA:

  El problema es: Las versiones no aparecen en index.html
  
  La solución es: Ejecutar ./fix-gh-pages-indexhtml.sh
  
  Luego verificar con: ./verify-gh-pages-indexhtml.sh
  
  Y en el futuro, siempre ejecutar:
    ./deploy-version.sh
    ./regenerate-indexhtml-after-deploy.sh
    ./verify-gh-pages-indexhtml.sh

═══════════════════════════════════════════════════════════════════════════

GUIDE
