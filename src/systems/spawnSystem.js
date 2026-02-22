import { CONFIG } from '../config/constants.js?v=29';

export class SpawnSystem {
    constructor() {
        this.enemyInterval = 800; // Slower base spawn
        this.foodTimer = 0;
        this.enemyCap = 100; // Prevent overcrowding
    }

    update(deltaTime, worldState) {
        const { entityManager, engine } = worldState;
        
        if (!engine || engine.gameState !== 'PLAYING') {
            this.initialSpawnDone = false;
            return;
        }

        if (!this.initialSpawnDone) {
            // Burst spawn 50 foods and 20 enemies when game starts
            for (let i = 0; i < CONFIG.INITIAL_FOOD_COUNT; i++) {
                this.spawnFood(entityManager);
            }
            // Use spawnEnemy logic but skip proximity check for initial burst if needed,
            // or just let it run 20 times within the logic.
            for (let i = 0; i < CONFIG.INITIAL_ENEMY_COUNT; i++) {
                this.spawnEnemy(entityManager, engine);
            }
            this.initialSpawnDone = true;
            this.enemyTimer = 0;
            return;
        }

        // Spawn Food gradually if collected
        const foodCount = entityManager.getEntitiesByType('food').length;
        if (foodCount < CONFIG.INITIAL_FOOD_COUNT) {
            this.spawnFood(entityManager);
        }

        // Spawn Enemies
        this.enemyTimer += deltaTime;
        const currentEnemies = entityManager.getEntitiesByType('enemy').length;
        if (this.enemyTimer > this.enemyInterval && currentEnemies < this.enemyCap) {
            // Spawn in bursts if we are far below cap
            const burstCount = (currentEnemies < this.enemyCap / 2) ? 3 : 1;
            for (let i = 0; i < burstCount; i++) {
                if (entityManager.getEntitiesByType('enemy').length < this.enemyCap) {
                    this.spawnEnemy(entityManager, engine);
                }
            }
            this.enemyTimer = 0;
        }
    }

    onWarp(level) {
        // Make enemies spawn faster as warp level increases
        this.enemyInterval = Math.max(200, 800 - (level - 1) * 100);
        this.enemyCap = 100 + (level - 1) * 20;
    }

    spawnFood(entityManager) {
        const x = (Math.random() - 0.5) * CONFIG.WORLD_WIDTH;
        const y = (Math.random() - 0.5) * CONFIG.WORLD_HEIGHT;
        entityManager.get('food', x, y);
    }

    spawnEnemy(entityManager, engine) {
        const cam = engine.camera;
        if (!cam) return;

        const zoom = cam.zoom;
        const viewW = cam.width / zoom;
        const viewH = cam.height / zoom;
        const marginW = 100;
        const marginH = 100;

        let x, y;
        const side = Math.floor(Math.random() * 4);
        switch (side) {
            case 0: // Top
                x = cam.x - marginW + Math.random() * (viewW + 2 * marginW);
                y = cam.y - marginH;
                break;
            case 1: // Bottom
                x = cam.x - marginW + Math.random() * (viewW + 2 * marginW);
                y = cam.y + viewH + marginH;
                break;
            case 2: // Left
                x = cam.x - marginW;
                y = cam.y - marginH + Math.random() * (viewH + 2 * marginH);
                break;
            case 3: // Right
                x = cam.x + viewW + marginW;
                y = cam.y - marginH + Math.random() * (viewH + 2 * marginH);
                break;
        }

        // World clamp
        const halfW = CONFIG.WORLD_WIDTH / 2;
        const halfH = CONFIG.WORLD_HEIGHT / 2;
        x = Math.max(-halfW, Math.min(halfW, x));
        y = Math.max(-halfH, Math.min(halfH, y));

        // Proximity check (don't spawn on top of player)
        if (engine.player) {
            const dx = x - engine.player.x;
            const dy = y - engine.player.y;
            if (Math.abs(dx) < 200 && Math.abs(dy) < 200) {
                return; // Too close, skip this spawn
            }
        }

        const baseSpeed = CONFIG.ENEMY_BASE_SPEED + (engine.warpLevel - 1) * 0.5;
        entityManager.get('enemy', x, y, baseSpeed);
    }
}
