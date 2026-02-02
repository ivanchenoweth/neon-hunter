class Loot {
    static Types = {
        COIN: 'coin',
        HEART: 'heart',
        SHIELD: 'shield',
        RAPID: 'rapid',
        TRIPLE: 'triple',
        BOMB: 'bomb'
    };

    static sprites = {};

    constructor(game, x, y, type = Loot.Types.COIN) {
        this.game = game;
        if (!Loot.sprites[type]) Loot.createSprites();
        this.reset(game, x, y, type);
    }

    static createSprites() {
        const types = Object.values(Loot.Types);
        const colors = {
            'coin': '#ffff00',
            'heart': '#ff4444',
            'shield': '#00d4ff',
            'rapid': '#ff8800',
            'triple': '#ff00ff',
            'bomb': '#ffffff'
        };

        types.forEach(type => {
            const canvas = document.createElement('canvas');
            canvas.width = 30;
            canvas.height = 30;
            const ctx = canvas.getContext('2d');
            const color = colors[type];
            const r = 10;
            const cx = 15;
            const cy = 15;

            ctx.fillStyle = color;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;

            if (type === Loot.Types.HEART) {
                ctx.beginPath();
                ctx.moveTo(cx, cy + r);
                ctx.bezierCurveTo(cx - r, cy, cx - r, cy - r, cx, cy - r / 2);
                ctx.bezierCurveTo(cx + r, cy - r, cx + r, cy, cx, cy + r);
                ctx.fill();
            } else if (type === Loot.Types.SHIELD) {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (type === Loot.Types.RAPID) {
                // Square for rapid
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
                ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
            } else if (type === Loot.Types.TRIPLE) {
                // Triangle for triple
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx - r, cy + r);
                ctx.lineTo(cx + r, cy + r);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (type === Loot.Types.BOMB) {
                // Star shape for bomb
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    const dist = i % 2 === 0 ? r : r / 2;
                    ctx.lineTo(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            Loot.sprites[type] = canvas;
        });
    }

    reset(game, x, y, type = Loot.Types.COIN) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 8;
        this.markedForDeletion = false;
        this.isCaptured = false;
        this.alpha = 1;
        this.angle = 0;

        switch (this.type) {
            case Loot.Types.HEART:
                this.color = '#ff4444';
                break;
            case Loot.Types.SHIELD:
                this.color = '#00d4ff';
                break;
            case Loot.Types.RAPID:
                this.color = '#ff8800'; // Orange
                break;
            case Loot.Types.TRIPLE:
                this.color = '#ff00ff'; // Purple/Magenta
                break;
            case Loot.Types.BOMB:
                this.color = '#ffffff'; // White
                break;
            default:
                this.color = '#ffff00';
        }
    }

    updateState(deltaTime) {
        if (this.isCaptured) {
            this.radius += deltaTime * 0.05;
            this.alpha -= deltaTime * 0.003;
            if (this.alpha <= 0) this.markedForDeletion = true;
            return;
        }

        // Magnetism to player if close
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
            this.x += (dx / dist) * 300 * (deltaTime / 1000);
            this.y += (dy / dist) * 300 * (deltaTime / 1000);
        }

        this.angle += deltaTime * 0.005;
    }

    draw(ctx) {
        ctx.save();
        if (this.isCaptured) ctx.globalAlpha = this.alpha;

        ctx.translate(this.x, this.y);

        const sprite = Loot.sprites[this.type];
        if (sprite) {
            if (this.type === Loot.Types.COIN) {
                // Spinning effect with scale
                ctx.scale(Math.cos(this.angle * 2), 1);
            } else {
                ctx.rotate(this.angle * 0.5);
            }
            ctx.drawImage(sprite, -15, -15);
        }

        ctx.restore();
    }
}
