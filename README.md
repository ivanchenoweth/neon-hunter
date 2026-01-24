# Neon Hunter

**Neon Hunter** es un vibrante juego tipo arcade de supervivencia y acción. El objetivo principal es **controlar a un cazador neon y sobrevivir** el mayor tiempo posible en un entorno hostil mientras recolectas monedas (coins) y eliminas oleadas de enemigos.

Diseñado con una arquitectura modular de alto rendimiento, el juego ofrece una experiencia fluida (60 FPS) y está optimizado desde sus cimientos para una futura transición a multijugador masivo.

## 🚀 Arquitectura y Optimizaciones

El motor del juego ha sido diseñado siguiendo principios avanzados de desarrollo de videojuegos para garantizar fluidez (60 FPS) y escalabilidad.

### 1. Separación de Estado y Renderizado (Multiplayer Ready)

A diferencia de los juegos sencillos donde la lógica y el dibujo están mezclados, Neon Hunter separa estas responsabilidades:

- **Lógica de Estado (`updateState`)**: Maneja la física, colisiones y reglas del juego. Este código es **autoritativo** y está listo para ser movido a un servidor (Node.js).
- **Lógica Visual (`updateVisuals`)**: Gestiona efectos secundarios como partículas, estelas (trails) y animaciones de ambiente que no afectan el resultado del juego.
- **Renderizado (`draw`)**: Puramente visual, encargado de dibujar el estado actual en el `<canvas>`.

### 2. Algoritmo de Cuadrícula Espacial (Spatial Grid)

Para evitar el costoso cálculo de colisiones de "todos contra todos" (O(n²)), utilizamos una **Spatial Grid** (`SpatialGrid.js`):

- El mundo se divide en celdas de 400x400px.
- Cada entidad se registra solo en la celda donde se encuentra.
- Las colisiones solo se verifican contra entidades en celdas adyacentes, reduciendo drásticamente la carga computacional y permitiendo cientos de objetos simultáneos sin lag.

### 3. Agrupación de Objetos (Object Pooling)

Para evitar el "Garbage Collection stutter" (pausas por liberación de memoria), implementamos un sistema de **Object Pooling** (`ObjectPool.js`):

- Las balas, enemigos y partículas no se crean y destruyen constantemente.
- Se reutilizan objetos "muertos" de una reserva pre-asignada, manteniendo una huella de memoria estable y un rendimiento fluido.


---

## 🎮 Controles y UI

- **Movimiento**: Teclas `W`, `A`, `S`, `D`.
- **Disparo**: Click izquierdo del ratón.
- **Interfaz**:
  - El **Score**, **Coins** y **FPS** se dibujan directamente en el buffer del canvas para minimizar el overhead del DOM.
  - El juego incluye un **Minimap** táctico en la esquina inferior derecha.

## 🛠️ Desarrollo Multijugador

El archivo `game.js` incluye hooks preparados para networking:

- `sendInputToServer()`: Punto de entrada para WebSockets para enviar inputs.
- `onServerUpdateReceived()`: Para sincronizar el estado global desde un servidor.

## 📦 Instalación y Ejecución

### Ejecutar en el navegador (sin usar `npm run start`) ✅

Puedes probar el juego en tu navegador local sin usar el script `npm run start`:

- **Opción A — Abrir directamente (simple):** Abrir `index.html` con el navegador (ruta `file://`). *Nota:* algunos navegadores pueden restringir módulos o peticiones por seguridad; si ves errores en la consola usa la Opción B.

- **Opción B — Servidor estático rápido (recomendado):** Si tienes Python instalado, en la raíz del proyecto ejecuta:
  ```bash
  python3 -m http.server 8000
  ```
  luego abre `http://localhost:8000` en tu navegador.

- **Opción C — Servir con Node.js sin usar `npm run start`:** Si prefieres usar Node.js sin ejecutar un script `npm`, puedes usar `npx` para ejecutar un servidor temporal:
  ```bash
  npx serve . -l 8000
  ```
  (Esto requiere Node.js instalado, pero no necesita crear o ejecutar un script en `package.json`.)

### Modo multijugador con Node.js (Socket.IO) 🔧

El proyecto incluye `server.js` para el modo multijugador usando Express + Socket.IO.

1. Asegúrate de tener Node.js instalado (v16+).
2. Instala dependencias (solo la primera vez):
   ```bash
   npm install
   ```
   Esto instalará `express` y `socket.io` como aparecen en `package.json`.
3. Inicia el servidor con Node (sin `npm run start`):
   ```bash
   node server.js
   ```
   Por defecto escucha en `http://localhost:3000`, pero también puede leer la variable de entorno `PORT`. Por ejemplo:
   ```bash
   PORT=4000 node server.js
   ```
   (En PowerShell de Windows usa: `$env:PORT=4000; node server.js`.)

   También hay un script npm conveniente incluido en `package.json`:
   ```bash
   npm run start:port
   ```
   **Recomendado (portátil):** Este script arranca el servidor en el puerto `4000` por defecto si `PORT` no está definido, usando un pequeño wrapper en Node que funciona en todas las plataformas.

   - Para usar otro puerto, define la variable `PORT` antes de ejecutar el script:
     - Linux/macOS:
       ```bash
       PORT=5000 npm run start:port
       ```
     - PowerShell (Windows):
       ```powershell
       $env:PORT=5000; npm run start:port
       ```

   También puedes ejecutar directamente sin npm:
   ```bash
   PORT=5000 node server.js
   ```

   Nota: `cross-env` se mantuvo en `devDependencies` como opción alternativa si la prefieres.

4. Abre `http://localhost:3000` (o `http://localhost:<PORT>` si usaste otra configuración) en uno o varios navegadores/dispositivos para probar el multijugador. El servidor por defecto permite conexiones desde cualquier origen (CORS: "*") para facilitar pruebas locales; en producción deberías restringir `ALLOWED_ORIGIN`:

```bash
ALLOWED_ORIGIN=https://example.com PORT=4000 node server.js
```

Puedes también especificar un directorio público diferente con la variable `PUBLIC_DIR` (recomendado en producción):

```bash
PUBLIC_DIR=public PORT=4000 node server.js
```

El servidor maneja señales `SIGINT` y `SIGTERM` y realiza un apagado ordenado (graceful shutdown) para cerrar conexiones activas.

> Nota: Si necesitas cambiar el puerto en pruebas locales o producción, establece la variable de entorno `PORT` antes de iniciar el servidor (por ejemplo `PORT=4000 node server.js`). Si prefieres, también puedes editar `server.js`.

**Requisito:** Este proyecto requiere **Node.js v20 o superior** (`engines.node` en `package.json`).

**Nota:** La dependencia `cross-env@^10` requiere Node.js v20+. Si necesitas soporte para Node 16/18 en tu entorno, considera usar una versión anterior de `cross-env` o ajustar la dependencia en `package.json`.

---

## 📦 Liberación de Versiones

El proyecto incluye un script automatizado para desplegar versiones del juego a **GitHub Pages**.

### Configuración inicial (solo una vez)

1. **Habilita GitHub Pages en tu repositorio:**
   - Ve a: `https://github.com/[tu-usuario]/neon-hunter/settings/pages`
   - En **"Source"**, selecciona:
     - **Branch:** `gh-pages`
     - **Folder:** `/ (root)`
   - Haz clic en **"Save"**

2. **Asegúrate de tener permisos de escritura** en la rama `gh-pages`.

### Cómo liberar una nueva versión

El nuevo sistema de despliegue es completamente automático y puede ejecutarse desde cualquier rama.

```bash
# Ejecuta el script sin argumentos
./deploy-version.sh
```

El script automáticamente:
1.  🔮 **Calcula la siguiente versión** (v3.0 -> v4.0, etc.)
2.  🐾 **Genera un Pet Name** único basado en el commit (ej. `frost-ranger`, `cyber-dragon`)
3.  🏷️ **Crea un Tag** de Git con toda la metadata
4.  📦 **Crea un GitHub Release** con notas automáticas (si tienes `gh` CLI instalado)
5.  🚀 **Despliega a GitHub Pages** y actualiza el índice de versiones

**Ejemplo de flujo de trabajo:**

1.  Estás trabajando en una nueva feature en la rama `feat/naves-enemigas`
2.  Terminas tus cambios y haces commit
3.  Ejecutas `./deploy-version.sh`
4.  ¡Listo! Se crea la versión `v4.0-neon-viper` (ejemplo) y te da el link para probarla.

### URLs de acceso

Después del despliegue (tarda 1-2 minutos en estar disponible):

- **Índice de versiones:** `https://[tu-usuario].github.io/neon-hunter/`
- **Versión específica:** `https://[tu-usuario].github.io/neon-hunter/releases/v3.0/`

**Ejemplo:**
- Índice: https://ivanchenoweth.github.io/neon-hunter/
- Versión 3.0: https://ivanchenoweth.github.io/neon-hunter/releases/v3.0/

### Notas importantes

- 📌 **No necesitas especificar versión**, el script la calcula sola.
- 📌 El script **NO** modifica tu rama de trabajo actual (usa worktrees).
- 📌 Cada versión se mantiene independiente en su carpeta.
- 📌 El pet name (`frost-ranger`) es determinístico: siempre será el mismo para el mismo commit.
- 📌 El archivo `.nojekyll` en `gh-pages` asegura que GitHub Pages sirva todos los archivos correctamente.

---

### TODOs / Próximos pasos ✅

- [ ] **Agregar tests de integración básicos** que arranquen y apaguen el servidor (start/shutdown) y verifiquen que endpoints y socket events funcionen. Aprovechar `module.exports = { server, io }` para control en pruebas.
- [ ] Añadir una carpeta `public/` con un ejemplo `index.html` para facilitar pruebas locales y despliegues.
- [ ] Documentar el flujo de despliegue en producción (ej. `pm2`, `systemd`) y recomendaciones para `ALLOWED_ORIGIN`.

### Consejos rápidos 📝

- Para pruebas en la red local, usa la IP de la máquina (ej. `http://192.168.1.5:3000`).
- Para mantener el servidor en ejecución en segundo plano en Linux, considera `nohup node server.js &` o usar `pm2`.

---

**Autor:** Ivan R. Chenoweth
