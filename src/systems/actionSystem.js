export class ActionSystem {
    constructor() {
        this.actions = {
            moveDir: { x: 0, y: 0 },
            aimDir: { x: 0, y: 0 },
            isShooting: false,
            isChargingBeam: false
        };
        this.history = [];
    }

    update(deltaTime, worldState) {
        const { input, engine } = worldState;
        if (!engine || !engine.player) return;

        // Translate Raw Input to Actions
        this.processInput(input, worldState);

        // Expose current actions to worldState for other systems to consume
        worldState.actions = this.actions;

        // Potential: Push to history for time-travel/multiplayer recording
        // this.history.push({ t: engine.warpTimer, a: { ...this.actions } });
    }

    processInput(input, worldState) {
        const { engine } = worldState;

        // 1. Movement Action
        let mx = 0, my = 0;
        if (input.joystickLeft && input.joystickLeft.active) {
            mx = input.joystickLeft.x;
            my = input.joystickLeft.y;
        } else {
            if (input.keys.w) my -= 1;
            if (input.keys.s) my += 1;
            if (input.keys.a) mx -= 1;
            if (input.keys.d) mx += 1;
        }
        this.actions.moveDir.x = mx;
        this.actions.moveDir.y = my;

        // 2. Aim Action (Simplified for decoupling)
        if (input.joystickRight && input.joystickRight.active) {
            this.actions.aimDir.x = input.joystickRight.x;
            this.actions.aimDir.y = input.joystickRight.y;
        } else {
            // Mouse aim is handled in PlayerSystem for now to keep things simple, 
            // but we could move it here later.
        }

        // 3. Shooting / Beam State Actions
        this.actions.isShooting = input.leftMouseDown || input.keys[' '] || (input.joystickRight && input.joystickRight.active);
        this.actions.isChargingBeam = input.keys[' '] || input.rightMouseDown || input.virtualBeamButton;
    }
}
