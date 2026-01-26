class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Double Buffering
        this.offScreenCanvas = document.createElement('canvas');
        this.offScreenCanvas.width = this.width;
        this.offScreenCanvas.height = this.height;
        this.offScreenCtx = this.offScreenCanvas.getContext('2d');

        // Bloom Buffer (1/4th resolution for performance)
        this.bloomScale = 0.25;
        this.bloomCanvas = document.createElement('canvas');
        this.bloomCanvas.width = this.width * this.bloomScale;
        this.bloomCanvas.height = this.height * this.bloomScale;
        this.bloomCtx = this.bloomCanvas.getContext('2d', { alpha: true });

        // Second Bloom Buffer for pre-blurring (avoids high-res filter cost)
        this.blurCanvas = document.createElement('canvas');
        this.blurCanvas.width = this.bloomCanvas.width;
        this.blurCanvas.height = this.bloomCanvas.height;
        this.blurCtx = this.blurCanvas.getContext('2d', { alpha: true });

        // FPS
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
        // monitor refresh rate
        this.fpsLimit = 120; // 120 FPS limit for smoothness
        this.frameInterval = 1000 / this.fpsLimit;

        this.shotTimer = 0;
        this.shotInterval = 100; // ms between shots

        // World dimensions
        this.worldWidth = 4000;
        this.worldHeight = 4000;

        this.score = 0;
        this.coins = 0;
        this.foodCollectedCount = 0;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        window.addEventListener('resize', () => this.handleResize());

        this.input = new InputHandler();
        this.sound = new SoundController();
        this.camera = new Camera(this.width, this.height, window.zoomLevel || 1);
        this.player = new Player(this);
        this.background = new Background(this);

        this.foods = [];
        this.enemies = [];
        this.bullets = [];
        // Object Pools
        this.bulletPool = new ObjectPool(() => new Bullet(this, 0, 0, 0, 0), 20);
        this.enemyPool = new ObjectPool(() => new Enemy(this), 20);
        this.particlePool = new ObjectPool(() => new Particle(this, 0, 0, '#fff'), 50);
        this.foodPool = new ObjectPool(() => new Food(this), 50);

        this.enemyTimer = 0;
        this.enemyInterval = 150; // Spawn every 0.5 second
        this.particles = [];

        // Grid for optimization
        this.grid = new SpatialGrid(this.worldWidth, this.worldHeight, 400); // 400px cells

        // Spawn initial food
        for (let i = 0; i < 50; i++) {
            this.foods.push(this.foodPool.get(this));
        }

        // Spawn initial enemies
        for (let i = 0; i < 20; i++) {
            this.enemies.push(this.enemyPool.get(this));
        }

        // Game States
        this.states = {
            INITIAL: 'INITIAL',
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED',
            GAME_OVER: 'GAME_OVER'
        };
        this.gameState = this.states.INITIAL;
        this.lives = 5;
        this.maxLives = 5;  // Track max lives for speed calculation
        this.baseSpeed = 175;  // Base player speed

        // Pause button bounds (Top Right)
        this.pauseBtnBounds = { x: this.width - 60, y: 20, w: 40, h: 40 };

        // Initial Zoom
        window.zoomLevel = window.zoomLevel || 1.0;

        // Button bounds for canvas interaction
        this.btnBounds = {
            restart: { x: 0, y: 0, w: 200, h: 60 },
            mainMenu: { x: 0, y: 0, w: 200, h: 60 },
            // Start Screen Buttons
            zoomOut: { x: 0, y: 0, w: 50, h: 40 },
            zoomIn: { x: 0, y: 0, w: 50, h: 40 },
            modeTouch: { x: 0, y: 0, w: 220, h: 50 },
            modeKeyboard: { x: 0, y: 0, w: 220, h: 50 },
            modeKeyboardFire: { x: 0, y: 0, w: 220, h: 50 }
        };

        // Canvas Interaction
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasClick(e));

        // Menu Navigation State
        this.menuSelection = 2; // Default to 'Touch' (index 2) on start
        this.menuCooldown = 0;
        this.sessionActive = false;

        this.lastTime = 0;
        this.loop = this.loop.bind(this);
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Resize offscreen canvas
        this.offScreenCanvas.width = this.width;
        this.offScreenCanvas.height = this.height;

        // Resize Bloom canvas
        this.bloomCanvas.width = this.width * this.bloomScale;
        this.bloomCanvas.height = this.height * this.bloomScale;

        // Update camera size
        this.camera.width = this.width;
        this.camera.height = this.height;
        this.blurCanvas.width = this.bloomCanvas.width;
        this.blurCanvas.height = this.bloomCanvas.height;

        this.camera.width = this.width;
        this.camera.height = this.height;
        this.camera.zoom = window.zoomLevel * 2.0; // Apply standard scaling multiplier

        // Update UI positions
        this.pauseBtnBounds.x = this.width - 60;
    }

    tryEnterFullscreen() {
        if (!document.fullscreenElement) {
            const canvas = this.canvas;
            const rfs = canvas.requestFullscreen || canvas.webkitRequestFullscreen || canvas.mozRequestFullScreen || canvas.msRequestFullscreen;
            if (rfs) {
                rfs.call(canvas).catch(err => console.log('Fullscreen denied:', err));
            }
        }
    }

    updateScore() {
        // En un futuro multijugador, aquí se podría notificar al servidor
        // o procesar lógica de subida de nivel.
        // El puntaje ahora se dibuja directamente en el canvas en el método draw().
    }

    drawMinimap(ctx) {
        const minimapScale = 0.1; // 1:10 zoom
        const minimapSize = 200; // Size of the minimap square
        const margin = 20;

        const x = this.width - minimapSize - margin;
        const y = margin; // move minimap to top-right corner

        ctx.save();
        ctx.translate(x, y);

        // Draw minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, minimapSize, minimapSize);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(0, 0, minimapSize, minimapSize);

        // Map world coordinates to minimap coordinates
        // World is from -worldWidth/2 to worldWidth/2
        // We want to map this to 0 to minimapSize
        const scale = minimapSize / this.worldWidth;
        const centerX = minimapSize / 2;
        const centerY = minimapSize / 2;

        // Draw world border on minimap
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, minimapSize, minimapSize);

        // Draw food on minimap - simplified
        ctx.fillStyle = '#ff0'; // Use a single color for food on minimap
        this.foods.forEach((food, index) => {
            // Only draw every 2nd food item on minimap if many
            if (this.foods.length > 100 && index % 2 !== 0) return;

            const fx = centerX + food.x * scale;
            const fy = centerY + food.y * scale;
            ctx.fillRect(fx, fy, 1.5, 1.5);
        });

        // Draw spawn area on minimap (where enemies appear)
        const spawnMinDistance = 600;
        const spawnMaxDistance = 1000;
        const px = centerX + this.player.x * scale;
        const py = centerY + this.player.y * scale;

        // Draw outer spawn ring (max distance)
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, spawnMaxDistance * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner spawn ring (min distance)
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, spawnMinDistance * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Fill the spawn ring area with semi-transparent red (between inner and outer rings only)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, spawnMaxDistance * scale, 0, Math.PI * 2);
        ctx.arc(px, py, spawnMinDistance * scale, 0, Math.PI * 2, true); // Counter-clockwise to create donut
        ctx.fill('evenodd');

        // Draw camera viewport on minimap
        const vx = centerX + this.camera.x * scale;
        const vy = centerY + this.camera.y * scale;
        const vw = (this.camera.width / this.camera.zoom) * scale;
        const vh = (this.camera.height / this.camera.zoom) * scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);

        // Draw player on minimap
        ctx.fillStyle = '#fff';
        // ctx.beginPath();
        // ctx.arc(px, py, 3, 0, Math.PI * 2);
        // ctx.fill();
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);

        // Draw enemies on minimap
        ctx.fillStyle = '#ff4444';
        this.enemies.forEach(enemy => {
            const ex = centerX + enemy.x * scale;
            const ey = centerY + enemy.y * scale;
            ctx.fillRect(ex - 2, ey - 2, 4, 4);
        });

        ctx.restore();
    }

    startGame() {
        this.sessionActive = true;
        this.gameState = this.states.PLAYING;
        this.score = 0;
        this.coins = 0;
        this.lives = 5;
        this.player.speed = this.baseSpeed;  // Reset player speed on game start
        this.foodCollectedCount = 0;
        this.enemies = [];
        this.bullets = [];
        this.foods = [];
        this.particles = [];
        this.enemyTimer = 0;

        // Hide overlays if present
        if (this.startScreen && this.startScreen.classList) this.startScreen.classList.add('hidden');
        if (this.gameOverScreen && this.gameOverScreen.classList) this.gameOverScreen.classList.add('hidden');

        // Anti-bounce: consume input
        this.input.keys.space = false;
    }

    takeDamage() {
        if (this.gameState !== this.states.PLAYING) return;

        this.lives--;
        this.sound.playDamage();
        this.camera.shake(20, 300);

        // Reduce player speed based on remaining lives (more lives = faster)
        // Speed ranges from 50% to 100% of base speed
        const speedMultiplier = 0.5 + (this.lives / this.maxLives) * 0.5;
        this.player.speed = this.baseSpeed * speedMultiplier;

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.sessionActive = false;
        this.gameState = this.states.GAME_OVER;
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.gameState === this.states.PLAYING || this.gameState === this.states.PAUSED) {
            // Check Pause Button
            const pb = this.pauseBtnBounds;
            if (mouseX >= pb.x && mouseX <= pb.x + pb.w && mouseY >= pb.y && mouseY <= pb.y + pb.h) {
                // Same logic as Spacebar: Go to Menu (Pause)
                this.gameState = this.states.INITIAL;
                this.menuCooldown = 500;
                this.sound.playCollect();
                return;
            }
        }

        if (this.gameState === this.states.PLAYING) return;

        if (this.gameState === this.states.INITIAL) {
            // Zoom Controls
            const bZoomOut = this.btnBounds.zoomOut;
            if (mouseX >= bZoomOut.x && mouseX <= bZoomOut.x + bZoomOut.w && mouseY >= bZoomOut.y && mouseY <= bZoomOut.y + bZoomOut.h) {
                if (window.zoomLevel > 0.5) {
                    window.zoomLevel = parseFloat((window.zoomLevel - 0.1).toFixed(1));
                    this.camera.zoom = window.zoomLevel * 2.0;
                    this.triggerExplosion(bZoomOut.x + bZoomOut.w / 2, bZoomOut.y + bZoomOut.h / 2, '#ff8500', 10);
                }
                return;
            }

            const bZoomIn = this.btnBounds.zoomIn;
            if (mouseX >= bZoomIn.x && mouseX <= bZoomIn.x + bZoomIn.w && mouseY >= bZoomIn.y && mouseY <= bZoomIn.y + bZoomIn.h) {
                if (window.zoomLevel < 2.0) {
                    window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                    this.camera.zoom = window.zoomLevel * 2.0;
                    this.triggerExplosion(bZoomIn.x + bZoomIn.w / 2, bZoomIn.y + bZoomIn.h / 2, '#ff8500', 10);
                }
                return;
            }

            // Mode Selection
            const modes = [
                { bounds: this.btnBounds.modeTouch, mode: 'touch', color: '#00ff88' },
                { bounds: this.btnBounds.modeKeyboard, mode: 'keyboard', color: '#00d4ff' },
                { bounds: this.btnBounds.modeKeyboardFire, mode: 'keyboardFire', color: '#ff00ff' }
            ];

            for (let m of modes) {
                const b = m.bounds;
                if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                    // Trigger Explosion
                    this.triggerExplosion(b.x + b.w / 2, b.y + b.h / 2, m.color, 30);

                    // Set Mode
                    window.inputMode = m.mode;
                    window.dispatchEvent(new Event('inputModeChanged'));

                    // Enter Fullscreen
                    const canvas = this.canvas;
                    const rfs = canvas.requestFullscreen || canvas.webkitRequestFullscreen || canvas.mozRequestFullScreen || canvas.msRequestFullscreen;
                    if (rfs) {
                        rfs.call(canvas).catch(err => console.log('Fullscreen denied:', err));
                    }

                    // Start Game or Resume
                    if (this.sessionActive) {
                        this.gameState = this.states.PLAYING;
                    } else {
                        this.startGame();
                    }
                    return;
                }
            }
        } else if (this.gameState === this.states.GAME_OVER) {
            const b = this.btnBounds.restart;
            if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                this.startGame();
                this.sound.playCollect();
            }

            const bMenu = this.btnBounds.mainMenu;
            if (mouseX >= bMenu.x && mouseX <= bMenu.x + bMenu.w && mouseY >= bMenu.y && mouseY <= bMenu.y + bMenu.h) {
                this.gameState = this.states.INITIAL; // Go back to start screen
                this.sound.playCollect();
            }
        }
    }

    triggerExplosion(screenX, screenY, color = '#00ff88', count = 12) {
        // Convert screen to world for particle system
        const worldX = (screenX / this.camera.zoom) + this.camera.x;
        const worldY = (screenY / this.camera.zoom) + this.camera.y;
        this.createExplosion(worldX, worldY, color, count);
    }

    createExplosion(x, y, color, count = 12) {
        this.sound.playExplosion();
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 10 + 10;
            this.particles.push(this.particlePool.get(this, x, y, color, size));
        }
    }

    drawStartScreen(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Title
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 60px "Outfit", sans-serif';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff88';
        ctx.fillText('NEON HUNTER', cx, cy - 200);

        // Version Badge
        ctx.shadowBlur = 0;
        ctx.font = 'bold 16px "Outfit", sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('v1.2.0-shadow-strike', cx, cy - 150);

        // Zoom Controls
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 20px "Outfit", sans-serif';
        // ctx.fillText('Zoom:', cx - 100, cy - 100);

        // Zoom Out Button
        const bZoomOut = this.btnBounds.zoomOut;
        bZoomOut.x = cx - 40 - bZoomOut.w;
        bZoomOut.y = cy - 120;
        this.drawButton(ctx, bZoomOut, '-', '#ff8500', this.menuSelection === 0);

        // Zoom Level Display
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 20px "Outfit", sans-serif';
        ctx.fillText(`${window.zoomLevel.toFixed(1)}x`, cx, cy - 100);

        // Zoom In Button
        const bZoomIn = this.btnBounds.zoomIn;
        bZoomIn.x = cx + 40;
        bZoomIn.y = cy - 120;
        this.drawButton(ctx, bZoomIn, '+', '#ff8500', this.menuSelection === 1);

        // Instruction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '20px "Outfit", sans-serif';
        ctx.fillText('Choose how you want to play:', cx, cy - 40);

        // Mode Buttons
        const bTouch = this.btnBounds.modeTouch;
        bTouch.x = cx - bTouch.w / 2;
        bTouch.y = cy;
        this.drawButton(ctx, bTouch, 'Touch Joysticks', '#00ff88', this.menuSelection === 2);

        const bKeyboard = this.btnBounds.modeKeyboard;
        bKeyboard.x = cx - bKeyboard.w / 2;
        bKeyboard.y = cy + 70;
        this.drawButton(ctx, bKeyboard, 'WASD + Mouse', '#00d4ff', this.menuSelection === 3);

        const bKeyboardFire = this.btnBounds.modeKeyboardFire;
        bKeyboardFire.x = cx - bKeyboardFire.w / 2;
        bKeyboardFire.y = cy + 140;
        this.drawButton(ctx, bKeyboardFire, 'WASD + IJLK', '#ff00ff', this.menuSelection === 4);

        ctx.restore();
    }

    drawButton(ctx, bounds, text, color, highlight = false) {
        ctx.save();
        if (highlight) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 15);
        else ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = 'bold 18px "Outfit", sans-serif';
        if (!highlight) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        }
        ctx.fillText(text, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
        ctx.restore();
    }

    drawGameOverScreen(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 60px "Outfit", sans-serif';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4444';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 120);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '30px "Outfit", sans-serif';
        ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 - 40);
        ctx.fillText(`Coins Collected: ${this.coins}`, this.width / 2, this.height / 2 + 10);

        const b = this.btnBounds.restart;
        b.x = this.width / 2 - b.w / 2;
        b.y = this.height / 2 + 80;

        this.drawButton(ctx, b, 'TRY AGAIN', '#00ff88', this.menuSelection === 0);

        // Main Menu Button
        const bMenu = this.btnBounds.mainMenu;
        bMenu.x = this.width / 2 - bMenu.w / 2;
        bMenu.y = b.y + 80;

        this.drawButton(ctx, bMenu, 'MAIN MENU', '#00d4ff', this.menuSelection === 1);

        ctx.restore();
    }

    drawPauseScreen(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 80px "Outfit", sans-serif';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff88';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 80);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Outfit", sans-serif';
        ctx.fillText('Press P to Resume', this.width / 2, this.height / 2 + 40);

        ctx.restore();
    }

    init() {
        console.log('Game initialized');
        requestAnimationFrame(this.loop);
    }

    /**
     * MÉTODOS PARA MULTIJUGADOR (Stubs)
     * Estos métodos son los que se usarían para conectar con un servidor.
     */
    sendInputToServer() {
        // En multijugador: socket.emit('playerInput', this.input.keys);
    }

    onServerUpdateReceived(gameState) {
        // En multijugador: Actualizar posiciones de jugadores remotos, enemigos, etc.
        // this.remotePlayers = gameState.players;
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Procesa la física, colisiones y reglas del juego.
     */
    updateState(deltaTime) {
        if (this.gameState !== this.states.PLAYING) return null;

        // 1. Enviar inputs si fuera multijugador
        this.sendInputToServer();

        // 2. Actualizar Entidades (Lógica autoritativa)
        const movementInfo = this.player.updateState(deltaTime, this.input);

        this.enemies.forEach(enemy => enemy.updateState(deltaTime));
        this.bullets.forEach(bullet => bullet.updateState(deltaTime));
        this.foods.forEach(food => food.updateState(deltaTime));

        // 3. Gestionar Ciclo de Vida (Eliminaciones/Pools)
        this.cleanupEntities();

        // 4. Generación de Entidades (Spawner)
        this.spawnEntities(deltaTime);

        // 5. Colisiones y Grid
        this.updateGrid();
        this.processCollisions();

        return movementInfo;
    }

    /**
     * Lógica Visual (Client-side)
     * Efectos, partículas y cámara.
     */
    updateVisuals(deltaTime, movementInfo) {
        this.player.updateVisuals(deltaTime, movementInfo);
        this.camera.follow(this.player, deltaTime);

        this.foods.forEach(food => {
            if (food.updateVisuals) food.updateVisuals(deltaTime);
        });

        this.particles.forEach(p => p.update());

        // Update player fire direction based on input mode
        let worldMouseX, worldMouseY;
        let screenMouseX = this.input.mouse.x;
        let screenMouseY = this.input.mouse.y;

        if (window.inputMode === 'keyboardFire') {
            // For WASD+IJLK mode, use IJLK keys to determine direction
            let dirX = 0, dirY = 0;
            if (this.input.keys.i) dirY -= 1;
            if (this.input.keys.k) dirY += 1;
            if (this.input.keys.j) dirX -= 1;
            if (this.input.keys.l) dirX += 1;

            if (dirX !== 0 || dirY !== 0) {
                // Normalize diagonal movement
                const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                dirX /= magnitude;
                dirY /= magnitude;
                // Set fire direction based on key input
                worldMouseX = this.player.x + dirX * 300;
                worldMouseY = this.player.y + dirY * 300;
            } else {
                // If no key pressed, keep current fire direction
                worldMouseX = this.player.x + this.player.fireDirection.x * 300;
                worldMouseY = this.player.y + this.player.fireDirection.y * 300;
            }
            // Convert world coordinates back to screen coordinates for shooting
            screenMouseX = (worldMouseX - this.camera.x) * this.camera.zoom;
            screenMouseY = (worldMouseY - this.camera.y) * this.camera.zoom;
        } else {
            // For other modes, use mouse position
            worldMouseX = (this.input.mouse.x / this.camera.zoom) + this.camera.x;
            worldMouseY = (this.input.mouse.y / this.camera.zoom) + this.camera.y;
        }

        this.player.setFireDirection(worldMouseX, worldMouseY);

        // Cleanup de partículas (siempre local)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].markedForDeletion) {
                this.particlePool.release(this.particles[i]);
                this.particles.splice(i, 1);
            }
        }

        // Shooting logic (Local trigger)
        if (this.shotTimer > 0) this.shotTimer -= deltaTime;

        // Handle firing based on input mode
        let shouldShoot = false;
        if (window.inputMode === 'keyboardFire') {
            // For WASD+IJLK mode, check if any fire key is pressed
            shouldShoot = this.input.keys.i || this.input.keys.j || this.input.keys.l || this.input.keys.k;
        } else {
            // For other modes, use mouse down
            shouldShoot = this.input.mouseDown;
        }

        if (shouldShoot && this.shotTimer <= 0) {
            this.shoot(screenMouseX, screenMouseY);
            this.shotTimer = this.shotInterval;
        }
    }

    updateMenu(deltaTime) {
        if (this.menuCooldown > 0) {
            this.menuCooldown -= deltaTime;
            if (this.menuCooldown < 0) this.menuCooldown = 0;
        }

        // Standardize Input
        const up = this.input.keys.w || this.input.keys.arrowup || (this.input.joystickLeft && this.input.joystickLeft.y < -0.5);
        const down = this.input.keys.s || this.input.keys.arrowdown || (this.input.joystickLeft && this.input.joystickLeft.y > 0.5);
        const left = this.input.keys.a || this.input.keys.arrowleft || (this.input.joystickLeft && this.input.joystickLeft.x < -0.5);
        const right = this.input.keys.d || this.input.keys.arrowright || (this.input.joystickLeft && this.input.joystickLeft.x > 0.5);
        const select = this.input.keys.space;

        if (up || down || left || right || select) {
            // this.tryEnterFullscreen(); // Reverted as per user request
        }

        if (this.gameState === this.states.INITIAL) {
            // Indices: 0:ZoomOut, 1:ZoomIn, 2:Touch, 3:WASD+Mouse, 4:WASD+IJLK
            if (this.menuCooldown === 0) {
                if (up) {
                    if (this.menuSelection > 1) this.menuSelection--; // Move up list
                    else if (this.menuSelection <= 1) { /* Stay in row 0 */ }
                    // Logic fix: 2->1? But 2 is centered. 2->0/1 logic:
                    // If at 2, up goes to 0 or 1? Let's say 0 default or keep previous column? 
                    // Simple stack: 0,1 are top row. 2 is below.
                    if (this.menuSelection === 2) this.menuSelection = 0;
                    this.menuCooldown = 200;
                    this.sound.playCollect();
                } else if (down) {
                    if (this.menuSelection < 4) {
                        if (this.menuSelection < 2) this.menuSelection = 2; // From Zoom to Touch
                        else this.menuSelection++;
                        this.menuCooldown = 200;
                        this.sound.playCollect();
                    }
                } else if (left) {
                    if (this.menuSelection === 1) { this.menuSelection = 0; this.menuCooldown = 200; this.sound.playCollect(); }
                } else if (right) {
                    if (this.menuSelection === 0) { this.menuSelection = 1; this.menuCooldown = 200; this.sound.playCollect(); }
                }
            }

            if (select && this.menuCooldown === 0) {
                this.menuCooldown = 300; // Longer cooldown after action
                if (this.menuSelection === 0) {
                    // Zoom Out
                    if (window.zoomLevel > 0.5) {
                        window.zoomLevel = parseFloat((window.zoomLevel - 0.1).toFixed(1));
                        this.camera.zoom = window.zoomLevel * 2.0;
                        const b = this.btnBounds.zoomOut;
                        this.triggerExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff8500', 10);
                    }
                } else if (this.menuSelection === 1) {
                    // Zoom In
                    if (window.zoomLevel < 2.0) {
                        window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                        this.camera.zoom = window.zoomLevel * 2.0;
                        const b = this.btnBounds.zoomIn;
                        this.triggerExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff8500', 10);
                    }
                } else {
                    // Modes
                    let mode = '', bounds = null, color = '';
                    if (this.menuSelection === 2) { mode = 'touch'; bounds = this.btnBounds.modeTouch; color = '#00ff88'; }
                    if (this.menuSelection === 3) { mode = 'keyboard'; bounds = this.btnBounds.modeKeyboard; color = '#00d4ff'; }
                    if (this.menuSelection === 4) { mode = 'keyboardFire'; bounds = this.btnBounds.modeKeyboardFire; color = '#ff00ff'; }

                    if (mode) {
                        this.triggerExplosion(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, color, 30);
                        window.inputMode = mode;
                        window.dispatchEvent(new Event('inputModeChanged'));

                        const canvas = this.canvas;
                        const rfs = canvas.requestFullscreen || canvas.webkitRequestFullscreen || canvas.mozRequestFullScreen || canvas.msRequestFullscreen;
                        if (rfs) rfs.call(canvas).catch(() => { });

                        if (this.sessionActive) {
                            this.gameState = this.states.PLAYING;
                        } else {
                            this.startGame();
                        }
                        // Anti-bounce: consume input
                        this.input.keys.space = false;
                    }
                }
            }

        } else if (this.gameState === this.states.GAME_OVER) {
            // Indices: 0: Try Again, 1: Main Menu
            if (this.menuCooldown === 0) {
                if (up || down) {
                    this.menuSelection = this.menuSelection === 0 ? 1 : 0;
                    this.menuCooldown = 200;
                    this.sound.playCollect();
                }
            }

            if (select && this.menuCooldown === 0) {
                this.menuCooldown = 300;
                if (this.menuSelection === 0) {
                    this.startGame();
                    this.sound.playCollect();
                } else {
                    this.gameState = this.states.INITIAL;
                    this.menuSelection = 2; // Reset to Touch/first mode option
                    this.sound.playCollect();
                }
            }
        }
    }

    cleanupEntities() {
        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].markedForDeletion) {
                this.enemyPool.release(this.enemies[i]);
                this.enemies.splice(i, 1);
            } else if (this.isOffScreen(this.enemies[i])) {
                this.enemies[i].reset(this);
            }
        }
        // Foods
        for (let i = this.foods.length - 1; i >= 0; i--) {
            if (this.foods[i].markedForDeletion) {
                this.foodPool.release(this.foods[i]);
                this.foods.splice(i, 1);
            }
        }
        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].markedForDeletion) {
                this.bulletPool.release(this.bullets[i]);
                this.bullets.splice(i, 1);
            }
        }
    }

    isOffScreen(entity) {
        const margin = entity.size || 50;
        return (
            entity.x + margin < this.camera.x ||
            entity.x - margin > this.camera.x + this.width ||
            entity.y + margin < this.camera.y ||
            entity.y - margin > this.camera.y + this.height
        );
    }

    spawnEntities(deltaTime) {
        this.enemyTimer += deltaTime;
        if (this.enemyTimer > this.enemyInterval && this.enemies.length < 100) {
            this.enemies.push(this.enemyPool.get(this));
            this.enemyTimer = 0;
        }
        if (this.foods.length < 50) {
            this.foods.push(this.foodPool.get(this));
        }
    }

    updateGrid() {
        this.grid.clear();
        this.enemies.forEach(enemy => this.grid.insert(enemy));
        this.foods.forEach(food => {
            if (!food.isCaptured) this.grid.insert(food);
        });
        this.bullets.forEach(bullet => this.grid.insert(bullet));
        this.particles.forEach(p => this.grid.insert(p));
    }

    processCollisions() {
        // Bullet collisions
        this.bullets.forEach(bullet => {
            const potentialEnemies = this.grid.retrieve(bullet, 50);
            potentialEnemies.forEach(enemy => {
                if (enemy instanceof Enemy && !enemy.markedForDeletion && !bullet.markedForDeletion) {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < enemy.size) {
                        enemy.markedForDeletion = true;
                        bullet.markedForDeletion = true;
                        this.score += 10;
                        this.updateScore();
                        this.createExplosion(enemy.x, enemy.y, enemy.color);
                    }
                }
            });
        });

        // Player-Food collisions
        const nearbyFood = this.grid.retrieve(this.player, this.player.radius + 50);
        nearbyFood.forEach(food => {
            if (food instanceof Food && !food.isCaptured) {
                const dx = this.player.x - food.x;
                const dy = this.player.y - food.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.player.radius + food.radius) {
                    food.isCaptured = true;
                    this.score += Math.floor(food.radius);
                    this.coins++;
                    this.foodCollectedCount++;

                    const progress = (this.foodCollectedCount - 1) % 5;
                    this.sound.playCollect(progress);

                    // Extra life every 5 collected foods
                    if (this.foodCollectedCount % 5 === 0) {
                        this.lives++;
                        this.sound.playExtraLife();
                        // Special particles for life gain
                        for (let i = 0; i < 20; i++) {
                            const p = this.particlePool.get(this, this.player.x, this.player.y, '#00ff88');
                            p.speedX *= 2;
                            p.speedY *= 2;
                            this.particles.push(p);
                        }
                    }

                    this.updateScore();
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(this.particlePool.get(this, food.x, food.y, food.color));
                    }
                }
            }
        });
    }

    update(deltaTime) {
        // Check for pause toggle
        if (this.input.keys.p && this.gameState === this.states.PLAYING) {
            this.gameState = this.states.PAUSED;
            this.input.keys.p = false; // Consume the key press
        } else if (this.input.keys.p && this.gameState === this.states.PAUSED) {
            this.gameState = this.states.PLAYING;
            this.input.keys.p = false; // Consume the key press
        }

        // Spacebar to Main Menu (Pause & Exit) from Playing/Paused
        if ((this.gameState === this.states.PLAYING || this.gameState === this.states.PAUSED) && this.input.keys.space) {
            this.gameState = this.states.INITIAL;
            this.menuCooldown = 500; // Prevent immediate selection
            this.sound.playCollect();
            this.input.keys.space = false; // Consume input
            return; // Skip rest of update
        }

        if (this.gameState === this.states.INITIAL || this.gameState === this.states.GAME_OVER) {
            this.updateMenu(deltaTime);
        }

        const movementInfo = this.updateState(deltaTime);
        this.updateVisuals(deltaTime, movementInfo);
    }

    draw() {
        // Draw scene to offscreen canvas
        const ctx = this.offScreenCtx;
        const bCtx = this.bloomCtx;

        // Clear canvases
        ctx.fillStyle = '#0d0d12';
        ctx.fillRect(0, 0, this.width, this.height);
        bCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);

        // --- Main Draw Pass ---
        ctx.save();
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        this.background.draw(ctx);

        // Draw world border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 5;
        ctx.strokeRect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);

        // --- Bloom Draw Pass Preparation ---
        // We only want entities to glow, not the background.
        bCtx.save();
        bCtx.scale(this.bloomScale * this.camera.zoom, this.bloomScale * this.camera.zoom);
        bCtx.translate(-this.camera.x, -this.camera.y);

        // Grid-based culled rendering
        const renderBounds = {
            x: this.camera.x - 100 / this.camera.zoom,
            y: this.camera.y - 100 / this.camera.zoom,
            width: (this.camera.width / this.camera.zoom) + 200 / this.camera.zoom,
            height: (this.camera.height / this.camera.zoom) + 200 / this.camera.zoom
        };
        const visibleEntitiesArr = this.grid.retrieveByBounds(renderBounds);
        const visibleEntities = new Set(visibleEntitiesArr);
        let visibleEnemies = 0;

        visibleEntities.forEach(ent => {
            if (ent instanceof Particle) {
                ent.draw(ctx);
                ent.draw(bCtx); // Draw to bloom
            } else if (ent instanceof Food) {
                ent.draw(ctx);
                ent.draw(bCtx); // Draw to bloom
                ent.draw(bCtx); // Extra pass for stronger Food glow
            } else if (ent instanceof Enemy) {
                if (ent.draw(ctx)) {
                    visibleEnemies++;
                    ent.draw(bCtx); // Draw to bloom
                }
            } else if (ent instanceof Bullet) {
                ent.draw(ctx);
                ent.draw(bCtx); // Draw to bloom
            }
        });

        // Handle captured food
        this.foods.forEach(food => {
            if (food.isCaptured) {
                food.draw(ctx);
                food.draw(bCtx);
                food.draw(bCtx);
            }
        });

        this.player.draw(ctx);
        this.player.draw(bCtx);

        ctx.restore();
        bCtx.restore();

        // --- Final Composite Pass ---
        // 1. Draw main scene (no need to clear this.ctx as offScreenCanvas is opaque)
        this.ctx.drawImage(this.offScreenCanvas, 0, 0);

        // 2. Optimized Bloom layer
        // First, blur the small canvas into the second small canvas
        this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
        this.blurCtx.filter = 'blur(2px) brightness(2.2)';
        this.blurCtx.drawImage(this.bloomCanvas, 0, 0);

        // Then, project the small blurred layer back to main canvas
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(this.blurCanvas, 0, 0, this.width, this.height);
        this.ctx.restore();

        // 3. Draw UI and HUD (Static on screen, should NOT glow)
        this.drawMinimap(this.ctx);

        // Draw FPS and Enemy Counters
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = 'bold 20px "Outfit", sans-serif';
        this.ctx.fillText(`FPS: ${this.fps}`, 20, 30);
        this.ctx.fillText(`Enemies: ${this.enemies.length} / Visible: ${visibleEnemies}`, 20, 60);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`Coins: ${this.coins}`, 20, 90);
        this.ctx.fillStyle = '#00ccff';
        this.ctx.fillText(`Score: ${this.score}`, 20, 120);

        // Health Indicator
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`Lives: ${'❤️'.repeat(this.lives)}`, 20, 150);

        // Pause Button (Visible in Playing/Paused)
        if (this.gameState === this.states.PLAYING || this.gameState === this.states.PAUSED) {
            const pb = this.pauseBtnBounds;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);

            // Draw Pause Icon (||)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(pb.x + 12, pb.y + 10, 6, 20);
            this.ctx.fillRect(pb.x + 22, pb.y + 10, 6, 20);
        }

        // UI Screens
        if (this.gameState === this.states.INITIAL) {
            this.drawStartScreen(this.ctx);
        } else if (this.gameState === this.states.PAUSED) {
            this.drawPauseScreen(this.ctx);
        } else if (this.gameState === this.states.GAME_OVER) {
            this.drawGameOverScreen(this.ctx);
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // FPS Calculation
        this.frameCount++;
        this.fpsTimer += deltaTime;
        if (this.fpsTimer >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        // Limit deltaTime to avoid huge jumps if the tab was inactive
        const cappedDelta = Math.min(deltaTime, 100);

        this.update(cappedDelta);
        this.draw();

        requestAnimationFrame(this.loop);
    }

    shoot(mouseX, mouseY) {
        if (this.gameState !== this.states.PLAYING) return;
        // Convert screen coordinates to world coordinates for arrow direction, accounting for zoom
        const worldMouseX = (mouseX / this.camera.zoom) + this.camera.x;
        const worldMouseY = (mouseY / this.camera.zoom) + this.camera.y;
        this.player.setFireDirection(worldMouseX, worldMouseY);
        // Trigger arrow blink effect
        this.player.triggerArrowBlink();
        // But bullets use screen coordinates since player is centered on screen
        this.bullets.push(this.bulletPool.get(this, this.player.x, this.player.y, mouseX, mouseY));
        this.sound.playShoot();
    }
}
