class Enemy {
    constructor(game) {
        this.game = game;
        this.size = 50;
        this.speed = 180 + Math.random() * 70;

        // Dark Orange to Saturated Red gradient based on speed
        // Speed range: 180 to 250 (delta 70)
        const speedRatio = (this.speed - 180) / 70;
        const hue = 35 * (1 - speedRatio);        // 35 (Orange) to 0 (Red)
        const saturation = 100;                    // Always saturated
        const lightness = 25 + speedRatio * 25;    // 25% (Dark) to 50% (Bright)
        this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        this.markedForDeletion = false;

        // Spawn somewhere around the player but at a distance
        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 400; // Between 600 and 1000 units away
        this.x = this.game.player.x + Math.cos(angle) * distance;
        this.y = this.game.player.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));

        this.angle = 0;

        // Ensure spawned enemy is not too far outside current camera view
        this._adjustSpawnIntoView();

        // Sprite rendering is now dynamic per-enemy based on color/speed
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Maneja el movimiento de persecución y colisiones con el jugador.
     */
    updateState(deltaTime) {
        // Chase player
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * (deltaTime / 1000);
            this.y += (dy / dist) * this.speed * (deltaTime / 1000);
        }

        // Separation from other enemies
        const separationDist = this.size * 0.8;
        const nearby = this.game.grid.retrieve(this, separationDist);
        nearby.forEach(other => {
            if (other instanceof Enemy && other !== this && !other.markedForDeletion) {
                const diffX = this.x - other.x;
                const diffY = this.y - other.y;
                const distance = Math.sqrt(diffX * diffX + diffY * diffY);

                if (distance < separationDist && distance > 0) {
                    // Constant push away to keep distance
                    const pushFactor = (separationDist - distance) / separationDist;
                    const pushForce = 150 * pushFactor; // Force magnitude
                    this.x += (diffX / distance) * pushForce * (deltaTime / 1000);
                    this.y += (diffY / distance) * pushForce * (deltaTime / 1000);
                } else if (distance === 0) {
                    // In case they are exactly on top of each other, nudge them
                    this.x += (Math.random() - 0.5) * 10;
                    this.y += (Math.random() - 0.5) * 10;
                }
            }
        });

        // Collision with player
        // NOTA: En un servidor autoritativo, esto se calcularía en el server 
        // y se notificaría al cliente para que reste puntos y cree efectos.
        if (dist < this.game.player.radius + this.size / 2) {
            this.markedForDeletion = true;

            // Esta parte afecta al estado global del juego
            this.game.takeDamage();

            // Explosion particles (Client-side)
            for (let i = 0; i < 10; i++) {
                this.game.particles.push(new Particle(this.game, this.x, this.y, this.color));
            }
        }

        // Update angle and angular velocity for visual effects
        const lastAngle = this.angle;
        this.angle = Math.atan2(dy, dx);

        // Handle angular wrap-around for velocity calculation
        let angleDiff = this.angle - lastAngle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Smooth the angular velocity
        this.angularVelocity = this.angularVelocity * 0.8 + angleDiff * 0.2;
    }

    // Deprecated for multiplayer readiness
    update(deltaTime) {
        this.updateState(deltaTime);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 5. Draw Enemy Body (B-2 Spirit Style Flying Wing)
        ctx.fillStyle = this.color;
        ctx.beginPath();

        // Iconic B-2 Flying Wing with sawtooth trailing edge
        // Tip (Nose)
        ctx.moveTo(this.size / 2, 0);

        // Leading edge to right wingtip
        ctx.lineTo(-this.size / 4, -this.size / 1.2);

        // Sawtooth trailing edge (W-shape)
        ctx.lineTo(-this.size / 8, -this.size / 3);
        ctx.lineTo(-this.size / 3, 0); // Center notch
        ctx.lineTo(-this.size / 8, this.size / 3);

        // Trailing edge to left wingtip
        ctx.lineTo(-this.size / 4, this.size / 1.2);

        ctx.closePath();
        ctx.fill();

        // 6. High-Performance Thrust Swirl (Fire Gradient) - Scaled by Speed
        const speedRatio = (this.speed - 180) / 70; // 0 to 1

        // Flicker effect using time - faster enemies flicker more intensely
        const time = performance.now() * (0.01 + speedRatio * 0.01);
        const flicker = Math.sin(time + this.x * 0.01) * 0.5 + 0.5;

        // Scale thrust size by speed ratio (larger for faster enemies)
        const baseThrustSize = this.size * (0.3 + speedRatio * 0.4);
        const thrustSize = baseThrustSize * (0.8 + flicker * 0.4);
        const thrustLength = thrustSize * (1.2 + speedRatio * 1.5);

        // High-Performance Thrust Rotation (Inertia effect) - Pronounced
        const thrustAngleOffset = this.angularVelocity * 4.0; // Increased from 1.5

        ctx.save();
        // Move to rotation axis (base of thrust at the notch)
        ctx.translate(-this.size / 3, 0);
        ctx.rotate(thrustAngleOffset);

        // Create Fire Gradient relative to the new origin
        const gradient = ctx.createLinearGradient(0, 0, -(thrustLength + this.size / 6), 0);

        // Bright core color based on enemy color hue
        const hue = 35 * (1 - speedRatio);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, ${0.8 + flicker * 0.2})`);
        gradient.addColorStop(0.3, `hsla(${hue}, 100%, 50%, ${0.6 + flicker * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);

        ctx.beginPath();
        ctx.fillStyle = gradient;

        // Draw the flame triangle centered at origin
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.size / 6, -this.size / 6);
        ctx.lineTo(-(thrustLength + this.size / 6), 0);
        ctx.lineTo(-this.size / 6, this.size / 6);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
        ctx.restore();
        return true;
    }
    reset(game) {
        this.game = game;
        this.markedForDeletion = false;

        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 400;
        this.x = this.game.player.x + Math.cos(angle) * distance;
        this.y = this.game.player.y + Math.sin(angle) * distance;

        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));
        this.angle = 0;
        this.angularVelocity = 0;
        this.speed = 180 + Math.random() * 70;

        // Update dark orange to saturated red color based on new speed
        const speedRatio = (this.speed - 180) / 70;
        const hue = 35 * (1 - speedRatio);
        const saturation = 100;
        const lightness = 25 + speedRatio * 25;
        this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        this._adjustSpawnIntoView();
    }

    _adjustSpawnIntoView() {
        // Try to nudge spawn so it isn't far outside the camera view after orientation changes.
        if (!this.game || !this.game.camera) return;
        const cam = this.game.camera;
        const margin = Math.max(this.size, 200);

        // Convert world pos to screen-relative coords
        const screenX = this.x - cam.x;
        const screenY = this.y - cam.y;

        // If within extended view, keep
        if (screenX >= -margin && screenX <= cam.width + margin && screenY >= -margin && screenY <= cam.height + margin) {
            return;
        }

        // Otherwise attempt a few times to pick a spawn that lands within extended view
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 400 + Math.random() * 600; // try somewhat closer ranges too
            const nx = this.game.player.x + Math.cos(angle) * distance;
            const ny = this.game.player.y + Math.sin(angle) * distance;
            const nxScreen = nx - cam.x;
            const nyScreen = ny - cam.y;
            if (nxScreen >= -margin && nxScreen <= cam.width + margin && nyScreen >= -margin && nyScreen <= cam.height + margin) {
                this.x = nx; this.y = ny; return;
            }
        }

        // As a fallback, clamp to just inside world bounds near player's edge of view
        const fallbackAngle = Math.atan2(this.y - this.game.player.y, this.x - this.game.player.x);
        const fallbackDist = Math.min(Math.max(500, Math.hypot(this.x - this.game.player.x, this.y - this.game.player.y)), 900);
        this.x = this.game.player.x + Math.cos(fallbackAngle) * fallbackDist;
        this.y = this.game.player.y + Math.sin(fallbackAngle) * fallbackDist;
    }
}
