export class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.3;
    }

    resume() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playShoot() {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(this.masterVolume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playExplosion() {
        this.resume();
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playDamage() {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playCollect(count = 1) {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // count goes from 1 to 5.
        // Base freq increases from 800 to 1600
        const baseFreq = 600 + (count * 200);
        const targetFreq = baseFreq * 1.5;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(this.masterVolume * 0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExtraLife() {
        this.resume();
        const now = this.ctx.currentTime;
        const duration = 0.4;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Robotron-style rapid frequency arpeggio
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.05);
        osc.frequency.setValueAtTime(880, now + 0.1);
        osc.frequency.setValueAtTime(1320, now + 0.15);
        osc.frequency.setValueAtTime(1760, now + 0.2);
        osc.frequency.setValueAtTime(2640, now + 0.25);

        gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start();
        osc.stop(now + duration);
    }

    playLaserCharge(duration = 1.5) {
        this.resume();
        this.stopLaserCharge(); // Stop any existing charge sound

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        filter.type = 'lowpass';

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Sweep frequency: 110Hz to 1760Hz
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + duration);

        // Open filter for "growing" brightness
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(5000, now + duration);

        // Volume envelope: slight fade in
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.1);

        osc.start(now);

        this.chargeOsc = osc;
        this.chargeGain = gain;
    }

    stopLaserCharge() {
        if (this.chargeOsc) {
            const now = this.ctx.currentTime;
            const osc = this.chargeOsc;
            const gain = this.chargeGain;

            // Fast fade out to avoid clicks
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.stop(now + 0.1);
            this.chargeOsc = null;
            this.chargeGain = null;
        }
    }

    update(deltaTime, worldState) {
        // Expose system to worldState
        worldState.audioSystem = this;
    }
}
