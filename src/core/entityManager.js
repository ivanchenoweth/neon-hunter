export class EntityManager {
    constructor() {
        this.entities = [];
        this.entitiesByType = new Map(); // Fast lookup categorized by type
        this.pools = new Map();
    }

    _getGroup(type) {
        if (!this.entitiesByType.has(type)) {
            this.entitiesByType.set(type, []);
        }
        return this.entitiesByType.get(type);
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
        this.entitiesByType.set(type, []);
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
        entity.active = true;
        entity.isMarkedForRemoval = false;

        pool.busy.push(entity);
        this.entities.push(entity);
        this._getGroup(type).push(entity);

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
            // Remove from categorized list
            const group = this.entitiesByType.get(type);
            if (group) {
                const gIdx = group.indexOf(entity);
                if (gIdx !== -1) group.splice(gIdx, 1);
            }

            // Remove from busy pool
            const bIdx = pool.busy.indexOf(entity);
            if (bIdx !== -1) pool.busy.splice(bIdx, 1);

            entity.reset();
            pool.available.push(entity);
        }
    }

    getEntitiesByType(type) {
        return this.entitiesByType.get(type) || [];
    }

    clear() {
        // Create a copy to avoid mutation issues during release
        const all = [...this.entities];
        all.forEach(entity => this.release(entity));
        this.entities = [];
        this.entitiesByType.forEach(arr => arr.length = 0);
    }
}
