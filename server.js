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

  // Try 10 random positions and pick the one farthest from the closest player
  for (let i = 0; i < 10; i++) {
    const testPos = {
      x: (Math.random() - 0.5) * (WORLD_WIDTH * 0.8),
      y: (Math.random() - 0.5) * (WORLD_HEIGHT * 0.8)
    };

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

  // Host-specific events
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
    socket.broadcast.emit('enemyDestroyed', enemyId);
  });

  socket.on('spawnAreaUpdated', (spawnAreaData) => {
    if (socket.id === hostId) {
      socket.broadcast.emit('spawnAreaUpdated', spawnAreaData);
    }
  });

  socket.on('foodCollected', (foodId) => {
    socket.broadcast.emit('foodCollected', foodId);
  });

  socket.on('requestWorldState', () => {
    if (hostId && hostId !== socket.id) {
      io.to(hostId).emit('requestWorldState', socket.id);
    }
  });

  socket.on('worldState', (data) => {
    // Relay world state from host to the specific player who requested it
    if (data.to) {
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
