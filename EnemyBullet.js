class EnemyBullet {
    static Types = {
        CIRCLE: 'circle',
        STAR: 'star'
    };

    constructor(game, x, y, angle) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 300;
        this.radius = 3;
        this.color = '#ff00ff';
        this.angle = angle;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.type = EnemyBullet.Types.CIRCLE;
        this.rotation = 0;

        if (!EnemyBullet.spriteCanvas) {
            EnemyBullet.spriteCanvas = document.createElement('canvas');
            EnemyBullet.spriteCanvas.width = 12;
            EnemyBullet.spriteCanvas.height = 12;
            const sCtx = EnemyBullet.spriteCanvas.getContext('2d');
            sCtx.fillStyle = '#fff';
            sCtx.beginPath();
            sCtx.arc(6, 6, 4, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.strokeStyle = '#ff00ff';
            sCtx.lineWidth = 2;
            sCtx.stroke();
        }
    }

    updateState(deltaTime) {
        this.x += this.dx * this.speed * (deltaTime / 1000);
        this.y += this.dy * this.speed * (deltaTime / 1000);

        if (this.type === EnemyBullet.Types.STAR) {
            this.rotation += 0.1;
        }

        // Remove if too far from camera
        const viewW = this.game.width / this.game.camera.zoom;
        const viewH = this.game.height / this.game.camera.zoom;
        const margin = 500;
        if (this.x < this.game.camera.x - margin ||
            this.x > this.game.camera.x + viewW + margin ||
            this.y < this.game.camera.y - margin ||
            this.y > this.game.camera.y + viewH + margin) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === EnemyBullet.Types.STAR) {
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.lineTo(this.radius * 2, 0);
                ctx.lineTo(this.radius * 0.5, this.radius * 0.5);
            }
            ctx.closePath();
            ctx.fill();

            // Core glow
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.drawImage(EnemyBullet.spriteCanvas, -6, -6);
        }
        ctx.restore();
    }

    reset(game, x, y, angle, speed = 300, color = '#ff00ff', type = EnemyBullet.Types.CIRCLE) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.type = type;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.markedForDeletion = false;
        this.radius = type === EnemyBullet.Types.STAR ? 6 : 3;
        this.rotation = Math.random() * Math.PI * 2;
    }
}
