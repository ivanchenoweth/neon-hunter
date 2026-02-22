import { CONFIG } from '../config/constants.js?v=29';

export class SpawnSystem {
    constructor() {
        this.enemyInterval = 250; // Every 250ms
        this.enemyTimer = 0;
        this.foodTimer = 0;
        this.enemyCap = 100; // Limit per warp session
        this.enemiesSpawnedInWarp = 0;
        this.initialSpawnDone = false;
    }

    update(deltaTime, worldState) {
        const { entityManager, engine } = worldState;

        if (!engine || engine.gameState !== 'PLAYING') {
            this.initialSpawnDone = false;
            return;
        }

        if (!this.initialSpawnDone) {
            // Burst spawn 50 foods
            for (let i = 0; i < CONFIG.INITIAL_FOOD_COUNT; i++) {
                this.spawnFood(entityManager);
            }
            this.initialSpawnDone = true;
            this.enemyTimer = 0;
            this.enemiesSpawnedInWarp = 0;
            return;
        }

        // Spawn Food gradually if collected
        const foodCount = entityManager.getEntitiesByType('food').length;
        if (foodCount < CONFIG.INITIAL_FOOD_COUNT) {
            this.spawnFood(entityManager);
        }

        // Spawn Enemies
        this.enemyTimer += deltaTime;
        if (this.enemyTimer > this.enemyInterval && this.enemiesSpawnedInWarp < 100) {
            const successes = this.spawnEnemy(entityManager, engine);
            if (successes) {
                this.enemiesSpawnedInWarp++;
            }
            this.enemyTimer = 0;
        }
    }

    onWarp(level) {
        // Reset spawn counter for the new warp level
        this.enemiesSpawnedInWarp = 0;
    }

    spawnFood(entityManager) {
        const x = (Math.random() - 0.5) * CONFIG.WORLD_WIDTH;
        const y = (Math.random() - 0.5) * CONFIG.WORLD_HEIGHT;
        entityManager.get('food', x, y);
    }

    spawnEnemy(entityManager, engine) {
        const cam = engine.camera;
        if (!cam) return false;

        const zoom = cam.zoom;
        const viewW = cam.width / zoom;
        const viewH = cam.height / zoom;

        // Perimeter spawn around camera viewport
        const margin = 150;
        let x, y;
        const side = Math.floor(Math.random() * 4);

        switch (side) {
            case 0: // Top
                x = cam.x - margin + Math.random() * (viewW + margin * 2);
                y = cam.y - margin;
                break;
            case 1: // Bottom
                x = cam.x - margin + Math.random() * (viewW + margin * 2);
                y = cam.y + viewH + margin;
                break;
            case 2: // Left
                x = cam.x - margin;
                y = cam.y - margin + Math.random() * (viewH + margin * 2);
                break;
            case 3: // Right
                x = cam.x + viewW + margin;
                y = cam.y - margin + Math.random() * (viewH + margin * 2);
                break;
        }

        // World clamp to keep them inside the borders
        const halfW = CONFIG.WORLD_WIDTH / 2;
        const halfH = CONFIG.WORLD_HEIGHT / 2;
        x = Math.max(-halfW, Math.min(halfW, x));
        y = Math.max(-halfH, Math.min(halfH, y));

        // Proximity check (optional here since it's outside view, but good for edge cases)
        if (engine.player) {
            const dx = x - engine.player.x;
            const dy = y - engine.player.y;
            if (Math.abs(dx) < 50 && Math.abs(dy) < 50) {
                return false;
            }
        }

        const warpIncrease = (engine.warpLevel - 1) * 10;
        const enemySpeed = Math.min(145, CONFIG.ENEMY_BASE_SPEED + warpIncrease);

        const enemy = entityManager.get('enemy', x, y, enemySpeed);
        return !!enemy;
    }
}
