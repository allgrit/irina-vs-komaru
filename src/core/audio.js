// Синтез звука на Web Audio: жужжание комаров, удары, реакции Ирины, амбиент. Без файлов.

export function createAudio() {
  let ctx = null;
  let master = null;
  let enabled = true;
  let noiseBuf = null;
  const voices = new Map(); // id -> { osc, gain, pan, lfo }
  let vacuumNode = null;
  let ambient = null;

  function ensure() {
    if (ctx) return true;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function resume() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(v) {
    enabled = v;
    if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.05);
  }

  function env(gainNode, t0, a, peak, d, sustain = 0) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t0 + a + d);
  }

  function tone(freq, type, dur, peak = 0.3, opts = {}) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
    const g = ctx.createGain();
    env(g, t0, opts.attack ?? 0.005, peak, dur);
    osc.connect(g);
    g.connect(opts.dest || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, peak = 0.3, opts = {}) {
    if (!ensure()) return null;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1200, t0);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur);
    f.Q.value = opts.q || 0.8;
    const g = ctx.createGain();
    env(g, t0, opts.attack ?? 0.005, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
    return { src, g, f };
  }

  const sfx = {
    swat() {
      noise(0.12, 0.35, { freq: 900, freqEnd: 300, q: 1.2 });
    },
    clap(power = 1) {
      noise(0.18, 0.5 * power, { freq: 1600, freqEnd: 400, q: 0.7 });
      tone(180, 'sine', 0.12, 0.3 * power, { slide: 60 });
    },
    splat() {
      noise(0.09, 0.4, { freq: 500, freqEnd: 120, q: 2 });
      tone(220, 'triangle', 0.08, 0.25, { slide: 90 });
    },
    hit() {
      tone(500, 'square', 0.05, 0.12, { slide: 300 });
    },
    miss() {
      tone(140, 'sine', 0.1, 0.15, { slide: 90 });
    },
    swipe() {
      noise(0.25, 0.3, { freq: 600, freqEnd: 2500, q: 0.6, attack: 0.03 });
    },
    zap() {
      const f = 1500 + Math.random() * 1500;
      tone(f, 'square', 0.06, 0.18, { slide: f * 0.4 });
      noise(0.05, 0.25, { freq: 4000, q: 0.5 });
    },
    spray() {
      noise(0.6, 0.3, { freq: 5000, freqEnd: 3000, q: 0.5, attack: 0.02, filter: 'highpass' });
    },
    bite() {
      tone(330, 'sawtooth', 0.35, 0.3, { slide: 160, attack: 0.02 });
      tone(660, 'sine', 0.15, 0.2, { slide: 520, delay: 0.05 });
    },
    absorb() {
      tone(500, 'triangle', 0.2, 0.2, { slide: 900 });
    },
    lamp(on) {
      tone(on ? 1800 : 1200, 'square', 0.03, 0.12);
    },
    select() {
      tone(900, 'triangle', 0.05, 0.12);
    },
    denied() {
      tone(200, 'square', 0.08, 0.1);
    },
    chime() {
      [880, 1108, 1318].forEach((f, i) => tone(f, 'sine', 0.6, 0.2, { delay: i * 0.18, attack: 0.01 }));
    },
    perk() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', 0.35, 0.18, { delay: i * 0.09 }));
    },
    coin() {
      tone(1400, 'sine', 0.08, 0.15);
      tone(2100, 'sine', 0.12, 0.15, { delay: 0.07 });
    },
    heal() {
      [660, 880].forEach((f, i) => tone(f, 'sine', 0.25, 0.2, { delay: i * 0.1 }));
    },
    bossKill() {
      tone(90, 'sawtooth', 0.8, 0.5, { slide: 30 });
      noise(0.5, 0.5, { freq: 300, freqEnd: 60, q: 1 });
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 'triangle', 0.5, 0.2, { delay: i * 0.12 }));
    },
    lose() {
      [440, 370, 311, 220].forEach((f, i) => tone(f, 'sawtooth', 0.5, 0.18, { delay: i * 0.22 }));
    },
    gambler() {
      tone(1000, 'sine', 0.1, 0.15);
      tone(1000, 'sine', 0.1, 0.15, { delay: 0.12 });
    },
    stuck() {
      tone(700, 'square', 0.06, 0.1, { slide: 400 });
    },
  };

  /** Обновляет голоса жужжания под текущее положение комаров. near = [{id, x, y, dist, buzzing, big}]. */
  function updateBuzz(list, earX, worldW) {
    if (!ctx || !enabled) return;
    const keep = new Set();
    const t = ctx.currentTime;
    for (const m of list) {
      keep.add(m.id);
      let v = voices.get(m.id);
      if (!v) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 7 + Math.random() * 4;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 18;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 2400;
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        osc.connect(filt);
        filt.connect(gain);
        if (pan) {
          gain.connect(pan);
          pan.connect(master);
        } else gain.connect(master);
        osc.start();
        lfo.start();
        v = { osc, gain, pan, lfo };
        voices.set(m.id, v);
      }
      const base = m.big ? 240 : 430 + (m.id % 7) * 11;
      const prox = Math.max(0, 1 - m.dist / 420);
      v.osc.frequency.setTargetAtTime(base * (1 + prox * 0.35) * (m.buzzing ? 1.15 : 1), t, 0.05);
      const vol = (0.012 + prox * prox * 0.11) * (m.buzzing ? 1.6 : 1) * (m.quiet ? 0.5 : 1);
      v.gain.gain.setTargetAtTime(vol, t, 0.08);
      if (v.pan) v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, (m.x - earX) / (worldW * 0.6))), t, 0.1);
    }
    for (const [id, v] of voices) {
      if (!keep.has(id)) {
        v.gain.gain.setTargetAtTime(0.0001, t, 0.03);
        const dead = v;
        voices.delete(id);
        setTimeout(() => {
          try {
            dead.osc.stop();
            dead.lfo.stop();
          } catch {
            /* уже остановлен */
          }
        }, 150);
      }
    }
  }

  function setVacuum(on) {
    if (!ctx) return;
    if (on && !vacuumNode) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
      vacuumNode = { src, g };
    } else if (!on && vacuumNode) {
      const n = vacuumNode;
      vacuumNode = null;
      n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
      setTimeout(() => n.src.stop(), 300);
    }
  }

  function setAmbient(on) {
    if (!ensure()) return;
    if (on && !ambient) {
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const oscs = [55, 82.5, 110].map((f) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(g);
        o.start();
        return o;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start();
      g.connect(master);
      ambient = { g, oscs, lfo };
    } else if (!on && ambient) {
      const a = ambient;
      ambient = null;
      a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => {
        a.oscs.forEach((o) => o.stop());
        a.lfo.stop();
      }, 1500);
    }
  }

  function stopAll() {
    updateBuzz([], 0, 1);
    setVacuum(false);
  }

  return { resume, setEnabled, sfx, updateBuzz, setVacuum, setAmbient, stopAll, get enabled() { return enabled; } };
}
