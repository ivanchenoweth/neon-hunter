export class SpatialGrid {
    constructor(worldWidth, worldHeight, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        this.grid = new Map();
        
        // Offset to handle centered coordinates
        this.offsetX = worldWidth / 2;
        this.offsetY = worldHeight / 2;
    }

    clear() {
        this.grid.clear();
    }

    _getKey(x, y) {
        const col = Math.floor((x + this.offsetX) / this.cellSize);
        const row = Math.floor((y + this.offsetY) / this.cellSize);
        return `${col},${row}`;
    }

    insert(entity) {
        const key = this._getKey(entity.x, entity.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(entity);
    }

    getNearby(entity) {
        const nearby = [];
        const gx = Math.floor((entity.x + this.offsetX) / this.cellSize);
        const gy = Math.floor((entity.y + this.offsetY) / this.cellSize);

        for (let x = gx - 1; x <= gx + 1; x++) {
            for (let y = gy - 1; y <= gy + 1; y++) {
                const key = `${x},${y}`;
                const cell = this.grid.get(key);
                if (cell) {
                    nearby.push(...cell);
                }
            }
        }
        return nearby;
    }
}
