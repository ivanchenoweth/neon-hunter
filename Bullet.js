class Bullet {
    constructor(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 600;
        this.radius = 1.5;
        this.color = '#ffff00';
        this.markedForDeletion = false;

        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.dx = dx / dist;
        this.dy = dy / dist;

        // Calculate angle for sprite rotation
        this.angle = Math.atan2(this.dy, this.dx);

        if (!Bullet.sprites) {
            Bullet.sprites = {};

            // Standard Yellow
            const s1 = document.createElement('canvas');
            s1.width = 20; s1.height = 5;
            const ctx1 = s1.getContext('2d');
            ctx1.fillStyle = '#ffff00';
            ctx1.fillRect(2.5, 1.5, 15, 2);
            Bullet.sprites['standard'] = s1;

            // Rapid Orange
            const s2 = document.createElement('canvas');
            s2.width = 20; s2.height = 5;
            const ctx2 = s2.getContext('2d');
            ctx2.fillStyle = '#ffaa00';
            ctx2.fillRect(2.5, 1.5, 15, 2);
            Bullet.sprites['rapid'] = s2;
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

        const sprite = Bullet.sprites[this.bulletType] || Bullet.sprites['standard'];
        ctx.drawImage(sprite, -10, -2.5);

        ctx.restore();
    }

    reset(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = (game.player.rapidFireTimer > 0) ? 900 : 600;
        this.bulletType = (game.player.rapidFireTimer > 0) ? 'rapid' : 'standard';
        this.markedForDeletion = false;

        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.dx = (dx / distance);
            this.dy = (dy / distance);
        } else {
            // Fallback for zero distance
            this.dx = game.player.fireDirection.x;
            this.dy = game.player.fireDirection.y;
        }
        this.angle = Math.atan2(this.dy, this.dx);
    }
}
