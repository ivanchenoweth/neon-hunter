class Player {
    constructor(game) {
        this.game = game;
        this.radius = 20;
        this.x = 0;
        this.y = 0;
        this.speed = 350;
        this.color = '#00ff88';
        this.glow = '#00ff88';
        this.trailTimer = 0;
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Esta función maneja la física y límites del jugador.
     * En un entorno multijugador, esto correría en el servidor.
     */
    updateState(deltaTime, input) {
        let dx = 0;
        let dy = 0;

        // NOTA: En multijugador, aquí se enviaría el input al servidor
        // y se esperaría la validación de la posición.
        if (input.keys.w) dy -= 1;
        if (input.keys.s) dy += 1;
        if (input.keys.a) dx -= 1;
        if (input.keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed * (deltaTime / 1000);
        this.y += dy * this.speed * (deltaTime / 1000);

        // Clamp player position within world boundaries
        const halfWidth = this.game.worldWidth / 2;
        const halfHeight = this.game.worldHeight / 2;
        this.x = Math.max(-halfWidth + this.radius, Math.min(halfWidth - this.radius, this.x));
        this.y = Math.max(-halfHeight + this.radius, Math.min(halfHeight - this.radius, this.y));

        return { dx, dy }; // Devolvemos info para la lógica visual
    }

    /**
     * Lógica Visual (Client-side)
     * Efectos que no afectan el resultado del juego (partículas, trails).
     */
    updateVisuals(deltaTime, movementInfo) {
        if (!movementInfo) return;
        const { dx, dy } = movementInfo;

        // Trail effect
        if (dx !== 0 || dy !== 0) {
            this.trailTimer += deltaTime;
            if (this.trailTimer > 50) {
                this.game.particles.push(new Particle(this.game, this.x, this.y, this.color));
                this.trailTimer = 0;
            }
        }
    }

    // Deprecated for multiplayer readiness
    update(deltaTime, input) {
        const movementInfo = this.updateState(deltaTime, input);
        this.updateVisuals(deltaTime, movementInfo);
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
