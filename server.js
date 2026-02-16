const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const io = new Server(server, { cors: { origin: allowedOrigin } });

const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, '.');
app.use(express.static(publicDir));

// --- ROOMS STATE ---
const rooms = {};
// Structure:
// rooms[roomId] = {
//   id: roomId,
//   hostId: socketId,
//   players: { [socketId]: { ...playerData } },
//   gameState: { ... } // enemies, foods, world settings
//   createdAt: timestamp
// }

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
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
  console.log(`User connected: ${socket.id}`);

  // Helpers to get player's room
  const getRoom = () => {
    const roomId = socket.roomId;
    return roomId ? rooms[roomId] : null;
  };

  // --- LOBBY EVENTS ---

  socket.on('createRoom', (callback) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      id: roomId,
      hostId: socket.id,
      players: {},
      // Initialize room-specific game state if needed (mostly handled by host logic currently)
      createdAt: Date.now()
    };

    // Join logic
    socket.roomId = roomId;
    socket.join(roomId);

    // Add player to room (Host)
    const room = rooms[roomId];
    const index = 1; // Host is always index 1
    const spawn = { x: 0, y: 0 }; // Host spawns center initially or random

    room.players[socket.id] = {
      id: socket.id,
      index: index,
      x: spawn.x,
      y: spawn.y,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      score: 0,
      kills: 0,
      fireDirection: { x: 0, y: -1 },
      isHost: true
    };

    console.log(`Room ${roomId} created by ${socket.id}`);
    if (callback) callback({ success: true, roomId: roomId, isHost: true });

    // Notify client they are host
    socket.emit('isHost');
    socket.emit('hostAssigned', socket.id);
  });

  socket.on('getRooms', (callback) => {
    const roomList = Object.values(rooms).map(r => ({
      id: r.id,
      playerCount: Object.keys(r.players).length,
      hostId: r.hostId
    }));
    if (callback) callback(roomList);
  });

  socket.on('joinRoom', (roomId, callback) => {
    const room = rooms[roomId];
    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found' });
      return;
    }

    socket.roomId = roomId;
    socket.join(roomId);

    const index = getNextAvailableIndex(room);
    const spawn = getRandomSpawnPoint(room);

    room.players[socket.id] = {
      id: socket.id,
      index: index,
      x: spawn.x,
      y: spawn.y,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      score: 0,
      kills: 0,
      fireDirection: { x: 0, y: -1 },
      isHost: false
    };

    console.log(`Player ${socket.id} joined room ${roomId}`);

    // Send success callback
    if (callback) callback({ success: true, roomId: roomId, isHost: false });

    // Send current room state to new player
    socket.emit('currentPlayers', room.players);
    socket.emit('hostAssigned', room.hostId);

    // Notify others in room
    socket.to(roomId).emit('newPlayer', room.players[socket.id]);
  });


  // --- GAME EVENTS (Scoped to Room) ---

  socket.on('playerMove', (movementData) => {
    const room = getRoom();
    if (!room || !room.players[socket.id]) return;

    const p = room.players[socket.id];
    p.x = movementData.x;
    p.y = movementData.y;
    p.fireDirection = movementData.fireDirection;
    p.cameraX = movementData.cameraX;
    p.cameraY = movementData.cameraY;
    p.viewW = movementData.viewW;
    p.viewH = movementData.viewH;

    socket.to(room.id).emit('playerMoved', { id: socket.id, ...movementData });
  });

  socket.on('playerShoot', (shootData) => {
    const room = getRoom();
    if (room) {
      socket.to(room.id).emit('playerFired', { id: socket.id, ...shootData });
    }
  });

  socket.on('updateStats', (stats) => {
    const room = getRoom();
    if (room && room.players[socket.id]) {
      room.players[socket.id].score = stats.score;
      room.players[socket.id].kills = stats.kills;
      socket.to(room.id).emit('statsUpdated', { id: socket.id, ...stats });
    }
  });

  // Host-only events need to verify socket.id === room.hostId
  socket.on('enemySpawned', (enemyData) => {
    const room = getRoom();
    if (room && socket.id === room.hostId) {
      socket.to(room.id).emit('enemySpawned', enemyData);
    }
  });

  socket.on('foodSpawned', (foodData) => {
    const room = getRoom();
    if (room && socket.id === room.hostId) {
      socket.to(room.id).emit('foodSpawned', foodData);
    }
  });

  socket.on('syncEnemies', (enemiesData) => {
    const room = getRoom();
    if (room && socket.id === room.hostId) {
      socket.to(room.id).emit('syncEnemies', enemiesData);
    }
  });

  socket.on('spawnAreaUpdated', (spawnAreaData) => {
    const room = getRoom();
    if (room && socket.id === room.hostId) {
      socket.to(room.id).emit('spawnAreaUpdated', spawnAreaData);
    }
  });

  // Shared events
  socket.on('enemyKilled', (enemyId) => {
    const room = getRoom();
    if (room) {
      socket.to(room.id).emit('enemyDestroyed', enemyId);
    }
  });

  socket.on('foodCollected', (foodId) => {
    const room = getRoom();
    if (room) {
      socket.to(room.id).emit('foodCollected', foodId);
    }
  });

  socket.on('requestWorldState', () => {
    const room = getRoom();
    if (room && room.hostId && room.hostId !== socket.id) {
      // Ask the host of THIS room for state
      io.to(room.hostId).emit('requestWorldState', socket.id);
    }
  });

  socket.on('worldState', (data) => {
    // Host replies with state, send to specific target
    if (data.to) {
      io.to(data.to).emit('worldState', data.state);
    }
  });

  socket.on('disconnect', () => {
    const room = getRoom();
    if (room) {
      console.log(`Player ${socket.id} left room ${room.id}`);
      const wasHost = (socket.id === room.hostId);

      // Remove player
      delete room.players[socket.id];

      // Notify others
      io.to(room.id).emit('playerDisconnected', socket.id);

      if (Object.keys(room.players).length === 0) {
        // Empty room, delete it
        console.log(`Deleting empty room ${room.id}`);
        delete rooms[room.id];
      } else if (wasHost) {
        // Host left, assign new host
        const newHostId = Object.keys(room.players)[0];
        room.hostId = newHostId;
        if (room.players[newHostId]) {
          room.players[newHostId].isHost = true;
        }
        io.to(room.id).emit('hostAssigned', newHostId);
        io.to(newHostId).emit('isHost');
        console.log(`New host for room ${room.id} is ${newHostId}`);
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
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { server: serverInstance, io };
