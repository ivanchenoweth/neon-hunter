const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Test Host connected:', socket.id);

    // Create a room
    socket.emit('createRoom', (response) => {
        if (response.success) {
            console.log('Test Room Created:', response.roomId);
        } else {
            console.error('Failed to create room:', response);
        }
    });
});

socket.on('disconnect', () => {
    console.log('Test Host disconnected');
});

// Keep alive
setInterval(() => { }, 1000);
