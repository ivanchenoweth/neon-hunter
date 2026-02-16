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

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

// Multiple Rooms State
const rooms = {};

function createRoom(roomId) {
  if (rooms[roomId]) return rooms[roomId];

  const room = {
    id: roomId,
    players: {},
    hostId: null,
    gameState: {
      warpLevel: 1,
      killCount: 0,
      killQuota: 100,
      spawnArea: null,
      processedKills: [] // Track unique kills per level
    }
  };

  // Initial Spawn Area for the room
  randomizeSpawnArea(room);
  rooms[roomId] = room;
  console.log(`Room created: ${roomId}`);
  return room;
}

function randomizeSpawnArea(room) {
  const areaSize = 800;
  const halfW = WORLD_WIDTH / 2;
  const halfH = WORLD_HEIGHT / 2;

  const x = (Math.random() * (WORLD_WIDTH - areaSize)) - halfW;
  const y = (Math.random() * (WORLD_HEIGHT - areaSize)) - halfH;

  room.gameState.spawnArea = { x, y, w: areaSize, h: areaSize };
  console.log(`[Room ${room.id}] New Spawn Area:`, room.gameState.spawnArea);
  io.to(room.id).emit('spawnAreaUpdated', room.gameState.spawnArea);
}

function getNextAvailableIndex(room) {
  const usedIndices = Object.values(room.players).map(p => p.index);
  let index = 1;
  while (usedIndices.includes(index)) {
    index++;
  }
  return index;
}

function getRandomSpawnPoint(room) {
  const playersArr = Object.values(room.players);
  let bestPos = { x: 0, y: 0 };
  let maxMinDist = -1;
  const safeDistance = 1000;

  for (let i = 0; i < 20; i++) {
    const testPos = {
      x: (Math.random() - 0.5) * (WORLD_WIDTH * 0.8),
      y: (Math.random() - 0.5) * (WORLD_HEIGHT * 0.8)
    };

    if (room.gameState.spawnArea) {
      const spawnCenterX = room.gameState.spawnArea.x + room.gameState.spawnArea.w / 2;
      const spawnCenterY = room.gameState.spawnArea.y + room.gameState.spawnArea.h / 2;
      const distToSpawn = Math.sqrt(Math.pow(testPos.x - spawnCenterX, 2) + Math.pow(testPos.y - spawnCenterY, 2));
      if (distToSpawn < safeDistance) continue;
    }

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

  if (maxMinDist === -1 && room.gameState.spawnArea) {
    bestPos.x = -room.gameState.spawnArea.x;
    bestPos.y = -room.gameState.spawnArea.y;
  }

  return bestPos;
}

io.on('connection', (socket) => {
  let currentRoom = null;

  console.log(`Socket conectado: ${socket.id}`);

  socket.on('listRooms', () => {
    const activeRooms = Object.keys(rooms).filter(id => Object.keys(rooms[id].players).length > 0);
    socket.emit('roomsList', activeRooms);
  });

  socket.on('joinRoom', (roomId) => {
    if (currentRoom) {
      socket.leave(currentRoom.id);
      // Clean up player from old room
      delete currentRoom.players[socket.id];
      // Handled in disconnect logic but let's be safe
    }

    const room = createRoom(roomId);
    currentRoom = room;
    socket.join(roomId);

    const index = getNextAvailableIndex(room);
    const spawn = getRandomSpawnPoint(room);

    room.players[socket.id] = {
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

    if (!room.hostId) {
      room.hostId = socket.id;
      room.players[socket.id].isHost = true;
      socket.emit('isHost');
    }

    socket.emit('currentPlayers', room.players);
    socket.emit('hostAssigned', room.hostId);
    socket.emit('serverGameState', room.gameState);
    socket.broadcast.to(roomId).emit('newPlayer', room.players[socket.id]);

    console.log(`Jugador ${socket.id} (P${index}) unido a sala ${roomId}`);
  });

  socket.on('playerMove', (movementData) => {
    if (currentRoom && currentRoom.players[socket.id]) {
      currentRoom.players[socket.id].x = movementData.x;
      currentRoom.players[socket.id].y = movementData.y;
      currentRoom.players[socket.id].fireDirection = movementData.fireDirection;
      socket.broadcast.to(currentRoom.id).emit('playerMoved', { id: socket.id, ...movementData });
    }
  });

  socket.on('updateStats', (stats) => {
    if (currentRoom && currentRoom.players[socket.id]) {
      const player = currentRoom.players[socket.id];
      player.score = stats.score;
      player.kills = stats.kills;

      // If host restarts (state moves from GAME_OVER/SPECTATING to PLAYING), reset room state
      if (player.isHost && stats.gameState === 'PLAYING') {
        if (currentRoom.gameState.warpLevel !== 1 || currentRoom.gameState.killCount !== 0) {
          console.log(`[RESET] Room ${currentRoom.id} reset by host ${socket.id}`);
          currentRoom.gameState.warpLevel = 1;
          currentRoom.gameState.killCount = 0;
          currentRoom.gameState.processedKills = [];

          // Broadcast reset to all
          io.to(currentRoom.id).emit('serverGameState', currentRoom.gameState);
          io.to(currentRoom.id).emit('killCountUpdate', 0);
        }
      }

      socket.broadcast.to(currentRoom.id).emit('statsUpdated', { id: socket.id, ...stats });
    }
  });

  socket.on('enemySpawned', (enemyData) => {
    if (currentRoom && socket.id === currentRoom.hostId) {
      socket.broadcast.to(currentRoom.id).emit('enemySpawned', enemyData);
    }
  });

  socket.on('foodSpawned', (foodData) => {
    if (currentRoom && socket.id === currentRoom.hostId) {
      socket.broadcast.to(currentRoom.id).emit('foodSpawned', foodData);
    }
  });

  socket.on('syncEnemies', (enemiesData) => {
    if (currentRoom && socket.id === currentRoom.hostId) {
      socket.broadcast.to(currentRoom.id).emit('syncEnemies', enemiesData);
    }
  });

  socket.on('pauseGame', () => {
    if (currentRoom && socket.id === currentRoom.hostId) {
      socket.broadcast.to(currentRoom.id).emit('gamePaused');
    }
  });

  socket.on('resumeGame', () => {
    if (currentRoom && socket.id === currentRoom.hostId) {
      socket.broadcast.to(currentRoom.id).emit('gameResumed');
    }
  });

  socket.on('playerShoot', (shootData) => {
    if (currentRoom) {
      socket.broadcast.to(currentRoom.id).emit('playerFired', { id: socket.id, ...shootData });
    }
  });

  socket.on('enemyKilled', (enemyId, attackerId) => {
    if (!currentRoom) return;

    // Use attackerId if provided (from host), otherwise fall back to socket.id
    const killerId = attackerId || socket.id;

    // Duplicate detection: Only process kill if enemyId is new for this level
    if (currentRoom.gameState.processedKills.includes(enemyId)) {
      return;
    }
    currentRoom.gameState.processedKills.push(enemyId);

    socket.broadcast.to(currentRoom.id).emit('enemyDestroyed', enemyId);
    currentRoom.gameState.killCount++;

    if (currentRoom.players[killerId]) {
      currentRoom.players[killerId].kills++;

      // Broadcast updated stats to all clients
      io.to(currentRoom.id).emit('statsUpdated', {
        id: killerId,
        score: currentRoom.players[killerId].score,
        kills: currentRoom.players[killerId].kills
      });
      console.log(`[KILL] Room: ${currentRoom.id}, Killer: ${killerId}, Kills: ${currentRoom.players[killerId].kills}, Room Total: ${currentRoom.gameState.killCount}`);
    }

    io.to(currentRoom.id).emit('killCountUpdate', currentRoom.gameState.killCount);

    if (currentRoom.gameState.killCount >= currentRoom.gameState.killQuota) {
      console.log(`[WARP] Room: ${currentRoom.id} reaching quota ${currentRoom.gameState.killQuota}`);
      currentRoom.gameState.warpLevel++;
      currentRoom.gameState.killCount = 0;
      currentRoom.gameState.processedKills = []; // Reset for new level
      randomizeSpawnArea(currentRoom);
      io.to(currentRoom.id).emit('warpLevelUp', currentRoom.gameState);
    }
  });

  socket.on('playerHit', (hitData) => {
    if (currentRoom && hitData.targetId) {
      // Forward the "take damage" signal only to the specific client that was hit
      io.to(hitData.targetId).emit('takeDamage');
    }
  });

  socket.on('foodCollected', (foodId) => {
    if (currentRoom) {
      socket.broadcast.to(currentRoom.id).emit('foodCollected', foodId);
    }
  });

  socket.on('requestWorldState', () => {
    if (!currentRoom) return;
    socket.emit('serverGameState', currentRoom.gameState);
    if (currentRoom.hostId && currentRoom.hostId !== socket.id) {
      io.to(currentRoom.hostId).emit('requestWorldState', socket.id);
    }
  });

  socket.on('worldState', (data) => {
    if (currentRoom && data.to) {
      data.state.warpLevel = currentRoom.gameState.warpLevel;
      data.state.warpLevelKillCount = currentRoom.gameState.killCount;
      data.state.killQuota = currentRoom.gameState.killQuota;
      data.state.spawnArea = currentRoom.gameState.spawnArea;
      io.to(data.to).emit('worldState', data.state);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const player = currentRoom.players[socket.id];
      console.log(`Jugador desconectado: ${socket.id} (P${player ? player.index : '?'}) de sala ${currentRoom.id}`);
      const wasHost = (socket.id === currentRoom.hostId);
      delete currentRoom.players[socket.id];

      if (wasHost) {
        currentRoom.hostId = Object.keys(currentRoom.players)[0] || null;
        if (currentRoom.hostId) {
          currentRoom.players[currentRoom.hostId].isHost = true;
          io.to(currentRoom.id).emit('hostAssigned', currentRoom.hostId);
          io.to(currentRoom.hostId).emit('isHost');
        }
      }

      io.to(currentRoom.id).emit('playerDisconnected', socket.id);

      // Delete room if empty
      if (Object.keys(currentRoom.players).length === 0) {
        delete rooms[currentRoom.id];
        console.log(`Room deleted: ${currentRoom.id}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
const serverInstance = server.listen(PORT, () => {
  console.log(`🎮 Neon Hunter server en puerto ${PORT}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}. Closing server...`);
  serverInstance.close(() => {
    io.close();
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { server: serverInstance, io };
