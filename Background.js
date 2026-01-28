class Background {
    constructor(game) {
        this.game = game;
        this.starCount = 200;
        this.stars = [];
        this.createStars();

        // Pre-render grid pattern
        this.gridSize = 100;
        this.gridPattern = this.createGridPattern();
    }

    createStars() {
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * (this.game.worldWidth + 1000),
                y: (Math.random() - 0.5) * (this.game.worldHeight + 1000),
                size: Math.random() * 2 + 0.5,
                alpha: Math.random()
            });
        }
    }

    createGridPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.gridSize;
        canvas.height = this.gridSize;
        const ctx = canvas.getContext('2d');

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.gridSize, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.gridSize);
        ctx.stroke();

        return ctx.createPattern(canvas, 'repeat');
    }

    draw(ctx) {
        ctx.save();
        // Since ctx is already translated by -camera.x, -camera.y in Game.js
        // We just need to fill the current camera viewport in world space.
        const camX = this.game.camera.x;
        const camY = this.game.camera.y;
        const viewW = this.game.width / this.game.camera.zoom;
        const viewH = this.game.height / this.game.camera.zoom;

        // Draw grid using pattern
        ctx.fillStyle = this.gridPattern;
        // The pattern handles its own tiling, but we must specify the world-coordinates to fill
        ctx.fillRect(camX, camY, viewW, viewH);

        // Draw stars
        ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            // Stars are in world space, we check if they are in the zoomed viewport
            if (
                star.x >= camX &&
                star.x <= camX + viewW &&
                star.y >= camY &&
                star.y <= camY + viewH
            ) {
                ctx.globalAlpha = star.alpha;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        });
        ctx.restore();
    }
}
