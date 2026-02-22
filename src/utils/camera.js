export class Camera {
    constructor(width, height, zoom = 1) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = zoom;
        this.target = null;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
    }

    follow(target) {
        this.target = target;
    }

    update(deltaTime) {
        if (this.target) {
            let targetX = this.target.x - (this.width / 2) / this.zoom;
            let targetY = this.target.y - (this.height / 2) / this.zoom;

            // Clamp target to world boundaries
            const halfW = 4000 / 2; // WORLD_WIDTH
            const halfH = 4000 / 2; // WORLD_HEIGHT
            const viewW = (this.width / this.zoom);
            const viewH = (this.height / this.zoom);

            const minX = -halfW;
            const maxX = halfW - viewW;
            const minY = -halfH;
            const maxY = halfH - viewH;

            targetX = Math.max(minX, Math.min(maxX, targetX));
            targetY = Math.max(minY, Math.min(maxY, targetY));

            // Smoothly interpolate to target (Lerp - Framerate Independent)
            // A higher smoothing factor means a tighter follow. 
            // 0.08 was the original value at ~60fps (16.6ms).
            const smoothing = 0.12;
            const lerpFactor = 1 - Math.pow(1 - smoothing, deltaTime / 16.6);

            this.x += (targetX - this.x) * lerpFactor;
            this.y += (targetY - this.y) * lerpFactor;
        }

        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            if (this.shakeDuration <= 0) {
                this.shakeIntensity = 0;
            }
        }
    }

    snapTo(target) {
        if (target) {
            this.x = target.x - (this.width / 2) / this.zoom;
            this.y = target.y - (this.height / 2) / this.zoom;

            // Clamp (using hardcoded 4000 for now as it's consistent in this file)
            const halfW = 2000;
            const halfH = 2000;
            const viewW = (this.width / this.zoom);
            const viewH = (this.height / this.zoom);
            this.x = Math.max(-halfW, Math.min(halfW - viewW, this.x));
            this.y = Math.max(-halfH, Math.min(halfH - viewH, this.y));
        }
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    apply(ctx) {
        ctx.save();
        ctx.scale(this.zoom, this.zoom);

        let offsetX = 0;
        let offsetY = 0;

        if (this.shakeDuration > 0) {
            offsetX = (Math.random() - 0.5) * this.shakeIntensity;
            offsetY = (Math.random() - 0.5) * this.shakeIntensity;
        }

        ctx.translate(-this.x + offsetX, -this.y + offsetY);
    }

    restore(ctx) {
        ctx.restore();
    }
}
