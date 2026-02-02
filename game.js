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
        this.enemiesDestroyed = 0;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        window.addEventListener('resize', () => this.handleResize());

        // Initial Zoom Level (1.0x baseline)
        window.zoomLevel = window.zoomLevel || 1.0;

        this.input = new InputHandler();
        this.sound = new SoundController();
        this.camera = new Camera(this.width, this.height, window.zoomLevel || 1);
        this.player = new Player(this);
        this.background = new Background(this);

        this.foods = [];
        this.enemies = [];
        this.bullets = [];
        this.loots = [];
        this.particles = [];
        this.floatingTexts = [];
        this.spawnZones = [];
        this.zoneTimer = 0;
        this.showDebugHUD = false; // Toggle with game.toggleDebug()
        this.beamSoundTimer = 0;

        // Initial zones
        this.generateSpawnZones();
        // Object Pools
        this.bulletPool = new ObjectPool(() => new Bullet(this, 0, 0, 0, 0), 100);
        this.enemyPool = new ObjectPool(() => new Enemy(this), 60);
        this.enemyBulletPool = new ObjectPool(() => new EnemyBullet(this, 0, 0, 0), 50);
        this.lootPool = new ObjectPool(() => new Loot(this, 0, 0, Loot.Types.COIN), 30);
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
        this.baseSpeed = 110;  // Base player speed

        // Pause button bounds (Top Left, Larger)
        this.pauseBtnBounds = { x: 20, y: 20, w: 60, h: 60 };


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
        this.canvas.addEventListener('pointerup', (e) => this.handleCanvasClick(e));

        // Menu Navigation State
        this.menuSelection = 2; // Default to 'Touch' (index 2) on start
        this.menuCooldown = 0;
        this.sessionActive = false;

        // Warp System
        // Warp System
        this.warpLevel = 1;
        this.warpLevelKillCount = 0;
        this.killQuota = 100;
        this.enemiesSpawnedInLevel = 0;
        this.warpMessageTimer = 0; // Don't show on load
        this.warpMessageDuration = 3000;
        this.warpTimer = 0; // ms passed in current warp

        this.lastTime = 0;
        this.loop = this.loop.bind(this);

        // Center camera on player immediately
        this.camera.follow(this.player, 0);
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

        this.camera.zoom = (window.zoomLevel || 1.0);

        // Update UI positions
        if (this.pauseBtnBounds) {
            this.pauseBtnBounds.x = 20;
            this.pauseBtnBounds.y = 20;
        }
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

        // Draw dynamic spawn zones on minimap
        this.spawnZones.forEach(zone => {
            const sx = centerX + zone.x * scale;
            const sy = centerY + zone.y * scale;
            const sw = zone.w * scale;
            const sh = zone.h * scale;

            ctx.fillStyle = zone.color;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(sx, sy, sw, sh);
            ctx.strokeStyle = zone.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, sw, sh);
        });
        ctx.globalAlpha = 1.0;

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
        const px = centerX + this.player.x * scale;
        const py = centerY + this.player.y * scale;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);

        // Draw enemies on minimap
        ctx.fillStyle = '#ff4444';
        this.enemies.forEach(enemy => {
            const ex = centerX + enemy.x * scale;
            const ey = centerY + enemy.y * scale;
            ctx.fillRect(ex - 2, ey - 2, 4, 4);
        });

        // Draw Laser Beam on minimap
        if (this.player.isChargingBeam && this.player.beamLength > 0) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const lx1 = centerX + this.player.x * scale;
            const ly1 = centerY + this.player.y * scale;
            const lx2 = centerX + (this.player.x + this.player.fireDirection.x * this.player.beamLength) * scale;
            const ly2 = centerY + (this.player.y + this.player.fireDirection.y * this.player.beamLength) * scale;
            ctx.moveTo(lx1, ly1);
            ctx.lineTo(lx2, ly2);
            ctx.stroke();
        }

        ctx.restore();
    }

    startGame() {
        this.sessionActive = true;
        this.gameState = this.states.PLAYING;
        this.score = 0;
        this.coins = 0;
        this.lives = 5;
        // Warp speed system: warp 1=110, warp 2=120, ..., warp 5=150 (max)
        this.baseSpeed = 110;  // Starting speed for warp 1
        this.player.speed = this.baseSpeed;  // Reset player speed on game start
        this.foodCollectedCount = 0;
        this.enemiesDestroyed = 0;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.loots = [];
        this.foods = [];
        this.particles = [];
        this.spawnZones = [];
        this.generateSpawnZones();
        this.zoneTimer = 0;
        this.enemyTimer = 0;

        // Reset Warp System
        // Reset Warp System
        this.warpLevel = 1;
        this.warpLevelKillCount = 0;
        this.enemiesSpawnedInLevel = 0;
        this.warpMessageTimer = 3000; // Show "WARP 1" on start
        this.warpTimer = 0;
        this.player.resetSpawnAnimation();

        // Hide overlays if present
        if (this.startScreen && this.startScreen.classList) this.startScreen.classList.add('hidden');
        if (this.gameOverScreen && this.gameOverScreen.classList) this.gameOverScreen.classList.add('hidden');

        // Anti-bounce: consume input
        this.input.keys.enter = false;
    }

    takeDamage() {
        if (this.player.shieldTimer > 0) return; // Protection!
        if (this.gameState !== this.states.PLAYING) return;

        this.lives--;
        this.sound.playDamage();
        this.camera.shake(20, 300);

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
                    this.camera.zoom = window.zoomLevel;
                    this.triggerExplosion(bZoomOut.x + bZoomOut.w / 2, bZoomOut.y + bZoomOut.h / 2, '#ff8500', 10);
                }
                return;
            }

            const bZoomIn = this.btnBounds.zoomIn;
            if (mouseX >= bZoomIn.x && mouseX <= bZoomIn.x + bZoomIn.w && mouseY >= bZoomIn.y && mouseY <= bZoomIn.y + bZoomIn.h) {
                if (window.zoomLevel < 2.0) {
                    window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                    this.camera.zoom = window.zoomLevel;
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
                    // 1. Enter Fullscreen IMMEDIATELY to capture user gesture
                    const el = document.documentElement;
                    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
                    if (rfs) {
                        rfs.call(el).catch(err => console.log('Fullscreen denied:', err));
                    }

                    // 2. Trigger Explosion
                    this.triggerExplosion(b.x + b.w / 2, b.y + b.h / 2, m.color, 30);

                    // 3. Set Mode
                    window.inputMode = m.mode;
                    window.dispatchEvent(new Event('inputModeChanged'));

                    // 4. Start Game or Resume
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

        // UI Scaling Factor (Relative to 1080p base height)
        const scale = Math.max(0.5, this.height / 1080);
        const titleSize = Math.floor(60 * scale);
        const versionSize = Math.floor(16 * scale);
        const instructionSize = Math.floor(20 * scale);
        const buttonTextSize = Math.floor(18 * scale);
        const spacing = 70 * scale;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Title
        ctx.fillStyle = '#00ff88';
        ctx.font = `bold ${titleSize}px "Outfit", sans-serif`;
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = '#00ff88';
        ctx.fillText('NEON HUNTER', cx, cy - 200 * scale);

        // Version Badge
        ctx.shadowBlur = 0;
        ctx.font = `bold ${versionSize}px "Outfit", sans-serif`;
        ctx.fillStyle = '#00ff88';
        ctx.fillText('v1.6.1-crimson-hawk (feat/31-respawn-outside-area • 2026-01-28 21:28)', cx, cy - 150 * scale);

        // Zoom Out Button
        const bZoomOut = this.btnBounds.zoomOut;
        bZoomOut.w = 50 * scale;
        bZoomOut.h = 40 * scale;
        bZoomOut.x = cx - 40 * scale - bZoomOut.w;
        bZoomOut.y = cy - 120 * scale;
        this.drawButton(ctx, bZoomOut, '-', '#ff8500', this.menuSelection === 0, buttonTextSize);

        // Zoom Level Display
        ctx.fillStyle = '#00ff88';
        ctx.font = `bold ${20 * scale}px "Outfit", sans-serif`;
        ctx.fillText(`${window.zoomLevel.toFixed(1)}x`, cx, cy - 100 * scale);

        // Zoom In Button
        const bZoomIn = this.btnBounds.zoomIn;
        bZoomIn.w = 50 * scale;
        bZoomIn.h = 40 * scale;
        bZoomIn.x = cx + 40 * scale;
        bZoomIn.y = cy - 120 * scale;
        this.drawButton(ctx, bZoomIn, '+', '#ff8500', this.menuSelection === 1, buttonTextSize);

        // Instruction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${instructionSize}px "Outfit", sans-serif`;
        ctx.fillText('Choose how you want to play:', cx, cy - 40 * scale);

        // Mode Buttons
        const btnW = 220 * scale;
        const btnH = 50 * scale;

        const bTouch = this.btnBounds.modeTouch;
        bTouch.w = btnW; bTouch.h = btnH;
        bTouch.x = cx - btnW / 2;
        bTouch.y = cy;
        this.drawButton(ctx, bTouch, 'Touch Joysticks', '#00ff88', this.menuSelection === 2, buttonTextSize);

        const bKeyboard = this.btnBounds.modeKeyboard;
        bKeyboard.w = btnW; bKeyboard.h = btnH;
        bKeyboard.x = cx - btnW / 2;
        bKeyboard.y = cy + spacing;
        this.drawButton(ctx, bKeyboard, 'WASD + Mouse', '#00d4ff', this.menuSelection === 3, buttonTextSize);

        const bKeyboardFire = this.btnBounds.modeKeyboardFire;
        bKeyboardFire.w = btnW; bKeyboardFire.h = btnH;
        bKeyboardFire.x = cx - btnW / 2;
        bKeyboardFire.y = cy + 2 * spacing;
        this.drawButton(ctx, bKeyboardFire, 'WASD + IJLK', '#ff00ff', this.menuSelection === 4, buttonTextSize);

        ctx.restore();
    }

    drawButton(ctx, bounds, text, color, highlight = false, fontSize = 18) {
        ctx.save();
        const borderRadius = 15;
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
        if (ctx.roundRect) ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, borderRadius);
        else ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
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

        const scale = Math.max(0.5, this.height / 1080);
        const titleSize = Math.floor(60 * scale);
        const statsSize = Math.floor(30 * scale);
        const buttonTextSize = Math.floor(18 * scale);
        const spacing = 80 * scale;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${titleSize}px "Outfit", sans-serif`;
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = '#ff4444';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 120 * scale);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `${statsSize}px "Outfit", sans-serif`;
        ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 - 40 * scale);
        ctx.fillText(`Coins Collected: ${this.coins}`, this.width / 2, this.height / 2 + 10 * scale);

        const btnW = 200 * scale;
        const btnH = 60 * scale;

        const b = this.btnBounds.restart;
        b.w = btnW; b.h = btnH;
        b.x = this.width / 2 - b.w / 2;
        b.y = this.height / 2 + spacing;

        this.drawButton(ctx, b, 'TRY AGAIN', '#00ff88', this.menuSelection === 0, buttonTextSize);

        // Main Menu Button
        const bMenu = this.btnBounds.mainMenu;
        bMenu.w = btnW; bMenu.h = btnH;
        bMenu.x = this.width / 2 - bMenu.w / 2;
        bMenu.y = b.y + spacing;

        this.drawButton(ctx, bMenu, 'MAIN MENU', '#00d4ff', this.menuSelection === 1, buttonTextSize);

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

        // Update aiming direction first (Authoritative)
        this.updateAiming();

        // 2. Actualizar Entidades (Lógica autoritativa)
        const movementInfo = this.player.updateState(deltaTime, this.input);

        // 2.1 Speed Escalation Logic (Warp Timer > 30s)
        // We do this BEFORE updating enemies so they use the new speed this frame.
        if (this.warpTimer > 30000) {
            const timeOverSeconds = (this.warpTimer - 30000) / 1000;

            this.enemies.forEach(enemy => {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Formula: baseSpeed * (1 + timeFactor * distFactor)
                // timeFactor: Quadratic growth - (timeOverSeconds / 5)^2 (Balanced for pressure)
                const timeFactor = Math.pow(timeOverSeconds / 5, 2);

                // distFactor: 0.2 base + 0.8 scaling by distance (closer enemies still get 20% of the boost)
                const distFactor = 0.2 + 0.8 * Math.min(1, dist / 1500);

                enemy.speed = enemy.baseSpeed * (1 + timeFactor * distFactor);
            });
        } else {
            // Ensure speeds are normal if timer is below 30s
            this.enemies.forEach(enemy => {
                enemy.speed = enemy.baseSpeed;
            });
        }

        this.enemies.forEach(enemy => enemy.updateState(deltaTime));
        this.bullets.forEach(bullet => bullet.updateState(deltaTime));
        this.enemyBullets.forEach(bullet => bullet.updateState(deltaTime));
        this.loots.forEach(loot => loot.updateState(deltaTime));
        this.foods.forEach(food => food.updateState(deltaTime));

        // 3. Gestionar Ciclo de Vida (Eliminaciones/Pools)
        this.cleanupEntities();

        // 4. Generación de Entidades (Spawner)
        this.spawnEntities(deltaTime);
        this.updateSpawnZones(deltaTime);

        // Update grid for collisionses y Grid
        this.updateGrid();
        this.processCollisions();

        // 6. Energy Rod Logic
        this.updateEnergyRod(deltaTime);

        return movementInfo;
    }

    updateAiming() {
        let worldX, worldY;
        if (window.inputMode === 'keyboardFire') {
            let dirX = 0, dirY = 0;
            if (this.input.keys.i) dirY -= 1;
            if (this.input.keys.k) dirY += 1;
            if (this.input.keys.j) dirX -= 1;
            if (this.input.keys.l) dirX += 1;

            if (dirX !== 0 || dirY !== 0) {
                const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                worldX = this.player.x + (dirX / magnitude) * 300;
                worldY = this.player.y + (dirY / magnitude) * 300;
            } else {
                worldX = this.player.x + this.player.fireDirection.x * 300;
                worldY = this.player.y + this.player.fireDirection.y * 300;
            }
        } else {
            worldX = (this.input.mouse.x / this.camera.zoom) + this.camera.x;
            worldY = (this.input.mouse.y / this.camera.zoom) + this.camera.y;
        }
        this.player.setFireDirection(worldX, worldY);
    }

    updateEnergyRod(deltaTime) {
        if (this.gameState !== this.states.PLAYING) return;

        // Activation sources: Spacebar, Right Click (Mouse mode), or Virtual Button (Touch)
        const isBeamRequested = this.input.keys.space || this.input.rightMouseDown || this.input.virtualBeamButton;

        if (isBeamRequested) {
            if (!this.player.isChargingBeam) {
                this.player.isChargingBeam = true;
                this.player.beamChargeTime = 0;
            }
            this.player.beamChargeTime += deltaTime;
            if (this.player.beamChargeTime > this.player.maxBeamChargeTime) {
                this.player.beamChargeTime = this.player.maxBeamChargeTime;
            }

            const progress = this.player.beamChargeTime / this.player.maxBeamChargeTime;

            // Calculate distance to world edge in current direction
            const maxDist = this.getDistanceToWorldEdge(
                this.player.x,
                this.player.y,
                this.player.fireDirection.x,
                this.player.fireDirection.y
            );

            // Mixed linear + quadratic growth: starts moving immediately (30% linear) 
            // and accelerates towards the end (70% quadratic)
            this.player.beamLength = (progress * 0.3 + Math.pow(progress, 2) * 0.7) * maxDist;

            // Play throttled charge sound
            this.beamSoundTimer += deltaTime;
            if (this.beamSoundTimer > 100) {
                this.sound.playBeamCharge(progress);
                this.beamSoundTimer = 0;
            }
        } else if (this.player.isChargingBeam) {
            // Released!
            const progress = this.player.beamChargeTime / this.player.maxBeamChargeTime;
            const tipX = this.player.x + this.player.fireDirection.x * this.player.beamLength;
            const tipY = this.player.y + this.player.fireDirection.y * this.player.beamLength;
            this.triggerBeamExplosion(tipX, tipY, progress);

            this.player.isChargingBeam = false;
            this.player.beamChargeTime = 0;
            this.player.beamLength = 0;
        }
    }

    getDistanceToWorldEdge(px, py, dx, dy) {
        const halfW = this.worldWidth / 2;
        const halfH = this.worldHeight / 2;

        let tMin = 5000; // Large default safety

        // Check X boundaries
        if (dx > 0) {
            tMin = Math.min(tMin, (halfW - px) / dx);
        } else if (dx < 0) {
            tMin = Math.min(tMin, (-halfW - px) / dx);
        }

        // Check Y boundaries
        if (dy > 0) {
            tMin = Math.min(tMin, (halfH - py) / dy);
        } else if (dy < 0) {
            tMin = Math.min(tMin, (-halfH - py) / dy);
        }

        return tMin;
    }

    triggerBeamExplosion(x, y, progress) {
        // Base radius 60, up to 240 at max power
        const radius = 60 + progress * 180;

        // Visual effect (initial burst at target)
        this.createExplosion(x, y, '#ff00ff', 60);
        this.sound.playBeamExplosion();

        // Calculate dash duration based on distance
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // High speed dash: 5000px/s
        const dashSpeed = 5000;
        const duration = (dist / dashSpeed) * 1000; // in ms

        // Set player dash state
        this.player.isDashing = true;
        this.player.dashStartPos = { x: this.player.x, y: this.player.y };
        this.player.dashTarget = { x: x, y: y };
        this.player.dashTimer = 0;
        this.player.dashDuration = Math.max(50, duration); // At least 50ms for visual feedback

        // Add a temporary ripple particle for the explosion range at target
        for (let i = 0; i < 360; i += 20) {
            const rad = i * Math.PI / 180;
            const px = x + Math.cos(rad) * radius;
            const py = y + Math.sin(rad) * radius;
            this.particles.push(new Particle(this, px, py, '#ff00ff'));
        }
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

        // Shooting targets (Screen space for regular bullets)
        const worldMouseX = this.player.x + this.player.fireDirection.x * 300;
        const worldMouseY = this.player.y + this.player.fireDirection.y * 300;
        const screenMouseX = (worldMouseX - this.camera.x) * this.camera.zoom;
        const screenMouseY = (worldMouseY - this.camera.y) * this.camera.zoom;

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
            this.shoot();
            const interval = this.player.turboTimer > 0 ? this.shotInterval * 0.4 : this.shotInterval;
            this.shotTimer = interval;
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
        const select = this.input.keys.enter;

        // Skip joystick/keyboard navigation if input mode is 'touch'
        // as buttons can be clicked/touched directly.
        const isTouchMode = window.inputMode === 'touch';

        if (this.gameState === this.states.INITIAL) {
            // Indices: 0:ZoomOut, 1:ZoomIn, 2:Touch, 3:WASD+Mouse, 4:WASD+IJLK
            if (this.menuCooldown === 0 && !isTouchMode) {
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
                        this.camera.zoom = window.zoomLevel;
                        const b = this.btnBounds.zoomOut;
                        this.triggerExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff8500', 10);
                    }
                } else if (this.menuSelection === 1) {
                    // Zoom In
                    if (window.zoomLevel < 2.0) {
                        window.zoomLevel = parseFloat((window.zoomLevel + 0.1).toFixed(1));
                        this.camera.zoom = window.zoomLevel;
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
                        this.input.keys.enter = false;
                    }
                }
            }

        } else if (this.gameState === this.states.GAME_OVER) {
            // Indices: 0: Try Again, 1: Main Menu
            if (this.menuCooldown === 0 && !isTouchMode) {
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
        // Loot
        for (let i = this.loots.length - 1; i >= 0; i--) {
            if (this.loots[i].markedForDeletion) {
                this.lootPool.release(this.loots[i]);
                this.loots.splice(i, 1);
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
        // Enemy Bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.enemyBullets[i].markedForDeletion) {
                this.enemyBulletPool.release(this.enemyBullets[i]);
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    isOffScreen(entity) {
        // MUST use zoomed viewport dimensions. 
        // Viewport width in world space is this.width / this.camera.zoom
        const viewW = this.width / this.camera.zoom;
        const viewH = this.height / this.camera.zoom;

        // Reset margin MUST be consistent with spawn margin (max 1200 in Enemy.js)
        const resetMargin = 1500;

        return (
            entity.x < this.camera.x - resetMargin ||
            entity.x > this.camera.x + viewW + resetMargin ||
            entity.y < this.camera.y - resetMargin ||
            entity.y > this.camera.y + viewH + resetMargin
        );
    }

    isVisible(entity) {
        const viewW = this.width / this.camera.zoom;
        const viewH = this.height / this.camera.zoom;
        const buffer = 200;
        return (
            entity.x >= this.camera.x - buffer &&
            entity.x <= this.camera.x + viewW + buffer &&
            entity.y >= this.camera.y - buffer &&
            entity.y <= this.camera.y + viewH + buffer
        );
    }

    updateSpawnZones(deltaTime) {
        this.zoneTimer += deltaTime;
        if (this.zoneTimer > 8000 || this.spawnZones.length === 0) {
            this.generateSpawnZones();
            this.zoneTimer = 0;
        }
    }

    generateSpawnZones() {
        this.spawnZones = [];

        // Define which enemies unlock at which warp
        const unlockLevels = {
            'basic': 1,
            'charger': 2,
            'striker': 3,
            'drifter': 4,
            'sniper': 5,
            'spinner': 5,
            'overlord': 5,
            'swarth': 6,
            'wraith': 6,
            'spear': 7,
            'mite': 7,
            'stalker': 6
        };

        // Only generate zones for "Special" enemies that use them (not BASIC)
        const types = Object.values(Enemy.Types).filter(type =>
            type !== Enemy.Types.BASIC && (unlockLevels[type] || 1) <= this.warpLevel
        );

        if (types.length === 0) return;

        // More types unlocked = more potential zones
        const zoneCount = Math.min(types.length * 2, 8);

        const colors = {
            'basic': '#ff4444',
            'charger': '#00d4ff',
            'striker': '#ffff00',
            'drifter': '#ff00ff',
            'overlord': '#ff8800',
            'sniper': '#00ff44',
            'spinner': '#ff0055',
            'stalker': '#00ffff',
            'swarth': '#aaff00',
            'wraith': '#ffffff',
            'spear': '#ffaa00',
            'mite': '#ff00aa'
        };

        for (let i = 0; i < zoneCount; i++) {
            let zone;
            let attempts = 0;
            const type = types[Math.floor(Math.random() * types.length)];

            while (attempts < 20) {
                const w = 300 + Math.random() * 400;
                const h = 300 + Math.random() * 400;
                const x = (Math.random() - 0.5) * (this.worldWidth - w);
                const y = (Math.random() - 0.5) * (this.worldHeight - h);

                zone = { x, y, w, h, type, color: colors[type] || '#ffffff' };

                // Check overlap
                const overlaps = this.spawnZones.some(z => {
                    return !(zone.x + zone.w < z.x ||
                        zone.x > z.x + z.w ||
                        zone.y + zone.h < z.y ||
                        zone.y > z.y + z.h);
                });

                if (!overlaps) {
                    this.spawnZones.push(zone);
                    break;
                }
                attempts++;
            }
        }
    }

    spawnEntities(deltaTime) {
        this.enemyTimer += deltaTime;

        // Keep spawning until the Warp Quota is met.
        // We want to maintain a healthy population of enemies (max 60) as long as we haven't reached the goal.
        const spawnInterval = this.enemies.length === 0 ? this.enemyInterval / 2 : this.enemyInterval;

        if (this.enemyTimer > spawnInterval && this.enemies.length < 60) {
            if (this.enemiesSpawnedInLevel < this.killQuota) {
                // Limit the total Number of enemies that can exist in a level
                // so the player can actually clear the screen as they progress.
                const e = this.enemyPool.get(this);
                this.enemies.push(e);
                this.enemiesSpawnedInLevel++;

                // Group spawning for Swarth
                if (e.type === Enemy.Types.SWARTH) {
                    for (let i = 0; i < 5; i++) {
                        const se = this.enemyPool.get(this);
                        se.type = Enemy.Types.SWARTH;
                        se.x = e.x + (Math.random() - 0.5) * 40;
                        se.y = e.y + (Math.random() - 0.5) * 40;
                        this.enemies.push(se);
                        this.enemiesSpawnedInLevel++;
                    }
                }
                this.enemyTimer = 0;
            }
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
        this.loots.forEach(loot => {
            if (!loot.isCaptured) this.grid.insert(loot);
        });
        this.bullets.forEach(bullet => this.grid.insert(bullet));
        this.enemyBullets.forEach(bullet => this.grid.insert(bullet));
        this.particles.forEach(p => this.grid.insert(p));
    }

    processCollisions() {
        // Bullet collisions
        this.bullets.forEach(bullet => {
            const potentialTargets = this.grid.retrieve(bullet, 50);
            potentialTargets.forEach(target => {
                if (bullet.markedForDeletion) return;

                if (target instanceof Enemy && !target.markedForDeletion) {
                    // Only damage if enemy is within camera view
                    if (this.isVisible(target)) {
                        const dx = bullet.x - target.x;
                        const dy = bullet.y - target.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < target.size) {
                            target.takeDamage(1); // Use takeDamage for consistent kill logic
                            bullet.markedForDeletion = true;
                        }
                    }
                }
                // Destructible projectiles (Stars)
                else if (target instanceof EnemyBullet && !target.markedForDeletion && target.type === EnemyBullet.Types.STAR) {
                    const dx = bullet.x - target.x;
                    const dy = bullet.y - target.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < target.radius + 10) {
                        target.markedForDeletion = true;
                        bullet.markedForDeletion = true;
                        // Small impact sparks
                        for (let i = 0; i < 5; i++) {
                            this.particles.push(this.particlePool.get(this, target.x, target.y, target.color));
                        }
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

                    // Extra life every 5 collected foods (no limit)
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

        // Enemy bullet collisions with Player
        this.enemyBullets.forEach(bullet => {
            if (!bullet.markedForDeletion) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isInvincible = this.player.collisionEffectTimer > 0 || this.player.shieldTimer > 0;
                if (!isInvincible && dist < this.player.radius + bullet.radius) {
                    bullet.markedForDeletion = true;
                    this.takeDamage();
                    this.player.triggerCollisionEffect();
                }
            }
        });

        // Player-Loot collisions
        const nearbyLoot = this.grid.retrieve(this.player, this.player.radius + 50);
        nearbyLoot.forEach(loot => {
            if (loot instanceof Loot && !loot.isCaptured) {
                const dx = this.player.x - loot.x;
                const dy = this.player.y - loot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.player.radius + loot.radius) {
                    loot.isCaptured = true;
                    if (loot.type === Loot.Types.HEART) {
                        this.lives++;
                        this.sound.playExtraLife();
                        this.addFloatingText("VIDA +1", this.player.x, this.player.y, '#ff4444');
                    } else if (loot.type === Loot.Types.SHIELD) {
                        this.player.shieldTimer = 10000;
                        this.addFloatingText("ESCUDO!", this.player.x, this.player.y, '#00d4ff');
                    } else if (loot.type === Loot.Types.TURBO) {
                        this.player.turboTimer = 8000;
                        this.addFloatingText("MEGA TURBO!", this.player.x, this.player.y, '#ff8800');
                    } else if (loot.type === Loot.Types.TRIPLE) {
                        this.player.tripleShotTimer = 8000;
                        this.addFloatingText("TRI-DISPARO!", this.player.x, this.player.y, '#ff00ff');
                    } else if (loot.type === Loot.Types.BOMB) {
                        this.useBomb();
                        this.addFloatingText("MEGA BOMBA!", this.player.x, this.player.y, '#ffffff');
                    } else {
                        this.score += 50;
                        this.coins += 5;
                    }
                    this.updateScore();
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

        // Enter to Main Menu (Pause & Exit) from Playing/Paused
        if ((this.gameState === this.states.PLAYING || this.gameState === this.states.PAUSED) && this.input.keys.enter) {
            this.gameState = this.states.INITIAL;
            this.menuCooldown = 500; // Prevent immediate selection
            this.sound.playCollect();
            this.input.keys.enter = false; // Consume input
            return; // Skip rest of update
        }

        if (this.gameState === this.states.INITIAL || this.gameState === this.states.GAME_OVER) {
            this.updateMenu(deltaTime);
        }

        if (this.gameState === this.states.PLAYING) {
            this.warpTimer += deltaTime;
        }

        const movementInfo = this.updateState(deltaTime);
        this.updateVisuals(deltaTime, movementInfo);

        if (this.warpMessageTimer > 0) {
            this.warpMessageTimer -= deltaTime;
        }
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
                ent.draw(ctx);
                if (this.isVisible(ent)) {
                    visibleEnemies++;
                }
                ent.draw(bCtx); // Draw to bloom
            } else if (ent instanceof Bullet) {
                ent.draw(ctx);
                ent.draw(bCtx); // Draw to bloom
            } else if (ent instanceof EnemyBullet) {
                ent.draw(ctx);
                ent.draw(bCtx);
            } else if (ent instanceof Loot) {
                ent.draw(ctx);
                ent.draw(bCtx);
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
        if (this.player.spawnTimer <= 0) this.player.draw(bCtx);

        // --- Speed Lines during Dash ---
        if (this.player.isDashing) {
            bCtx.save();
            bCtx.strokeStyle = '#ff00ff';
            bCtx.lineWidth = 2;
            bCtx.globalAlpha = 0.6;
            const dashDx = this.player.dashTarget.x - this.player.dashStartPos.x;
            const dashDy = this.player.dashTarget.y - this.player.dashStartPos.y;
            const dashAngle = Math.atan2(dashDy, dashDx);

            for (let i = 0; i < 15; i++) {
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                const length = 40 + Math.random() * 60;

                bCtx.beginPath();
                bCtx.moveTo(this.player.x + offsetX, this.player.y + offsetY);
                bCtx.lineTo(this.player.x + offsetX - Math.cos(dashAngle) * length,
                    this.player.y + offsetY - Math.sin(dashAngle) * length);
                bCtx.stroke();
            }
            bCtx.restore();
        }

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
        this.drawFloatingTexts(this.ctx);

        // Draw Main HUD (Visual)
        this.ctx.font = 'bold 20px "Outfit", sans-serif';

        this.ctx.fillStyle = '#00ccff';
        // HUD Text - Offset downward to avoid Pause Button (y=20 to 80)
        const hudYOffset = 100;
        this.ctx.fillText(`Score: ${this.score}`, 20, hudYOffset);

        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`Coins: ${this.coins}`, 20, hudYOffset + 30);

        this.ctx.fillStyle = '#ff4444';
        const fullGroups = Math.floor(this.lives / 10);
        const remainder = this.lives % 10;
        let livesText = '';
        if (fullGroups > 0) {
            livesText = `❤️x10`.repeat(fullGroups) + ' ' + '❤️'.repeat(remainder);
        } else {
            livesText = '❤️'.repeat(this.lives);
        }
        this.ctx.fillText(`Lives: ${livesText}`, 20, hudYOffset + 60);

        this.ctx.fillStyle = '#00ff88';

        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillText(`Warp ${this.warpLevel} Process: ${this.warpLevelKillCount} / ${this.killQuota}`, 20, hudYOffset + 90);
        this.ctx.fillText(`FPS: ${this.fps}`, 20, hudYOffset + 120);

        // Conditional Debug HUD
        if (this.showDebugHUD) {
            const maxEnemySpeed = this.enemies.reduce((max, e) => Math.max(max, e.speed), 0);
            const seconds = Math.floor(this.warpTimer / 1000);
            const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
            const ss = (seconds % 60).toString().padStart(2, '0');

            this.ctx.fillStyle = '#00ff88';

            if (this.warpTimer > 30000) this.ctx.fillStyle = '#ff4444';
            else this.ctx.fillStyle = '#00ff88';
            this.ctx.fillText(`Warp Time: ${mm}:${ss}`, 20, 210);

            this.ctx.fillStyle = '#00ff88';
            this.ctx.fillText(`Enemies Total: ${this.enemies.length} / Visible: ${visibleEnemies}`, 20, 240);

            this.ctx.fillStyle = '#00d4ff';
            this.ctx.fillText(`Ship Speed: ${Math.round(this.player.speed)}`, 20, 270);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillText(`Max Enemy Speed: ${Math.round(maxEnemySpeed)}`, 20, 300);
        }

        // Pause Button (Visible in Playing/Paused)
        if (this.gameState === this.states.PLAYING || this.gameState === this.states.PAUSED) {
            const pb = this.pauseBtnBounds;
            this.ctx.save();

            // Background for better visibility
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(pb.x, pb.y, pb.w, pb.h);

            this.ctx.globalAlpha = 0.8;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);

            // Draw Pause Icon (||)
            this.ctx.fillStyle = '#ffffff';
            const iconW = 10;
            const iconH = 34;
            const gap = 14;
            this.ctx.fillRect(pb.x + (pb.w - iconW * 2 - gap) / 2, pb.y + (pb.h - iconH) / 2, iconW, iconH);
            this.ctx.fillRect(pb.x + (pb.w - iconW * 2 - gap) / 2 + iconW + gap, pb.y + (pb.h - iconH) / 2, iconW, iconH);
            this.ctx.restore();
        }

        // Draw Virtual Controls (Touch Mode Only)
        this.drawVirtualControls(this.ctx);

        // UI Screens
        if (this.gameState === this.states.INITIAL) {
            this.drawStartScreen(this.ctx);
        } else if (this.gameState === this.states.PAUSED) {
            this.drawPauseScreen(this.ctx);
        } else if (this.gameState === this.states.GAME_OVER) {
            this.drawGameOverScreen(this.ctx);
        }

        // Draw Warp Level Text
        if (this.warpMessageTimer > 0) {
            this.drawWarpText(this.ctx);
        }
    }

    drawVirtualControls(ctx) {
        const vc = window.virtualControls;
        if (!vc || window.inputMode !== 'touch') return;

        ctx.save();

        // 1. Draw Beam Button Area (Subtle overlay for Minimap)
        const beam = vc.beam;
        const br = beam.rect;

        ctx.globalAlpha = beam.active ? 0.25 : 0.08;
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(br.x, br.y, br.w, br.h, 12);
        else ctx.rect(br.x, br.y, br.w, br.h);
        ctx.fill();

        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Draw Joysticks
        const drawJoy = (joy, side) => {
            const centerX = joy.touchId !== null ? joy.baseX : joy.placeholderX;
            const centerY = joy.touchId !== null ? joy.baseY : joy.placeholderY;

            // Outer Ring
            ctx.globalAlpha = joy.touchId !== null ? 0.2 : 0.08; // Reduced alpha
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, vc.maxRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Inner Knob
            const kx = centerX + joy.x * vc.maxRadius;
            const ky = centerY + joy.y * vc.maxRadius;

            ctx.globalAlpha = joy.touchId !== null ? 0.2 : 0.08; // Reduced alpha
            ctx.fillStyle = '#00ff88';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff88';
            ctx.beginPath();
            ctx.arc(kx, ky, vc.maxRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Knob border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        drawJoy(vc.left, 'left');
        drawJoy(vc.right, 'right');

        ctx.restore();
    }

    nextLevel() {
        this.warpLevel++;
        this.warpLevelKillCount = 0;
        this.enemiesSpawnedInLevel = 0;
        this.warpTimer = 0;
        this.warpMessageTimer = 3000;
        this.player.resetSpawnAnimation(); // Trigger player transition animation
        this.sound.playExtraLife(); // Reuse for level up sound or create new

        // Progressive speed by warp: warp 1=110, warp 2=120, ..., warp 5=150 (max)
        // Formula: 100 + (warpLevel * 10), capped at 150
        this.baseSpeed = Math.min(150, 100 + (this.warpLevel * 10));

        // Reset player speed to the new base speed (unless in collision effect)
        if (this.player.collisionEffectTimer <= 0) {
            this.player.speed = this.baseSpeed;
        }
    }

    drawWarpText(ctx) {
        ctx.save();
        const t = this.warpMessageTimer;
        const d = this.warpMessageDuration;
        let alpha = 1.0;

        // Fade in (first 0.5s) and Fade out (last 0.5s)
        if (t > d - 500) {
            alpha = (d - t) / 500;
        } else if (t < 500) {
            alpha = t / 500;
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 100px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 40;

        ctx.fillText(`WARP ${this.warpLevel}`, this.width / 2, this.height / 3);

        ctx.restore();
    }

    toggleDebug() {
        this.showDebugHUD = !this.showDebugHUD;
        console.log(`Debug HUD is now: ${this.showDebugHUD ? 'ENABLED' : 'DISABLED'}`);
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

        // Camera Warp/Teleport Transition
        if (this.warpMessageTimer > 0) {
            const t = (this.warpMessageDuration - this.warpMessageTimer) / this.warpMessageDuration;
            // Smooth pulse: zoom goes from 1.0 -> 1.25 -> 1.0
            this.camera.zoom = 1.0 + Math.sin(t * Math.PI) * 0.25;
        } else if (this.player.isDashing) {
            // Slight zoom in during dash travel
            this.camera.zoom = 1.15;
        } else {
            this.camera.zoom = 1.0;
        }

        // Limit deltaTime to avoid huge jumps if the tab was inactive
        const cappedDelta = Math.min(deltaTime, 100);

        this.update(cappedDelta);
        this.draw();

        requestAnimationFrame(this.loop);
    }

    shoot() {
        if (this.gameState !== this.states.PLAYING) return;

        const dx = this.player.fireDirection.x;
        const dy = this.player.fireDirection.y;
        const ang = Math.atan2(dy, dx);

        const spawnBullet = (angleOffset = 0) => {
            const finalAng = ang + angleOffset;
            const targetX = this.player.x + Math.cos(finalAng) * 500;
            const targetY = this.player.y + Math.sin(finalAng) * 500;
            const b = this.bulletPool.get(this, this.player.x, this.player.y, targetX, targetY);
            this.bullets.push(b);
        };

        if (this.player.tripleShotTimer > 0) {
            spawnBullet(0);
            spawnBullet(0.25); // Slightly wider spread for better feel
            spawnBullet(-0.25);
        } else {
            spawnBullet(0);
        }

        // Trigger arrow blink effect
        this.player.triggerArrowBlink();
        this.sound.playShoot();
    }

    useBomb() {
        // Clear all visible enemies and their bullets
        this.enemies.forEach(enemy => {
            if (this.isVisible(enemy)) {
                enemy.takeDamage(100); // Massive damage to clear
            }
        });
        this.enemyBullets.forEach(bullet => {
            if (this.isVisible(bullet)) {
                bullet.markedForDeletion = true;
            }
        });
        // Big flash effect particles
        for (let i = 0; i < 50; i++) {
            const p = this.particlePool.get(this, this.player.x, this.player.y, '#ffffff');
            p.speedX *= 3;
            p.speedY *= 3;
            this.particles.push(p);
        }
    }

    addFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text, x, y, color,
            timer: 1500, // 1.5 seconds
            maxTimer: 1500
        });
    }

    drawFloatingTexts(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px "Outfit", sans-serif';

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            const t = ft.timer / ft.maxTimer; // 1.0 -> 0.0

            // Screen position calculation
            const screenX = (ft.x - this.camera.x) * this.camera.zoom;
            const screenY = (ft.y - this.camera.y) * this.camera.zoom - (1 - t) * 100; // Float up

            ctx.globalAlpha = t;
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, screenX, screenY);

            ft.timer -= 16; // Assuming ~60fps for simple logic
            if (ft.timer <= 0) this.floatingTexts.splice(i, 1);
        }
        ctx.restore();
    }

}
