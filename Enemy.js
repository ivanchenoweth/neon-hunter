class Enemy {
    constructor(game) {
        this.game = game;
        this.size = 50;
        this.speed = 180 + Math.random() * 70;
        this.color = '#ff4444';
        this.markedForDeletion = false;

        // Spawn somewhere around the player but at a distance
        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 400; // Between 600 and 1000 units away
        this.x = this.game.player.x + Math.cos(angle) * distance;
        this.y = this.game.player.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));

        this.angle = 0;

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

        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 400;
        this.x = this.game.player.x + Math.cos(angle) * distance;
        this.y = this.game.player.y + Math.sin(angle) * distance;

        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));
        this.angle = 0;
        this.speed = 180 + Math.random() * 70;
    }
}
