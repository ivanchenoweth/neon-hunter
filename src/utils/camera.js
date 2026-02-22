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

            // Smoothly interpolate to target (Lerp)
            const speed = 0.08; 
            this.x += (targetX - this.x) * speed;
            this.y += (targetY - this.y) * speed;
        }

        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            if (this.shakeDuration <= 0) {
                this.shakeIntensity = 0;
            }
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
