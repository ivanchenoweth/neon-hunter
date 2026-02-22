import { CONFIG } from '../config/constants.js?v=29';

export class RenderSystem {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;

        this.stars = [];
        this._createStars();
        this.gridPattern = this._createGridPattern();

        // Bloom Buffer
        this.bloomScale = CONFIG.BLOOM_SCALE;
        this.bloomCanvas = document.createElement('canvas');
        this.bloomCtx = this.bloomCanvas.getContext('2d', { alpha: true });
        this.blurCanvas = document.createElement('canvas');
        this.blurCtx = this.blurCanvas.getContext('2d', { alpha: true });
        
        this.handleResize();
    }

    _createStars() {
        for (let i = 0; i < 400; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * (CONFIG.WORLD_WIDTH + 2000),
                y: (Math.random() - 0.5) * (CONFIG.WORLD_HEIGHT + 2000),
                size: Math.random() * 2 + 0.5,
                alpha: Math.random()
            });
        }
    }

    _createGridPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(100, 0);
        ctx.moveTo(0, 0); ctx.lineTo(0, 100);
        ctx.stroke();
        return ctx.createPattern(canvas, 'repeat');
    }

    resize(width, height) {
        this.bloomCanvas.width = width * this.bloomScale;
        this.bloomCanvas.height = height * this.bloomScale;
        this.blurCanvas.width = this.bloomCanvas.width;
        this.blurCanvas.height = this.bloomCanvas.height;
    }

    handleResize() {
        this.resize(this.canvas.width, this.canvas.height);
    }

    render(worldState) {
        const { ctx, entityManager, width, height } = worldState;

        // 1. Initial Clear
        ctx.fillStyle = '#0d0d12';
        ctx.fillRect(0, 0, width, height);

        // 2. Background Layer (World Space)
        this.camera.apply(ctx);
        this.drawBackground(ctx);
        this.camera.restore(ctx);

        // 3. Bloom / Emissive Pass (Drawing to offscreen)
        this.drawBloomPass(worldState);

        // 4. Main Entities (World Space)
        this.camera.apply(ctx);
        for (const entity of entityManager.entities) {
            if (entity.active && entity.draw) {
                // Special high-visibility for player if needed
                entity.draw(ctx);
            }
        }
        this.camera.restore(ctx);

        // 5. Composite Bloom
        this.compositeBloom(ctx, width, height);

        // 6. HUD Layer (Screen Space)
        // Handled by StateSystem or another devoted system
    }

    drawBackground(ctx) {
        const cam = this.camera;
        const viewW = this.canvas.width / cam.zoom;
        const viewH = this.canvas.height / cam.zoom;

        ctx.fillStyle = this.gridPattern;
        ctx.fillRect(cam.x, cam.y, viewW + 100, viewH + 100); // Small buffer

        // Draw World Boundaries
        const halfW = CONFIG.WORLD_WIDTH / 2;
        const halfH = CONFIG.WORLD_HEIGHT / 2;
        ctx.strokeStyle = CONFIG.COLORS.PLAYER;
        ctx.lineWidth = 5;
        ctx.strokeRect(-halfW, -halfH, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        
        // Add a secondary inner glow line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-halfW, -halfH, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        ctx.fillStyle = '#fff';
        for (const star of this.stars) {
            if (star.x >= cam.x && star.x <= cam.x + viewW && star.y >= cam.y && star.y <= cam.y + viewH) {
                ctx.globalAlpha = star.alpha;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
        }
        ctx.globalAlpha = 1;
    }

    drawBloomPass(worldState) {
        const { entityManager } = worldState;
        const bCtx = this.bloomCtx;
        
        // Safety check for 0x0 canvas which can cause some browsers to crash on drawImage later
        if (this.bloomCanvas.width === 0 || this.bloomCanvas.height === 0) return;

        bCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
        
        bCtx.save();
        bCtx.scale(this.bloomScale * this.camera.zoom, this.bloomScale * this.camera.zoom);
        bCtx.translate(-this.camera.x, -this.camera.y);

        for (const entity of entityManager.entities) {
            if (entity.active && (entity.type === 'bullet' || entity.type === 'player' || entity.type === 'particle')) {
                if (entity.draw) entity.draw(bCtx);
            }
        }
        bCtx.restore();
    }

    compositeBloom(ctx, width, height) {
        if (this.blurCanvas.width === 0 || this.blurCanvas.height === 0) return;

        // Blur
        this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
        try {
            this.blurCtx.filter = 'blur(4px)';
            this.blurCtx.drawImage(this.bloomCanvas, 0, 0);
        } catch (e) {
            // Filter might not be supported, just draw normally
            this.blurCtx.drawImage(this.bloomCanvas, 0, 0);
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.blurCanvas, 0, 0, width, height);
        ctx.restore();
    }
}
