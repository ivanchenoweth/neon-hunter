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

    takeDamage(amount, worldState, impactDir = null) {
        this.active = false;
        if (worldState.engine) {
            worldState.engine.score += 10;
            worldState.engine.enemiesDestroyed++;
            worldState.engine.warpLevelKillCount++;
            if (worldState.engine.audioSystem) worldState.engine.audioSystem.playExplosion();
        }

        // CINEMA EXPLOSION (Star Wars style)
        // impactDir can be a velocity vector {x, y} or normalized {x, y}
        let biasX = this.vx || 0; // Inherit ship's own momentum
        let biasY = this.vy || 0;

        if (impactDir) {
            const mag = Math.sqrt(impactDir.x ** 2 + impactDir.y ** 2) || 1;
            biasX += (impactDir.x / mag) * 150; // Add shot momentum
            biasY += (impactDir.y / mag) * 150;
        }

        for (let i = 0; i < 60; i++) {
            const typeRoll = Math.random();
            const angle = Math.random() * Math.PI * 2;
            let speed = 50 + Math.random() * 250;
            let color = this.color;
            let size = 4 + Math.random() * 8;

            if (typeRoll < 0.25) {
                // SPARKS: White/Yellow, very fast
                color = '#ffffaa';
                speed *= 2.5;
                size = 2 + Math.random() * 3;
            } else if (typeRoll < 0.75) {
                // DEBRIS: Dark red / Hot grey
                color = Math.random() > 0.5 ? '#441111' : '#222222';
                size = 6 + Math.random() * 10;
                speed *= 0.8;
            } else {
                // CORE: Entity neon color
                color = this.color;
                size = 8 + Math.random() * 12;
            }

            const vx = Math.cos(angle) * speed + biasX;
            const vy = Math.sin(angle) * speed + biasY;

            worldState.entityManager.get('particle', this.x, this.y, color, size, vx, vy);
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
