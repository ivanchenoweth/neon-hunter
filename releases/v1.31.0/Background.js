class Background {
    constructor(game, seed = 12345) {
        this.game = game;
        this.seed = seed;
        this.starCount = 400; // Increased density
        this.stars = [];
        this.createStars();

        // Pre-render grid pattern
        this.gridSize = 100;
        this.gridPattern = this.createGridPattern();
    }

    // Simple seeded random generator (LCG)
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    createStars() {
        const rng = () => this.seededRandom();

        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: (rng() - 0.5) * (this.game.worldWidth + 2000),
                y: (rng() - 0.5) * (this.game.worldHeight + 2000),
                size: rng() * 2 + 0.5,
                alpha: rng()
            });
        }

        this.celestialObjects = [];
        const objectCount = 20; // Increased count
        const types = ['planet', 'comet', 'comet', 'galaxy']; // Doubled comet ratio

        for (let i = 0; i < objectCount; i++) {
            const type = types[Math.floor(rng() * types.length)];
            const obj = {
                type: type,
                x: (rng() - 0.5) * (this.game.worldWidth + 1500),
                y: (rng() - 0.5) * (this.game.worldHeight + 1500),
                size: 30 + rng() * 50,
                color: `hsl(${rng() * 360}, 40%, 50%)`,
                alpha: 0.2 + rng() * 0.3
            };

            if (type === 'planet') {
                obj.hasRing = true; // All planets are now Saturn-like
                obj.ringColor = `hsla(${rng() * 360}, 40%, 70%, 0.3)`;
                obj.ringAngle = rng() * Math.PI;
            } else if (type === 'comet') {
                obj.angle = rng() * Math.PI * 2;
                obj.tailLength = 60 + rng() * 100;
            } else if (type === 'galaxy') {
                obj.rotation = rng() * Math.PI * 2;
                obj.arms = 2 + Math.floor(rng() * 3);
                obj.points = [];
                for (let arm = 0; arm < obj.arms; arm++) {
                    const armOffset = (arm / obj.arms) * Math.PI * 2;
                    for (let j = 0; j < 30; j++) {
                        const ratio = j / 30;
                        const r = ratio * obj.size;
                        const a = ratio * Math.PI * 3 + armOffset;
                        // Add some variance to points
                        const dx = (rng() - 0.5) * 5;
                        const dy = (rng() - 0.5) * 5;
                        obj.points.push({
                            x: Math.cos(a) * r + dx,
                            y: Math.sin(a) * r + dy,
                            size: rng() * 1.5 + 0.5
                        });
                    }
                }
            }
            this.celestialObjects.push(obj);
        }
    }

    createGridPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.gridSize;
        canvas.height = this.gridSize;
        const ctx = canvas.getContext('2d');

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.gridSize, 0);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.gridSize);
        ctx.stroke();

        return ctx.createPattern(canvas, 'repeat');
    }

    draw(ctx) {
        ctx.save();
        // Since ctx is already translated by -camera.x, -camera.y in Game.js
        // We just need to fill the current camera viewport in world space.
        const camX = this.game.camera.x;
        const camY = this.game.camera.y;
        const viewW = this.game.width / this.game.camera.zoom;
        const viewH = this.game.height / this.game.camera.zoom;

        // Draw grid using pattern
        ctx.fillStyle = this.gridPattern;
        // The pattern handles its own tiling, but we must specify the world-coordinates to fill
        ctx.fillRect(camX, camY, viewW, viewH);

        // Draw stars
        ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            if (
                star.x >= camX &&
                star.x <= camX + viewW &&
                star.y >= camY &&
                star.y <= camY + viewH
            ) {
                ctx.globalAlpha = star.alpha;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        });

        // Draw celestial objects
        this.celestialObjects.forEach(obj => {
            const margin = obj.size * 2;
            if (
                obj.x >= camX - margin &&
                obj.x <= camX + viewW + margin &&
                obj.y >= camY - margin &&
                obj.y <= camY + viewH + margin
            ) {
                ctx.save();
                ctx.globalAlpha = obj.alpha;
                ctx.translate(obj.x, obj.y);

                if (obj.type === 'planet') {
                    // Body
                    ctx.fillStyle = obj.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Shadow (darker side)
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.beginPath();
                    ctx.arc(obj.size * 0.1, obj.size * 0.1, obj.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Rings (Saturn-like)
                    ctx.strokeStyle = obj.ringColor;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, obj.size * 1.3, obj.size * 0.4, obj.ringAngle, 0, Math.PI * 2);
                    ctx.stroke();
                    // Second ring line for detail
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, obj.size * 1.1, obj.size * 0.35, obj.ringAngle, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (obj.type === 'comet') {
                    ctx.rotate(obj.angle);
                    // Tail
                    const grad = ctx.createLinearGradient(0, 0, -obj.tailLength, 0);
                    grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(0, -3);
                    ctx.lineTo(-obj.tailLength, 0);
                    ctx.lineTo(0, 3);
                    ctx.fill();
                    // Head
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (obj.type === 'galaxy') {
                    ctx.rotate(obj.rotation);
                    ctx.fillStyle = obj.color;
                    obj.points.forEach(p => {
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    });
                    // Center core glow
                    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, obj.size / 2);
                    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = coreGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        });
        ctx.restore();
    }
}
