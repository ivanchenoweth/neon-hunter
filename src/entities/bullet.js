import { Entity } from './entity.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class Bullet extends Entity {
    constructor() {
        super();
        this.speed = 600;
        this.radius = 1.5;
        this.color = CONFIG.COLORS.BULLET;
        this.angle = 0;
        this.type = 'bullet';
    }

    init(x, y, dx, dy) {
        super.init(x, y);
        this.vx = dx * this.speed;
        this.vy = dy * this.speed;
        this.angle = Math.atan2(dy, dx);
        this.active = true;
    }

    update(deltaTime) {
        // Position update is handled by MovementSystem
        // Bullet specific cleanup should be here or in a LifeSystem
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-7.5, -1, 15, 2);
        
        ctx.restore();
    }
}
