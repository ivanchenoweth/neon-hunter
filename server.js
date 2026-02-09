const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const io = new Server(server, { cors: { origin: allowedOrigin } });

const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, '.');
app.use(express.static(publicDir)); // Serve static files from explicit dir (default: project root)

const players = {};
let hostId = null;

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

// Server-side Game State
const gameState = {
  warpLevel: 1,
  killCount: 0,
  killQuota: 100,
  spawnArea: null
};

function randomizeSpawnArea() {
  const areaSize = 800; // Same as client
  const halfW = WORLD_WIDTH / 2;
  const halfH = WORLD_HEIGHT / 2;

  // Ensure the area is within world bounds
  const x = (Math.random() * (WORLD_WIDTH - areaSize)) - halfW;
  const y = (Math.random() * (WORLD_HEIGHT - areaSize)) - halfH;

  gameState.spawnArea = { x, y, w: areaSize, h: areaSize };
  console.log('New Spawn Area:', gameState.spawnArea);
  // Broadcast to all clients
  io.emit('spawnAreaUpdated', gameState.spawnArea);
}

// Initial Spawn Area
randomizeSpawnArea();

function getNextAvailableIndex() {
  const usedIndices = Object.values(players).map(p => p.index);
  let index = 1;
  while (usedIndices.includes(index)) {
    index++;
  }
  return index;
}

function getRandomSpawnPoint() {
  const playersArr = Object.values(players);
  let bestPos = { x: 0, y: 0 };
  let maxMinDist = -1;
  const safeDistance = 1000; // Minimum distance from spawn area center

  // Try 20 random positions
  for (let i = 0; i < 20; i++) {
    const testPos = {
      x: (Math.random() - 0.5) * (WORLD_WIDTH * 0.8),
      y: (Math.random() - 0.5) * (WORLD_HEIGHT * 0.8)
    };

    // 1. Check strict collision/proximity with Spawn Area
    if (gameState.spawnArea) {
      const spawnCenterX = gameState.spawnArea.x + gameState.spawnArea.w / 2;
      const spawnCenterY = gameState.spawnArea.y + gameState.spawnArea.h / 2;
      const distToSpawn = Math.sqrt(Math.pow(testPos.x - spawnCenterX, 2) + Math.pow(testPos.y - spawnCenterY, 2));

      // If too close to enemy spawn, discard this point immediately
      if (distToSpawn < safeDistance) continue;
    }

    // 2. Maximize distance from other players
    if (playersArr.length === 0) return testPos;

    let minDist = Infinity;
    playersArr.forEach(p => {
      const d = Math.sqrt(Math.pow(p.x - testPos.x, 2) + Math.pow(p.y - testPos.y, 2));
      if (d < minDist) minDist = d;
    });

    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestPos = testPos;
    }
  }

  // If we couldn't find a "best" one, force a safe position
  if (maxMinDist === -1) {
    if (gameState.spawnArea) {
      // Place at opposite quadrant
      bestPos.x = -gameState.spawnArea.x;
      bestPos.y = -gameState.spawnArea.y;
    }
  }

  return bestPos;
}

io.on('connection', (socket) => {
  const index = getNextAvailableIndex();
  console.log(`Jugador conectado: ${socket.id} (P${index})`);

  // Initial state for the new player with random spawn
  const spawn = getRandomSpawnPoint();

  players[socket.id] = {
    id: socket.id,
    index: index,
    x: spawn.x,
    y: spawn.y,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    fireDirection: { x: 0, y: -1 },
    score: 0,
    kills: 0,
    isHost: false
  };

  // If no host, assign this player as host
  if (!hostId) {
    hostId = socket.id;
    players[socket.id].isHost = true;
    socket.emit('isHost'); // Direct host confirmation
  }

  // Send the current players and host info to the new player
  socket.emit('currentPlayers', players);
  socket.emit('hostAssigned', hostId);

  // Send authoritative Server State immediately
  socket.emit('serverGameState', gameState);

  // Notify others about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('playerMove', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].fireDirection = movementData.fireDirection;
      // Relay to others
      socket.broadcast.emit('playerMoved', { id: socket.id, ...movementData });
    }
  });

  socket.on('updateStats', (stats) => {
    if (players[socket.id]) {
      players[socket.id].score = stats.score;
      players[socket.id].kills = stats.kills;
      socket.broadcast.emit('statsUpdated', { id: socket.id, ...stats });
    }
  });

  // Host-specific events (for entity spawning logic that is still host-driven)
  socket.on('enemySpawned', (enemyData) => {
    if (socket.id === hostId) {
      socket.broadcast.emit('enemySpawned', enemyData);
    }
  });

  socket.on('foodSpawned', (foodData) => {
    if (socket.id === hostId) {
      socket.broadcast.emit('foodSpawned', foodData);
    }
  });

  socket.on('syncEnemies', (enemiesData) => {
    if (socket.id === hostId) {
      socket.broadcast.emit('syncEnemies', enemiesData);
    }
  });

  socket.on('pauseGame', () => {
    if (socket.id === hostId) {
      socket.broadcast.emit('gamePaused');
    }
  });

  socket.on('resumeGame', () => {
    if (socket.id === hostId) {
      socket.broadcast.emit('gameResumed');
    }
  });

  socket.on('playerShoot', (shootData) => {
    socket.broadcast.emit('playerFired', { id: socket.id, ...shootData });
  });

  socket.on('enemyKilled', (enemyId) => {
    // Relay destruction for visual effects
    socket.broadcast.emit('enemyDestroyed', enemyId);

    // Update Server State (Authoritative Kill Tracking)
    gameState.killCount++;
    io.emit('killCountUpdate', gameState.killCount);

    // Debug log to check progress
    console.log(`Enemy Killed! Current: ${gameState.killCount}, Target: ${gameState.killQuota}, Level: ${gameState.warpLevel}`);

    if (gameState.killCount >= gameState.killQuota) {
      // WARP!
      console.log(`--- TRIGGERING WARP (Count ${gameState.killCount} >= ${gameState.killQuota}) ---`);

      gameState.warpLevel++;
      gameState.killCount = 0;
      // Maybe scale quota slightly? Or keep flat? Let's bump it slightly for fun, or not.
      // gameState.killQuota += 20;

      // Randomize spawn area for next level
      randomizeSpawnArea();

      // Broadcast Warp event with new state
      io.emit('warpLevelUp', gameState);
    }
  });

  socket.on('spawnAreaUpdated', (spawnAreaData) => {
    // Ignore client updates for spawn area, server is authority
    // (Optionally log it)
  });

  socket.on('foodCollected', (foodId) => {
    socket.broadcast.emit('foodCollected', foodId);
  });

  socket.on('requestWorldState', () => {
    // Always send server state first
    socket.emit('serverGameState', gameState);

    // Then ask host for dynamic entities if someone else is host
    if (hostId && hostId !== socket.id) {
      io.to(hostId).emit('requestWorldState', socket.id);
    }
  });

  socket.on('worldState', (data) => {
    // Relay world state from host to the specific player who requested it
    if (data.to) {
      // Overwrite with Server Authority
      data.state.warpLevel = gameState.warpLevel;
      data.state.warpLevelKillCount = gameState.killCount;
      data.state.killQuota = gameState.killQuota;
      data.state.spawnArea = gameState.spawnArea;

      io.to(data.to).emit('worldState', data.state);
    }
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    console.log(`Jugador desconectado: ${socket.id} (P${player ? player.index : '?'})`);
    const wasHost = (socket.id === hostId);
    delete players[socket.id];

    if (wasHost) {
      hostId = Object.keys(players)[0] || null;
      if (hostId) {
        players[hostId].isHost = true;
        io.emit('hostAssigned', hostId);
        io.to(hostId).emit('isHost'); // Notify the new host
      }
    }

    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
const serverInstance = server.listen(PORT, () => {
  console.log(`🎮 Neon Hunter server en puerto ${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`Received ${signal}. Closing server...`);
  serverInstance.close(() => {
    io.close();
    console.log('Server closed. Exiting.');
    process.exit(0);
  });
  // Force exit if not closed after timeout
  setTimeout(() => {
    console.error('Forcing shutdown.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export server and io for testing or external control
module.exports = { server: serverInstance, io };
