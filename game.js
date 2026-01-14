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
        this.fpsLimit = 60; // 60 FPS limit for smoothness
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
        this.camera = new Camera(this.width, this.height);
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
            GAME_OVER: 'GAME_OVER'
        };
        this.gameState = this.states.INITIAL;
        this.lives = 3;

        // Button bounds for canvas interaction
        this.btnBounds = {
            start: { x: 0, y: 0, w: 200, h: 60 },
            restart: { x: 0, y: 0, w: 200, h: 60 }
        };

        // Canvas Interaction
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasClick(e));

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
        this.blurCanvas.width = this.bloomCanvas.width;
        this.blurCanvas.height = this.bloomCanvas.height;

        this.camera.width = this.width;
        this.camera.height = this.height;
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

        // Draw camera viewport on minimap
        const vx = centerX + this.camera.x * scale;
        const vy = centerY + this.camera.y * scale;
        const vw = this.camera.width * scale;
        const vh = this.camera.height * scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);

        // Draw player on minimap
        const px = centerX + this.player.x * scale;
        const py = centerY + this.player.y * scale;
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
        this.gameState = this.states.PLAYING;
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.foodCollectedCount = 0;
        this.enemies = [];
        this.bullets = [];
        this.foods = [];
        this.particles = [];
        this.enemyTimer = 0;

        // Hide overlays if present
        if (this.startScreen && this.startScreen.classList) this.startScreen.classList.add('hidden');
        if (this.gameOverScreen && this.gameOverScreen.classList) this.gameOverScreen.classList.add('hidden');
    }

    takeDamage() {
        if (this.gameState !== this.states.PLAYING) return;

        this.lives--;
        this.sound.playDamage();
        this.camera.shake(20, 300);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.gameState = this.states.GAME_OVER;
    }

    handleCanvasClick(e) {
        if (this.gameState === this.states.PLAYING) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.gameState === this.states.INITIAL) {
            const b = this.btnBounds.start;
            if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                this.startGame();
                this.sound.playCollect();
            }
        } else if (this.gameState === this.states.GAME_OVER) {
            const b = this.btnBounds.restart;
            if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                this.startGame();
                this.sound.playCollect();
            }
        }
    }

    drawStartScreen(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 60px "Outfit", sans-serif';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff88';
        ctx.fillText('NEON HUNTER', this.width / 2, this.height / 2 - 100);

        ctx.font = '20px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 0;
        ctx.fillText('Sobrevive el mayor tiempo posible', this.width / 2, this.height / 2 - 40);

        const b = this.btnBounds.start;
        b.x = this.width / 2 - b.w / 2;
        b.y = this.height / 2 + 20;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 30);
        else ctx.rect(b.x, b.y, b.w, b.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText('START GAME', this.width / 2, b.y + b.h / 2);
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

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 30);
        else ctx.rect(b.x, b.y, b.w, b.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText('TRY AGAIN', this.width / 2, b.y + b.h / 2);
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

        // Cleanup de partículas (siempre local)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].markedForDeletion) {
                this.particlePool.release(this.particles[i]);
                this.particles.splice(i, 1);
            }
        }

        // Shooting logic (Local trigger)
        if (this.shotTimer > 0) this.shotTimer -= deltaTime;
        if (this.input.mouseDown && this.shotTimer <= 0) {
            this.shoot(this.input.mouse.x, this.input.mouse.y);
            this.shotTimer = this.shotInterval;
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
                        this.sound.playExplosion();
                        for (let i = 0; i < 12; i++) {
                            const size = Math.random() * 20 + 20;
                            this.particles.push(this.particlePool.get(this, enemy.x, enemy.y, enemy.color, size));
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
        ctx.translate(-this.camera.x, -this.camera.y);

        this.background.draw(ctx);

        // Draw world border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 5;
        ctx.strokeRect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);

        // --- Bloom Draw Pass Preparation ---
        // We only want entities to glow, not the background.
        bCtx.save();
        bCtx.scale(this.bloomScale, this.bloomScale);
        bCtx.translate(-this.camera.x, -this.camera.y);

        // Grid-based culled rendering
        const renderBounds = {
            x: this.camera.x - 100,
            y: this.camera.y - 100,
            width: this.camera.width + 200,
            height: this.camera.height + 200
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

        // UI Screens
        if (this.gameState === this.states.INITIAL) {
            this.drawStartScreen(this.ctx);
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
        this.bullets.push(this.bulletPool.get(this, this.player.x, this.player.y, mouseX, mouseY));
        this.sound.playShoot();
    }
}
