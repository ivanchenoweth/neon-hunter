import { Engine } from './core/engine.js?v=29';
import { Camera } from './utils/camera.js?v=29';
import { InputSystem } from './systems/inputSystem.js?v=29';
import { MovementSystem } from './systems/movementSystem.js?v=29';
import { CollisionSystem } from './systems/collisionSystem.js?v=29';
import { RenderSystem } from './systems/renderSystem.js?v=29';
import { AudioSystem } from './systems/audioSystem.js?v=29';
import { SpawnSystem } from './systems/spawnSystem.js?v=29';
import { StateSystem } from './systems/stateSystem.js?v=29';
import { EffectSystem } from './systems/effectSystem.js?v=29';
import { PlayerSystem } from './systems/playerSystem.js?v=29';
import { EnemySystem } from './systems/enemySystem.js?v=29';

// Entities
import { Player } from './entities/player.js?v=29';
import { Enemy } from './entities/enemy.js?v=29';
import { Bullet } from './entities/bullet.js?v=29';
import { Food } from './entities/food.js?v=29';
import { Particle } from './entities/particle.js?v=29';

function initGame() {
    window.zoomLevel = 1.0;
    const canvas = document.getElementById('gameCanvas');
    const engine = new Engine(canvas);
    
    // Initialize Camera
    engine.camera = new Camera(engine.width, engine.height);

    // Register Entity Pools
    engine.entityManager.registerPool('player', () => new Player(), 1);
    engine.entityManager.registerPool('enemy', () => new Enemy(), 100);
    engine.entityManager.registerPool('bullet', () => new Bullet(), 100);
    engine.entityManager.registerPool('food', () => new Food(), 100);
    engine.entityManager.registerPool('particle', () => new Particle(), 200);

    // 3. Register Systems with correct phase ordering
    const inputSystem = new InputSystem();
    const stateSystem = new StateSystem(engine);
    engine.stateSystem = stateSystem; // Accessible by DOM listeners
    const audioSystem = new AudioSystem();
    engine.audioSystem = audioSystem; // Globally accessible
    const effectSystem = new EffectSystem();
    const renderSystem = new RenderSystem(canvas, engine.camera);
    
    // LOGIC Phase Order
    engine.systemManager.addSystem(inputSystem, 'logic');
    engine.systemManager.addSystem(stateSystem, 'logic'); // Transition state next
    engine.systemManager.addSystem(new PlayerSystem(), 'logic');
    engine.systemManager.addSystem(new EnemySystem(), 'logic');
    engine.systemManager.addSystem(new SpawnSystem(), 'logic');
    engine.systemManager.addSystem(new MovementSystem(), 'logic');
    engine.systemManager.addSystem(new CollisionSystem(), 'logic');
    engine.systemManager.addSystem(effectSystem, 'logic');
    engine.systemManager.addSystem(audioSystem, 'logic');

    // RENDER Phase Order
    engine.systemManager.addSystem(renderSystem, 'render'); // Draws world first
    engine.systemManager.addSystem(stateSystem, 'render');  // Draws HUD/Menu on top
    
    window.gameEngine = engine;
    
    // Global click to resume audio
    document.addEventListener('click', () => {
        if (audioSystem.ctx.state === 'suspended') {
            audioSystem.ctx.resume();
        }
    }, { once: true });

    engine.start();
}

// Execute immediately since type="module" guarantees DOM is parsed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
