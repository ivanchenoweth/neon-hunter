import { getDistance } from '../utils/math.js?v=29';
import { SpatialGrid } from '../utils/spatialGrid.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class CollisionSystem {
    constructor() {
        this.grid = new SpatialGrid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT, CONFIG.GRID_CELL_SIZE);
    }

    update(deltaTime, worldState) {
        const { entityManager } = worldState;

        this.grid.clear();
        for (const entity of entityManager.entities) {
            if (entity.active) {
                this.grid.insert(entity);
            }
        }

        // We use a traditional loop to avoid issues with modifying the array if we destroy entities
        // Though entityManager.cleanup handles the actual removal, it's safer.
        const entities = entityManager.entities;
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            if (!a.active || a.type === 'particle') continue;

            const nearby = this.grid.getNearby(a);
            for (let j = 0; j < nearby.length; j++) {
                const b = nearby[j];
                if (a === b || !b.active) continue;

                const dist = getDistance(a.x, a.y, b.x, b.y);
                const minDist = a.radius + b.radius;

                if (dist < minDist) {
                    this.resolveCollision(a, b, worldState);
                }
            }
        }
    }

    resolveCollision(a, b, worldState) {
        // Bullet vs Enemy
        if (a.type === 'bullet' && b.type === 'enemy') {
            a.active = false;
            b.takeDamage(1, worldState);
            return;
        }
        if (b.type === 'bullet' && a.type === 'enemy') {
            b.active = false;
            a.takeDamage(1, worldState);
            return;
        }

        // Player vs Enemy
        if (a.type === 'player' && b.type === 'enemy') {
            if (a.spawnTimer > 0 || a.collisionEffectTimer > 0) return; // Ghost state
            a.takeDamage(1, worldState);
            b.takeDamage(1, worldState);
            return;
        }
        if (b.type === 'player' && a.type === 'enemy') {
            if (b.spawnTimer > 0 || b.collisionEffectTimer > 0) return; // Ghost state
            b.takeDamage(1, worldState);
            a.takeDamage(1, worldState);
            return;
        }

        // Player vs Food
        if (a.type === 'player' && b.type === 'food') {
            if (!b.isCaptured) {
                a.collectFood(b, worldState);
                b.isCaptured = true;
            }
            return;
        }
        if (b.type === 'player' && a.type === 'food') {
            if (!a.isCaptured) {
                b.collectFood(a, worldState);
                a.isCaptured = true;
            }
            return;
        }

        // Enemy vs Enemy (Separation/Bouncing)
        if (a.type === 'enemy' && b.type === 'enemy') {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (a.radius + b.radius - dist) / dist;
            const pushX = dx * force * 0.5;
            const pushY = dy * force * 0.5;
            a.x += pushX;
            a.y += pushY;
            b.x -= pushX;
            b.y -= pushY;
        }
    }
}
