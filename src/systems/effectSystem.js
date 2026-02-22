import { CONFIG } from '../config/constants.js?v=29';

export class EffectSystem {
    update(deltaTime, worldState) {
        const { entityManager } = worldState;
        const particles = entityManager.getEntitiesByType('particle');
        
        for (const particle of particles) {
            particle.update(deltaTime);
        }
    }

    render(worldState) {
        // Here we could handle the bloom effect
        // 1. Draw emissive entities to a low-res buffer
        // 2. Blur the buffer
        // 3. Composite back to main ctx
    }
}
