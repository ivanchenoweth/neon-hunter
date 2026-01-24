class VirtualJoystickManager {
    constructor() {
        this.maxRadius = 60; // pixels
        this.left = this._createJoystick('left');
        this.right = this._createJoystick('right');
        this._bindEvents();
        window.virtualJoysticks = { left: this.left.api, right: this.right.api };
        // React to input mode changes (main.js sets window.inputMode)
        this._updatePlaceholders();
        window.addEventListener('inputModeChanged', () => this._updatePlaceholders());
        window.addEventListener('resize', () => this._updatePlaceholders());
        // Sizes responsive to device viewport
        this._updateSizes();
        window.addEventListener('resize', () => this._updateSizes());
    }

    _createJoystick(side) {
        const container = document.createElement('div');
        container.className = `vj-container vj-${side}`;
        const bg = document.createElement('div');
        bg.className = 'vj-bg';
        const knob = document.createElement('div');
        knob.className = 'vj-knob';
        container.appendChild(bg);
        container.appendChild(knob);
        document.body.appendChild(container);

        const state = {
            touchId: null,
            baseX: 0,
            baseY: 0,
            x: 0,
            y: 0,
            active: false,
        };

        const api = {
            get x() { return state.x; },
            get y() { return state.y; },
            isActive: () => state.active
        };

        // initial inline sizing will be set by _updateSizes
        container.style.position = 'absolute';
        container.style.display = 'none';

        return { side, container, bg, knob, state, api };
    }

    _updateSizes() {
        // Compute maxRadius relative to device viewport (about 9% of smaller side)
        const base = Math.min(window.innerWidth, window.innerHeight || 600);
        const computedRadius = Math.round(base * 0.09);
        // Clamp to reasonable values
        this.maxRadius = Math.max(36, Math.min(110, computedRadius));

        const knobSize = Math.round(this.maxRadius * 0.6);
        const containerSize = this.maxRadius * 2;

        [this.left, this.right].forEach(j => {
            j.container.style.width = containerSize + 'px';
            j.container.style.height = containerSize + 'px';
            j.bg.style.width = '100%';
            j.bg.style.height = '100%';
            j.knob.style.width = knobSize + 'px';
            j.knob.style.height = knobSize + 'px';
            j.knob.style.marginLeft = -(knobSize / 2) + 'px';
            j.knob.style.marginTop = -(knobSize / 2) + 'px';
        });
        // Update placeholders positions after resizing
        this._updatePlaceholders();
    }

    _bindEvents() {
        window.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        window.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
        window.addEventListener('resize', () => this._hideAll());
    }

    _onTouchStart(e) {
        // Ignore touches if player selected keyboard mode
        if (window.inputMode && window.inputMode !== 'touch') return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const side = t.clientX < window.innerWidth / 2 ? 'left' : 'right';
            const joy = side === 'left' ? this.left : this.right;
            if (joy.state.touchId === null) {
                joy.state.touchId = t.identifier;
                joy.state.baseX = t.clientX;
                joy.state.baseY = t.clientY;
                joy.state.active = true;
                joy.state.x = 0;
                joy.state.y = 0;
                joy.container.style.display = 'block';
                joy.container.style.left = (joy.state.baseX - this.maxRadius) + 'px';
                joy.container.style.top = (joy.state.baseY - this.maxRadius) + 'px';
                joy.knob.style.transform = `translate(0px, 0px)`;
            }
        }
    }

    _updatePlaceholders() {
        const mode = window.inputMode || 'keyboard';
        // Show faint placeholders only for touch mode and when no active touch
        const showLeft = mode === 'touch' && this.left.state.touchId === null;
        const showRight = mode === 'touch' && this.right.state.touchId === null;

        if (showLeft) {
            const leftX = 20; // px from left
            const top = Math.max(20, window.innerHeight - (this.maxRadius * 2) - 20); // place near bottom
            this.left.container.style.display = 'block';
            this.left.container.style.left = leftX + 'px';
            this.left.container.style.top = top + 'px';
            this.left.bg.style.background = 'rgba(255,255,255,0.015)';
            this.left.bg.style.border = '1px dashed rgba(255,255,255,0.06)';
        } else if (!this.left.state.active) {
            this.left.container.style.display = 'none';
        }

        if (showRight) {
            const rightX = Math.max(20, window.innerWidth - (this.maxRadius * 2) - 20);
            const top = Math.max(20, window.innerHeight - (this.maxRadius * 2) - 20);
            this.right.container.style.display = 'block';
            this.right.container.style.left = rightX + 'px';
            this.right.container.style.top = top + 'px';
            this.right.bg.style.background = 'rgba(255,255,255,0.015)';
            this.right.bg.style.border = '1px dashed rgba(255,255,255,0.06)';
        } else if (!this.right.state.active) {
            this.right.container.style.display = 'none';
        }
    }

    _onTouchMove(e) {
        let handled = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const joy = this._findByTouchId(t.identifier);
            if (!joy) continue;
            handled = true;
            const dx = t.clientX - joy.state.baseX;
            const dy = t.clientY - joy.state.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxR = this.maxRadius;
            const clamped = dist > maxR ? maxR / dist : 1;
            const nx = dx * clamped / maxR;
            const ny = dy * clamped / maxR;
            joy.state.x = nx; // -1..1
            joy.state.y = ny; // -1..1
            const knobX = nx * maxR;
            const knobY = ny * maxR;
            joy.knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
        if (handled) e.preventDefault();
    }

    _onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const joy = this._findByTouchId(t.identifier);
            if (!joy) continue;
            joy.state.touchId = null;
            joy.state.active = false;
            joy.state.x = 0;
            joy.state.y = 0;
            joy.container.style.display = 'none';
            joy.knob.style.transform = `translate(0px, 0px)`;
        }
    }

    _findByTouchId(id) {
        if (this.left.state.touchId === id) return this.left;
        if (this.right.state.touchId === id) return this.right;
        return null;
    }

    _hideAll() {
        [this.left, this.right].forEach(j => {
            j.container.style.display = 'none';
            j.state.touchId = null;
            j.state.active = false;
            j.state.x = 0; j.state.y = 0;
        });
    }
}

// Inicializa al cargar el script
window.addEventListener('load', () => {
    try {
        new VirtualJoystickManager();
    } catch (e) {
        console.error('VirtualJoystick init error', e);
    }
});
