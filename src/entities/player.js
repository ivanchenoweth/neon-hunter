import { Entity } from './entity.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class Player extends Entity {
    constructor() {
        super();
        this.radius = 10;
        this.color = CONFIG.COLORS.PLAYER;
        this.speed = CONFIG.PLAYER_BASE_SPEED;
        
        this.fireDirection = { x: 0, y: -1 };
        this.arrowBlinkTimer = 0;
        
        this.spawnDuration = 2000;
        this.spawnTimer = this.spawnDuration;
        
        this.collisionAlpha = 1.0;
        this.collisionEffectTimer = 0;
        
        this.lives = CONFIG.PLAYER_LIVES;
        
        // Beam System
        this.isChargingBeam = false;
        this.beamChargeTime = 0;
        this.maxBeamChargeTime = 1500;
        this.beamLength = 0;
        
        this.type = 'player';
    }

    init(x, y) {
        super.init(x, y);
        this.lives = CONFIG.PLAYER_LIVES;
        this.spawnTimer = this.spawnDuration;
        this.active = true;
    }

    takeDamage(amount, worldState) {
        if (this.spawnTimer > 0) return; // Invulnerable during spawn
        
        this.lives -= amount;
        this.collisionEffectTimer = 4000;
        
        if (worldState.audioSystem) {
            worldState.audioSystem.playDamage();
        }
        
        if (worldState.engine && worldState.engine.camera) {
            worldState.engine.camera.shake(20, 300);
        }

        if (this.lives <= 0) {
            this.active = false;
            if (worldState.stateSystem) {
                worldState.stateSystem.gameOver();
            }
        }
    }

    collectFood(food, worldState) {
        // Logic for score/coins update
        if (worldState.engine) {
            worldState.engine.score += 10;
            worldState.engine.coins += 1;
        }
        if (worldState.audioSystem) {
            worldState.audioSystem.playCollect();
        }
    }

    setFireDirection(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
            this.fireDirection.x = dx / length;
            this.fireDirection.y = dy / length;
        }
    }

    draw(ctx) {
        ctx.save();

        if (this.spawnTimer > 0) {
            const t = this.spawnTimer / this.spawnDuration;
            // More visible fade-in: start at 0.5, become fully opaque
            ctx.globalAlpha = 0.5 + 0.5 * (1 - t);
        } else {
            ctx.globalAlpha = this.collisionAlpha;
            if (this.collisionEffectTimer > 0) {
                const timePassed = 4000 - this.collisionEffectTimer;
                const phase = timePassed * (0.012 + 0.0000025 * timePassed);
                if (Math.floor(phase) % 2 === 0) {
                    ctx.globalAlpha = 0;
                }
            }
        }

        // Draw Ship Body
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Arrow Logic
        this.drawArrow(ctx);

        // Beam Logic
        if (this.isChargingBeam && this.beamLength > 0) {
            this.drawBeam(ctx);
        }

        ctx.restore();
    }

    drawArrow(ctx) {
        const arrowLength = this.radius * 0.45;
        const arrowWidth = this.radius * 1.15;
        
        let arrowColor = '#ff00ff';
        if (this.arrowBlinkTimer > 0) {
            const blinkProgress = 1 - (this.arrowBlinkTimer / 150);
            const g = Math.floor(255 * (1 - blinkProgress));
            arrowColor = `rgb(255, ${g}, 0)`;
        }

        const fireAngle = Math.atan2(this.fireDirection.y, this.fireDirection.x);
        const angleOffset = Math.atan2(arrowWidth, this.radius);

        const baseOffsetX = this.x + this.fireDirection.x * this.radius;
        const baseOffsetY = this.y + this.fireDirection.y * this.radius;

        const tipX = baseOffsetX + this.fireDirection.x * arrowLength;
        const tipY = baseOffsetY + this.fireDirection.y * arrowLength;

        const baseAngle1 = fireAngle + angleOffset;
        const baseAngle2 = fireAngle - angleOffset;

        const baseX1 = this.x + Math.cos(baseAngle1) * this.radius;
        const baseY1 = this.y + Math.sin(baseAngle1) * this.radius;
        const baseX2 = this.x + Math.cos(baseAngle2) * this.radius;
        const baseY2 = this.y + Math.sin(baseAngle2) * this.radius;

        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX1, baseY1);
        ctx.arc(this.x, this.y, this.radius, baseAngle1, baseAngle2, true);
        ctx.lineTo(tipX, tipY);
        ctx.closePath();
        ctx.fill();
    }

    drawBeam(ctx) {
        ctx.save();
        ctx.strokeStyle = '#ff00ff';
        const widthScale = (this.beamChargeTime / this.maxBeamChargeTime);
        ctx.lineWidth = 4 + widthScale * 12;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff44ff';

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.fireDirection.x * this.beamLength, this.y + this.fireDirection.y * this.beamLength);
        ctx.stroke();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 + widthScale * 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.fireDirection.x * this.beamLength, this.y + this.fireDirection.y * this.beamLength);
        ctx.stroke();
        ctx.restore();
    }

    update(deltaTime) {
        if (this.spawnTimer > 0) this.spawnTimer -= deltaTime;
        if (this.arrowBlinkTimer > 0) this.arrowBlinkTimer -= deltaTime;
        
        if (this.collisionEffectTimer > 0) {
            this.collisionEffectTimer -= deltaTime;
            const recoveryDuration = 3000;
            if (this.collisionEffectTimer > recoveryDuration) {
                this.speed = CONFIG.PLAYER_BASE_SPEED * 0.7;
                this.collisionAlpha = 0.5;
            } else {
                const progress = (recoveryDuration - this.collisionEffectTimer) / recoveryDuration;
                this.speed = CONFIG.PLAYER_BASE_SPEED * (0.7 + 0.3 * progress);
                this.collisionAlpha = 0.5 + 0.5 * progress;
            }
        } else {
            this.speed = CONFIG.PLAYER_BASE_SPEED;
            this.collisionAlpha = 1.0;
        }
    }
}
