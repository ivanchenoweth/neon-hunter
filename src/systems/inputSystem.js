export class InputSystem {
    constructor() {
        this.keys = {};
        this.updateDuringPause = true;
        this.mouse = { x: 0, y: 0 };
        this.leftMouseDown = false;
        this.rightMouseDown = false;
        
        // Virtual Controls State
        this.joystickLeft = { active: false, x: 0, y: 0, touchId: null, baseX: 0, baseY: 0 };
        this.joystickRight = { active: false, x: 0, y: 0, touchId: null, baseX: 0, baseY: 0 };
        this.virtualBeamButton = false;
        this.beamTouchId = null;
        
        this.maxRadius = 70;
        this.inputMode = window.inputMode || 'keyboard';
        this.clicks = [];

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.leftMouseDown = true;
            if (e.button === 2) this.rightMouseDown = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.leftMouseDown = false;
            if (e.button === 2) this.rightMouseDown = false;
        });
        window.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            // Record click for UI
            this.clicks.push({ x: e.clientX, y: e.clientY });
        });
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        window.addEventListener('inputModeChanged', () => {
            this.inputMode = window.inputMode;
        });
    }

    _onTouchStart(e) {
        if (this.inputMode !== 'touch') return;
        
        const h = window.innerHeight;
        const w = window.innerWidth;
        const beamRect = { x: w - 220, y: 20, w: 200, h: 200 };

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const tx = t.clientX;
            const ty = t.clientY;

            if (tx >= beamRect.x && tx <= beamRect.x + beamRect.w && ty >= beamRect.y && ty <= beamRect.y + beamRect.h) {
                if (this.beamTouchId === null) {
                    this.beamTouchId = t.identifier;
                    this.virtualBeamButton = true;
                }
                continue;
            }

            if (ty > h * 0.4) {
                const side = tx < w / 2 ? 'joystickLeft' : 'joystickRight';
                const joy = this[side];
                if (joy.touchId === null) {
                    joy.touchId = t.identifier;
                    joy.active = true;
                    joy.baseX = tx;
                    joy.baseY = ty;
                    joy.x = 0;
                    joy.y = 0;
                }
            }
        }
    }

    _onTouchMove(e) {
        if (this.inputMode !== 'touch') return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            ['joystickLeft', 'joystickRight'].forEach(side => {
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
            
            // Record touch end as click for UI if not a joystick gesture
            if (this.inputMode === 'touch' && !this.beamTouchId && !this.joystickLeft.touchId && !this.joystickRight.touchId) {
                 this.clicks.push({ x: t.clientX, y: t.clientY });
            }

            if (this.beamTouchId === t.identifier) {
                this.beamTouchId = null;
                this.virtualBeamButton = false;
            }
            ['joystickLeft', 'joystickRight'].forEach(side => {
                const joy = this[side];
                if (joy.touchId === t.identifier) {
                    joy.touchId = null;
                    joy.active = false;
                    joy.x = 0;
                    joy.y = 0;
                }
            });
        }
    }

    update(deltaTime, worldState) {
        worldState.input = {
            keys: this.keys,
            mouse: this.mouse,
            clicks: this.clicks,
            leftMouseDown: this.leftMouseDown,
            rightMouseDown: this.rightMouseDown,
            joystickLeft: this.joystickLeft,
            joystickRight: this.joystickRight,
            virtualBeamButton: this.virtualBeamButton
        };
        this.clicks = [];
    }
}
