export class EnemySystem {
    update(deltaTime, worldState) {
        const { entityManager, engine } = worldState;
        const player = engine.player;
        if (!player || engine.gameState !== 'PLAYING') return;

        const enemies = entityManager.getEntitiesByType('enemy');
        const warpTimer = engine.warpTimer || 0;

        for (const enemy of enemies) {
            if (!enemy.active) continue;

            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Warp Speed Escalation (Ported from original Game.js)
            if (warpTimer > 30000) {
                const timeOverSeconds = (warpTimer - 30000) / 1000;
                // Formula: baseSpeed * (1 + timeFactor * distFactor)
                const timeFactor = Math.pow(timeOverSeconds / 5, 2);
                const distFactor = 0.2 + 0.8 * Math.min(1, dist / 1500);
                enemy.speed = enemy.baseSpeed * (1 + timeFactor * distFactor);
            } else {
                enemy.speed = enemy.baseSpeed;
            }

            if (dist > 0) {
                enemy.vx = (dx / dist) * enemy.speed;
                enemy.vy = (dy / dist) * enemy.speed;
                enemy.angle = Math.atan2(dy, dx);
            } else {
                enemy.vx = 0;
                enemy.vy = 0;
            }
        }
    }
}
