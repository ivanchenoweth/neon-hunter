class InputHandler {
    constructor() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        // Respect input mode: default to 'keyboard' if not set
        const mode = window.inputMode || 'keyboard';
        this.mouse = { x: 0, y: 0 };
        this.mouseDown = false;

        if (mode === 'keyboard') {
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));

            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
            window.addEventListener('mousedown', () => this.mouseDown = true);
            window.addEventListener('mouseup', () => this.mouseDown = false);
        }

        // Virtual joysticks (multitouch)
        this.joystickLeft = { x: 0, y: 0, active: false };
        this.joystickRight = { x: 0, y: 0, active: false };
        this._startJoystickPoll();
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
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
