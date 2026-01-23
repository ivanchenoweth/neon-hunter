class Bullet {
    constructor(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 1000;
        this.radius = 3;
        this.color = '#ffff00';
        this.markedForDeletion = false;

        // Use the player's pre-calculated fire direction for perfect sync with arrow
        this.dx = game.player.fireDirection.x;
        this.dy = game.player.fireDirection.y;

        // Calculate angle for sprite rotation
        this.angle = Math.atan2(this.dy, this.dx);

        if (!Bullet.spriteCanvas) {
            Bullet.spriteCanvas = document.createElement('canvas');
            Bullet.spriteCanvas.width = 40;
            Bullet.spriteCanvas.height = 10;
            const sCtx = Bullet.spriteCanvas.getContext('2d');
            sCtx.fillStyle = this.color;
            sCtx.fillRect(5, 3, 30, 4);
        }
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Actualiza la posición de la bala y comprueba si debe ser eliminada por distancia.
     */
    updateState(deltaTime) {
        this.x += this.dx * this.speed * (deltaTime / 1000);
        this.y += this.dy * this.speed * (deltaTime / 1000);

        // Remove if too far
        // En multijugador, el servidor decidiría cuándo una bala expira.
        const distFromPlayer = Math.hypot(this.x - this.game.player.x, this.y - this.game.player.y);
        if (distFromPlayer > 2000) this.markedForDeletion = true;
    }

    // Deprecated for multiplayer readiness
    update(deltaTime) {
        this.updateState(deltaTime);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(Bullet.spriteCanvas, -20, -5);
        ctx.restore();
    }

    reset(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 1000;
        this.markedForDeletion = false;

        const centerX = this.game.width / 2;
        const centerY = this.game.height / 2;

        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.dx = (dx / distance);
        this.dy = (dy / distance);
        this.angle = Math.atan2(dy, dx);
    }
}
