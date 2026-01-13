class Bullet {
    constructor(game, x, y, targetX, targetY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 1000;
        this.radius = 3;
        this.color = '#ffff00';
        this.markedForDeletion = false;

        // Calculate direction
        // The targetX/Y are in screen coordinates, but we need them in world coordinates relative to the player
        // However, the camera modifies the view.
        // Easiest is to unproject the mouse or calculating angle from center screen if player is centered.
        // Player is ALWAYS centered on screen because of Camera.follow?
        // Let's check Camera.follow. Yes, centers on target.
        // So player is at width/2, height/2 on SCREEN.
        // Mouse is at clientX, clientY on SCREEN.
        // So vectors are simple screen space diffs.

        const centerX = this.game.width / 2;
        const centerY = this.game.height / 2;

        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.dx = (dx / distance);
        this.dy = (dy / distance);

        // Proper start position: slightly outside player to avoid visual clip? 
        // Or just center. Center is fine.

        this.angle = Math.atan2(dy, dx);

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
