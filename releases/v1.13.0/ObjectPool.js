class ObjectPool {
    constructor(factoryFunc, initialSize = 10) {
        this.factory = factoryFunc;
        this.pool = [];

        // Pre-fill pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    get(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            // Expansion if pool is empty
            obj = this.factory();
        }

        // Initialize object
        if (obj.reset) {
            obj.reset(...args);
        }

        return obj;
    }

    release(obj) {
        this.pool.push(obj);
    }
}
