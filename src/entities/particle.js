import { Entity } from './entity.js?v=29';
import { lerpColor } from '../utils/math.js?v=29';

export class Particle extends Entity {
    constructor() {
        super();
        this.type = 'particle';
        this.size = 0;
        this.alpha = 1;
        this.baseColor = '#fff';
        this.life = 1.0;
        this.friction = 0.97; // Drag for firework effect
    }

    init(x, y, color, size, vx, vy) {
        super.init(x, y);
        this.baseColor = color;
        this.life = 1.0;
        this.size = size || (Math.random() * 10 + 5);
        this.vx = vx !== undefined ? vx : (Math.random() * 6 - 3) * 60;
        this.vy = vy !== undefined ? vy : (Math.random() * 6 - 3) * 60;
        this.alpha = 1;
        this.active = true;
    }

    update(deltaTime) {
        // Apply friction/drag
        const frictionCoeff = Math.pow(this.friction, deltaTime / 16.6);
        this.vx *= frictionCoeff;
        this.vy *= frictionCoeff;

        // Slow decay for fireworks: size and life
        this.life -= (0.015 * (deltaTime / 16.6)); // Slower fade
        this.size *= Math.pow(0.985, deltaTime / 16.6); // Slower shrink
        this.alpha = this.life;

        // Incandescent effect
        const t = 1.0 - this.life;
        this.color = lerpColor('#ffffaa', this.baseColor, t);

        if (this.alpha <= 0 || this.size <= 0.3) {
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
