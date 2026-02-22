export class ProgressionSystem {
    constructor(engine) {
        this.engine = engine;
    }

    update(deltaTime, worldState) {
        const { engine, entityManager, audioSystem, camera } = worldState;
        if (engine.gameState !== 'PLAYING') return;

        if (engine.warpLevelKillCount >= worldState.engine.config.KILL_QUOTA) {
            this.handleWarp(worldState);
        }
    }

    handleWarp(worldState) {
        const { engine, entityManager, camera } = worldState;

        engine.warpLevel++;
        engine.warpLevelKillCount = 0;
        engine.warpTimer = 0;

        // Teleport player to a new random position
        if (engine.player) {
            engine.player.x = (Math.random() - 0.5) * (engine.config.WORLD_WIDTH * 0.7);
            engine.player.y = (Math.random() - 0.5) * (engine.config.WORLD_HEIGHT * 0.7);
            if (camera) camera.snapTo(engine.player);
        }

        // Properly clear all enemies on warp
        entityManager.getEntitiesByType('enemy').forEach(e => {
            e.active = false;
        });
        entityManager.cleanup();

        // Notify systems of warp change
        for (const system of engine.systemManager.logicSystems) {
            if (system.onWarp) system.onWarp(engine.warpLevel);
        }
    }
}
