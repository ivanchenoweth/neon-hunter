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
        // Draw grid using pattern
        ctx.save();
        // Translate pattern match camera
        ctx.fillStyle = this.gridPattern;

        // Offset pattern to align with camera
        const offsetX = -this.game.camera.x;
        const offsetY = -this.game.camera.y;

        ctx.translate(this.game.camera.x, this.game.camera.y);
        ctx.fillRect(0, 0, this.game.width, this.game.height);
        ctx.restore();

        // Draw stars - Constant color, minimize fillRect calls, with culling
        ctx.fillStyle = '#fff';
        const camX = this.game.camera.x;
        const camY = this.game.camera.y;
        const camW = this.game.width;
        const camH = this.game.height;

        this.stars.forEach(star => {
            if (
                star.x >= camX &&
                star.x <= camX + camW &&
                star.y >= camY &&
                star.y <= camY + camH
            ) {
                ctx.globalAlpha = star.alpha;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        });
        ctx.globalAlpha = 1;
    }
}
