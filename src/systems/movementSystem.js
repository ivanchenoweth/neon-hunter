import { CONFIG } from '../config/constants.js?v=29';

export class MovementSystem {
    update(deltaTime, worldState) {
        const { entityManager } = worldState;
        const halfW = CONFIG.WORLD_WIDTH / 2;
        const halfH = CONFIG.WORLD_HEIGHT / 2;

        for (const entity of entityManager.entities) {
            if (!entity.active) continue;

            // Update entity internal state (animations, effects, etc.)
            if (entity.update) entity.update(deltaTime);

            entity.x += entity.vx * (deltaTime / 1000);
            entity.y += entity.vy * (deltaTime / 1000);

            // World boundaries for specific entities if needed
            if (entity.type === 'player' || entity.type === 'enemy') {
                if (entity.x < -halfW) entity.x = -halfW;
                if (entity.x > halfW) entity.x = halfW;
                if (entity.y < -halfH) entity.y = -halfH;
                if (entity.y > halfH) entity.y = halfH;
            }
        }
    }
}
