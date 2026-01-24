class Player {
    constructor(game) {
        this.game = game;
        this.radius = 20;
        this.x = 0;
        this.y = 0;
        this.speed = 350;
        this.color = '#00ff88';
        this.glow = '#00ff88';
        this.trailTimer = 0;
        this.fireDirection = { x: 0, y: -1 }; // Direction pointer for firing
        this.arrowBlinkTimer = 0; // Timer for arrow blink effect when firing
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
