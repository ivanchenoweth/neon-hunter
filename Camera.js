class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.shakePower = 0;
        this.shakeTimer = 0;
    }

    shake(power, duration) {
        this.shakePower = power;
        this.shakeTimer = duration;
    }

    follow(target, deltaTime) {
        let x = target.x - this.width / 2;
        let y = target.y - this.height / 2;

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
