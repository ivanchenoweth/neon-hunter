# Neon Hunter

**Neon Hunter** is a vibrant arcade-style survival and action game. The main objective is to **control a neon hunter and survive** as long as possible in a hostile environment while collecting coins and eliminating waves of enemies.

Designed with a high-performance modular architecture, the game offers a smooth experience (60 FPS) and is optimized from the ground up for a future transition to massive multiplayer.

## 🚀 Architecture and Optimizations

The game engine has been designed following advanced game development principles to ensure fluidity (60 FPS) and scalability.

### 1. State and Rendering Separation (Multiplayer Ready)

Unlike simple games where logic and drawing are mixed, Neon Hunter separates these responsibilities:

- **State Logic (`updateState`)**: Handles physics, collisions, and game rules. This code is **authoritative** and ready to be moved to a server (Node.js).
- **Visual Logic (`updateVisuals`)**: Manages side effects like particles, trails, and environmental animations that don't affect the game outcome.
- **Rendering (`draw`)**: Purely visual, in charge of drawing the current state on the `<canvas>`.

### 2. Spatial Grid Algorithm

To avoid the costly "all-versus-all" (O(n²)) collision calculation, we use a **Spatial Grid** (`SpatialGrid.js`):

- The world is divided into 400x400px cells.
- Each entity is registered only in the cell where it is located.
- Collisions are only checked against entities in adjacent cells, drastically reducing computational load and allowing hundreds of simultaneous objects without lag.

### 3. Object Pooling

To avoid "Garbage Collection stutter" (pauses due to memory release), we implemented an **Object Pooling** system (`ObjectPool.js`):

- Bullets, enemies, and particles are not constantly created and destroyed.
- "Dead" objects are reused from a pre-allocated pool, maintaining a stable memory footprint and smooth performance.

---

## 👾 Enemy Behavior

Enemies in Neon Hunter exhibit specific behaviors designed to challenge the player:

- **Aggressive Chasing**: Enemies constantly calculate the vector towards the player and move at a speed relative to the player's (up to 120% of the player's nominal speed, with a maximum of 180 units/sec) to intercept them.
- **Social Separation**: They implement a separation algorithm. If they get too close to each other, they apply a "push" force to avoid overlapping, creating a "swarming" effect rather than stacking.
- **Dynamic Spawning**:
    - They spawn at a safe distance from the player (between 600 and 1000 units).
    - The spawner ensures they appear near the current camera view but not directly on top of the player.
    - If an enemy goes too far off-screen, it is automatically recycled and repositioned near the player's current view.
- **Combat & Effects**:
    - On collision with the player, the enemy is destroyed, the player takes damage, and a camera shake effect is triggered.
    - When shot by a bullet, they explode into multiple neon particles and grant points.

---

## 🎮 Controls and UI

- **Movement**: `W`, `A`, `S`, `D` keys.
- **Shooting**: Left mouse click.
- **Interface**:
  - **Score**, **Coins**, and **FPS** are drawn directly to the canvas buffer to minimize DOM overhead.
  - The game includes a tactical **Minimap** in the top-right corner.

## 🛠️ Multiplayer Development

The `game.js` file includes hooks prepared for networking:

- `sendInputToServer()`: Entry point for WebSockets to send inputs.
- `onServerUpdateReceived()`: To synchronize the global state from a server.

## 📦 Installation and Execution

### Run in the browser (without using `npm run start`) ✅

You can test the game in your local browser without using the `npm run start` script:

- **Option A — Open directly (simple):** Open `index.html` with your browser (`file://` path). *Note:* some browsers may restrict modules or requests for security; if you see errors in the console, use Option B.

- **Option B — Quick static server (recommended):** If you have Python installed, run this in the project root:
  ```bash
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000` in your browser.

- **Option C — Serve with Node.js without using `npm run start`:** If you prefer using Node.js without running an `npm` script, you can use `npx` to run a temporary server:
  ```bash
  npx serve . -l 8000
  ```
  (This requires Node.js installed but doesn't need to create or run a script in `package.json`.)

### Multiplayer mode with Node.js (Socket.IO) 🔧

The project includes `server.js` for multiplayer mode using Express + Socket.IO.

1. Ensure you have Node.js installed (v20+).
2. Install dependencies (first time only):
   ```bash
   npm install
   ```
   This will install `express` and `socket.io` as listed in `package.json`.
3. Start the server with Node (without `npm run start`):
   ```bash
   node server.js
   ```
   By default, it listens on `http://localhost:3000`, but it can also read the `PORT` environment variable. For example:
   ```bash
   PORT=4000 node server.js
   ```
   (In Windows PowerShell use: `$env:PORT=4000; node server.js`.)

   There is also a convenient npm script included in `package.json`:
   ```bash
   npm run start:port
   ```
   **Recommended (portable):** This script starts the server on port `4000` by default if `PORT` is not defined, using a small Node wrapper that works on all platforms.

   - To use another port, define the `PORT` variable before running the script:
     - Linux/macOS:
       ```bash
       PORT=5000 npm run start:port
       ```
     - PowerShell (Windows):
       ```powershell
       $env:PORT=5000; npm run start:port
       ```

   Note: `cross-env` was kept in `devDependencies` as an alternative option if preferred.

4. Open `http://localhost:3000` (or `http://localhost:<PORT>` if you used another configuration) in one or more browsers/devices to test multiplayer. The default server allows connections from any origin (CORS: "*") to facilitate local testing; in production, you should restrict `ALLOWED_ORIGIN`:

```bash
ALLOWED_ORIGIN=https://example.com PORT=4000 node server.js
```

You can also specify a different public directory with the `PUBLIC_DIR` variable (recommended in production):

```bash
PUBLIC_DIR=public PORT=4000 node server.js
```

The server handles `SIGINT` and `SIGTERM` signals and performs a graceful shutdown to close active connections.

> Note: If you need to change the port in local testing or production, set the `PORT` environment variable before starting the server. If you prefer, you can also edit `server.js`.

**Requirement:** This project requires **Node.js v20 or higher** (`engines.node` in `package.json`).

**Note:** The `cross-env@^10` dependency requires Node.js v20+. If you need support for Node 16/18 in your environment, consider using an earlier version of `cross-env` or adjusting the dependency in `package.json`.

### TODOs / Next Steps ✅

- [ ] **Add basic integration tests** that start and stop the server (start/shutdown) and verify that endpoints and socket events work. Use `module.exports = { server, io }` for testing control.
- [ ] Add a `public/` folder with an example `index.html` to facilitate local testing and deployments.
- [ ] Document the production deployment flow (e.g., `pm2`, `systemd`) and recommendations for `ALLOWED_ORIGIN`.

### Quick Tips 📝

- For testing on the local network, use the machine's IP (e.g., `http://192.168.1.5:3000`).
- To keep the server running in the background on Linux, consider `nohup node server.js &` or using `pm2`.

---

game.toggleDebug()

**Author:** Ivan R. Chenoweth
