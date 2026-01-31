class VirtualControls {
    constructor() {
        this.maxRadius = 70;
        this.inputMode = 'keyboard';

        this.left = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            x: 0,
            y: 0,
            placeholderX: 0,
            placeholderY: 0
        };

        this.right = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            x: 0,
            y: 0,
            placeholderX: 0,
            placeholderY: 0
        };

        this.beam = {
            active: false,
            touchId: null,
            rect: { x: 0, y: 0, w: 0, h: 0 }
        };

        this._bindEvents();
        this._updateLayout();
        window.addEventListener('resize', () => this._updateLayout());
        window.addEventListener('inputModeChanged', () => {
            this.inputMode = window.inputMode || 'keyboard';
        });

        // Expose to global for InputHandler and Game
        window.virtualControls = this;
    }

    _updateLayout() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Define Beam area: top-right 50% width, 40% height
        this.beam.rect = {
            x: w / 2,
            y: 0,
            w: w / 2,
            h: h * 0.4
        };

        // Static placeholder positions for joysticks
        const margin = 80;
        this.left.placeholderX = margin + this.maxRadius;
        this.left.placeholderY = h - margin - this.maxRadius;

        this.right.placeholderX = w - margin - this.maxRadius;
        this.right.placeholderY = h - margin - this.maxRadius;
    }

    _bindEvents() {
        window.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        window.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
    }

    _onTouchStart(e) {
        if (this.inputMode !== 'touch') return;

        // Deactivate controls if not in playing state (allows clicking menu buttons)
        if (window.game && window.game.gameState !== window.game.states.PLAYING) return;

        let handled = false;
        const h = window.innerHeight;
        const w = window.innerWidth;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const tx = t.clientX;
            const ty = t.clientY;

            // 1. Check Beam Button Area
            const br = this.beam.rect;
            if (tx >= br.x && ty <= br.h) {
                if (this.beam.touchId === null) {
                    this.beam.touchId = t.identifier;
                    this.beam.active = true;
                    if (window.game && window.game.input) window.game.input.virtualBeamButton = true;
                }
                handled = true;
                continue;
            }

            // 2. Check Joysticks - Limit hit area to bottom 60% of screen to avoid menu buttons
            if (ty > h * 0.4) {
                const side = tx < w / 2 ? 'left' : 'right';
                const joy = this[side];

                if (joy.touchId === null) {
                    joy.touchId = t.identifier;
                    joy.active = true;
                    joy.baseX = tx;
                    joy.baseY = ty;
                    joy.x = 0;
                    joy.y = 0;
                    handled = true;
                }
            }
        }

        // Only preventDefault if we are using the virtual controls
        // This allows 'mousedown' events to still reach the canvas for menu buttons
        if (handled) e.preventDefault();
    }

    _onTouchMove(e) {
        if (this.inputMode !== 'touch') return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];

            // Handle joysticks
            ['left', 'right'].forEach(side => {
                const joy = this[side];
                if (joy.touchId === t.identifier) {
                    const dx = t.clientX - joy.baseX;
                    const dy = t.clientY - joy.baseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const clamped = dist > this.maxRadius ? this.maxRadius / dist : 1;

                    joy.x = (dx * clamped) / this.maxRadius;
                    joy.y = (dy * clamped) / this.maxRadius;
                }
            });
        }
        e.preventDefault();
    }

    _onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const id = t.identifier;

            if (this.beam.touchId === id) {
                this.beam.touchId = null;
                this.beam.active = false;
                if (window.game && window.game.input) window.game.input.virtualBeamButton = false;
            }

            ['left', 'right'].forEach(side => {
                const joy = this[side];
                if (joy.touchId === id) {
                    joy.touchId = null;
                    joy.active = false;
                    joy.x = 0;
                    joy.y = 0;
                }
            });
        }
    }
}

// Initialize Logic
window.addEventListener('load', () => {
    new VirtualControls();
});
