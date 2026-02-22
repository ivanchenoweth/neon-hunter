class Camera {
    constructor(width, height, zoom = 1) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = zoom;
        this.shakePower = 0;
        this.shakeTimer = 0;
    }

    shake(power, duration) {
        this.shakePower = power;
        this.shakeTimer = duration;
    }

    follow(target, deltaTime) {
        let x = target.x - (this.width / this.zoom) / 2;
        let y = target.y - (this.height / this.zoom) / 2;

        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            const offsetX = (Math.random() - 0.5) * this.shakePower * 2;
            const offsetY = (Math.random() - 0.5) * this.shakePower * 2;
            x += offsetX;
            y += offsetY;
        }

        this.x = x;
        this.y = y;
    }
}
