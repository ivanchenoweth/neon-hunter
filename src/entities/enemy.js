import { Entity } from './entity.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class Enemy extends Entity {
    constructor() {
        super();
        this.radius = 12.5; // size 25 -> radius 12.5
        this.type = 'enemy';
        this.baseSpeed = 0;
        this.speed = 0;
        this.angle = 0;
    }

    init(x, y, baseSpeed) {
        super.init(x, y);
        this.baseSpeed = baseSpeed;
        this.speed = baseSpeed;
        this.color = CONFIG.COLORS.ENEMY;
        this.angle = 0;
        this.active = true;
    }

    takeDamage(amount, worldState) {
        this.active = false;
        if (worldState.engine) {
            worldState.engine.score += 10;
            worldState.engine.enemiesDestroyed++;
            worldState.engine.warpLevelKillCount++;
            if (worldState.engine.audioSystem) worldState.engine.audioSystem.playExplosion();
        }
        // Spawn particles
        for (let i = 0; i < 10; i++) {
            worldState.entityManager.get('particle', this.x, this.y, this.color);
        }
    }

    update(deltaTime) {
        // Pursuit logic is in MovementSystem or here
        // For now keep it simple, it's a data container mostly
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const size = this.radius * 2;
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(-size / 2, -size / 2.5);
        ctx.lineTo(-size / 3, 0);
        ctx.lineTo(-size / 2, size / 2.5);
        ctx.fill();
        ctx.closePath();
        
        ctx.restore();
    }
}
