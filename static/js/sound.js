// Little synthesized sound effects shared by every page: no audio files, nothing loaded from elsewhere
const soundKey = 'memory-sound';

window.memorySound = (() => {
    let ctx = null;
    let master = null;
    let enabled = true;
    try {
        enabled = localStorage.getItem(soundKey) !== 'off';
    } catch {
        // Storage unavailable; sound stays on
    }

    // Browsers only allow audio after a tap or click, so the context is created on first use
    function audio() {
        if (!ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;
            ctx = new AudioContext();
            master = ctx.createGain();
            master.gain.value = 0.5;
            master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // One soft note: quick fade in, smooth fade out
    function tone(freq, delay, duration, { type = 'sine', volume = 0.2, slideTo } = {}) {
        const c = audio();
        if (!c) return;
        const start = c.currentTime + delay;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.05);
    }

    function play(fn) {
        if (enabled) fn();
    }

    return {
        get enabled() { return enabled; },
        toggle() {
            enabled = !enabled;
            try {
                localStorage.setItem(soundKey, enabled ? 'on' : 'off');
            } catch {
                // Storage unavailable; the choice lasts until the page closes
            }
            return enabled;
        },
        // Bright little jingle for starting a game
        start: () => play(() => {
            [659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.07, 0.22, { type: 'triangle', volume: 0.14 }));
            tone(1318.5, 0.2, 0.3, { volume: 0.1 });
        }),
        flip: () => play(() => tone(620, 0, 0.07, { type: 'triangle', volume: 0.12, slideTo: 900 })),
        // Chime that climbs a step with each match in a streak
        match: (streak) => play(() => {
            const base = 523.25 * Math.pow(2, Math.min(streak - 1, 5) * 2 / 12);
            tone(base, 0, 0.22, { volume: 0.18 });
            tone(base * 1.25, 0.07, 0.26, { volume: 0.15 });
            tone(base * 1.5, 0.14, 0.34, { volume: 0.13 });
        }),
        slip: () => play(() => tone(260, 0, 0.28, { volume: 0.16, slideTo: 150 })),
        win: () => play(() => {
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.11, 0.4, { type: 'triangle', volume: 0.16 }));
            tone(1318.5, 0.5, 0.7, { volume: 0.12 });
        })
    };
})();
