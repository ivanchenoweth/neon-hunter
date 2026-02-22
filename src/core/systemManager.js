export class SystemManager {
    constructor() {
        this.logicSystems = [];
        this.renderSystems = [];
    }

    addSystem(system, phase = 'both') {
        if (phase === 'logic' || phase === 'both') {
            if (system.update) this.logicSystems.push(system);
        }
        if (phase === 'render' || phase === 'both') {
            if (system.render) this.renderSystems.push(system);
        }
    }

    update(deltaTime, worldState) {
        const isPaused = worldState.engine && worldState.engine.gameState === 'PAUSED';
        for (const system of this.logicSystems) {
            if (isPaused && !system.updateDuringPause) continue;
            system.update(deltaTime, worldState);
        }
    }

    render(worldState) {
        for (const system of this.renderSystems) {
            system.render(worldState);
        }
    }
}
