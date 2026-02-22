import { EntityManager } from './entityManager.js?v=29';
import { SystemManager } from './systemManager.js?v=29';
import { CONFIG } from '../config/constants.js?v=29';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.entityManager = new EntityManager();
        this.systemManager = new SystemManager();

        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDeltaTime = 1000 / 60; // 60 FPS fixed simulation rate

        // Global State
        this.gameState = 'INITIAL';
        this.score = 0;
        this.coins = 0;
        this.enemiesDestroyed = 0;
        this.warpLevel = 1;
        this.warpLevelKillCount = 0;
        this.warpTimer = 0;

        // FPS Tracking
        this.fps = 0;
        this.lastFpsUpdate = 0;
        this.framesSinceUpdate = 0;

        this.setupCanvas();
        this.config = CONFIG;
        window.addEventListener('resize', () => this.handleResize());
    }

    setupCanvas() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Propagate resize to systems
        for (const system of this.systemManager.logicSystems) {
            if (system.resize) system.resize(this.width, this.height);
        }
        for (const system of this.systemManager.renderSystems) {
            if (system.resize) system.resize(this.width, this.height);
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(currentTime) {
        try {
            const frameTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            // Cap frame time to prevent "spiral of death" during heavy lag
            this.accumulator += Math.min(frameTime, 250);

            while (this.accumulator >= this.fixedDeltaTime) {
                this.update(this.fixedDeltaTime);
                this.accumulator -= this.fixedDeltaTime;
            }

            this.render();

            // FPS Calculation
            this.framesSinceUpdate++;
            if (currentTime - this.lastFpsUpdate >= 1000) {
                this.fps = Math.round((this.framesSinceUpdate * 1000) / (currentTime - this.lastFpsUpdate));
                this.lastFpsUpdate = currentTime;
                this.framesSinceUpdate = 0;
            }

            requestAnimationFrame((t) => this.loop(t));
        } catch (error) {
            console.error('[Engine] CRITICAL LOOP ERROR:', error);
        }
    }

    update(deltaTime) {
        if (this.gameState === 'PLAYING') {
            this.warpTimer += deltaTime;
        }

        // Collect information for systems
        const worldState = {
            width: this.width,
            height: this.height,
            entityManager: this.entityManager,
            engine: this,
            camera: this.camera,
            audioSystem: this.audioSystem,
            stateSystem: this.stateSystem
        };

        if (this.gameState === 'PAUSED') {
            this.systemManager.update(deltaTime, worldState);
            return;
        }

        this.systemManager.update(deltaTime, worldState);
        this.entityManager.cleanup();

        if (this.camera) {
            this.camera.update(deltaTime);
        }
    }

    render() {
        const worldState = {
            width: this.width,
            height: this.height,
            ctx: this.ctx,
            entityManager: this.entityManager,
            engine: this,
            camera: this.camera,
            audioSystem: this.audioSystem,
            stateSystem: this.stateSystem
        };

        this.systemManager.render(worldState);
    }
}
