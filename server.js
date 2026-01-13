const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('.')); // Sirve tu juego

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
server.listen(PORT, () => {
  console.log(`🎮 Neon Hunter server en puerto ${PORT}`);
});
