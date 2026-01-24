class Particle {
    constructor(game, x, y, color, size, stretch = 1, alpha = 1) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size || (Math.random() * 10 + 5);
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.alpha = alpha;
        this.stretch = stretch;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.2;
        this.jitter = 0;
        this.type = 'rect'; // 'rect', 'shard', 'spark'
        this.markedForDeletion = false;

        // Randomize shard vertices if type is shard
        this.shardVertices = this._generateShard();
    }

    _generateShard() {
        return [
            { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
            { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
            { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
        ];
    }

    update() {
        this.x += this.speedX + (Math.random() - 0.5) * this.jitter;
        this.y += this.speedY + (Math.random() - 0.5) * this.jitter;
        this.angle += this.spin;
        this.size *= 0.96;
        this.alpha -= 0.025;
        if (this.alpha <= 0 || this.size <= 0.5) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'spark') {
            // Thin high-velocity line
            const length = this.size * this.stretch;
            ctx.fillRect(-length / 2, -1, length, 2);
        } else if (this.type === 'shard') {
            // Irregular triangle
            ctx.beginPath();
            ctx.moveTo(this.shardVertices[0].x * this.size, this.shardVertices[0].y * this.size);
            ctx.lineTo(this.shardVertices[1].x * this.size, this.shardVertices[1].y * this.size);
            ctx.lineTo(this.shardVertices[2].x * this.size, this.shardVertices[2].y * this.size);
            ctx.fill();
        } else {
            // Default rect (confetti-like if stretched)
            const length = this.size * this.stretch;
            ctx.fillRect(-length / 2, -this.size / 2, length, this.size);
        }

        ctx.restore();
    }

    reset(game, x, y, color, size, stretch = 1, alpha = 1) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size || (Math.random() * 10 + 5);
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.alpha = alpha;
        this.stretch = stretch;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.2;
        this.jitter = 0;
        this.type = 'rect';
        this.shardVertices = this._generateShard();
        this.markedForDeletion = false;
    }
}
