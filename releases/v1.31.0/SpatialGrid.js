class SpatialGrid {
    constructor(worldWidth, worldHeight, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        this.buckets = new Map();

        // Offset to handle negative coordinates (centering)
        this.offsetX = worldWidth / 2;
        this.offsetY = worldHeight / 2;
    }

    clear() {
        this.buckets.clear();
    }

    getKey(x, y) {
        // Adjust coordinate by offset to map -worldWidth/2...worldWidth/2 to 0...worldWidth
        const adjX = x + this.offsetX;
        const adjY = y + this.offsetY;

        const col = Math.max(0, Math.min(this.cols - 1, Math.floor(adjX / this.cellSize)));
        const row = Math.max(0, Math.min(this.rows - 1, Math.floor(adjY / this.cellSize)));
        return `${col},${row}`;
    }

    insert(client) {
        const key = this.getKey(client.x, client.y);
        if (!this.buckets.has(key)) {
            this.buckets.set(key, []);
        }
        this.buckets.get(key).push(client);
    }

    retrieve(client, radius = 0) {
        return this.retrieveByBounds({
            x: client.x - radius,
            y: client.y - radius,
            width: radius * 2,
            height: radius * 2
        });
    }

    retrieveByBounds(rect) {
        const adjX = rect.x + this.offsetX;
        const adjY = rect.y + this.offsetY;
        const adjW = rect.width;
        const adjH = rect.height;

        const startCol = Math.max(0, Math.floor(adjX / this.cellSize));
        const startRow = Math.max(0, Math.floor(adjY / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((adjX + adjW) / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((adjY + adjH) / this.cellSize));

        let nearby = [];

        for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
                const key = `${col},${row}`;
                const bucket = this.buckets.get(key);
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) {
                        nearby.push(bucket[i]);
                    }
                }
            }
        }

        return nearby;
    }
}
