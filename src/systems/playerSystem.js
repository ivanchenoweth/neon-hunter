import { CONFIG } from '../config/constants.js?v=29';

export class PlayerSystem {
    constructor() {
        this.shotTimer = 0;
        this.shotInterval = 100;
        this.beamSoundTimer = 0;
    }

    update(deltaTime, worldState) {
        const { input, entityManager, engine } = worldState;
        const player = engine.player;
        if (!player || !player.active || engine.gameState !== 'PLAYING') return;

        this.handleMovement(player, input, deltaTime);
        this.handleAiming(player, input, engine.camera);
        this.handleShooting(player, input, entityManager, deltaTime, worldState);
        this.handleBeam(player, input, deltaTime, worldState);
        player.update(deltaTime);
    }

    handleMovement(player, input, deltaTime) {
        let dx = 0, dy = 0;
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
            player.vx = (dx / length) * player.speed;
            player.vy = (dy / length) * player.speed;
        } else {
            player.vx = 0;
            player.vy = 0;
        }
    }

    handleAiming(player, input, camera) {
        if (window.inputMode === 'keyboardFire') {
            let dirX = 0, dirY = 0;
            if (input.keys.i) dirY -= 1;
            if (input.keys.k) dirY += 1;
            if (input.keys.j) dirX -= 1;
            if (input.keys.l) dirX += 1;

            if (dirX !== 0 || dirY !== 0) {
                const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                const worldX = player.x + (dirX / magnitude) * 300;
                const worldY = player.y + (dirY / magnitude) * 300;
                player.setFireDirection(worldX, worldY);
            }
        } else if (input.joystickRight && input.joystickRight.active) {
            const length = Math.sqrt(input.joystickRight.x ** 2 + input.joystickRight.y ** 2);
            if (length > 0) {
                player.fireDirection.x = input.joystickRight.x / length;
                player.fireDirection.y = input.joystickRight.y / length;
            }
        } else {
            const worldX = (input.mouse.x / camera.zoom) + camera.x;
            const worldY = (input.mouse.y / camera.zoom) + camera.y;
            player.setFireDirection(worldX, worldY);
        }
    }

    handleShooting(player, input, entityManager, deltaTime, worldState) {
        this.shotTimer += deltaTime;
        const isShooting = input.leftMouseDown || input.keys[' '] || input.keys.j || input.keys.k || input.keys.l || input.keys.i || (input.joystickRight && input.joystickRight.active);

        if (isShooting && this.shotTimer > this.shotInterval && player.spawnTimer <= 0) {
            entityManager.get('bullet', player.x, player.y, player.fireDirection.x, player.fireDirection.y);
            this.shotTimer = 0;
            const engine = worldState.engine || this.engine;
            if (engine && engine.audioSystem) engine.audioSystem.playShoot();
        }
    }

    handleBeam(player, input, deltaTime, worldState) {
        const { audioSystem, entityManager } = worldState;
        const isBeamRequested = input.keys[' '] || input.rightMouseDown || input.virtualBeamButton;

        if (isBeamRequested && player.spawnTimer <= 0) {
            if (!player.isChargingBeam) {
                player.isChargingBeam = true;
                player.beamChargeTime = 0;
            }
            player.beamChargeTime += deltaTime;
            if (player.beamChargeTime > player.maxBeamChargeTime) player.beamChargeTime = player.maxBeamChargeTime;

            const progress = player.beamChargeTime / player.maxBeamChargeTime;
            // Mixed linear + quadratic growth
            player.beamLength = (progress * 0.3 + Math.pow(progress, 2) * 0.7) * 2000;

            this.beamSoundTimer += deltaTime;
            if (this.beamSoundTimer > 100 && audioSystem) {
                audioSystem.resume(); // Ensure context is active
                this.beamSoundTimer = 0;
            }
        } else if (player.isChargingBeam) {
            // Trigger Beam Explosion
            const progress = player.beamChargeTime / player.maxBeamChargeTime;
            const tipX = player.x + player.fireDirection.x * player.beamLength;
            const tipY = player.y + player.fireDirection.y * player.beamLength;
            
            this.triggerBeamExplosion(tipX, tipY, progress, worldState);

            // TELEPORT Logic
            const oldX = player.x;
            const oldY = player.y;
            player.x = tipX;
            player.y = tipY;

            // Teleport Particles at start and end
            for (let i = 0; i < 15; i++) {
                entityManager.get('particle', oldX, oldY, '#ffffff', 5 + Math.random() * 10);
                entityManager.get('particle', tipX, tipY, '#ff00ff', 5 + Math.random() * 10);
            }

            if (worldState.engine && worldState.engine.camera) {
                worldState.engine.camera.shake(15, 200);
            }

            player.isChargingBeam = false;
            player.beamChargeTime = 0;
            player.beamLength = 0;
        }
    }

    triggerBeamExplosion(x, y, progress, worldState) {
        const { entityManager, audioSystem } = worldState;
        const radius = 60 + progress * 180;
        
        // Kill enemies in radius
        const enemies = entityManager.getEntitiesByType('enemy');
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dist = Math.sqrt((enemy.x - x)**2 + (enemy.y - y)**2);
            if (dist < radius) {
                enemy.takeDamage(1, worldState);
            }
        }

        // Spawn many particles
        for (let i = 0; i < 30; i++) {
            entityManager.get('particle', x, y, '#ff00ff', 15 + Math.random() * 20);
        }

        if (audioSystem || (worldState.engine && worldState.engine.audioSystem)) {
            const audio = audioSystem || worldState.engine.audioSystem;
            audio.playExplosion();
        }
    }

    onWarp(level) {
        // Increase fire rate slightly with warp?
        this.shotInterval = Math.max(50, 100 - (level - 1) * 5);
    }
}
