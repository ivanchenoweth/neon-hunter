class Enemy {
    constructor(game) {
        this.game = game;
        this.size = 25;
        // Limit enemy speed to 120% of player speed, max 180
        const maxSpeed = Math.min(180, this.game.baseSpeed * 1.2);
        this.baseSpeed = maxSpeed * (0.8 + Math.random() * 0.2);
        this.speed = this.baseSpeed;
        this.color = '#ff4444';
        this.markedForDeletion = false;
        this.id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

        // Spawn on the edges of the world (outside perimeter)
        this._setEdgeSpawnPosition();

        this.angle = 0;

        // Network Sync / Interpolation targets
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetAngle = this.angle;

        // Ensure spawned enemy targets current position initially
        // this._adjustSpawnIntoView(); // Disabled for edge spawning

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
        // En multijugador, solo el HOST simula el movimiento de los enemigos.
        // Los clientes interpolan las posiciones recibidas por red.
        if (!this.game.isHost) return;

        // Targeting logic: find the closest player
        const allPlayers = [this.game.player, ...Array.from(this.game.remotePlayers.values())];

        let minDistance = Infinity;
        let closestPlayer = this.game.player;

        allPlayers.forEach(p => {
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const distSq = dx * dx + dy * dy; // Use squared distance for performance
            if (distSq < minDistance) {
                minDistance = distSq;
                closestPlayer = p;
            }
        });

        this.target = closestPlayer;
        let target = this.target;

        // Chase target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
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
        // Skip collision entirely if player is invulnerable (blinking)
        const isInvincible = this.game.player.collisionEffectTimer > 0;
        if (!isInvincible && dist < this.game.player.radius + this.size / 2) {
            this.markedForDeletion = true;

            // Trigger collision effect (speed reduction + alpha reduction)
            this.game.player.triggerCollisionEffect();

            // Esta parte afecta al estado global del juego
            this.game.takeDamage();

            // Grant points and kill count
            this.game.score += 10;
            this.game.enemiesDestroyed++;
            this.game.updateScore();

            // Count collision as a kill for progress (User Request)
            this.game.warpLevelKillCount++;
            if (this.game.warpLevelKillCount >= this.game.killQuota && this.game.enemies.length <= 1 && this.game.warpMessageTimer <= 0) {
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
        this.id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

        this._setEdgeSpawnPosition();

        this.angle = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetAngle = this.angle;

        // Limit enemy speed to 120% of player speed, max 180
        const maxSpeed = Math.min(180, this.game.baseSpeed * 1.2);
        this.baseSpeed = maxSpeed * (0.8 + Math.random() * 0.2);
        this.speed = this.baseSpeed;
        // this._adjustSpawnIntoView(); // Disabled for edge spawning
    }

    /**
     * Set position on the outer edges of the world or within a designated spawn area
     */
    _setEdgeSpawnPosition() {
        // If there is a specific spawn area (e.g. Multiplayer red box), use it.
        if (this.game.spawnArea) {
            this.x = this.game.spawnArea.x + Math.random() * this.game.spawnArea.w;
            this.y = this.game.spawnArea.y + Math.random() * this.game.spawnArea.h;
            return;
        }

        // If no explicit spawn area (Single Player), spawn relative to Camera
        const camX = this.game.camera.x;
        const camY = this.game.camera.y;

        // Calculate visible viewport in world coordinates
        const viewW = this.game.width / this.game.camera.zoom;
        const viewH = this.game.height / this.game.camera.zoom;

        const margin = 100; // Distance outside the view to spawn

        const side = Math.floor(Math.random() * 4); // 0: Top, 1: Bottom, 2: Left, 3: Right

        switch (side) {
            case 0: // Top edge (just above view)
                this.x = camX + Math.random() * viewW;
                this.y = camY - margin;
                break;
            case 1: // Bottom edge (just below view)
                this.x = camX + Math.random() * viewW;
                this.y = camY + viewH + margin;
                break;
            case 2: // Left edge (just left of view)
                this.x = camX - margin;
                this.y = camY + Math.random() * viewH;
                break;
            case 3: // Right edge (just right of view)
                this.x = camX + viewW + margin;
                this.y = camY + Math.random() * viewH;
                break;
        }
    }

    /**
     * Spawns the enemy in a rectangular perimeter around the camera's current view.
     */
    /**
     * Spawns the enemy in a rectangular perimeter around the camera's current view.
     * @deprecated Use _setEdgeSpawnPosition instead.
     */
    _setRectangularSpawnPosition() {
        // This method is now legacy as per user request to stick to spawn areas.
        // Falling back to edge spawn logic.
        this._setEdgeSpawnPosition();
    }

    _adjustSpawnIntoView() {
        // Check if spawn is too close to player
        const dx = this.x - this.game.player.x;
        const dy = this.y - this.game.player.y;
        if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
            this._setRectangularSpawnPosition();
        }
    }

    /**
     * Set enemy state from network sync
     */
    setState(data) {
        this.x = data.x;
        this.y = data.y;
        this.angle = data.angle;
        this.speed = data.speed;
        this.markedForDeletion = data.markedForDeletion;
    }

    /**
     * Set interpolation targets from network sync
     */
    setTargetState(data) {
        this.targetX = data.x;
        this.targetY = data.y;
        this.targetAngle = data.angle;
        this.speed = data.speed;
        this.markedForDeletion = data.markedForDeletion;
    }

    /**
     * Smoothly interpolate position (Client-side use only)
     */
    updateInterpolation(deltaTime) {
        // Simple lerp (0.2 factor for smooth movement)
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;

        // Angle interpolation (handle wrap-around if needed, but simple lerp works for small steps)
        let diffAngle = this.targetAngle - this.angle;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        this.angle += diffAngle * 0.2;
    }
}
