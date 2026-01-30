class InputHandler {
    constructor() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            i: false,
            j: false,
            l: false,
            k: false,
            p: false,
            space: false,
            enter: false,
            arrowleft: false,
            arrowdown: false,
            arrowup: false,
            arrowright: false
        };

        this.mouse = { x: 0, y: 0 };
        this.mouseDown = false;

        // Binding methods
        this._onKeyDown = this.handleKeyDown.bind(this);
        this._onKeyUp = this.handleKeyUp.bind(this);
        this._onMouseMove = (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        };
        this._onMouseDown = () => this.mouseDown = true;
        this._onMouseUp = () => this.mouseDown = false;

        // Virtual joysticks (multitouch)
        this.joystickLeft = { x: 0, y: 0, active: false };
        this.joystickRight = { x: 0, y: 0, active: false };

        // Setup listeners based on current mode
        this.setupListeners();

        // Re-setup when mode changes
        window.addEventListener('inputModeChanged', () => {
            console.log('Input mode changed, re-setting listeners');
            this.setupListeners();
        });

        this._startJoystickPoll();
    }

    setupListeners() {
        // Remove existing to avoid duplicates
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);

        const mode = window.inputMode || 'keyboard';

        if (mode === 'keyboard' || mode === 'keyboardFire') {
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);

            if (mode === 'keyboard') {
                window.addEventListener('mousemove', this._onMouseMove);
                window.addEventListener('mousedown', this._onMouseDown);
                window.addEventListener('mouseup', this._onMouseUp);
            }
        }
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
        if (e.code === 'Space') {
            this.keys.space = true;
        }
        if (e.code === 'Enter') {
            this.keys.enter = true;
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
        if (e.code === 'Space') {
            this.keys.space = false;
        }
        if (e.code === 'Enter') {
            this.keys.enter = false;
        }
    }

    _startJoystickPoll() {
        const poll = () => {
            if (window.virtualJoysticks) {
                const l = window.virtualJoysticks.left;
                const r = window.virtualJoysticks.right;
                this.joystickLeft.x = l ? l.x : 0;
                this.joystickLeft.y = l ? l.y : 0;
                this.joystickLeft.active = l ? l.isActive() : false;
                this.joystickRight.x = r ? r.x : 0;
                this.joystickRight.y = r ? r.y : 0;
                this.joystickRight.active = r ? r.isActive() : false;
                // Map right joystick to aiming/shooting only if input mode is touch
                const deadzone = 0.15;
                const modeNow = window.inputMode || 'keyboard';
                if (modeNow === 'touch') {
                    if (this.joystickRight.active && (Math.abs(this.joystickRight.x) > deadzone || Math.abs(this.joystickRight.y) > deadzone)) {
                        const aimDist = 300; // distance from center in px for aiming target
                        this.mouse.x = (window.innerWidth / 2) + this.joystickRight.x * aimDist;
                        this.mouse.y = (window.innerHeight / 2) + this.joystickRight.y * aimDist;
                        this.mouseDown = true;
                    } else {
                        this.mouseDown = false;
                    }
                }
            }
            requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
    }
}
