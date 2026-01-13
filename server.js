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

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);
  
  socket.on('playerMove', (data) => {
    socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
  });
  
  socket.on('disconnect', () => {
    io.emit('playerLeft', socket.id);
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
