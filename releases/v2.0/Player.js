class Player {
    constructor(game) {
        this.game = game;
        this.radius = 20;
        this.lives = 5;
        this.x = 0;
        this.y = 0;
        this.speed = 350; // Base speed at 5 lives
        this.color = '#111'; // Dark outer body
        this.glow = '#00ff88';
        this.trailTimer = 0;
        this.fireDirection = { x: 0, y: -1 }; // Direction pointer for firing
        this.moveVector = { x: 0, y: 0 }; // Actual movement vector
        this.arrowBlinkTimer = 0; // Timer for arrow blink effect when firing
        this.swirlTimer = 0; // Timer for center color swirl effect
    }

    /**
     * Lógica de Estado (Server-side candidate)
     * Esta función maneja la física y límites del jugador.
     * En un entorno multijugador, esto correría en el servidor.
     */
    updateState(deltaTime, input) {
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

        // Speed scaling capped at 8 lives (3 extra max)
        // 1 life (~150), 5 lives (350), 8 lives (500)
        const effectiveLives = Math.min(8, this.game.lives);
        const currentSpeed = 150 + 50 * (effectiveLives - 1);

        this.x += dx * currentSpeed * (deltaTime / 1000);
        this.y += dy * currentSpeed * (deltaTime / 1000);

        // Store movement vector for visuals (retro-thrust alignment)
        this.moveVector.x = dx;
        this.moveVector.y = dy;

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
        if (!movementInfo) return;
        const { dx, dy } = movementInfo;

        // Update swirl effect frequency based on lives
        // More lives = Faster swirl
        const lifeFactor = Math.max(1, this.game.lives);
        const swirlSpeed = 0.00315 * lifeFactor;
        this.swirlTimer += deltaTime * swirlSpeed;

        // Update arrow blink timer
        if (this.arrowBlinkTimer > 0) {
            this.arrowBlinkTimer -= deltaTime;
        }

        // Restore Trail with dynamic color
        if (movementInfo.dx !== 0 || movementInfo.dy !== 0) {
            this.trailTimer += deltaTime;
            if (this.trailTimer > 50) {
                const hue = 180 + Math.sin(this.swirlTimer) * 60;
                const lives = Math.max(1, this.game.lives);

                // 1. DISINTEGRATION FACTORS (Only for lives < 5)
                let stretch = 1;
                let jitter = 0;
                let spin = 0;
                let damageFactor = 0;

                if (lives < 5) {
                    damageFactor = (5 - lives) / 4; // 0 at 5 lives, 1 at 1 life
                    stretch = 1 + damageFactor * 12;
                    jitter = damageFactor * 4;
                    spin = damageFactor * 0.4;
                }

                const initialAlpha = 0.4 - (damageFactor * 0.2); // Maintain subtle alpha

                // 2. PARTICLE DENSITY (Scales up to 8 lives)
                // Capped at 3 extra lives (total 8)
                const densityFactor = (Math.min(8, lives) - 1) / 7; // 0 at 1 life, 1 at 8 lives
                const particleDensity = 2 + Math.floor(densityFactor * 8); // Density increases with health

                // Align particles with the retro-thrust exit point
                const thrusterExitX = this.x - this.moveVector.x * this.radius * 1.0;
                const thrusterExitY = this.y - this.moveVector.y * this.radius * 1.0;

                // 3. SPAWN PARTICLES (Energy trail)
                for (let i = 0; i < particleDensity; i++) {
                    const p = new Particle(this.game, thrusterExitX, thrusterExitY, `hsl(${hue}, 100%, 50%)`, null, stretch, initialAlpha);
                    p.type = 'rect';
                    p.jitter = jitter;
                    p.spin = spin;
                    p.speedX = -this.moveVector.x * (5 + Math.random() * 5);
                    p.speedY = -this.moveVector.y * (5 + Math.random() * 5);
                    this.game.particles.push(p);
                }

                // 4. DARK HULL FRAGMENTS (Only when damaged: < 5 lives)
                if (lives <= 3) {
                    const fragmentCount = (4 - lives) * 2;
                    for (let i = 0; i < fragmentCount; i++) {
                        const darkHue = Math.random() * 20 + 200;
                        const size = Math.random() * 6 + 3;
                        const fragment = new Particle(this.game, thrusterExitX, thrusterExitY, `hsl(${darkHue}, 15%, 15%)`, size, 1.2, initialAlpha * 0.9);
                        fragment.type = 'rect';
                        fragment.jitter = jitter * 2;
                        fragment.spin = (Math.random() - 0.5) * 1.5;
                        fragment.speedX = -this.moveVector.x * (3 + Math.random() * 3) + (Math.random() - 0.5) * 4;
                        fragment.speedY = -this.moveVector.y * (3 + Math.random() * 3) + (Math.random() - 0.5) * 4;
                        this.game.particles.push(fragment);
                    }
                }

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

        // Calculate dynamic hues for swirl effects
        const hue = 180 + Math.sin(this.swirlTimer) * 60; // Blue to Green
        const dynamicColor = `hsl(${hue}, 100%, 50%)`;

        // Inverse Swirl Color Calculation (Opposite phase)
        const inverseHue = 180 + Math.sin(this.swirlTimer + Math.PI) * 60;
        const inverseColor = `hsl(${inverseHue}, 100%, 50%)`;

        // --- SECTION A: Retro-Thrust Effect (Drawn FIRST so ship covers base) ---
        const isMoving = Math.abs(this.moveVector.x) > 0.01 || Math.abs(this.moveVector.y) > 0.01;

        if (isMoving) {
            const time = performance.now() * 0.01;
            const flicker = Math.sin(time) * 0.5 + 0.5;
            const thrustWidth = this.radius * 0.8 * (0.8 + flicker * 0.4); // Doubled width
            const thrustLength = this.radius * (1.2 + flicker * 1.5); // 1.5x length

            // Define thrust direction (exactly opposite to moveVector)
            const moveAngle = Math.atan2(this.moveVector.y, this.moveVector.x);
            const thrustAngle = moveAngle + Math.PI;

            ctx.save();
            ctx.translate(this.x, this.y);
            // Position at the exact tangent of the radius
            ctx.translate(Math.cos(thrustAngle) * this.radius, Math.sin(thrustAngle) * this.radius);
            ctx.rotate(thrustAngle);

            // Add Neon Glow for visibility
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;

            const thrusterGradient = ctx.createLinearGradient(0, 0, thrustLength, 0); // Point OUTWARD
            thrusterGradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
            thrusterGradient.addColorStop(0.3, `hsla(${hue}, 100%, 60%, 0.7)`);
            thrusterGradient.addColorStop(1, `hsla(${hue}, 100%, 30%, 0)`);

            ctx.fillStyle = thrusterGradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -thrustWidth / 2);
            ctx.lineTo(thrustLength, 0); // Point OUTWARD
            ctx.lineTo(0, thrustWidth / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // --- SECTION B: Ship Body ---
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#222');
        gradient.addColorStop(1, '#050505');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Swirl Edge Stroke
        ctx.strokeStyle = inverseColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.closePath();

        // Swirling Center Effect (Core)
        ctx.fillStyle = dynamicColor;
        ctx.shadowBlur = 25;
        ctx.shadowColor = dynamicColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- SECTION C: Directional Arrow (Pointer) ---
        const shipAngle = Math.atan2(this.fireDirection.y, this.fireDirection.x);
        const tipX = this.x + Math.cos(shipAngle) * (this.radius * 1.5);
        const tipY = this.y + Math.sin(shipAngle) * (this.radius * 1.5);

        let arrowColor = inverseColor;
        if (this.arrowBlinkTimer > 0) {
            const blinkDuration = 150;
            const blinkProgress = 1 - (this.arrowBlinkTimer / blinkDuration);
            arrowColor = `rgb(255, ${Math.floor(255 * (1 - blinkProgress))}, 0)`;
        }

        ctx.fillStyle = arrowColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = arrowColor;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(this.x + Math.cos(shipAngle + 0.3) * this.radius, this.y + Math.sin(shipAngle + 0.3) * this.radius);
        ctx.lineTo(this.x + Math.cos(shipAngle - 0.3) * this.radius, this.y + Math.sin(shipAngle - 0.3) * this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

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
}
