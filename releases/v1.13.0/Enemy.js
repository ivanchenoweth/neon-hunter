class Enemy {
    constructor(game) {
        this.game = game;
        this.size = 25;
        // Increase speed by 20% for each warp level (Warp 1 = 1x, Warp 2 = 1.2x)
        const speedMultiplier = 1 + (this.game.warpLevel - 1) * 0.2;
        this.baseSpeed = (90 + Math.random() * 35) * speedMultiplier;
        this.speed = this.baseSpeed;
        this.color = '#ff4444';
        this.markedForDeletion = false;

        // Spawn in a rectangular area around the player
        this._setRectangularSpawnPosition();

        // Clamp to world bounds
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));

        this.angle = 0;

        // Ensure spawned enemy is not too far outside current camera view
        this._adjustSpawnIntoView();

        if (!Enemy.spriteCanvas) {
            Enemy.spriteCanvas = document.createElement('canvas');
            const size = this.size;
            Enemy.spriteCanvas.width = size * 1.5;
            Enemy.spriteCanvas.height = size * 1.5;
            const sCtx = Enemy.spriteCanvas.getContext('2d');
            sCtx.translate(size * 0.75, size * 0.75);
            sCtx.fillStyle = this.color;
            sCtx.beginPath();
            sCtx.moveTo(size / 2, 0);
            sCtx.lineTo(-size / 2, -size / 2.5);
            sCtx.lineTo(-size / 3, 0);
            sCtx.lineTo(-size / 2, size / 2.5);
            sCtx.fill();
            sCtx.closePath();
        }
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Maneja el movimiento de persecución y colisiones con el jugador.
     */
    updateState(deltaTime) {
        // Chase player
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * (deltaTime / 1000);
            this.y += (dy / dist) * this.speed * (deltaTime / 1000);
        }

        // Separation from other enemies
        const separationDist = this.size * 0.8;
        const nearby = this.game.grid.retrieve(this, separationDist);
        nearby.forEach(other => {
            if (other instanceof Enemy && other !== this && !other.markedForDeletion) {
                const diffX = this.x - other.x;
                const diffY = this.y - other.y;
                const distance = Math.sqrt(diffX * diffX + diffY * diffY);

                if (distance < separationDist && distance > 0) {
                    // Constant push away to keep distance
                    const pushFactor = (separationDist - distance) / separationDist;
                    const pushForce = 150 * pushFactor; // Force magnitude
                    this.x += (diffX / distance) * pushForce * (deltaTime / 1000);
                    this.y += (diffY / distance) * pushForce * (deltaTime / 1000);
                } else if (distance === 0) {
                    // In case they are exactly on top of each other, nudge them
                    this.x += (Math.random() - 0.5) * 10;
                    this.y += (Math.random() - 0.5) * 10;
                }
            }
        });

        // Collision with player
        // NOTA: En un servidor autoritativo, esto se calcularía en el server 
        // y se notificaría al cliente para que reste puntos y cree efectos.
        if (dist < this.game.player.radius + this.size / 2) {
            this.markedForDeletion = true;

            // Esta parte afecta al estado global del juego
            this.game.takeDamage();

            // Count collision as a kill for progress (User Request)
            this.game.warpLevelKillCount++;
            if (this.game.warpLevelKillCount >= this.game.killQuota && this.game.warpMessageTimer <= 0) {
                this.game.nextLevel();
            }

            // Explosion particles (Client-side)
            for (let i = 0; i < 10; i++) {
                this.game.particles.push(new Particle(this.game, this.x, this.y, this.color));
            }
        }

        // Update angle
        this.angle = Math.atan2(dy, dx);
    }

    // Deprecated for multiplayer readiness
    update(deltaTime) {
        this.updateState(deltaTime);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.drawImage(
            Enemy.spriteCanvas,
            -this.size * 0.75,
            -this.size * 0.75
        );

        ctx.restore();
        return true;
    }
    reset(game) {
        this.game = game;
        this.markedForDeletion = false;

        this._setRectangularSpawnPosition();

        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));
        this.angle = 0;
        const speedMultiplier = 1 + (this.game.warpLevel - 1) * 0.2;
        this.baseSpeed = (90 + Math.random() * 35) * speedMultiplier;
        this.speed = this.baseSpeed;
        this._adjustSpawnIntoView();
    }

    /**
     * Helper to set position on the edges of a rectangle around the player/camera
     */
    _setRectangularSpawnPosition() {
        const cam = this.game.camera;
        const viewW = cam.width / cam.zoom;
        const viewH = cam.height / cam.zoom;

        // Reduced margins to bring spawning closer to the visible area
        const marginW = 400;
        const marginH = 400;

        const side = Math.floor(Math.random() * 4); // 0: Top, 1: Bottom, 2: Left, 3: Right

        // Broaden the ranges to include the corner areas (points outside the screen-corners)
        switch (side) {
            case 0: // Top edge (including corners)
                this.x = cam.x - marginW + Math.random() * (viewW + 2 * marginW);
                this.y = cam.y - marginH;
                break;
            case 1: // Bottom edge (including corners)
                this.x = cam.x - marginW + Math.random() * (viewW + 2 * marginW);
                this.y = cam.y + viewH + marginH;
                break;
            case 2: // Left edge (including corners)
                this.x = cam.x - marginW;
                this.y = cam.y - marginH + Math.random() * (viewH + 2 * marginH);
                break;
            case 3: // Right edge (including corners)
                this.x = cam.x + viewW + marginW;
                this.y = cam.y - marginH + Math.random() * (viewH + 2 * marginH);
                break;
        }

        // Clamp to world bounds
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));
    }

    _adjustSpawnIntoView() {
        // With rectangular spawn directly based on camera, 
        // this is mostly covered by _setRectangularSpawnPosition.
        // We just ensure it's not exactly on top of the player.
        const dx = this.x - this.game.player.x;
        const dy = this.y - this.game.player.y;
        if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
            this._setRectangularSpawnPosition();
        }
    }
}
