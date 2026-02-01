class Particle {
    constructor(game, x, y, color, size) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size || (Math.random() * 10 + 5);
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.alpha = 1;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= 0.95;
        this.alpha -= 0.03;
        if (this.alpha <= 0 || this.size <= 0.5) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
    reset(game, x, y, color, size) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size || (Math.random() * 10 + 5);
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.alpha = 1;
        this.markedForDeletion = false;
    }
}
