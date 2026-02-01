class Food {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.x = (Math.random() - 0.5) * this.game.worldWidth;
        this.y = (Math.random() - 0.5) * this.game.worldHeight;
        this.radius = 4 + Math.random() * 4; // Random size
        this.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
        this.markedForDeletion = false;

        // Float animation
        this.angle = Math.random() * Math.PI * 2;
        this.isCaptured = false;
        this.alpha = 1;
        this.baseRadius = this.radius;
        this.targetedByBlocker = false;

        // Pre-render icon
        if (!this.iconCanvas) this.iconCanvas = document.createElement('canvas');
        this.updateIcon();
    }

    updateIcon() {
        const size = (this.radius + 5) * 2;
        this.iconCanvas.width = size;
        this.iconCanvas.height = size;
        const ctx = this.iconCanvas.getContext('2d');
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(size / 2, size / 2, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Determina cuándo una comida es capturada y eliminada.
     */
    updateState(deltaTime) {
        if (this.isCaptured) {
            // En multijugador, el servidor notifica de la captura
            // y el cliente maneja la animación de desaparición.
            this.radius += deltaTime * 0.05;
            this.alpha -= deltaTime * 0.0015;
            this.y -= deltaTime * 0.1;
            if (this.alpha <= 0) this.markedForDeletion = true;
        }
    }

    /**
     * Lógica Visual (Client-side)
     * Animaciones de ambiente (flotación, rotación).
     */
    updateVisuals(deltaTime) {
        this.angle += deltaTime * 0.002;
    }

    // Deprecated for multiplayer readiness
    update(deltaTime) {
        this.updateState(deltaTime);
        this.updateVisuals(deltaTime);
    }

    draw(ctx) {
        // Culling is now handled by the grid in Game.js, 
        // but we keep a simple check just in case or for captured food.

        const floatY = Math.sin(this.angle) * 5;

        if (this.isCaptured) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
        }

        const scale = this.radius / this.baseRadius;
        const size = this.iconCanvas.width * scale;
        ctx.drawImage(this.iconCanvas, this.x - size / 2, this.y + floatY - size / 2, size, size);

        if (this.isCaptured) {
            ctx.restore();
        }
    }
}
