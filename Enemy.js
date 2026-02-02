class Enemy {
    static Types = {
        BASIC: 'basic',
        CHARGER: 'charger', // Blink-Ram
        STRIKER: 'striker', // Pulsar Drone
        DRIFTER: 'drifter', // Spectral Drifter
        OVERLORD: 'overlord', // Void Sentinel
        SNIPER: 'sniper', // Cyber Sniper
        SPINNER: 'spinner', // Vortex Spinner
        STALKER: 'stalker', // Optic Stalker (Robotron style)
        SWARTH: 'swarth', // Neon Swarth (Swarm)
        WRAITH: 'wraith', // Glitch Wraith (Erratic)
        SPEAR: 'spear', // Vector Spear (Linear)
        MITE: 'mite' // Chaos Mite (Random)
    };

    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset(game) {
        if (game) this.game = game;
        this.markedForDeletion = false;

        // Determine type based on Warp Level
        const level = this.game.warpLevel || 1;
        const roll = Math.random();

        if (level === 1) {
            this.type = Enemy.Types.BASIC;
        } else if (level === 2) {
            this.type = roll < 0.7 ? Enemy.Types.BASIC : Enemy.Types.CHARGER;
        } else if (level === 3) {
            if (roll < 0.4) this.type = Enemy.Types.BASIC;
            else if (roll < 0.7) this.type = Enemy.Types.CHARGER;
            else this.type = Enemy.Types.STRIKER;
        } else if (level === 4) {
            if (roll < 0.3) this.type = Enemy.Types.BASIC;
            else if (roll < 0.5) this.type = Enemy.Types.CHARGER;
            else if (roll < 0.75) this.type = Enemy.Types.STRIKER;
            else this.type = Enemy.Types.DRIFTER;
        } else if (level === 5) {
            // Warp 5
            if (roll < 0.15) this.type = Enemy.Types.BASIC;
            else if (roll < 0.3) this.type = Enemy.Types.CHARGER;
            else if (roll < 0.45) this.type = Enemy.Types.STRIKER;
            else if (roll < 0.6) this.type = Enemy.Types.DRIFTER;
            else if (roll < 0.75) this.type = Enemy.Types.SNIPER;
            else if (roll < 0.9) this.type = Enemy.Types.SPINNER;
            else this.type = Enemy.Types.OVERLORD;
        } else if (level === 6) {
            // Warp 6
            if (roll < 0.1) this.type = Enemy.Types.BASIC;
            else if (roll < 0.2) this.type = Enemy.Types.CHARGER;
            else if (roll < 0.3) this.type = Enemy.Types.STRIKER;
            else if (roll < 0.45) this.type = Enemy.Types.DRIFTER;
            else if (roll < 0.6) this.type = Enemy.Types.SNIPER;
            else if (roll < 0.7) this.type = Enemy.Types.SPINNER;
            else if (roll < 0.8) this.type = Enemy.Types.STALKER;
            else if (roll < 0.9) this.type = Enemy.Types.SWARTH;
            else if (roll < 0.95) this.type = Enemy.Types.WRAITH;
            else this.type = Enemy.Types.OVERLORD;
        } else {
            // Warp 7+ - All variants
            if (roll < 0.08) this.type = Enemy.Types.BASIC;
            else if (roll < 0.16) this.type = Enemy.Types.CHARGER;
            else if (roll < 0.24) this.type = Enemy.Types.STRIKER;
            else if (roll < 0.32) this.type = Enemy.Types.DRIFTER;
            else if (roll < 0.45) this.type = Enemy.Types.SNIPER;
            else if (roll < 0.55) this.type = Enemy.Types.SPINNER;
            else if (roll < 0.65) this.type = Enemy.Types.STALKER;
            else if (roll < 0.75) this.type = Enemy.Types.SWARTH;
            else if (roll < 0.85) this.type = Enemy.Types.WRAITH;
            else if (roll < 0.92) this.type = Enemy.Types.SPEAR;
            else if (roll < 0.98) this.type = Enemy.Types.MITE;
            else this.type = Enemy.Types.OVERLORD;
        }

        // Default properties
        this.size = 25;
        this.health = 1;
        this.color = '#ff4444';
        this.state = 'CHASE';
        this.stateTimer = 0;
        this.shootTimer = Math.random() * 3000;

        // Type-specific overrides
        const playerBaseSpeed = this.game.baseSpeed || 110;
        const maxNominalSpeed = Math.min(180, playerBaseSpeed * 1.2);

        switch (this.type) {
            case Enemy.Types.CHARGER:
                this.color = '#00d4ff'; // Neon blue
                this.baseSpeed = maxNominalSpeed * 0.6; // Slower base
                this.chargeSpeed = maxNominalSpeed * 2.5;
                break;
            case Enemy.Types.STRIKER:
                this.color = '#ffff00'; // Yellow
                this.baseSpeed = maxNominalSpeed * 0.8;
                break;
            case Enemy.Types.DRIFTER:
                this.color = '#ff00ff'; // Magenta
                this.baseSpeed = maxNominalSpeed * 1.4; // Fast
                this.state = 'WANDER';
                break;
            case Enemy.Types.OVERLORD:
                this.color = '#ff8800'; // Orange
                this.size = 50;
                this.health = 5;
                this.baseSpeed = maxNominalSpeed * 0.4; // Very slow
                this.spawnMargin = 1000;
                break;
            case Enemy.Types.SNIPER:
                this.color = '#00ff44'; // Bright green
                this.size = 20;
                this.health = 2;
                this.baseSpeed = maxNominalSpeed * 0.5;
                this.spawnMargin = 1200; // Spawns very far
                break;
            case Enemy.Types.SPINNER:
                this.color = '#ff0055'; // Pinkish Red
                this.size = 35;
                this.health = 3;
                this.baseSpeed = maxNominalSpeed * 0.9;
                this.spawnMargin = 850;
                break;
            case Enemy.Types.STALKER:
                this.color = '#00ffff'; // Cyan
                this.size = 25;
                this.health = 2;
                this.baseSpeed = maxNominalSpeed * 1.5; // High burst speed
                this.spawnMargin = 600;
                break;
            case Enemy.Types.SWARTH:
                this.color = '#aaff00'; // Lime
                this.size = 15; // Small
                this.health = 1;
                this.baseSpeed = maxNominalSpeed * 1.6;
                this.spawnMargin = 400;
                break;
            case Enemy.Types.WRAITH:
                this.color = '#ffffff'; // White
                this.size = 22;
                this.health = 2;
                this.baseSpeed = maxNominalSpeed * 0.9;
                this.spawnMargin = 700;
                break;
            case Enemy.Types.SPEAR:
                this.color = '#ffaa00'; // Gold/Amber
                this.size = 30;
                this.health = 3;
                this.baseSpeed = maxNominalSpeed * 2.5; // Very fast charge
                this.spawnMargin = 900;
                break;
            case Enemy.Types.MITE:
                this.color = '#ff00aa'; // Hot Pink
                this.size = 18;
                this.health = 1;
                this.baseSpeed = maxNominalSpeed * 1.8;
                this.spawnMargin = 500;
                break;
            default:
                this.color = '#ff4444';
                this.baseSpeed = maxNominalSpeed * (0.8 + Math.random() * 0.2);
                this.spawnMargin = 500;
        }

        this.speed = this.baseSpeed;

        // Dynamic Zone Spawning
        const matchingZones = this.game.spawnZones.filter(z => z.type === this.type);
        if (matchingZones.length > 0 && this.type !== Enemy.Types.BASIC) {
            const zone = matchingZones[Math.floor(Math.random() * matchingZones.length)];
            this.x = zone.x + Math.random() * zone.w;
            this.y = zone.y + Math.random() * zone.h;
        } else {
            // Basic enemies and types without zones spawn near camera
            this._setRectangularSpawnPosition(this.spawnMargin, this.spawnMargin);
        }
        this._adjustSpawnIntoView();

        // Re-generate sprite if size or color changed (normally would use multiple sprites)
        // For simplicity, we just use a draw logic that respects this.color
    }

    updateState(deltaTime) {
        const player = this.game.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.angle = Math.atan2(dy, dx);
        }

        // --- AI Behavior Logic ---
        switch (this.type) {
            case Enemy.Types.CHARGER:
                this._updateChargerAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.STRIKER:
                this._updateStrikerAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.DRIFTER:
                this._updateDrifterAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.OVERLORD:
                this._updateOverlordAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.SNIPER:
                this._updateSniperAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.SPINNER:
                this._updateSpinnerAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.STALKER:
                this._updateStalkerAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.SWARTH:
                this._updateSwarthAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.WRAITH:
                this._updateWraithAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.SPEAR:
                this._updateSpearAI(deltaTime, dx, dy, dist);
                break;
            case Enemy.Types.MITE:
                this._updateMiteAI(deltaTime, dx, dy, dist);
                break;
            default:
                this._updateBasicAI(deltaTime, dx, dy, dist);
        }

        // --- Separation & Physics ---
        this._applySeparation(deltaTime);

        // --- Collision with player ---
        const isInvincible = player.collisionEffectTimer > 0 || player.shieldTimer > 0;
        if (!isInvincible && dist < player.radius + this.size / 2) {
            this.takeDamage(1);
            player.triggerCollisionEffect();
            this.game.takeDamage();
        }

        this.angle = Math.atan2(dy, dx);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.markedForDeletion = true;
            this.game.score += (this.type === Enemy.Types.OVERLORD ? 50 : 10);
            this.game.enemiesDestroyed++;
            this.game.warpLevelKillCount++;

            // Progression check
            if (this.game.warpLevelKillCount >= this.game.killQuota && this.game.warpMessageTimer <= 0) {
                this.game.nextLevel();
            }

            // Explosion
            const particleCount = this.type === Enemy.Types.OVERLORD ? 30 : 10;
            for (let i = 0; i < particleCount; i++) {
                const p = this.game.particlePool.get(this.game, this.x, this.y, this.color);
                this.game.particles.push(p);
            }

            // Drop Loot
            const roll = Math.random();
            let lootType = Loot.Types.COIN;

            const isAdvanced = [
                Enemy.Types.WRAITH, Enemy.Types.SPEAR, Enemy.Types.MITE,
                Enemy.Types.OVERLORD, Enemy.Types.STALKER
            ].includes(this.type);

            if (isAdvanced && Math.random() < 0.25) { // 25% chance for powerup on advanced
                const pRoll = Math.random();
                if (pRoll < 0.33) lootType = Loot.Types.TURBO;
                else if (pRoll < 0.66) lootType = Loot.Types.TRIPLE;
                else lootType = Loot.Types.BOMB;
            } else {
                if (roll < 0.05) lootType = Loot.Types.HEART; // 5% chance for heart
                else if (roll < 0.12) lootType = Loot.Types.SHIELD; // 7% chance for shield
            }

            // Overlord always drops something useful
            if (this.type === Enemy.Types.OVERLORD && lootType === Loot.Types.COIN) {
                lootType = Math.random() < 0.5 ? Loot.Types.HEART : Loot.Types.SHIELD;
            }

            const loot = this.game.lootPool.get(this.game, this.x, this.y, lootType);
            this.game.loots.push(loot);

            this.game.updateScore();
        }
    }

    // --- AI Strategy Methods ---

    _updateBasicAI(deltaTime, dx, dy, dist) {
        if (dist > 0) {
            this.x += (dx / dist) * this.speed * (deltaTime / 1000);
            this.y += (dy / dist) * this.speed * (deltaTime / 1000);
        }
    }

    _updateChargerAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;
        if (this.state === 'CHASE') {
            this.speed = this.baseSpeed;
            this._updateBasicAI(deltaTime, dx, dy, dist);
            if (this.stateTimer > 3000 && dist < 400) {
                this.state = 'PREPARE';
                this.stateTimer = 0;
            }
        } else if (this.state === 'PREPARE') {
            this.speed = 0; // Stop to charge
            // Visual tell: blink color (handled in draw)
            if (this.stateTimer > 800) {
                this.state = 'CHARGE';
                this.stateTimer = 0;
                // Lock in direction
                this.chargeDirX = dx / dist;
                this.chargeDirY = dy / dist;
            }
        } else if (this.state === 'CHARGE') {
            this.speed = this.chargeSpeed;
            this.x += this.chargeDirX * this.speed * (deltaTime / 1000);
            this.y += this.chargeDirY * this.speed * (deltaTime / 1000);
            if (this.stateTimer > 600) {
                this.state = 'CHASE';
                this.stateTimer = 0;
            }
        }
    }

    _updateStrikerAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;
        if (this.state === 'CHASE') {
            this._updateBasicAI(deltaTime, dx, dy, dist);
            // Increased distance check and added randomness to transition
            if (dist < 400 || this.stateTimer > 5000) {
                this.state = 'SHOOT';
                this.stateTimer = 0;
            }
        } else if (this.state === 'SHOOT') {
            this.speed = this.baseSpeed * 0.1; // Move even slower while preparing/shooting
            this._updateBasicAI(deltaTime, dx, dy, dist);

            this.shootTimer += deltaTime;
            // First 800ms is "charging" (handled in draw), then fire
            if (this.shootTimer > 2500) { // Increased from 600 to 2500 for burst interval
                // GLOBAL LIMIT: Only fire if there aren't too many bullets already
                if (this.game.enemyBullets.length < 15) {
                    // Fire a 3-way spread
                    const baseAngle = Math.atan2(dy, dx);
                    [-0.2, 0, 0.2].forEach(offset => {
                        const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, baseAngle + offset, 350, this.color);
                        this.game.enemyBullets.push(b);
                    });
                }
                this.shootTimer = 0;
            }

            if (this.stateTimer > 3000) { // Stay in shoot state longer to reduce frequency of bursts
                this.state = 'CHASE';
                this.stateTimer = 0;
            }
        }
    }

    _updateDrifterAI(deltaTime, dx, dy, dist) {
        // Fast zig-zag movement
        this.stateTimer += deltaTime;
        const angle = Math.atan2(dy, dx) + Math.sin(this.stateTimer / 200) * 1.5;
        this.x += Math.cos(angle) * this.speed * (deltaTime / 1000);
        this.y += Math.sin(angle) * this.speed * (deltaTime / 1000);

        this.shootTimer += deltaTime;
        if (this.shootTimer > 4000) { // Increased from 2000 to 4000
            if (this.game.enemyBullets.length < 15) {
                const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, Math.atan2(dy, dx), 500, this.color);
                this.game.enemyBullets.push(b);
            }
            this.shootTimer = 0;
        }
    }

    _updateOverlordAI(deltaTime, dx, dy, dist) {
        this._updateBasicAI(deltaTime, dx, dy, dist);
        this.shootTimer += deltaTime;
        if (this.shootTimer > 3000) {
            // Large slow orb
            if (this.game.isVisible(this)) {
                const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, Math.atan2(dy, dx), 200, this.color);
                b.radius = 12; // Extra large
                this.game.enemyBullets.push(b);
            }
            this.shootTimer = 0;
        }
    }

    _updateSniperAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;

        // Sniper logic: Keep a moderate distance, ENSURE stays in view logic
        const targetDist = 380; // Reduced from 450 to keep it very clearly on screen
        const buffer = 50;

        if (dist > targetDist + buffer) {
            this._updateBasicAI(deltaTime, dx, dy, dist); // Move closer
        } else if (dist < targetDist - buffer) {
            // Back away
            this.x -= (dx / dist) * this.speed * (deltaTime / 1000);
            this.y -= (dy / dist) * this.speed * (deltaTime / 1000);
        } else {
            // Strafe to be harder to hit
            const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
            const strafeDir = (Math.floor(this.stateTimer / 2000) % 2 === 0) ? 1 : -1;
            this.x += Math.cos(strafeAngle) * (this.speed * 0.8) * strafeDir * (deltaTime / 1000);
            this.y += Math.sin(strafeAngle) * (this.speed * 0.8) * strafeDir * (deltaTime / 1000);
        }

        // Additional view enforcement: if it's getting too close to edges of camera, push it back in
        const viewW = this.game.width / this.game.camera.zoom;
        const viewH = this.game.height / this.game.camera.zoom;
        const pad = 80;
        if (this.x < this.game.camera.x + pad) this.x += this.speed * (deltaTime / 1000);
        if (this.x > this.game.camera.x + viewW - pad) this.x -= this.speed * (deltaTime / 1000);
        if (this.y < this.game.camera.y + pad) this.y += this.speed * (deltaTime / 1000);
        if (this.y > this.game.camera.y + viewH - pad) this.y -= this.speed * (deltaTime / 1000);

        this.shootTimer += deltaTime;
        if (this.shootTimer > 5000) {
            if (this.game.isVisible(this) && this.game.enemyBullets.length < 25) {
                const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, Math.atan2(dy, dx), 1300, this.color);
                b.radius = 2.5;
                this.game.enemyBullets.push(b);
            }
            this.shootTimer = 0;
        }
    }

    _updateSwarthAI(deltaTime, dx, dy, dist) {
        // Simple boid-like flocking (only chase and separation)
        this._updateBasicAI(deltaTime, dx, dy, dist);
    }

    _updateWraithAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;
        // Glitch movement: jitter and occasional short jumps
        if (Math.random() < 0.05) {
            this.x += (Math.random() - 0.5) * 40;
            this.y += (Math.random() - 0.5) * 40;
        }

        if (this.stateTimer > 2000) {
            // Flicker/Teleport closer
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * 100;
            this.y += Math.sin(angle) * 100;
            this.stateTimer = 0;
        }
        this._updateBasicAI(deltaTime, dx, dy, dist);
    }

    _updateSpearAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;
        if (this.state === 'CHASE') {
            const targetAngle = Math.atan2(dy, dx);
            const angleDiff = targetAngle - this.angle;
            this.angle += angleDiff * 0.05; // Slow rotate to face player

            this.x += Math.cos(this.angle) * this.baseSpeed * 0.3 * (deltaTime / 1000);
            this.y += Math.sin(this.angle) * this.baseSpeed * 0.3 * (deltaTime / 1000);

            if (this.stateTimer > 2500 && dist < 600) {
                this.state = 'PREPARE';
                this.stateTimer = 0;
            }
        } else if (this.state === 'PREPARE') {
            if (this.stateTimer > 1000) {
                this.state = 'CHARGE';
                this.stateTimer = 0;
            }
        } else if (this.state === 'CHARGE') {
            this.x += Math.cos(this.angle) * this.baseSpeed * 3.5 * (deltaTime / 1000);
            this.y += Math.sin(this.angle) * this.baseSpeed * 3.5 * (deltaTime / 1000);
            if (this.stateTimer > 1200) {
                this.state = 'CHASE';
                this.stateTimer = 0;
            }
        }
    }

    _updateMiteAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;
        if (this.stateTimer > 500) {
            this.randomAngle = Math.random() * Math.PI * 2;
            this.stateTimer = 0;
        }
        const angle = Math.atan2(dy, dx);
        const lerpAngle = angle * 0.4 + (this.randomAngle || 0) * 0.6;
        this.x += Math.cos(lerpAngle) * this.baseSpeed * (deltaTime / 1000);
        this.y += Math.sin(lerpAngle) * this.baseSpeed * (deltaTime / 1000);
    }

    _updateStalkerAI(deltaTime, dx, dy, dist) {
        this.stateTimer += deltaTime;

        if (this.state === 'CHASE' || this.state === 'IDLE') {
            // Move jerkily: wait, then burst
            if (this.stateTimer > 600) {
                this.state = 'BURST';
                this.stateTimer = 0;
                // Move towards player with some randomness
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
                this.chargeDirX = Math.cos(angle);
                this.chargeDirY = Math.sin(angle);

                // Fire a star on burst start!
                if (this.game.isVisible(this) && this.game.enemyBullets.length < 25) {
                    const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, angle, 250, this.color, EnemyBullet.Types.STAR);
                    this.game.enemyBullets.push(b);
                }
            } else {
                // Slower movement while idle
                this.x += (dx / dist) * (this.baseSpeed * 0.2) * (deltaTime / 1000);
                this.y += (dy / dist) * (this.baseSpeed * 0.2) * (deltaTime / 1000);
            }
        } else if (this.state === 'BURST') {
            this.x += this.chargeDirX * this.baseSpeed * 2 * (deltaTime / 1000);
            this.y += this.chargeDirY * this.baseSpeed * 2 * (deltaTime / 1000);
            if (this.stateTimer > 300) {
                this.state = 'IDLE';
                this.stateTimer = 0;
            }
        }
    }

    _updateSpinnerAI(deltaTime, dx, dy, dist) {
        this._updateBasicAI(deltaTime, dx, dy, dist);

        // Spinner has rotating "blades" (visual effect in draw)
        // They also release small sparks periodically
        this.shootTimer += deltaTime;
        if (this.shootTimer > 1500 && dist < 500) {
            if (this.game.enemyBullets.length < 25) {
                const angle = (this.stateTimer * 0.005) % (Math.PI * 2);
                const b = this.game.enemyBulletPool.get(this.game, this.x, this.y, angle, 300, this.color);
                this.game.enemyBullets.push(b);
            }
            this.shootTimer = 0;
        }
    }

    _applySeparation(deltaTime) {
        const separationDist = this.size * 1.2;
        const nearby = this.game.grid.retrieve(this, separationDist);
        nearby.forEach(other => {
            if (other instanceof Enemy && other !== this && !other.markedForDeletion) {
                const diffX = this.x - other.x;
                const diffY = this.y - other.y;
                const distance = Math.sqrt(diffX * diffX + diffY * diffY);
                if (distance < separationDist && distance > 0) {
                    const pushFactor = (separationDist - distance) / separationDist;
                    const pushForce = 200 * pushFactor;
                    this.x += (diffX / distance) * pushForce * (deltaTime / 1000);
                    this.y += (diffY / distance) * pushForce * (deltaTime / 1000);
                }
            }
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Visual Tell for Charger & Striker
        let drawColor = this.color;
        if (this.state === 'PREPARE' && Math.floor(Date.now() / 100) % 2 === 0) {
            drawColor = '#fff';
        }
        if (this.type === Enemy.Types.STRIKER && this.state === 'SHOOT' && this.shootTimer > 1500 && Math.floor(Date.now() / 150) % 2 === 0) {
            drawColor = '#fff';
        }

        // Draw dynamic shape
        ctx.fillStyle = drawColor;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        const player = this.game.player;
        if (this.type === Enemy.Types.OVERLORD) {
            // Octagon for tank
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                const r = this.size * 0.75;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
        } else if (this.type === Enemy.Types.SNIPER) {
            // Diamond shape with antenna
            ctx.moveTo(this.size, 0);
            ctx.lineTo(0, this.size / 2);
            ctx.lineTo(-this.size, 0);
            ctx.lineTo(0, -this.size / 2);
            ctx.closePath();

            // Draw Sniper laser aim
            if (this.shootTimer > 3000) {
                ctx.restore(); ctx.save(); // Reset rotation for laser
                ctx.strokeStyle = 'rgba(0, 255, 68, 0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([10, 5]);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                ctx.lineTo(this.x + (dx / dist) * dist, this.y + (dy / dist) * dist);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.translate(this.x, this.y); ctx.rotate(this.angle); // Restore
            }
        } else if (this.type === Enemy.Types.SPINNER) {
            // Cross shape that rotates
            const rot = this.stateTimer * 0.01;
            ctx.rotate(rot);
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.moveTo(0, 0);
                ctx.lineTo(this.size, 0);
                ctx.lineTo(this.size * 0.8, this.size * 0.2);
            }
        } else if (this.type === Enemy.Types.STALKER) {
            // Sphere with an Eye
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();

            // The Eye White
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.size * 0.3, 0, this.size * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // The Pupil (looking towards movement/direction)
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.size * 0.5, 0, this.size * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Glow on eye
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.type === Enemy.Types.SWARTH) {
            // Tiny arrowheads
            ctx.scale(0.7, 0.7);
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size, -this.size * 0.8);
            ctx.lineTo(-this.size * 0.5, 0);
            ctx.lineTo(-this.size, this.size * 0.8);
            ctx.closePath();
        } else if (this.type === Enemy.Types.WRAITH) {
            // Glitching square
            const alpha = 0.5 + Math.random() * 0.5;
            ctx.globalAlpha = alpha;
            const jitter = (Math.random() - 0.5) * 5;
            ctx.strokeRect(-this.size / 2 + jitter, -this.size / 2, this.size, this.size);
            ctx.fillRect(-this.size / 4, -this.size / 4, this.size / 2, this.size / 2);
            ctx.globalAlpha = 1.0;
        } else if (this.type === Enemy.Types.SPEAR) {
            // Long thin razor
            ctx.moveTo(this.size * 1.5, 0);
            ctx.lineTo(-this.size * 0.5, -this.size * 0.3);
            ctx.lineTo(-this.size, 0);
            ctx.lineTo(-this.size * 0.5, this.size * 0.3);
            ctx.closePath();
        } else if (this.type === Enemy.Types.MITE) {
            // Pulsing star
            const p = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.moveTo(0, 0);
                ctx.lineTo(this.size * p, 0);
                ctx.lineTo(this.size * 0.2, this.size * 0.2);
            }
        } else if (this.type === Enemy.Types.CHARGER) {
            // Pointy arrow
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size / 2, -this.size / 2);
            ctx.lineTo(-this.size / 4, 0);
            ctx.lineTo(-this.size / 2, this.size / 2);
        } else {
            // Classic triangle
            ctx.moveTo(this.size / 2, 0);
            ctx.lineTo(-this.size / 2, -this.size / 2.5);
            ctx.lineTo(-this.size / 3, 0);
            ctx.lineTo(-this.size / 2, this.size / 2.5);
        }
        ctx.fill();
        ctx.closePath();

        ctx.restore();
    }

    _setRectangularSpawnPosition(marginW = 500, marginH = 500) {
        const cam = this.game.camera;
        const viewW = cam.width / cam.zoom;
        const viewH = cam.height / cam.zoom;
        const side = Math.floor(Math.random() * 4);
        switch (side) {
            case 0: this.x = cam.x - marginW + Math.random() * (viewW + 2 * marginW); this.y = cam.y - marginH; break;
            case 1: this.x = cam.x - marginW + Math.random() * (viewW + 2 * marginW); this.y = cam.y + viewH + marginH; break;
            case 2: this.x = cam.x - marginW; this.y = cam.y - marginH + Math.random() * (viewH + 2 * marginH); break;
            case 3: this.x = cam.x + viewW + marginW; this.y = cam.y - marginH + Math.random() * (viewH + 2 * marginH); break;
        }
        const halfW = this.game.worldWidth / 2;
        const halfH = this.game.worldHeight / 2;
        this.x = Math.max(-halfW, Math.min(halfW, this.x));
        this.y = Math.max(-halfH, Math.min(halfH, this.y));
    }

    _adjustSpawnIntoView() {
        const dx = this.x - this.game.player.x;
        const dy = this.y - this.game.player.y;
        if (Math.abs(dx) < 200 && Math.abs(dy) < 200) {
            this._setRectangularSpawnPosition(this.spawnMargin, this.spawnMargin);
        }
    }
}
