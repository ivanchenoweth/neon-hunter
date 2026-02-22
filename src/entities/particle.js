import { Entity } from './entity.js?v=29';

export class Particle extends Entity {
    constructor() {
        super();
        this.type = 'particle';
        this.size = 0;
        this.alpha = 1;
    }

    init(x, y, color, size) {
        super.init(x, y);
        this.color = color;
        this.size = size || (Math.random() * 10 + 5);
        this.vx = (Math.random() * 6 - 3) * 60; // scale for per-second vx
        this.vy = (Math.random() * 6 - 3) * 60;
        this.alpha = 1;
        this.active = true;
    }

    update(deltaTime) {
        this.size *= 0.95;
        this.alpha -= (0.03 * (deltaTime / 16)); // approximate fade
        if (this.alpha <= 0 || this.size <= 0.5) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
}
