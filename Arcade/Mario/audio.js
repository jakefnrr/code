const AudioManager = {
    ctx: null,
    soundOn: true,
    musicOn: true,
    initialized: false,

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {
            console.warn('Web Audio not supported');
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(type) {
        if (!this.ctx || !this.soundOn) return;
        this.resume();
        const now = this.ctx.currentTime;
        try {
            switch(type) {
                case 'jump': this._playJump(now); break;
                case 'bigJump': this._playBigJump(now); break;
                case 'coin': this._playCoin(now); break;
                case 'blockHit': this._playBlockHit(now); break;
                case 'blockBreak': this._playBlockBreak(now); break;
                case 'powerUp': this._playPowerUp(now); break;
                case 'pipe': this._playPipe(now); break;
                case 'stomp': this._playStomp(now); break;
                case 'fireball': this._playFireball(now); break;
                case 'damage': this._playDamage(now); break;
                case 'death': this._playDeath(now); break;
                case 'checkpoint': this._playCheckpoint(now); break;
                case 'levelComplete': this._playLevelComplete(now); break;
                case 'worldComplete': this._playWorldComplete(now); break;
                case 'gameOver': this._playGameOver(now); break;
                case 'oneUp': this._playOneUp(now); break;
                case 'invincible': this._playInvincible(now); break;
                case 'bump': this._playBump(now); break;
                case 'timerWarn': this._playTimerWarn(now); break;
                case 'click': this._playClick(now); break;
                case 'star': this._playStar(now); break;
            }
        } catch(e) {}
    },

    _osc(freq, type, start, dur, gainVal) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(gainVal || 0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
    },

    _playJump(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    },

    _playBigJump(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.2);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    _playCoin(t) {
        this._osc(988, 'square', t, 0.07, 0.1);
        this._osc(1319, 'square', t + 0.07, 0.15, 0.1);
    },

    _playBlockHit(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    _playBlockBreak(t) {
        const bufSize = this.ctx.sampleRate * 0.15;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        src.buffer = buf;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(t);
    },

    _playPowerUp(t) {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.08, 0.12, 0.1);
        });
    },

    _playPipe(t) {
        this._osc(150, 'square', t, 0.15, 0.1);
        this._osc(100, 'square', t + 0.15, 0.15, 0.1);
    },

    _playStomp(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    _playFireball(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    _playDamage(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
    },

    _playDeath(t) {
        const notes = [494, 440, 392, 349, 330, 262];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.2, 0.25, 0.12);
        });
    },

    _playCheckpoint(t) {
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.07, 0.1, 0.08);
        });
    },

    _playLevelComplete(t) {
        const notes = [523, 587, 659, 784, 880, 1047];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.1, 0.2, 0.1);
        });
    },

    _playWorldComplete(t) {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((freq, i) => {
            this._osc(freq, 'triangle', t + i * 0.12, 0.3, 0.12);
        });
    },

    _playGameOver(t) {
        const notes = [392, 330, 262, 220, 175, 131];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.25, 0.3, 0.1);
        });
    },

    _playOneUp(t) {
        const notes = [330, 392, 523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.06, 0.1, 0.08);
        });
    },

    _playInvincible(t) {
        for (let i = 0; i < 6; i++) {
            this._osc(800 + i * 100, 'square', t + i * 0.05, 0.08, 0.06);
        }
    },

    _playBump(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    },

    _playTimerWarn(t) {
        this._osc(880, 'square', t, 0.05, 0.08);
        this._osc(880, 'square', t + 0.1, 0.05, 0.08);
    },

    _playClick(t) {
        this._osc(800, 'square', t, 0.03, 0.08);
    },

    _playStar(t) {
        const notes = [523, 659, 784, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this._osc(freq, 'square', t + i * 0.08, 0.1, 0.07);
        });
    },

    playStartup() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const notes = [
            [659, 0.15], [659, 0.15], [0, 0.05],
            [659, 0.15], [523, 0.15], [659, 0.15], [0, 0.05],
            [784, 0.3], [0, 0.1], [392, 0.3]
        ];
        let offset = 0;
        notes.forEach(([freq, dur]) => {
            if (freq > 0) {
                this._osc(freq, 'square', t + offset, dur, 0.12);
            }
            offset += dur;
        });
    }
};
