class Blocker {
    static idCounter = 0;
    constructor(game) {
        this.game = game;
        this.id = Blocker.idCounter++;
        this.width = 40;
        this.height = 20;
        this.color = '#006622'; // Dark Green
        this.speed = 50 + Math.random() * 30; // Increased speed
        this.angle = 0;
        this.markedForDeletion = false;

        // Random spawn in the whole world
        this.x = (Math.random() - 0.5) * this.game.worldWidth;
        this.y = (Math.random() - 0.5) * this.game.worldHeight;

        this._avoidPlayerSpawn();

        // Patrol state
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolRadius = 80; // Distance to circle around the coin
        this.patrolSpeed = 1.5; // Speed of rotation
        this.patrolDir = Math.random() > 0.5 ? 1 : -1;

        // Frenetic chase state
        this.wobbleTimer = Math.random() * 100;
        this.wobbleAmp = 0.26 + Math.random() * 0.26; // Randomize wobble between ~15 (0.26) and 30 (0.52) degrees
        this.chaseTimer = 0;
        this.chaseCooldown = 0;
    }

    _avoidPlayerSpawn() {
        const dx = this.x - this.game.player.x;
        const dy = this.y - this.game.player.y;
        if (Math.abs(dx) < 300 && Math.abs(dy) < 300) {
            this.x = (Math.random() - 0.5) * this.game.worldWidth;
            this.y = (Math.random() - 0.5) * this.game.worldHeight;
            this._avoidPlayerSpawn();
        }
    }

    updateState(deltaTime) {
        // --- SEPARATION LOGIC ---
        const separationRadius = 60;
        const neighbors = this.game.grid.retrieve(this, separationRadius);
        let sepX = 0;
        let sepY = 0;
        let count = 0;

        neighbors.forEach(other => {
            if (other instanceof Blocker && other !== this) {
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < separationRadius * separationRadius && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const pushStrength = (separationRadius - dist) / separationRadius;
                    sepX += (dx / dist) * pushStrength;
                    sepY += (dy / dist) * pushStrength;
                    count++;
                }
            }
        });

        if (count > 0) {
            const repulsionForce = 150;
            this.x += sepX * repulsionForce * (deltaTime / 1000);
            this.y += sepY * repulsionForce * (deltaTime / 1000);
        }
        // ------------------------

        // 1. Release target if it was captured or is now targeted by someone else (safety)
        if (this.target && (this.target.isCaptured || this.target.markedForDeletion || this.target.blockerId !== this.id)) {
            if (this.target.blockerId === this.id) {
                this.target.targetedByBlocker = false;
                this.target.blockerId = null;
            }
            this.target = null;
        }

        // Decrement timers
        if (this.chaseTimer > 0) this.chaseTimer -= deltaTime;
        if (this.chaseCooldown > 0) this.chaseCooldown -= deltaTime;

        const dxP = this.x - this.game.player.x;
        const dyP = this.y - this.game.player.y;
        const distToPlayerSq = dxP * dxP + dyP * dyP;
        const aggroRangeSq = 140 * 140; // Reduced to 140px trigger

        // If patrolling and player gets too close, maybe lunge?
        if (this.target && distToPlayerSq < aggroRangeSq && this.chaseCooldown <= 0) {
            // Drop any coin target to chase player briefly
            if (this.target.blockerId === this.id) {
                this.target.targetedByBlocker = false;
                this.target.blockerId = null;
                this.target = null;

                // Set burst timers
                this.chaseTimer = 2000; // Chase for 2 seconds
                this.chaseCooldown = 5000; // Cooldown for 5 seconds
            }
        }

        // 2. If no target, try to find a free coin
        // We allow finding a coin as long as we are not FORCED to chase (chaseTimer > 0)
        if (!this.target && this.chaseTimer <= 0) {
            let nearestFood = null;
            let minDistSq = Infinity;

            this.game.foods.forEach(food => {
                if (!food.isCaptured && !food.targetedByBlocker) {
                    const dx = food.x - this.x;
                    const dy = food.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        nearestFood = food;
                    }
                }
            });

            if (nearestFood) {
                this.target = nearestFood;
                this.target.targetedByBlocker = true;
                this.target.blockerId = this.id;
            }
        }

        // 3. Determine movement direction
        let tx, ty;
        let isChasingPlayer = false;
        let isPatrolling = false;

        if (this.target) {
            // Guarding behavior: Circle around the coin
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distToCoin = Math.sqrt(dx * dx + dy * dy);

            if (distToCoin > this.patrolRadius + 10) {
                // Too far, approach the coin's patrol ring
                tx = this.target.x;
                ty = this.target.y;
            } else {
                // Close enough, start circling
                isPatrolling = true;
                this.patrolAngle += this.patrolSpeed * (deltaTime / 1000) * this.patrolDir;
                tx = this.target.x + Math.cos(this.patrolAngle) * this.patrolRadius;
                ty = this.target.y + Math.sin(this.patrolAngle) * this.patrolRadius;
            }
        } else {
            // No free food available -> Target player
            tx = this.game.player.x;
            ty = this.game.player.y;
            isChasingPlayer = true;
        }

        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            let currentSpeed = this.speed;
            let moveAngle = Math.atan2(dy, dx);

            if (isChasingPlayer) {
                // FRENETIC CHASE MODE

                // Scale difficulty: Slower in early warps (0.7x at Warp 1 -> 1.0x at Warp 4)
                const warpScale = Math.min(1, 0.6 + (this.game.warpLevel || 1) * 0.1);

                // Base calculation
                currentSpeed = this.speed * 1.8 * warpScale;

                // STRICT CAP: Never exceed player base speed
                const playerMaxSpeed = this.game.baseSpeed || 110;
                if (currentSpeed >= playerMaxSpeed) {
                    currentSpeed = playerMaxSpeed - 5; // Always slightly slower
                }

                // Add ZigZag/Wobble
                this.wobbleTimer += deltaTime * 0.01;
                const wobble = Math.sin(this.wobbleTimer) * this.wobbleAmp;
                moveAngle += wobble;

                // Update angle to face movement (visceral direction)
                this.angle = moveAngle;
            } else if (isPatrolling) {
                currentSpeed = this.speed * 1.5;
                // Face tangent logic
                const tangentAngle = this.patrolAngle + (Math.PI / 2) * this.patrolDir;
                this.angle = tangentAngle;
            } else {
                // Normal movement
                currentSpeed = Math.max(this.speed, 35);
                this.angle = moveAngle;
            }

            this.x += Math.cos(moveAngle) * currentSpeed * (deltaTime / 1000);
            this.y += Math.sin(moveAngle) * currentSpeed * (deltaTime / 1000);
        }

        // 4. Bound clamping
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW + 20, Math.min(halfW - 20, this.x));
        this.y = Math.max(-halfH + 20, Math.min(halfH - 20, this.y));
    }

    // Displacement logic for bullets
    onHit(bullet) {
        // Displace in direction of bullet impact by half body length (20px)
        const displacement = this.width / 2;
        this.x += bullet.dx * displacement;
        this.y += bullet.dy * displacement;

        // Remove frenetic state on hit
        this.chaseTimer = 0;
        this.chaseCooldown = 1500;

        // Boundary check after push
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW + this.height, Math.min(halfW - this.height, this.x));
        this.y = Math.max(-halfH + this.height, Math.min(halfH - this.height, this.y));
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Style: Neon Green Blocker
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5; // Reduced glow
        ctx.shadowColor = this.color;

        // 2x1 Rectangle (40x20) - Centered
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Isosceles Triangle on the short forward edge
        ctx.beginPath();
        ctx.moveTo(this.width / 2, -this.height / 2);
        ctx.lineTo(this.width / 2 + 10, 0); // Tip pointing forward
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Aesthetics: core detail
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width - 4, this.height - 4);

        ctx.restore();
    }
}
