export class Entity {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 0;
        this.color = '#fff';
        this.active = false;
        this.isMarkedForRemoval = false;
        this.type = 'unknown';
    }

    init(x, y, ...args) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.isMarkedForRemoval = false;
    }

    reset() {
        this.active = false;
        this.isMarkedForRemoval = false;
    }

    update(deltaTime) {
        // To be overridden by specific entities if needed, 
        // though logic should preferably be in Systems.
    }

    draw(ctx) {
        // To be overridden by RenderSystem or entities.
    }
}
