export class EntityManager {
    constructor() {
        this.entities = [];
        this.pools = new Map();
    }

    registerPool(type, factory, initialSize = 20) {
        const pool = {
            factory,
            available: [],
            busy: []
        };

        for (let i = 0; i < initialSize; i++) {
            pool.available.push(factory());
        }

        this.pools.set(type, pool);
    }

    get(type, x, y, ...args) {
        const pool = this.pools.get(type);
        if (!pool) {
            console.error(`No pool registered for type: ${type}`);
            return null;
        }

        let entity;
        if (pool.available.length > 0) {
            entity = pool.available.pop();
        } else {
            entity = pool.factory();
        }

        entity.init(x, y, ...args);
        entity.type = type;
        pool.busy.push(entity);
        this.entities.push(entity);

        return entity;
    }

    cleanup() {
        // Collect entities marked for removal
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity.isMarkedForRemoval || !entity.active) {
                this.entities.splice(i, 1);
                this.release(entity);
            }
        }
    }

    release(entity) {
        const type = entity.type;
        const pool = this.pools.get(type);
        if (pool) {
            const index = pool.busy.indexOf(entity);
            if (index !== -1) {
                pool.busy.splice(index, 1);
            }
            entity.reset();
            pool.available.push(entity);
        }
    }

    getEntitiesByType(type) {
        return this.entities.filter(e => e.type === type);
    }

    clear() {
        this.entities.forEach(entity => this.release(entity));
        this.entities = [];
    }
}
