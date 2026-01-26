# 📚 Script Reference Guide

## Quick Start

### Deploy una nueva versión
```bash
./gh-deploy-version.sh
```
**Qué hace:** Crea v{X}.{X}.{X}, pet name único, copia a gh-pages/releases/, genera index.html

### Verificar estado
```bash
./gh-verify-indexhtml.sh
```
**Qué hace:** Valida que releases/, index.html y tags estén sincronizados

### Limpiar versiones viejas
```bash
./gh-reset-tags.sh
./gh-remove-releases-files.sh
```
**Qué hace:** Elimina todos los tags y releases para empezar desde cero

---

## Scripts Disponibles

### 🚀 gh-deploy-version.sh
**Propósito:** Automatizar release de nuevas versiones

**Flujo:**
1. Calcula siguiente versión (SemVer)
2. Genera pet name basado en hash del commit
3. Actualiza game.js con Release ID
4. Crea tag de Git
5. Pushea cambios a origin
6. Copia archivos a gh-pages/releases/
7. Genera index.html en gh-pages
8. Pushea a GitHub Pages

**Uso:**
```bash
echo "sí" | ./gh-deploy-version.sh
# O interactivamente:
./gh-deploy-version.sh
# Responder "sí" al prompt
```

---

### ✓ gh-verify-indexhtml.sh
**Propósito:** Verificar integridad del deployment

**Validaciones:**
- ✓ releases/ contiene directorios v*.*.* 
- ✓ Cada release tiene index.html y archivos necesarios
- ✓ Pet names están presentes
- ✓ index.html en gh-pages lista todas las versiones
- ✓ No hay referencias huérfanas
- ✓ Estructura HTML válida
- ✓ Tags Git presentes y correctos

**Salida:**
- 🟢 EXITOSA: Todo sincronizado
- 🟡 LIMPIO: Sin releases (esperado en nuevo setup)
- 🔴 FALLIDA: Con detalle de errores encontrados

**Uso:**
```bash
./gh-verify-indexhtml.sh
# Exit code 0 = OK, 1 = Problemas
```

---

### 🏷️  gh-reset-tags.sh
**Propósito:** Limpiar tags de Git viejos

**Acciones:**
- Elimina todos los tags locales que comienzan con 'v'
- Elimina los mismos tags del remoto (origin)
- Confirmación de usuario antes de proceder

**Uso:**
```bash
echo "sí" | ./gh-reset-tags.sh
# O interactivamente:
./gh-reset-tags.sh
```

---

### 🧹 gh-remove-releases-files.sh
**Propósito:** Limpiar releases de gh-pages

**Acciones:**
- Cambia a rama gh-pages
- Elimina contenido de directorio releases/
- Elimina index.html en gh-pages
- Hace commit con mensaje de limpieza
- Pushea cambios a origin/gh-pages

**Uso:**
```bash
echo "sí" | ./gh-remove-releases-files.sh
```

---

## Estructura de Directorios (gh-pages)

```
gh-pages/
├── index.html                 # Índice principal (regenerado en cada deploy)
├── releases/
│   ├── v1.0.0/
│   │   ├── index.html        # Copia del juego
│   │   ├── game.js
│   │   ├── main.js
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   ├── ...              # Otros archivos de juego
│   │   └── .pet-name        # "brave-wave"
│   ├── v1.1.0/
│   │   ├── ...
│   │   └── .pet-name        # "turbo-flash"
│   └── v1.2.0/
│       ├── ...
│       └── .pet-name        # "frost-wave"
├── .nojekyll
└── README.md
```

---

## Versioning System

### Semantic Versioning (SemVer)
Format: `v{MAJOR}.{MINOR}.{PATCH}`

**Example progression:**
- v1.0.0 (first release)
- v1.1.0 (minor update)
- v1.1.1 (patch fix)
- v2.0.0 (major breaking change)

### Pet Names
- **Generated:** Auto-generado basado en hash del commit
- **Format:** `{adjective}-{noun}`
- **Examples:** "brave-wave", "turbo-flash", "frost-wave"
- **Purpose:** Identificación memorable de cada versión

### Release ID
- **Format:** `v{MAJOR}.{MINOR}.{PATCH}-{pet-name}`
- **Example:** `v1.0.0-brave-wave`
- **Storage:** 
  - Embebido en game.js (badge visible)
  - En archivo .pet-name en cada release
  - En tag de Git

---

## Workflow Example

### Scenario 1: First Deployment
```bash
# 1. Verify clean state
./gh-verify-indexhtml.sh
# Output: ℹ️ NO HAY RELEASES YET

# 2. Deploy first version
./gh-deploy-version.sh
# Creates: v1.0.0-{petname}

# 3. Verify
./gh-verify-indexhtml.sh
# Output: ✅ EXITOSA
```

### Scenario 2: Cleanup & Restart
```bash
# 1. Remove old tags
./gh-reset-tags.sh

# 2. Remove old releases
./gh-remove-releases-files.sh

# 3. Verify empty state
./gh-verify-indexhtml.sh

# 4. Deploy new version (starts from v1.0.0 again)
./gh-deploy-version.sh
```

### Scenario 3: Continuous Deployment
```bash
# Keep deploying new versions
./gh-deploy-version.sh  # Creates v1.0.0
./gh-deploy-version.sh  # Creates v1.1.0
./gh-deploy-version.sh  # Creates v1.2.0

# Verify all at once
./gh-verify-indexhtml.sh
# Shows: 3 releases, all synchronized ✅
```

---

## Troubleshooting

### Issue: "No se pudo cambiar a gh-pages"
**Solution:**
```bash
git fetch origin gh-pages
./gh-verify-indexhtml.sh
```

### Issue: "releases/ no encontrado"
**Expected for:** Fresh gh-pages setup
**Solution:** Run first deploy, script creates directory automatically

### Issue: "index.html NO está en index.html"
**Cause:** Deploy script didn't update index.html correctly
**Solution:** 
```bash
./gh-verify-indexhtml.sh  # See detailed errors
# Check gh-deploy-version.sh logic
```

### Issue: "Commit no genera nuevo tag"
**Solution:**
```bash
git tag -l  # List existing tags
git push origin --delete v1.0.0  # Remove remote if needed
./gh-reset-tags.sh  # Clean local
./gh-deploy-version.sh  # Try again
```

---

## Testing Checklist

- [ ] `gh-verify-indexhtml.sh` shows ✅ when releases exist
- [ ] `gh-verify-indexhtml.sh` shows ℹ️ when no releases
- [ ] `gh-deploy-version.sh` creates next version correctly
- [ ] Pet names are generated uniquely
- [ ] index.html in gh-pages lists all versions
- [ ] Each release directory has all necessary files
- [ ] .pet-name files exist in each release
- [ ] Tags are created correctly
- [ ] Tags are pushed to origin
- [ ] Clean provides working directory

---

**Last Updated:** 26 de Enero de 2026  
**Status:** ✅ Production Ready
