class Player {
    constructor(game) {
        this.game = game;
        this.radius = 10;
        this.x = 0;
        this.y = 0;
        this.speed = 110;
        this.color = '#00ff88';
        this.glow = '#00ff88';
        this.trailTimer = 0;
        this.fireDirection = { x: 0, y: -1 }; // Direction pointer for firing
        this.arrowBlinkTimer = 0; // Timer for arrow blink effect when firing

        // Spawn Animation
        this.spawnDuration = 2000; // 2 seconds
        this.spawnTimer = this.spawnDuration;

        this.collisionAlpha = 1.0; // Alpha during collision effect

        // Energy Rod / Laser Charge System
        this.isChargingBeam = false;
        this.beamChargeTime = 0;
        this.maxBeamChargeTime = 1500; // 1.5 seconds to max charge
        this.beamLength = 0;
        this.maxBeamLength = 2000; // Maximum distance of the laser
        this.shieldTimer = 0; // Temporary invulnerability
        this.rapidFireTimer = 0;
        this.tripleShotTimer = 0;
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Esta función maneja la física y límites del jugador.
     * En un entorno multijugador, esto correría en el servidor.
     */
    updateState(deltaTime, input) {
        // Update collision effect timer
        if (this.collisionEffectTimer > 0) {
            this.collisionEffectTimer -= deltaTime;

            const totalDuration = 4000; // 4 seconds total
            const reductionDuration = 1000; // 1 second of slow speed (impact phase)
            const recoveryDuration = 3000; // 3 seconds of recovery phase

            // Always use the game's base speed to avoid compounding reductions
            const baseSpeed = this.game.baseSpeed || 110;

            if (this.collisionEffectTimer > recoveryDuration) {
                // Impact Phase (First 1 second): Stay at 70% speed and 50% alpha (30% reduction)
                this.speed = baseSpeed * 0.7;
                this.collisionAlpha = 0.5;
            } else {
                // Recovery Phase (Remaining 3 seconds): Recover from 70% to 100%
                const recoveryProgress = (recoveryDuration - this.collisionEffectTimer) / recoveryDuration;
                this.speed = baseSpeed * (0.7 + 0.3 * recoveryProgress);
                this.collisionAlpha = 0.5 + 0.5 * recoveryProgress;
            }

            if (this.collisionEffectTimer <= 0) {
                // Effect finished, restore to normal
                this.speed = this.game.baseSpeed || 110;
                this.collisionAlpha = 1.0;
            }
        } else {
            this.speed = this.game.baseSpeed || 110;
            this.collisionAlpha = 1.0;
        }

        if (this.shieldTimer > 0) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer < 0) this.shieldTimer = 0;
        }

        if (this.rapidFireTimer > 0) {
            this.rapidFireTimer -= deltaTime;
            if (this.rapidFireTimer < 0) this.rapidFireTimer = 0;
        }

        if (this.tripleShotTimer > 0) {
            this.tripleShotTimer -= deltaTime;
            if (this.tripleShotTimer < 0) this.tripleShotTimer = 0;
        }

        let dx = 0;
        let dy = 0;

        // NOTA: En multijugador, aquí se enviaría el input al servidor
        // y se esperaría la validación de la posición.
        // Preferir joystick izquierdo si está activo (multitouch)
        if (input.joystickLeft && input.joystickLeft.active) {
            dx = input.joystickLeft.x;
            dy = input.joystickLeft.y;
        } else {
            if (input.keys.w) dy -= 1;
            if (input.keys.s) dy += 1;
            if (input.keys.a) dx -= 1;
            if (input.keys.d) dx += 1;
        }

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed * (deltaTime / 1000);
        this.y += dy * this.speed * (deltaTime / 1000);

        // Clamp player position within world boundaries
        const halfWidth = this.game.worldWidth / 2;
        const halfHeight = this.game.worldHeight / 2;
        this.x = Math.max(-halfWidth + this.radius, Math.min(halfWidth - this.radius, this.x));
        this.y = Math.max(-halfHeight + this.radius, Math.min(halfHeight - this.radius, this.y));

        return { dx, dy }; // Devolvemos info para la lógica visual
    }

    /**
     * Lógica Visual (Client-side)
     * Efectos que no afectan el resultado del juego (partículas, trails).
     */
    updateVisuals(deltaTime, movementInfo) {
        if (this.spawnTimer > 0) {
            this.spawnTimer -= deltaTime;
        }

        if (!movementInfo) return;
        const { dx, dy } = movementInfo;

        // Trail effect
        if (dx !== 0 || dy !== 0) {
            this.trailTimer += deltaTime;
            if (this.trailTimer > 50) {
                this.game.particles.push(new Particle(this.game, this.x, this.y, this.color));
                this.trailTimer = 0;
            }
        }
    }

    // Deprecated for multiplayer readiness
    update(deltaTime, input) {
        const movementInfo = this.updateState(deltaTime, input);
        this.updateVisuals(deltaTime, movementInfo);
    }

    draw(ctx) {
        ctx.save();

        // Spawn Animation
        if (this.spawnTimer > 0) {
            const t = this.spawnTimer / this.spawnDuration; // 1.0 -> 0.0
            const scale = 1 + t * 9; // 1x -> 10x (interpolating backwards from 10 to 1) 
            // Wait, t goes from 1 to 0. So 1 + 1*9 = 10. 1 + 0*9 = 1. Correct.

            const alpha = 1 - t; // 0 -> 1
            const blur = t * 20; // 20px -> 0px

            ctx.filter = `blur(${blur}px)`;
            ctx.globalAlpha = alpha;

            // Translate to center for scaling
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        } else {
            // Apply collision alpha and dynamic blink effect
            ctx.globalAlpha = this.collisionAlpha;

            if (this.collisionEffectTimer > 0) {
                // Time passed since the collision (0 to 4000ms)
                const timePassed = 4000 - this.collisionEffectTimer;

                // Accelerated frequency:
                // Starts fast (~12Hz) and ends "super fast" (~30Hz)
                // This creates a frantic and high-energy recovery sensation
                const phase = timePassed * (0.012 + 0.0000025 * timePassed);

                if (Math.floor(phase) % 2 === 0) {
                    ctx.globalAlpha = 0; // Hide ship during blink phase
                }
            }
        }

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Draw directional arrow (triangle) outside the circle with curved base
        const arrowLength = this.radius * 0.45;
        const arrowWidth = this.radius * 1.15;

        // Update and check blink timer
        if (this.arrowBlinkTimer > 0) {
            this.arrowBlinkTimer -= 16; // Assuming ~60fps
        }

        // Calculate arrow color based on blink effect
        let arrowColor = '#ff00ff'; // Default magenta
        if (this.arrowBlinkTimer > 0) {
            // Blend from yellow (#ffff00) to magenta (#ff00ff)
            const blinkDuration = 150;
            const blinkProgress = 1 - (this.arrowBlinkTimer / blinkDuration);
            // Interpolate between yellow and magenta
            const r = Math.floor(255);
            const g = Math.floor(255 * (1 - blinkProgress));
            const b = Math.floor(0);
            arrowColor = `rgb(${r}, ${g}, ${b})`;
        }

        // Calculate the fire direction angle
        const fireAngle = Math.atan2(this.fireDirection.y, this.fireDirection.x);

        // Calculate the angular offset for symmetric placement on circle
        const angleOffset = Math.atan2(arrowWidth, this.radius);

        // Position arrow at the circumference of the circle
        const baseOffsetX = this.x + this.fireDirection.x * this.radius;
        const baseOffsetY = this.y + this.fireDirection.y * this.radius;

        // Calculate arrow point (tip) - extends outward from the circle
        const tipX = baseOffsetX + this.fireDirection.x * arrowLength;
        const tipY = baseOffsetY + this.fireDirection.y * arrowLength;

        // Base corners positioned symmetrically on the circle
        const baseAngle1 = fireAngle + angleOffset;
        const baseAngle2 = fireAngle - angleOffset;

        const baseX1 = this.x + Math.cos(baseAngle1) * this.radius;
        const baseY1 = this.y + Math.sin(baseAngle1) * this.radius;
        const baseX2 = this.x + Math.cos(baseAngle2) * this.radius;
        const baseY2 = this.y + Math.sin(baseAngle2) * this.radius;

        // Draw shape with curved base following the player circle
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX1, baseY1);
        // Arc from baseX1 to baseX2 along the player's circle
        ctx.arc(this.x, this.y, this.radius, baseAngle1, baseAngle2, true);
        ctx.lineTo(tipX, tipY);
        ctx.closePath();
        ctx.fill();

        // Draw Energy Rod if charging
        if (this.isChargingBeam && this.beamLength > 0) {
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

            // Core white line
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 + widthScale * 4;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.fireDirection.x * this.beamLength, this.y + this.fireDirection.y * this.beamLength);
            ctx.stroke();

            ctx.restore();
        }

        // Draw Shield Ring
        if (this.shieldTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();

            // Outer glow
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    setFireDirection(targetX, targetY) {
        // Calculate direction from player to target in world coordinates
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
            this.fireDirection.x = dx / length;
            this.fireDirection.y = dy / length;
        }
    }

    triggerArrowBlink() {
        // Trigger the arrow blink effect when firing
        this.arrowBlinkTimer = 150;
    }

    triggerCollisionEffect() {
        // Trigger the collision effect (speed reduction + alpha reduction)
        this.collisionEffectTimer = 4000; // 4 seconds total (1s reduction + 3s recovery)
        this.normalSpeed = this.game.baseSpeed || 110; // Store current normal speed
    }

    resetSpawnAnimation() {
        this.spawnTimer = this.spawnDuration;
    }
}
