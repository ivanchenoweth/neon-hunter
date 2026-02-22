import { Entity } from './entity.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class Food extends Entity {
    constructor() {
        super();
        this.radius = 5;
        this.type = 'food';
        this.isCaptured = false;
        this.alpha = 1;
        this.angle = 0;
    }

    init(x, y) {
        super.init(x, y);
        this.radius = 4 + Math.random() * 4;
        this.color = `hsl(${Math.random() * 360}, 100%, 70%)`;
        this.isCaptured = false;
        this.alpha = 1;
        this.angle = Math.random() * Math.PI * 2;
    }

    update(deltaTime) {
        this.angle += deltaTime * 0.002;
        if (this.isCaptured) {
            this.radius += deltaTime * 0.05;
            this.alpha -= deltaTime * 0.0015;
            this.y -= deltaTime * 0.1;
            if (this.alpha <= 0) this.active = false;
        }
    }

    draw(ctx) {
        const floatY = Math.sin(this.angle) * 5;
        ctx.save();
        if (this.isCaptured) ctx.globalAlpha = this.alpha;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + floatY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
